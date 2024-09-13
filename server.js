import dotenv from 'dotenv'

let side = process.env.YT_STREAM_KEY === undefined ? 'render' : 'glitch'

if (side === 'render') dotenv.config()

let streaming = false
let render = 'https://tristan-bulmer.onrender.com/projects/datacord'
let glitch = 'https://autoamb.glitch.me'

import path from 'path'
import { fileURLToPath } from 'url'
import Discord from 'discord.js'
import autoAmb from './bots/autoAmb.js'

// define __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
var gifSent = false
var gifQueries = [
  {
    query: 'dua lipa',
    weight: 3, // 3
  },
  {
    query: 'jess bush star trek nurse christine chapel',
    weight: 5, // 2
  },
  {
    query: 'death on the nile emma mackey jacqueline de bellefort',
    weight: 7, // 2
  },
  {
    query: 'sylvie sophia di martino',
    weight: 9, // 2
  },
  {
    query: 'gal gadot',
    weight: 11, // 2
  },
  {
    query: 'ava max',
    weight: 13, // 2
  },
  {
    query: 'emma mackey',
    weight: 14, // 1
  },
  {
    query: 'shin hati',
    weight: 17, // 3
  },
]

import { readFileSync, writeFileSync } from 'fs'
import express, { static as _static, urlencoded, json as _json } from 'express'
const app = express()
import fetch from 'node-fetch'
import {
  collection,
  datacord,
  getDocs,
  doc as _doc,
  setDoc,
} from './firebase.js'
import sneezeHook from './sneezeHook.js'
import requestPkg from 'request'
const { post } = requestPkg
import { join } from 'path'

var gifLoop = setInterval(checkGIF, 40000) // Every 40 seconds, check if a gif should be sent

// Only start the bots after the first check is done
checkGIF()

// const discordBotkit = require('botkit-discord')
import './bot.js'

function sendMessage(message, hookname) {
  console.log('Sending message "' + message + '" to ' + hookname + ' webhook')
  if (message == null || message.lenght < 1) {
    return
  }

  if (hookname == 'MEDIA') {
    var id = process.env.MEDIA_ID
    var token = process.env.MEDIA_TOKEN
  } else if (hookname == 'GIF') {
    var id = process.env.GIF_ID
    var token = process.env.GIF_TOKEN
  } else if (hookname == 'TEST') {
    var id = process.env.TEST_ID
    var token = process.env.TEST_TOKEN
  } else if (hookname == 'TRISBOT') {
    var id = process.env.TBOT_ID
    var token = process.env.TBOT_TOKEN
  }

  const webhook = new Discord.WebhookClient({
    id: id,
    token: token,
  })

  webhook.send(message).catch((err) => {
    console.log(err)
  })
}

app.use(urlencoded({ extended: true }))
app.use(_json())
app.use(express.raw({ type: 'audio/aac', limit: '50mb' }))

app.get('/wakeup', function (request, response) {
  response.send('Wakeup successful.')
  console.log(`Pinged at ${new Date()}`)
})
app.get('/notify', function (request, response) {
  // Send a message to the req
  var message = request.query.message
  var hook = request.query.hook
  sendMessage(message, hook)
  response.send('Message sent')
})
app.get('/local', function (request, response) {
  response.send(readFileSync(join(__dirname, 'local.json')))
})
app.get('/update', async function (request, response) {
  var field = request.query.field

  var fetchedData = JSON.parse(readFileSync(join(__dirname, 'local.json')))

  const docRef = collection(datacord, 'data')
  const docSnap = await getDocs(docRef)
  const doc = docSnap.docs.find((doc) => doc.id == field)
  const final = JSON.parse(doc.data().data)
  fetchedData[field] = final
  writeFileSync(join(__dirname, 'local.json'), JSON.stringify(fetchedData))
  response.send(`Updated '${field}'`)
})
app.get('/vote', function (request, response) {
  var title = request.query.title
  var description = request.query.description
  var color = request.query.color
  var id = request.query.id

  // Get 12 hours from now
  var date = new Date()
  date.setHours(date.getHours() + 12)

  var embed = {
    content: `New proposal \"${title}\"`,
    tts: false,
    components: [
      {
        type: 1,
        components: [
          {
            style: 3,
            label: `Accept`,
            custom_id: `accept`,
            disabled: false,
            type: 2,
          },
          {
            style: 4,
            label: `Reject`,
            custom_id: `review`,
            disabled: false,
            type: 2,
          },
        ],
      },
    ],
    embeds: [
      {
        type: 'rich',
        title: title,
        description: description,
        color: parseInt(color),
        timestamp: date.toISOString(),
        footer: {
          text: `Voting close`,
        },
        url: `https://transit-lumber.github.io/supedb/map.html?id=${id}`,
      },
    ],
  }

  sendMessage(embed, 'TEST')
  response.send('Message sent')
})
app.post('/test', function (req, res) {
  console.log(req.body)
  res.sendStatus(200)
})
app.get('/relay', async (req, res) => {
  // Take url, relay it's response in response
  const url = req.query.url
  const response = await fetch(decodeURIComponent(url))
  const data = await response.json()
  res.json(data)
})
app.get('/startStream', async (req, res) => {
  // Start the stream
  autoAmb.start()
  res.send('Stream started')
})
app.get('/stopStream', async (req, res) => {
  // Stop the stream
  autoAmb.stop()
  res.send('Stream stopped')
})
app.post('/chunk', async (req, res) => {
  // Save the chunk
  const chunk = req.query.chunk // The chunk number
  const data = req.body

  console.log(`Saving chunk ${chunk}`)
  console.log(data)

  // Save the buffer as an mp3 file (buffer, audio/aac)
  writeFileSync(join(__dirname, `chunk${chunk}.mp3`), data)

  // If not streaming, and this was chunk 1, start the stream
  if (!streaming && chunk == 1) {
    streaming = true
    console.log('Ready to stream')
    autoAmb.stream()
  }

  res.send('Chunk saved')
})
app.get('/chunk/:chunk', async (req, res) => {
  // Return the saved chunk file
  const chunk = req.params.chunk
  const filename = join(__dirname, `chunk${chunk}.mp3`)
  res.sendFile(filename)
})

// Check hooks every 1000 ms
setInterval(async () => {
  const hooks = await getData('hooks')

  // Filter out all that have expired
  const expired = hooks.filter((hook) => hook.expires <= new Date().getTime())

  expired.forEach((hook) => {
    try {
      const options = {
        url: hook.webhookUrl,
        method: 'POST',
        json: true,
        body: { expired: true },
      }

      post(options)
    } catch (error) {}
  })

  // Update hooks
  if (expired.length) {
    const active = hooks.filter((hook) => hook.expires > new Date().getTime())
    setData('hooks', active)
  }
}, 1000)

app.use('/api/v1/', sneezeHook)

function getGif() {
  // Check if time for Sunday GIF
  var currenttime = new Date()

  if (currenttime.getDay() == 7 && currenttime.getHours() == 0) {
    // Send a special gif
    sendMessage(
      [
        'https://tenor.com/view/sylvie-sunday-marvel-loki-gif-22319892',
        'https://tenor.com/view/it%27s-shin-sunday-it%27s-shin-shin-sunday-star-wars-shin-hati-star-wars-shin-sunday-gif-17221787885420664774',
      ][Math.floor(Math.random() * 2)],
      'GIF'
    )
    return
  }

  // Get a random number between 0 and the weight of the last gif
  var random = Math.floor(
    Math.random() * gifQueries[gifQueries.length - 1].weight
  )

  // Get a random query from the array based on the random number
  var query = gifQueries.find((x) => random <= x.weight - 1).query

  // Use fetch and the Giphy API to get a random gif
  var url =
    'https://tenor.googleapis.com/v2/search?q=' +
    query +
    '&key=' +
    process.env.TENOR_KEY +
    '&client_key=gif_bot&limit=10&random=true'
  var response = fetch(url, async function (error, meta, body) {
    var data = JSON.parse(body.toString())
    // Retrieve the first non-blacklisted GIF
    var blacklist = await getData('blacklist')

    var gif = data.results.find((result) => !blacklist.includes(result.itemurl))

    if (gif) sendMessage(gif.itemurl, 'GIF')
  })
}

function checkGIF() {
  var currenttime = new Date()

  console.log(
    'Checking for gif, current time is ' +
      currenttime.getHours() +
      ':' +
      currenttime.getMinutes()
  )

  // Send a gif every 2 hours from 8am till 2am
  if (
    ![3, 4, 5, 6, 7].includes(currenttime.getHours()) &&
    currenttime.getMinutes() == 0 &&
    !gifSent
  ) {
    console.log('Time matches, sending gif')
    getGif()
    gifSent = true
  }
  // Reset the gifSent variable when a gif hasn't been sent
  else {
    gifSent = false
  }
}

async function getData(field) {
  // Get the data from local.json or from firebase if it's not there (and save it to local.json)
  var fetchedData = JSON.parse(readFileSync(join(__dirname, 'local.json')))
  if (fetchedData[field] == null) {
    const docRef = collection(datacord, 'data')
    const docSnap = await getDocs(docRef)
    const doc = docSnap.docs.find((doc) => doc.id == field)
    const final = JSON.parse(doc.data().data)
    fetchedData[field] = final
    writeFileSync(join(__dirname, 'local.json'), JSON.stringify(fetchedData))
    return final
  } else {
    return fetchedData[field]
  }
}

function setData(field, data) {
  // Update the firebase data and local.json
  const docRef = collection(datacord, 'data')
  const docSnap = _doc(docRef, field)
  setDoc(docSnap, { data: JSON.stringify(data) })
  var fetchedData = JSON.parse(readFileSync(join(__dirname, 'local.json')))
  fetchedData[field] = data
  writeFileSync(join(__dirname, 'local.json'), JSON.stringify(fetchedData))
}

export default app
