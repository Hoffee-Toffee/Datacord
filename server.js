// require('dotenv').config();
var timezoneoffset = 12 * 1000 * 3600

const express = require('express')
const app = express()
const fs = require('fs')

const test_config = {
  token:
    'MTE0NjI0OTM2Nzc1NDM3NTE4OA.GR1Y_5.2RaudV_2Tjdz7EX6mrqmQhamNQP1LpgU56Zh7o',
}

const Stocks = require('stocks.js')

var portfolio = JSON.parse(fs.readFileSync('./stocks.json'))

var files = []
var data = []

fs.readdirSync('./data').forEach((file) => {
  files.push(`./data/${file}`)
})

files.forEach((name) => {
  var file = fs.readFileSync(name).toString().split('\n').splice(1)

  var obj = {}

  file.forEach((col) => {
    var segments = col.split(',')

    obj[segments[0]] = {
      open: parseFloat(segments[1]),
      high: parseFloat(segments[2]),
      low: parseFloat(segments[3]),
      close: parseFloat(segments[4]),
      adjClose: parseFloat(segments[5]),
      volume: parseFloat(segments[6]),
    }
  })

  data[name.slice(7, name.length - 4)] = obj
})

// Reset all values (FOR TESTING ONLY)
if (false) {
  portfolio.stocks = {}
}
portfolio.bank.total = portfolio.bank.start
portfolio.pool.total = portfolio.pool.start

files.forEach(
  (name) =>
    (portfolio.stocks[name.slice(7, name.length - 4)] = {
      trending: 'low',
      anchor: -1,
      shares: [],
    })
)

// var simStart = new Date('2010-06-30')
var simStart = new Date('2023-09-06')
var simDate = simStart
var simEnd = new Date('2023-09-06')

// var stocks = new Stocks('JIGT25NX38IRYX2X')

// Login to minutesBot and dataBot with discord.js
// Require discord.js
const { Client, GatewayIntentBits, Message } = require('discord.js')
const { time } = require('console')
const { channel } = require('diagnostics_channel')

// Create the new clients instances including the intents needed for the bots like presence and guild messages
const testClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ],
})

// Log in to Discord with your clients tokens
testClient.login(test_config.token)

testClient.on('messageCreate', async (message = new Message()) => {
  // Exit and stop if the prefix is not there or if user is a bot
  if (message.author.bot) return

  if (message.channel.id == '1146742345447002153') {
    eval(message.content)
    return
  }

  if (message.content.toLowerCase() == '.') {
    message.channel.send(
      message.guild.members.cache.get(message.author.id).nickname ||
        message.author.globalName
    )
  }

  if (
    ['.kill', '.stop', '.end', '.exit'].includes(message.content.toLowerCase())
  ) {
    message.channel.send('Ended bot.').finally(() => {
      process.exit()
    })
  }
})

testClient.on('ready', async () => {
  await testClient.channels.fetch('1146256683748827177').then((channel) => {
    channel.send('Starting simulation.')
    stockSim()
  })
})

app.get('/wakeup', function (request, response) {
  response.send('Wakeup successful.')
  console.log(`Pinged at ${new Date()}`)
})

async function sendMessage(message) {
  if (message == null || message.length < 1) {
    return
  }

  await testClient.channels
    .fetch('1146256683748827177')
    .then((channel) => channel.send(message))
}

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port)
})

async function stockSim() {
  while (simEnd - simDate > 0) {
    portfolio = await check()
    simDate.setDate(simDate.getDate() + 1)
  }
  sendMessage(
    `Bank: $${portfolio.bank.start} -> $${portfolio.bank.total}\nPool: $${
      portfolio.pool.start
    } -> $${
      portfolio.pool.total
    }\nShares: $${portfolio.stocks.TSLA.shares.reduce(
      (total, curr) => total + curr.amount * curr.cost,
      0
    )}\nTOTAL: $${portfolio.bank.start + portfolio.pool.start} -> $${
      portfolio.bank.total +
      portfolio.pool.total +
      portfolio.stocks.TSLA.shares.reduce(
        (total, curr) => total + curr.amount * curr.cost,
        0
      )
    }`
  )
}

async function check() {
  var fTime = simDate.toISOString().slice(0, 10)

  var newStock = data.TSLA[fTime]
  var oldStock = portfolio.stocks.TSLA

  if (!newStock || !oldStock) return portfolio

  if (oldStock.anchor == -1) {
    oldStock.anchor = newStock.low
  }

  // Sell if high trending low
  if (newStock.high < oldStock.anchor && oldStock.trending == 'high') {
    // All stock in it
    oldStock.shares.forEach((share) => {
      portfolio.pool.total += share.amount * newStock.close
    })
    oldStock.shares = []
    oldStock.trending = 'low'
  }

  // Sell some stocks if pool is low
  if (portfolio.pool.total < portfolio.pool.lowerLimit) {
    // Soon
  }

  // Buy if low trending high
  if (newStock.low > oldStock.anchor && oldStock.trending == 'low') {
    // Buy as much stock in it as can afford

    if (newStock.close < portfolio.pool.total) {
      var num = Math.floor(portfolio.pool.total / newStock.close)

      oldStock.shares.push({
        amount: num,
        cost: newStock.close,
      })

      portfolio.pool.total -= num * newStock.close
    }
    oldStock.trending = 'high'
  }

  // Save excess if needed
  if (portfolio.pool.total > portfolio.pool.upperLimit) {
    portfolio.bank.total += portfolio.pool.total - portfolio.pool.upperLimit
    portfolio.pool.total = portfolio.pool.upperLimit
  }

  // Update vars for next cycle
  oldStock.anchor += oldStock.trending == 'low' ? newStock.high : newStock.low
  oldStock.anchor /= 2
  portfolio.stocks.TSLA = oldStock

  return portfolio
}
