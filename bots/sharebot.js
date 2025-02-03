import { link, readFileSync, writeFileSync } from 'fs'
import { Client, GatewayIntentBits } from 'discord.js'
import {
  collection,
  datacord,
  getDocs,
  doc as _doc,
  setDoc,
} from '../firebase.js'
import { join } from 'path'
import fetch from 'node-fetch'
import path from 'path'
import { fileURLToPath } from 'url'
import { JSDOM } from 'jsdom'
import { config } from 'dotenv'
config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
})

client.login(process.env.CLARKE_DISCORD_TOKEN)

const colors = {
  yellow: 16567828, // Requested (Initial request, no action taken)
  blue: 1077733, // Pending (Order has been made, waiting for confirmation following order completion)
  green: 35342, // Complete (Order has been completed, order closed)
  red: 15209235, // Cancelled (Order failed, or user declined the suggestion, order closed)
}

async function fetchPrices() {
  let res = await fetch('https://www.nzx.com/markets/NZSX')
  res = await res.text()
  res = new JSDOM(res)
  const prices = {}
  const { document } = res.window
  Array.from(document.querySelectorAll('table strong')).forEach(
    (e) => (prices[e.textContent] = 0)
  )
  Array.from(document.getElementsByClassName('Price')).forEach(
    (e, i) =>
      (prices[Object.keys(prices)[i]] = parseFloat(e.textContent.slice(1)))
  )
  return prices
}

async function getData(field) {
  // 'config' - Bot configuration
  // 'stocks' - Stock data

  var fetchedData = JSON.parse(
    readFileSync(join(__dirname, 'clarke.json'), 'utf8')
  )
  if (fetchedData[field] === undefined) {
    const docRef = collection(datacord, 'clarke')
    const docSnap = await getDocs(docRef)
    const doc = docSnap.docs.find((doc) => doc.id === field)
    const final = JSON.parse(doc.data().data)
    fetchedData[field] = final
    writeFileSync(join(__dirname, 'clarke.json'), JSON.stringify(fetchedData))
    return final
  } else return fetchedData[field]
}

async function saveData(field, data) {
  const docRef = collection(datacord, 'clarke')
  const docSnap = _doc(docRef, field)
  setDoc(docSnap, { data: JSON.stringify(data) })
  var fetchedData = JSON.parse(
    readFileSync(join(__dirname, 'clarke.json'), 'utf8')
  )
  fetchedData[field] = data
  writeFileSync(join(__dirname, 'clarke.json'), JSON.stringify(fetchedData))
}

async function stockCheck() {
  const [config, stocks] = await Promise.all(['config', 'stocks'].map(getData))
  const changes = {}

  const prices = await fetchPrices()

  Object.entries(stocks).forEach(([symbol, stock]) => {
    // Skip if transaction pending
    if (stock.pending) return
    const currentPrice = prices[symbol]

    if (stock.midpoint === null) {
      stock.midpoint = currentPrice
      changes.stock = true
      return
    } else {
      const lowerBound = Math.min(
        stock.midpoint - config.lowerMarginDiff,
        stock.midpoint * (1 - config.lowerMarginPerc)
      )
      const upperBound = Math.max(
        stock.midpoint + config.upperMarginDiff,
        stock.midpoint * (1 + config.upperMarginPerc)
      )

      switch (stock.heading) {
        case 1: // Going up
          if (currentPrice >= stock.midpoint) {
            stock.midpoint = currentPrice
            changes.stock = true
          } else if (currentPrice < lowerBound) {
            stock.midpoint = lowerBound
            stock.heading = 0
            changes.stock = true
          }
          break
        case -1: // Going down
          if (currentPrice <= stock.midpoint) {
            stock.midpoint = currentPrice
            changes.stock = true
          } else if (currentPrice > upperBound) {
            stock.midpoint = upperBound
            stock.heading = 0
            changes.stock = true
          }
          break
        default: // Turning / Stable
          if (currentPrice > upperBound) {
            stock.midpoint = currentPrice
            stock.heading = 1
            stock.pending = {
              side: 'buy',
              price: Math.floor(currentPrice * 1000) / 1000,
              amount: Math.floor(config.buyPerc * stock.money * 1000) / 1000,
              units:
                Math.floor(
                  ((config.buyPerc *
                    stock.money *
                    (1 - config.transactionFee)) /
                    currentPrice) *
                    1000
                ) / 1000,
            }
            changes.stock = true
          } else if (currentPrice < lowerBound) {
            stock.midpoint = currentPrice
            stock.heading = -1
            stock.pending = {
              side: 'sell',
              price: Math.floor(currentPrice * 1000) / 1000,
              amount: Math.floor(stock.units * currentPrice * 1000) / 1000,
              units: stock.units,
            }
            changes.stock = true
          }
          break
      }
    }
  })

  if (changes.stock) await saveData('stocks', stocks)

  return stocks
}

async function suggestOrder(symbol, stock) {
  const [config, stocks] = await Promise.all(['config', 'stocks'].map(getData))

  const order = stock.pending

  return {
    content: '',
    tss: false,
    embeds: [
      {
        title: `${order.side.toUpperCase()} at $${order.price}`,
        color: colors.yellow,
        fields: [
          {
            name: 'Price',
            value: `$${order.amount}`,
            inline: true,
          },
          {
            name: 'Units (after fees)',
            value: order.units.toString(),
            inline: true,
          },
        ],
        author: {
          url: `https://app.sharesies.com/profile/personal/invest/search/${symbol.toLowerCase()}`,
          name: `${symbol} (${stock.name})`,
          icon_url: stock.logo,
        },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: 'Order',
            url: `https://app.sharesies.com/profile/personal/invest/search/${symbol.toLowerCase()}/${order.side.toLowerCase()}`,
          },
          {
            type: 2,
            style: 3,
            label: 'Confirm',
            custom_id: 'confirm',
          },
          {
            type: 2,
            style: 4,
            label: 'Cancel',
            custom_id: 'cancel',
          },
        ],
      },
    ],
  }
}

client.on('ready', awaitEvent)

async function awaitEvent() {
  const now = new Date()
  const target = new Date(now.getTime())
  target.setHours(9, 0, 0, 0)
  let event = 'pending'

  const daysTillNextWeekday = now.getDay() > 4 ? 8 - now.getDay() : 1
  target.setDate(now.getDate() + daysTillNextWeekday)

  if (![0, 6].includes(now.getDay()) && now.getHours() < 10) {
    target.setDate(now.getDate())
    if (now.getHours() === 9 && now.getMinutes() >= 30) {
      target.setHours(10, 0, 0, 0)
      event = 'open'
    } else if (now.getHours() === 9) {
      target.setHours(9, 30, 0, 0)
      event = 'alert'
    }
  }

  setTimeout(() => triggerEvent(event), target.getTime() - now.getTime())
}

async function triggerEvent(event) {
  const [config, stocks] = await Promise.all(['config', 'stocks'].map(getData))

  switch (event) {
    case 'alert':
      sendMessage('The market will open in 30 minutes!')
      break
    case 'open':
      sendMessage('The market is now open!')
      const stockData = await stockCheck()
      Object.entries(stockData).forEach(async ([symbol, stock]) => {
        if (stock.pending) {
          const order = await suggestOrder(symbol, stock)
          sendMessage(order)
          return
        }
      })
      break
    case 'pending':
      // Any unanswered orders will be resent
      Object.entries(stocks).forEach(async ([symbol, stock]) => {
        if (stock.pending) {
          const order = await suggestOrder(symbol, stock)
          sendMessage(order)
          return
        }
      })
      break
    case 'log':
      // Log the raw config and stock data
      console.log({ config, stocks })
      break
  }
  awaitEvent()
}

async function handleConfirm(interaction) {
  // Get data from stock.pending (to be an object instead of a string, use as if an object)

  // Change color to green
  // BUY/SELL -> BOUGHT/SOLD
  // Update money to reflect
  // Remove pending order
  // Add "Completed" footer
  // Disable all buttons

  // Pending -> undefined
  // Heading -> 1 (Bought) / -1 (Sold)
  // units -> 0 (Sold) / X (Bought)

  const [config, stocks] = await Promise.all(['config', 'stocks'].map(getData))
  const symbol = interaction.message.embeds[0].author.name.split(' ')[0]
  const stock = stocks[symbol]

  // Account for transaction fees

  if (stock.pending) {
    const order = stock.pending

    const newStocks = {
      ...stocks,
      [symbol]: {
        ...stock,
        pending: undefined,
        heading: order.side === 'buy' ? 1 : -1,
        units: order.side === 'buy' ? order.units : 0,
        money:
          order.side === 'buy'
            ? stock.money - order.amount
            : stock.money + order.amount * (1 - config.transactionFee),
      },
    }

    await saveData('stocks', newStocks)

    const newConfig = {
      ...config,
      money:
        order.side === 'buy'
          ? config.money - order.amount
          : config.money + order.amount * (1 - config.transactionFee),
    }

    const transactions = await getData('transactions')
    transactions.logs.push({
      type: order.side,
      amount:
        order.side === 'buy'
          ? order.amount
          : order.amount * (1 - config.transactionFee),
      fee: order.side === 'buy' ? 0 : order.amount * config.transactionFee,
    })
    await saveData('transactions', transactions)

    if (config.spreadGains && order.side === 'sell') {
      // money / stocks without units
      const bankPerStock =
        config.money / newStocks.filter((stock) => stock.units === 0).length
      // Provide the difference to each stock
      newStocks = newStocks.map((stock) => ({
        ...stock,
        money: stock.money + (stock.units === 0 ? bankPerStock : 0),
      }))
    }

    await saveData('config', newConfig)

    interaction.update({
      embeds: [
        {
          ...interaction.message.embeds[0].data,
          color: colors.green,
          footer: {
            text: 'Order confirmed',
          },
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: 'Order',
              url: `https://app.sharesies.com/profile/personal/invest/search/${symbol.toLowerCase()}/${order.side.toLowerCase()}`,
              disabled: true,
            },
            {
              type: 2,
              style: 3,
              label: 'Confirm',
              custom_id: 'confirm',
              disabled: true,
            },
            {
              type: 2,
              style: 4,
              label: 'Cancel',
              custom_id: 'cancel',
              disabled: true,
            },
          ],
        },
      ],
    })
  }
}

async function handleCancel(interaction) {
  // Change color to red
  // Add "Cancelled" footer
  // Disable all buttons

  // Pending -> undefined

  const [config, stocks] = await Promise.all(['config', 'stocks'].map(getData))
  const symbol = interaction.message.embeds[0].author.name.split(' ')[0]
  const stock = stocks[symbol]

  if (stock.pending) {
    const order = stock.pending

    const newStocks = {
      ...stocks,
      [symbol]: {
        ...stock,
        pending: undefined,
        units: order.side === 'buy' ? 0 : stock.units,
      },
    }

    await saveData('stocks', newStocks)

    interaction.update({
      embeds: [
        {
          ...interaction.message.embeds[0].data,
          color: colors.red,
          footer: {
            text: 'Order cancelled',
          },
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: 'Order',
              url: `https://app.sharesies.com/profile/personal/invest/search/${symbol.toLowerCase()}/${order.side.toLowerCase()}`,
              disabled: true,
            },
            {
              type: 2,
              style: 3,
              label: 'Confirm',
              custom_id: 'confirm',
              disabled: true,
            },
            {
              type: 2,
              style: 4,
              label: 'Cancel',
              custom_id: 'cancel',
              disabled: true,
            },
          ],
        },
      ],
    })
  }
}

// Test mode:
// !a - Alert in 10 seconds
// !o - Open in 10 seconds
// !p - Pending in 10 seconds
// !l - Log current data

client.on('messageCreate', async (message) => {
  if (message.author.bot) return
  const testSet = ['!a', '!o', '!p', '!l']
  if (testSet.includes(message.content))
    setTimeout(
      () =>
        triggerEvent(
          ['alert', 'open', 'pending', 'log'][testSet.indexOf(message.content)]
        ),
      3000
    )

  const [command, amount] = message.content.split(' ')
  if (command === '!d' || command === '!w') {
    const [config, stocks, transactions] = await Promise.all(
      ['config', 'stocks', 'transactions'].map(getData)
    )
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      message.reply('Invalid amount.')
      return
    }

    if (!transactions.logs) {
      transactions.logs = []
    }

    switch (command) {
      case '!d':
        config.money += amountNum
        const totalMoney = Object.values(stocks).reduce(
          (acc, stock) => acc + (stock.money || 0),
          0
        )
        if (totalMoney === 0) {
          const stockCount = Object.keys(stocks).length
          const amountPerStock = amountNum / stockCount
          Object.keys(stocks).forEach((symbol) => {
            stocks[symbol].money = amountPerStock
          })
        } else {
          Object.keys(stocks).forEach((symbol) => {
            stocks[symbol].money +=
              ((stocks[symbol].money || 0) / totalMoney) * amountNum
          })
        }
        await saveData('config', config)
        await saveData('stocks', stocks)
        transactions.logs.push({ type: 'deposit', amount: amountNum, fee: 0 })
        await saveData('transactions', transactions)
        message.reply(`Deposited $${amountNum}.`)
        break
      case '!w':
        if (config.money < amountNum) {
          message.reply('Insufficient funds.')
          return
        }
        config.money -= amountNum
        const totalMoneyWithdraw = Object.values(stocks).reduce(
          (acc, stock) => acc + stock.money,
          0
        )
        Object.keys(stocks).forEach((symbol) => {
          stocks[symbol].money -=
            (stocks[symbol].money / totalMoneyWithdraw) * amountNum
        })
        await saveData('config', config)
        await saveData('stocks', stocks)
        transactions.logs.push({ type: 'withdraw', amount: amountNum, fee: 0 })
        await saveData('transactions', transactions)
        message.reply(`Withdrew $${amountNum}.`)
        break
    }
  }

  if (command === '!setlimit') {
    const [config] = await Promise.all(['config'].map(getData))
    const newLimit = parseFloat(amount)
    if (isNaN(newLimit) || newLimit <= 0) {
      message.reply('Invalid limit amount.')
      return
    }
    config.limit = newLimit
    await saveData('config', config)
    message.reply(`Limit set to $${newLimit}.`)
  }

  if (command === '!settings') {
    const [config, transactions] = await Promise.all(
      ['config', 'transactions'].map(getData)
    )
    const totalGainedLost = config.money - (transactions.startMoney || 0)
    const settingsMessage = `
      **General Settings**
      Money: $${config.money}
      Change so far: $${totalGainedLost}
      Limit: $${config.limit}
      Transaction Fee: ${config.transactionFee * 100}%
      Bank Percentage: ${
        config.bankPercentage * 100
      }% (of excess money per month)
      Spread Gains: ${config.spreadGains ? 'Enabled' : 'Disabled'}
    `
    message.reply(settingsMessage)
  }

  if (command === '!help') {
    const helpMessage = `
      **Available Commands**
      !d <amount> - Deposit money
      !w <amount> - Withdraw money
      !setlimit <amount> - Set the limit
      !settings - View general settings
      !help - View all available commands
    `
    message.reply(helpMessage)
  }
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return
  switch (interaction.customId) {
    case 'confirm':
      handleConfirm(interaction)
      break
    case 'cancel':
      handleCancel(interaction)
      break
  }
})

function sendMessage(message, silent = false) {
  const channelId = silent ? '1206705530740019230' : '1331485333782663251'
  client.channels.fetch(channelId).then((channel) => {
    channel.send(message)
  })
}

async function logWeeklySummary() {
  const [config, transactions] = await Promise.all(
    ['config', 'transactions'].map(getData)
  )

  const summary = {
    bought: 0,
    boughtFees: 0,
    sold: 0,
    soldFees: 0,
    withdrawn: 0,
    deposited: 0,
    totalFees: 0,
    totalGainedLost: 0,
    startMoney: transactions.startMoney,
    endMoney: config.money,
  }

  transactions.logs.forEach((log) => {
    switch (log.type) {
      case 'buy':
        summary.bought += log.amount
        summary.boughtFees += log.fee
        break
      case 'sell':
        summary.sold += log.amount
        summary.soldFees += log.fee
        break
      case 'withdraw':
        summary.withdrawn += log.amount
        break
      case 'deposit':
        summary.deposited += log.amount
        break
    }
    summary.totalFees += log.fee
  })

  summary.totalGainedLost = summary.endMoney - summary.startMoney

  const summaryMessage = `
    **Weekly Summary**
    Bought: $${summary.bought}
    Bought Fees: $${summary.boughtFees}
    Sold: $${summary.sold}
    Sold Fees: $${summary.soldFees}
    Withdrawn: $${summary.withdrawn}
    Deposited: $${summary.deposited}
    Total Fees: $${summary.totalFees}
    Total Gained/Lost: $${summary.totalGainedLost}
    Start Money: $${summary.startMoney}
    End Money: $${summary.endMoney}
  `

  sendMessage(summaryMessage, true)

  // Save last week's logs in the database
  await saveData('weekly_logs', { logs: transactions.logs, summary })

  // Reset transactions for the next week
  transactions.startMoney = config.money
  transactions.logs = []
  await saveData('transactions', transactions)
}

// Schedule weekly summary for Friday's close
function scheduleWeeklySummary() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7
  const nextFriday = new Date(
    now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000
  )
  nextFriday.setHours(16, 0, 0, 0) // 4 PM on Friday

  const timeUntilNextFriday = nextFriday.getTime() - now.getTime()
  scheduleTimeout(() => {
    logWeeklySummary()
    setInterval(logWeeklySummary, 7 * 24 * 60 * 60 * 1000) // Every week
  }, timeUntilNextFriday)
}

function scheduleMonthlyCheck() {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  nextMonth.setHours(0, 0, 0, 0)

  const timeUntilNextMonth = nextMonth.getTime() - now.getTime()
  scheduleTimeout(() => {
    handleLimitAndBankPercentage()
  }, timeUntilNextMonth)
}

function scheduleTimeout(callback, delay) {
  if (delay > 0x7fffffff) {
    // 0x7FFFFFFF is the maximum 32-bit signed integer value
    setTimeout(() => scheduleTimeout(callback, delay - 0x7fffffff), 0x7fffffff)
  } else {
    setTimeout(callback, delay)
  }
}

scheduleWeeklySummary()
scheduleMonthlyCheck()

async function handleLimitAndBankPercentage() {
  const [config, stocks] = await Promise.all(['config', 'stocks'].map(getData))

  if (config.money > config.limit) {
    const excessMoney = config.money - config.limit
    const bankAmount = excessMoney * (config.bankPercentage / 100)
    const remainingAmount = excessMoney - bankAmount

    config.money = config.limit + remainingAmount
    await saveData('config', config)

    sendMessage(`Transferred $${bankAmount} to the bank account.`)
  }

  // Schedule the next check
  scheduleMonthlyCheck()
}
