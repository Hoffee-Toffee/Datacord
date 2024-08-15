// Require discord.js
import { readFileSync, writeFileSync } from 'fs'
import { Client, GatewayIntentBits } from 'discord.js'
import * as firebase from '../firebase.js'
import dotenv from 'dotenv'

dotenv.config()
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

const channelId = '1206705530740019230'
const avKey = process.env.AV_API_KEY

// Log in to Discord with your client's token
client.login(process.env.CLARKE_DISCORD_TOKEN)

let bot

client.on('ready', (c) => (bot = c))

function sendMessage(msg) {
  bot.channels.fetch(channelId).then(async (channel) => {
    channel.send(msg)
  })
}

async function getData() {
  // Get the data from clarke.json or firebase (then save it to clarke.json)
  var fetchedData = JSON.parse(
    readFileSync(join(__dirname, '../clarke.json'), 'utf8')
  )
  if (fetchedData.clarke == null) {
    const docRef = firebase.collection(firebase.datacord, 'clarke')
    const docSnap = await firebase.getDocs(docRef)
    fetchedData.clarke = {}
    docSnap.docs.forEach((doc) => (fetchedData.clarke[doc.id] = doc.data()))
    writeFileSync(
      join(__dirname, '../clarke.json'),
      JSON.stringify(fetchedData)
    )
    return fetchedData.clarke
  } else {
    return fetchedData.clarke
  }
}

async function setData(data) {
  // Only update the keys under clarke that don't match the local data
  const oldData = JSON.parse(
    readFileSync(join(__dirname, '../clarke.json'), 'utf8')
  )
  // get all the clarke keys for both the old and the new, as we will compare each to track new, modified, and deleted keys
  const keys = Array.from(
    new Set([...Object.keys(data), ...Object.keys(oldData.clarke)])
  )

  keys.forEach(async (key) => {
    const docRef = firebase.doc(firebase.datacord, 'clarke', key)

    // Check which sets this key is in
    switch (
      (Object.keys(data).includes(key),
      Object.keys(oldData.clarke).includes(key))
    ) {
      // isInNew, isInOld
      case (true, false):
        // Create new document {key}, with value data[key]
        await firebase.addDoc(docRef, data[key])
        break
      case (false, true):
        // Delete the document
        // await firebase.deleteDoc(docRef)
        break
      case (true, true):
        // Only set the document if the stringified values are different
        if (JSON.stringify(data[key]) !== JSON.stringify(oldData.clarke[key]))
          await firebase.setDoc(docRef, data[key])
        break
    }
  })

  // Update the local data
  writeFileSync(
    join(__dirname, '../clarke.json'),
    JSON.stringify({ ...oldData, clarke: data })
  )
}

let data = await getData()

let stocks = [
  'TSLA',
  'HPQ',
  'INTC',
  'GOOGL',
  'DELL',
  'ABT',
  'EA',
  'HON',
  'AMZN',
  'AMD',
  'AAPL',
  'KO',
  'NDAQ',
  'DIS',
  'SONY',
  'IMAX',
]

function dailyFetch(setSize = 12) {
  sendMessage('Starting daily fetch...')
  let promises = []

  let end = new Date()
  end.setMonth(end.getMonth() - 1)
  end = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, 0)}`

  // Create an array of how many months (keys) each stock has, or 0 if it has none, or -1 if it contains data on the last month
  let stockMonths = stocks.map((stock) =>
    data[stock] ? (!data[stock][end] ? -1 : Object.keys(data[stock]).length) : 0
  )

  // Sort by the number of months, from least to most, and remove all stocks set to -1
  stocks = stocks
    .filter((_, i) => stockMonths[i] !== -1)
    .sort(
      (a, b) => stockMonths[stocks.indexOf(a)] - stockMonths[stocks.indexOf(b)]
    )

  for (let i = 0; i < setSize; i++) {
    // Get the stock at index i, modulo
    let stock = stocks[i % stocks.length]
    let start = new Date('2014')

    // Get the number of months the stock has data for
    let months = Object.keys(data[stock] || {}).length

    // Set to number of months plus any modulo cycles
    start.setMonth(months + Math.floor(i / stocks.length))

    let date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(
      2,
      0
    )}`

    let url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stock}&interval=5min&month=${date}&outputsize=full&extended_hours=false&apikey=${avKey}`
    let fetchPromise = fetch(url)
      .then((response) => {
        console.log(i, response)
        return response.json()
      })
      .then((response) => {
        console.log(i, response)

        if (response['Error Message']) {
          console.error(
            `Error fetching data for ${stock} on ${date}: ${response['Error Message']}`
          )
          return
        }

        if (!response['Time Series (5min)']) {
          console.error(
            `Error fetching data for ${stock} on ${date}: Time Series data not found`
          )
          return
        }

        data[stock] = data[stock] || {}
        data[stock][date] = {}

        Object.entries(response['Time Series (5min)']).forEach(([k, v]) => {
          data[stock][date][k] = parseFloat(v['4. close'])
        })
      })
      .catch((err) => {
        console.error(`Error fetching data for ${stock} on ${date}: ${err}`)
      })

    promises.push(fetchPromise)
  }

  // Wait for all promises to settle and then set the data
  Promise.allSettled(promises).then(() => {
    setData(data)
  })

  // Create the next fetch
  createFetch()
}

function createFetch() {
  // Will run every 24 hours, plus 5 minutes to ensure the daily fetch has completed
  const now = new Date()
  const gapDuration = 1000 * 60 * (60 * 24 + 5)

  let nextFetch = Math.ceil(now.getTime() / gapDuration) * gapDuration

  const msRemaining = nextFetch - now.getTime()

  // Wait until then, then begin the daily fetch function
  setTimeout(dailyFetch, msRemaining)
}

createFetch()

// If the user sends message in the channel...
client.on('messageCreate', async (message) => {
  // Ignore if the message was from this, or any other bot
  if (message.author.bot || message.channel.id !== channelId) return

  // 'train' - run training
  // 'set {x} {y}' - set the variable x to the value y
  // 'get {x}' - get the value of variable x
  // 'get all' - show all keys and their values
  // 'list' - list all keys

  // command is all before the first space
  // key is all left that's before the second space
  // value is all after the second space
  const args = message.content.trim().split(' ')
  const command = args[0].toLowerCase()
  let key = args[1]
  let value = args.slice(2).join(' ')

  switch (command) {
    case 'train':
      startTraining()
      break
    case 'set':
      // Must have both the key and the value
      if (!key || !value) {
        return sendMessage('Usage: set <key> <value>')
      }

      // Must be a valid property of data
      if (!data.config.hasOwnProperty(key)) {
        return sendMessage('Invalid key')
      }

      // Try to set the value
      try {
        data.config[key] = JSON.parse(value)

        // Save the data to local and cloud storage
        await setData(data)
        sendMessage(`Set ${key} to ${value}`)
      } catch (err) {
        console.error(`Error setting value for ${key}: ${err}`)
        sendMessage('Invalid value')
      }

      break
    case 'get':
      // Must have the key
      if (!key) {
        return sendMessage('Usage: get <key>')
      }

      // If getting all keys
      if (key === 'all') {
        return sendMessage(JSON.stringify(data.config, null, 2))
      }

      // If getting a specific key, check if it exists
      if (!data.config.hasOwnProperty(key)) {
        return sendMessage('Invalid key')
      }

      sendMessage(`Value of ${key} is ${data.config[key]}`)
      break
    case 'list':
      // List all keys in the data object
      sendMessage(Object.keys(data.config).join(', '))
      break
  }
})

// bot-population class

class Bot {
  constructor(config, genes) {
    this.config = config // Full config stored to ease inheritance
    this.round = 0 // Which round the bot is on
    this.fitnessSum = 0 // The sum of all fitness values for this bot

    // Environment details used by all instances
    this.buyPenalty = config.buyPenalty // A transaction cost taken every time a bot buys a stock
    this.sellPenalty = config.sellPenalty // A transaction cost taken every time a bot sells a stock
    this.startCash = config.startCash // How much cash each bot starts with on every round
    this.mutationRate = config.mutationRate // How likely a mutation is to occur every round

    // Genetic information used for this instance
    this.lowerMarginPerc = genes.lowerMarginPerc // How different the price must be as a percentage to trigger an action in the lower bound
    this.lowerMarginDiff = genes.lowerMarginDiff // How different the price must be trigger an action in the lower bound
    this.upperMarginPerc = genes.upperMarginPerc // ...
    this.upperMarginDiff = genes.upperMarginDiff // ...
    this.buyPerc = genes.buyPerc // A percentage of how much money the bot will risk on a purchase
    this.buyLimit = genes.buyLimit // A set value the bot will not spend over
    this.riskAverse = genes.riskAverse // Weather or not the bot will perform a transaction even if it causes a short-term loss
    this.stockExpiry = genes.stockExpiry // How long the bot will hold a stock before increasing it's likelihood of selling it
    this.stockDecay = genes.stockDecay // How much more likely it will be for a stock to be sold after each expiration
    this.ignoreFailedOrder = genes.ignoreFailedOrder // Weather or not you will ignore a change in heading if your order fails

    // Internal state for this round, to be reset before each round
    this.roundEnd()
  }

  // Reset the internal state for this round
  roundEnd(finalStockPrice = null) {
    // Calculate a fitness score if a finalStockPrice is given
    let roundFitness = null
    if (finalStockPrice) {
      // Add the money remaining to the value of any remaining stocks
      const equity = this.buyingPower + this.stockQuantity * finalStockPrice

      // Will end up returning how many times larger the value is to the starting equity
      roundFitness = equity / this.config.startCash

      // Update the round and fitnessSum for the bot
      this.round++
      this.fitnessSum += roundFitness
    }

    // Reset internal state for the next round
    this.heading = 0 // Direction the stock is going (-1: falling, 0: flat, 1: rising)
    this.midpoint = null // Point where the current stock price is compared to to judge heading
    this.lastValue = Infinity // Stock price at last sell or buy
    this.lastDate = null // Date of last transaction
    this.stockQuantity = 0 // Number of stock owned by this instance
    this.buyingPower = this.startCash // How much money the bot has to spend
  }

  // Function to calculate the equity value for this bot
  getEquity(currentStockPrice) {
    return this.buyingPower + this.stockQuantity * currentStockPrice
  }

  // Function to make a buy or sell decision based on the current stock price
  makeDecision(currentStockPrice, time) {
    // If there is no midpoint recorded, then set that to the current stock price and return
    if (!this.midpoint) {
      this.midpoint = currentStockPrice
      return
    }

    // Define the upper and lower bounds around the midpoint
    const lowerBound = Math.min(
      this.midpoint - this.lowerMarginDiff,
      this.midpoint * (1 - this.lowerMarginPercent)
    )
    const upperBound = Math.max(
      this.midpoint + this.upperMarginDiff,
      this.midpoint * (1 + this.upperMarginPercent)
    )

    // Use the current decided heading to evaluate a change in direction
    switch (this.heading) {
      // If heading is 1, price was rising
      case 1:
        // If it is still increasing, raise the midpoint to match
        if (currentStockPrice > this.midpoint) this.midpoint = currentStockPrice
        // If it has decreased beneath the lower bound, reset the heading
        else if (currentStockPrice < lowerBound) {
          this.midpoint = lowerBound
          this.heading = 0
        }
        break
      // If heading is -1, price was falling
      case -1:
        // If it is still decreasing, lower the midpoint to match
        if (currentStockPrice < this.midpoint) this.midpoint = currentStockPrice
        // If it has increased above the upper bound, reset the heading
        else if (currentStockPrice > upperBound) {
          this.midpoint = upperBound
          this.heading = 0
        }
        break
      // If heading is 0, price was flat
      default:
        // If it is rising above the upper bound, then try to buy stock (was low, now rising)
        if (currentStockPrice > upperBound)
          this.order('buy', currentStockPrice, time)
        // If it is falling below the lower bound, then try to sell stock (was high, now falling)
        else if (currentStockPrice < lowerBound)
          this.order('sell', currentStockPrice, time)
        break
    }
  }

  // Function to make a stock order
  order(type, price, time) {
    switch (type) {
      case 'buy':
        // If ignoring failed purchases then update heading now
        if (!this.ignoreFailedOrder) this.heading = 1

        // Calculate how much money you can spend
        const spendableCash = Math.min(
          this.buyLimit,
          this.buyingPower * (1 - this.buyPer)
        )

        // Can't if you already own stock
        if (this.stockQuantity > 0) return
        // Or don't have enough money to buy a stock (plus the transaction cost)
        if (spendableCash < price + this.buyPenalty) return
        // Or if risk averse and you would be buying for more than the last sell
        if (this.riskAverse && this.lastValue > price) return

        this.lastValue = price
        this.lastDate = time

        // Calculate how many stocks you can buy (not including the transaction cost)
        const stocksBought = Math.floor(spendableCash / price)

        // Update your buying power and stock quantity
        this.buyingPower -= stocksBought * price + this.buyPenalty
        this.stockQuantity = stocksBought

        // Transaction was successful, so update the heading
        this.heading = 1
        break
      case 'sell':
        // If ignoring failed sales then update heading now
        if (!this.ignoreFailedOrder) this.heading = -1

        // Can't if you don't own any stock
        if (this.stockQuantity === 0) return
        // Or if risk averse and you would be selling for less than the last buy
        if (this.riskAverse && this.lastValue < price) return

        this.lastValue = price
        this.lastDate = time

        // Sell all your stock at the current price
        const totalValue = this.stockQuantity * price
        this.buyingPower += totalValue - this.sellPenalty
        this.stockQuantity = 0

        // Transaction was successful, so update the heading
        this.heading = -1
        break
    }
  }

  // Function to possibly mutate this bot's genes
  tryMutate(child = false) {
    // Some variables are bools, which will be toggled
    // Some must be between 0 and 1, others may be from 0 to 1000

    // For numbers, it will pick a random number in this range, but will be more likely to be closer to the old value (normally distributed with that as the normal value)

    // It will do this for every gene

    const sets = {
      Bools: ['riskAverse', 'ignoreFailedOrder'],
      Percs: ['lowerMarginPerc', 'upperMarginPerc', 'buyPerc', 'stockDecay'],
      Nums: ['lowerMarginDiff', 'upperMarginDiff', 'buyLimit', 'stockExpiry'],
    }

    for (let set in sets) {
      for (let gene of sets[set]) {
        if (Math.random() < this.mutationRate * (child ? 2 : 1)) {
          switch (set) {
            case 'Bools':
              this[gene] = !this[gene]
              break
            case 'Percs':
              // The old valu
              this.mutateValue(gene, 1)
              break
            case 'Nums':
              this.mutateValue(gene, 1000)
              break
          }
        }
      }
    }
  }

  // Function to mutate a single value within a gene
  mutateValue(gene, upperBound) {
    let oldValue = this[gene]

    // Generate a normally distributed value around the current value (Box-Muller transform)
    let newValue =
      oldValue +
      10 *
        Math.sqrt(
          -2 * Math.log(Math.random()) * Math.cos(2 * Math.PI * Math.random())
        )

    // Ensure the value stays within the specified range
    this[gene] = Math.min(upperBound, Math.max(0, newValue))
  }

  // Function to get the fitness value
  getFitness() {
    // Use the round and fitnessSum to calculate the average fitness
    return this.fitnessSum / this.round
  }

  // Function to export the genes of the bot
  exportBot() {
    return {
      lowerMarginPerc: this.lowerMarginPerc,
      upperMarginPerc: this.upperMarginPerc,
      buyPerc: this.buyPerc,
      buyLimit: this.buyLimit,
      riskAverse: this.riskAverse,
      stockExpiry: this.stockExpiry,
      stockDecay: this.stockDecay,
      ignoreFailedOrder: this.ignoreFailedOrder,
    }
  }
  // Function to crossover two genes
  static crossover(bot1, bot2) {
    const genes = [
      'lowerMarginPerc',
      'upperMarginPerc',
      'buyPerc',
      'buyLimit',
      'riskAverse',
      'stockExpiry',
      'stockDecay',
      'ignoreFailedOrder',
    ]

    console.log(bot1)

    const config = bot1.config
    bot1 = bot1.exportBot()
    bot2 = bot2.exportBot()

    // Go through each gene, selecting the value from either parent, randomly
    let childGenes = {}
    for (let gene of genes) {
      childGenes[gene] = Math.random() < 0.5 ? bot1[gene] : bot2[gene]
    }

    // Initialize the child
    let child = new Bot(config, childGenes)

    // Try to mutate the child
    child.tryMutate(true)

    return child
  }
}

// Function to start the training process
async function startTraining() {
  // Get the population
  let config = data.config
  let population = Object.values(data.population).map(
    (genes) => new Bot(config, genes)
  )

  // Merge all of the stock data into one array of month-sets
  let stockData = stocks.flatMap((stock) => Object.values(data[stock] || {}))

  sendMessage(`Training started (${config.genLen} x ${config.roundLen})`)

  for (let gen = 0; gen < config.genLen; gen++) {
    // Pick a random (roundLen) of stock data
    let dataCopy = [...stockData]
    let genData = Array(config.roundLen)
      .fill(0)
      .flatMap(() =>
        dataCopy.splice(Math.floor(Math.random() * dataCopy.length), 1)
      )

    for (let round = 0; round < config.roundLen; round++) {
      // Pick a random set from the training data, removing it from the old array
      let randomIndex = Math.floor(Math.random() * genData.length)
      let currentSet = genData[randomIndex]
      genData.splice(randomIndex, 1)

      // Go through each entry in the set, running each bot on the values provided
      Object.entries(currentSet).forEach(([date, value]) => {
        population.forEach((bot) => bot.makeDecision(value, date))
      })

      const lastPrice = Object.values(currentSet).pop()

      // Finish the round
      population.forEach((bot) => bot.roundEnd(lastPrice))
    }

    // Sort the population by fitness
    population.sort((a, b) => b.getFitness() - a.getFitness())

    let target = population.length

    // Remove the bottom fifth
    let newPopulation = population.slice(0, Math.floor(population.length * 0.8))
    let newChildren = []

    // Replace that same number with descendants of random pairs of survivors (preferring the more fit)
    while (newPopulation.length + newChildren.length < target) {
      // Use a roulette algorithm to select two different members of the population to mate
      let parents = roulette(newPopulation)

      console.log(parents)

      // Crossover and mutate the child
      let child = Bot.crossover(...parents)
      newChildren.push(child)
    }

    // Log the best, worst, and average fitness scores
    const best = population.at(0).getFitness()
    const worst = population.at(-1).getFitness()
    const average =
      population.reduce((sum, bot) => sum + bot.getFitness(), 0) /
      population.length
    sendMessage(
      `Generation ${
        gen + 1
      }:\n    Best: ${best}\n    Worst: ${worst}\n    Average: ${average}`
    )

    // Replace the old population with the new population and the new children
    population = [...newPopulation, ...newChildren]
  }

  // Save the final population to the data object
  data.population = population.reduce(
    (obj, bot, i) => ({ ...obj, [i]: bot.exportBot() }),
    {}
  )
  setData(data)
}

function roulette(population) {
  population = [...population]
  return Array(2)
    .fill(0)
    .map(() => {
      let sliceEnds = []
      let fitnessSum = population.reduce((sum, bot) => {
        sliceEnds.push(sum + bot.getFitness())
        return sum + bot.getFitness()
      }, 0)

      // Generate a random value between 0 and the fitness sum
      let randomValue = Math.random() * fitnessSum
      // Find the index of the first slice end that is greater than or equal to the random value
      let selectedIndex = sliceEnds.findIndex((end) => randomValue >= end)

      // Return the two selected parents
      return population.splice(selectedIndex, 1)[0]
    })
}
