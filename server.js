require('dotenv').config()

const build = 'a2508ebc3ea44f7345c28e6f50659beb'

if (process.env.BUILD != build) {
  // Stop the server
  process.exit(0)
}

var timezoneoffset = 12 * 1000 * 3600

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
]

const fs = require('fs')
const express = require('express')
const discordBotkit = require('botkit-discord')
const app = express()
const fetchUrl = require('fetch').fetchUrl
const firebase = require('./firebase.js')

var gifLoop = setInterval(checkGIF, 40000) // Every 40 seconds, check if a gif should be sent

// Only start the bots after the first check is done
checkGIF()

const discordBot = require('./bot')

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

  const Discord = require('discord.js')
  const webhook = new Discord.WebhookClient({
    id: id,
    token: token,
  })

  webhook.send(message).catch((err) => {
    console.log(err)
  })
}

app.use(express.static('public'))
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

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port)
})

function getGif() {
  // Check if time for Sunday GIF
  var currenttime = new Date()

  if (currenttime.getDay() == 6 && currenttime.getHours() == 12) {
    // Send a special gif
    sendMessage(
      'https://tenor.com/view/sylvie-sunday-marvel-loki-gif-22319892',
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
  var response = fetchUrl(url, async function (error, meta, body) {
    var data = JSON.parse(body.toString())
    // Retrieve the first non-blacklisted GIF
    var blacklist = await getData('blacklist')

    var gif = data.results.find((result) => !blacklist.includes(result.itemurl))

    if (gif) sendMessage(gif.itemurl, 'GIF')
  })
}

function checkGIF() {
  var currenttime = new Date()
  currenttime.setTime(currenttime.getTime() + timezoneoffset)

  console.log(
    'Checking for gif, current time is ' +
      currenttime.getHours() +
      ':' +
      currenttime.getMinutes()
  )

  // Send a gif every 2 hours from 8am till 2am
  if (
    [8, 10, 12, 14, 16, 18, 20, 22, 0, 2].includes(currenttime.getHours()) &&
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

  // If out of date version, kill this instance
  if (process.env.BUILD != build) {
    process.exit(0)
  }
}

async function getData(field) {
  // Get the data from local.json or from firebase if it's not there (and save it to local.json)
  var fetchedData = JSON.parse(fs.readFileSync('./local.json'))
  if (fetchedData[field] == null) {
    const docRef = firebase.collection(firebase.datacord, 'data')
    const docSnap = await firebase.getDocs(docRef)
    const doc = docSnap.docs.find((doc) => doc.id == field)
    const final = JSON.parse(doc.data().data)
    fetchedData[field] = final
    fs.writeFileSync('./local.json', JSON.stringify(fetchedData))
    return final
  } else {
    return fetchedData[field]
  }
}

function setData(field, data) {
  // Update the firebase data and local.json
  const docRef = firebase.collection(firebase.datacord, 'data')
  const docSnap = firebase.doc(docRef, field)
  firebase.setDoc(docSnap, { data: JSON.stringify(data) })
  var fetchedData = JSON.parse(fs.readFileSync('./local.json'))
  fetchedData[field] = data
  fs.writeFileSync('./local.json', JSON.stringify(fetchedData))
}
