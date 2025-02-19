// Login to minutesBot and dataBot with discord.js
// Require discord.js
import { readFileSync, stat, writeFileSync } from 'fs'
import { Client, GatewayIntentBits } from 'discord.js'
import {
  collection,
  datacord,
  getDocs,
  doc as _doc,
  setDoc,
} from '../firebase.js'
import { config } from 'dotenv'
import { join } from 'path'
import fetch from 'node-fetch'
import path from 'path'
import { fileURLToPath } from 'url'

// define __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create the new client instance including the intents needed for the bot (like presence and guild messages)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
})

// Log in to Discord with your client's token
client.login(process.env.CLARKE_DISCORD_TOKEN)

async function fetchAccount() {
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      ...keys.apca,
    },
  }

  return await fetch('https://paper-api.alpaca.markets/v2/account', options)
    .then((response) => response.json())
    .catch((err) => console.error(err))
}

async function fetchPositions() {
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      ...keys.apca,
    },
  }

  return await fetch('https://paper-api.alpaca.markets/v2/positions', options)
    .then((response) => response.json())
    .catch((err) => console.error(err))
}

function sendMessage(msg, silent = false) {
  state.bot.channels
    .fetch(silent ? '1206705530740019230' : '1199976538930688040')
    .then(async (channel) => {
      channel.send(msg)
    })
}

async function fetchPrice(symbol) {
  return await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${keys.finn}`
  )
    .then(async (response) => {
      let data = await response.json()

      return data.c
    })
    .catch((err) => console.error(err))
}

async function loadConfig() {
  let field = 'clarke'

  // Get the data from local.json or firebase (then save it to local.json)
  var fetchedData = JSON.parse(
    readFileSync(join(__dirname, '../local.json'), 'utf8')
  )
  if (fetchedData[field] == null) {
    const docRef = collection(datacord, 'data')
    const docSnap = await getDocs(docRef)
    const doc = docSnap.docs.find((doc) => doc.id == field)
    const final = JSON.parse(doc.data().data)
    fetchedData[field] = final
    writeFileSync(join(__dirname, '../local.json'), JSON.stringify(fetchedData))
    return final
  } else {
    return fetchedData[field]
  }
}

function saveConfig() {
  let field = 'clarke'
  let data = state.config

  // Update the data in local.json and firebase
  const docRef = collection(datacord, 'data')
  const docSnap = _doc(docRef, field)
  setDoc(docSnap, { data: JSON.stringify(data) })
  var fetchedData = JSON.parse(
    readFileSync(join(__dirname, '../local.json'), 'utf8')
  )
  fetchedData[field] = data
  writeFileSync(join(__dirname, '../local.json'), JSON.stringify(fetchedData))
  // sendMessage(JSON.stringify(state.config, null, 2), true)
}

async function fetchTimes() {
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      ...keys.apca,
    },
  }

  return await fetch('https://paper-api.alpaca.markets/v2/clock', options)
    .then((response) => response.json())
    .catch((err) => console.error(err))
}

async function autoTrader() {
  // Update status to have current portfolio stats
  state.now = new Date()
  state.account = await fetchAccount()

  // Check if market opening / closing times need to be fetched
  if (
    !state.timestamp ||
    (state.now > state.next_open && state.now > state.next_close)
  ) {
    // Fetch and update
    let data = await fetchTimes()

    state = {
      ...state,
      ...data,
      next_open: new Date(data.next_open),
      next_close: new Date(data.next_close),
    }
  }
  // Check if now opening / closing
  else if (
    state.is_open ? state.now > state.next_close : state.now > state.next_open
  ) {
    state.is_open = !state.is_open
    await sendReport()
  }

  // If equity is over 1000, bank the excess (or all of the cash on hand if not enough)
  if (state.account.equity - (state.config.banked || 0) > state.config.limit) {
    let excess =
      state.account.equity - (state.config.banked || 0) - state.config.limit
    excess = Math.min(excess, state.account.cash)
    // Bank 'state.config.bankPerc'% of the excess
    // and add 1 - 'state.config.bankPerc'% to the limit
    state.config.banked =
      (state.config.banked || 0) + excess * state.config.bankPerc
    state.config.limit =
      (state.config.limit || 0) + excess * (1 - state.config.bankPerc)
    state.change = true
  }

  // If open...
  if (
    state.is_open &&
    !(state.now.getMinutes() % 2) &&
    state.now.getSeconds() < 10
  ) {
    await stockCheck()
  }

  // Check if there are changes to be saved, and save them
  if (state.change) {
    state.change = undefined
    saveConfig()
  }

  updateStatus()
}

async function stockCheck() {
  // Get the current typical stock prices
  let positions = await fetchPositions()

  let prices = {}
  positions.forEach((stock) => {
    prices[stock.symbol] = parseFloat(stock.current_price)
  })

  // Loop though each stock
  for (const [symbol, config] of Object.entries(state.config.stocks)) {
    const price = prices[symbol] || (await fetchPrice(symbol))

    // If there is no midpoint then set that to the current price and return
    if (config.midpoint == null) {
      config.midpoint = price
      state.change = true
    } else {
      // Use margin config to calculate heading bounds

      const lowerBound = Math.min(
        config.midpoint - state.config.lowerMarginDiff,
        config.midpoint * (1 - state.config.lowerMarginPerc)
      )
      const upperBound = Math.max(
        config.midpoint + state.config.upperMarginDiff,
        config.midpoint * (1 + state.config.upperMarginPerc)
      )

      switch (config.heading) {
        // If heading is 1...
        case 1:
          // Increase - Update midpoint
          if (price >= config.midpoint) {
            config.midpoint = price
            state.change = true
          }
          // Decrease by X - Update midpoint, change heading to 0
          else if (price < lowerBound) {
            config.midpoint = lowerBound
            config.heading = 0
            state.change = true
          }

          break

        // If heading is -1...
        case -1:
          // Decrease - Update midpoint
          if (price <= config.midpoint) {
            config.midpoint = price
            state.change = true
          }
          // Increase by X - Update midpoint, change heading to 0
          else if (price > upperBound) {
            config.midpoint = upperBound
            config.heading = 0
            state.change = true
          }
          break

        // If heading is 0 / undefined / null / other...
        default:
          // Increase by X - update midpoint, change heading to 1, buy stock
          if (price > upperBound) {
            order('buy', price, symbol)
          }
          // Decrease by X - update midpoint, change heading to -1, sell stock
          else if (price < lowerBound) {
            order('sell', price, symbol)
          }
          break
      }
    }
  }
}

async function order(side, price, symbol) {
  // Get the current position (if any)
  let positions = await fetchPositions()
  let position = positions.find((pos) => pos.symbol == symbol) || { qty: 0 }
  let account = await fetchAccount()

  let tickConfig = state.config.stocks[symbol]
  tickConfig.midpoint = price
  tickConfig.heading = side == 'buy' ? 1 : -1
  state.change = true

  if (state.now.getTime() - tickConfig.lastTransaction > Math.pow(120, 3)) {
    tickConfig.lastTransaction = state.now.getTime()
    tickConfig.lastValue = (tickConfig.lastValue + 2 * tickConfig.midpoint) / 3
  }

  let bodyObj = {
    symbol,
    side,
    type: 'market',
    time_in_force: 'fok',
  }

  // Try to execute the order, only changing the midpoint and heading if successful
  switch (side) {
    // Buying
    case 'buy':
      // Calc how much $ worth to buy
      let cost = Math.min(
        parseFloat(account.buying_power) - (state.config.banked || 0),
        state.config.buyLimit
      )
      // Can't if already has stock, not enough cash, or is buying for more than last sell
      if (
        position.qty ||
        cost * state.config.buyPerc <= price ||
        price > (tickConfig.lastValue || Infinity)
      )
        return

      tickConfig.lastValue = price
      tickConfig.lastTransaction = state.now.getTime()

      // Try to buy some stock
      bodyObj.qty =
        String(Math.floor((cost * state.config.buyPerc) / price)) || 1

      break

    // Selling
    case 'sell':
      // Can't if doesn't have stock, or if it will return less that the last buy
      if (!position.qty || price < (tickConfig.lastValue || 0)) return

      tickConfig.lastValue = price
      tickConfig.lastTransaction = state.now.getTime()

      // Try to sell all of that stock
      bodyObj.qty = String(position.qty)

      break
  }
  console.log(tickConfig)
  state.change = true

  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      ...keys.apca,
    },
    body: JSON.stringify(bodyObj),
  }

  fetch('https://paper-api.alpaca.markets/v2/orders', options)
    .then((response) => {
      sendMessage(
        `New \`${symbol}\`Order Created:\n\n    TYPE: \`${side}\`\n    QTY: \`${
          bodyObj.qty
        }\`\n    ESTIMATED VALUE: \`${
          parseFloat(bodyObj.qty) * price
        }\`\n    STATUS: \`${response.status}\``
      )
    })
    .catch((err) => console.error(err))
}

async function updateStatus() {
  let nextTime = state.is_open ? state.next_close : state.next_open

  let diff = nextTime - state.now

  let days = Math.floor(diff / 86400000)
  let hours = Math.floor((diff / 3600000) % 24)
  let minutes = Math.floor((diff / 60000) % 60)

  let delay = [days, hours, minutes]
    .map((x, i) =>
      x ? `${x} ${['day', 'hour', 'minute'][i]}${x > 1 ? 's' : ''}` : 0
    )
    .filter((x) => x)
    .filter((x, i) => i < 2)
    .join(' and ')

  // Set the bot's presence
  client.user.setPresence({
    activities: [
      {
        name: `Market: ${state.is_open ? 'Open' : 'Closed'},\n ${
          state.is_open ? 'Closes' : 'Opens'
        } in: ${delay},\n Cash: ${
          state.account.cash - (state.config.banked || 0)
        },\n In Stocks: ${
          state.account.equity - state.account.cash
        },\n Banked: ${state.config.banked || 0},\n Total: ${
          state.account.equity
        }`,
        type: 0,
      },
    ],
  })
}

async function sendReport() {
  let nextTime = state.is_open ? state.next_close : state.next_open

  let diff = nextTime - state.now

  let days = Math.floor(diff / 86400000)
  let hours = Math.floor((diff / 3600000) % 24)
  let minutes = Math.floor((diff / 60000) % 60)

  let delay = [days, hours, minutes]
    .map((x, i) =>
      x ? `${x} ${['day', 'hour', 'minute'][i]}${x > 1 ? 's' : ''}` : 0
    )
    .filter((x) => x)
    .filter((x, i) => i < 2)
    .join(' and ')

  sendMessage(
    `UPDATE:\n\n    Market: ${state.is_open ? 'Open' : 'Closed'}\n    ${
      state.is_open ? 'Closes' : 'Opens'
    } in: ${delay}\n    Cash: ${
      state.account.cash - (state.config.banked || 0)
    }\n    In Stocks: ${
      state.account.equity - state.account.cash
    }\n    Banked: ${state.config.banked || 0}\n    Total: ${
      state.account.equity
    }`
  )
}

let state = {}

let keys = {
  apca: {
    'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID,
    'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY,
  },
  twlv: process.env.TWLV_API_KEY,
  finn: process.env.FINN_API_KEY,
}

client.on('ready', async (bot) => {
  state.config = await loadConfig()

  // Run the main bot loop every 30 seconds, starting 1 second after the nearest 'snap' point
  state.bot = bot
  let waitMs = 30000 - (new Date().getTime() % 30000)

  setTimeout(() => {
    setInterval(autoTrader, 30000)
  }, waitMs + 1000)
})

// C.L.A.R.K.E.
// Clarke is a stock trading bot
// It is named after the famous science fiction author, Arthur C. Clarke
// It uses upper and lower bounds to determine when to buy and sell stocks
// It also banks excess cash, which can then be transferred to the user's account
// Clarke is a bot best used on many stocks, as it is designed to be a high-frequency trader
// It is not recommended to use Clarke with less than 5 stocks

// However, we do not have an acronym for C.L.A.R.K.E. yet
// We do have some other names and acronyms, though
// Including:
// - Bounded Automated Stock Trader Engine with Real-time Knowledge and Execution
