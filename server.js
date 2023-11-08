require('dotenv').config()

const build = 'e0cb303a190e289e4f8960163b8c66fc'

const fs = require('fs')
const express = require('express')
const discordBotkit = require('botkit-discord')
const app = express()
const fetchUrl = require('fetch').fetchUrl
const firebase = require('./firebase.js')
const sneezeHook = require('./sneezeHook.ts')
const request = require('request');

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
  response.send(fs.readFileSync('./local.json'))
})
app.get('/update', async function (request, response) {
  var field = request.query.field

  var fetchedData = JSON.parse(fs.readFileSync('./local.json'))

  const docRef = firebase.collection(firebase.datacord, 'data')
  const docSnap = await firebase.getDocs(docRef)
  const doc = docSnap.docs.find((doc) => doc.id == field)
  const final = JSON.parse(doc.data().data)
  fetchedData[field] = final
  fs.writeFileSync('./local.json', JSON.stringify(fetchedData))
  response.send(`Updated '${field}`)
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

app.post('/test', async (req, res) => {
  console.log(req.body)
  res.sendStatus(200)
})

// Check hooks every 1000 ms
setInterval(async () => {
  const hooks = await getData('hooks')

  // Filter out all that have expired
  const expired = hooks.filter(hook => new Date(hook.expires) <= new Date())

  expired.forEach(hook => {
    try {
      const options = {
        url: hook.webhookUrl,
        method: 'POST',
        json: true,
        body: { expired: true }
      };

      request.post(options)
    }
    catch (error) {

    }
  })

  // Update hooks
  if (expired.length) {
    const active = hooks.filter(hook => new Date(hook.expires) > new Date())
    setData('hooks', active)
  }
})

app.use('/api/v1/', sneezeHook)

const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port)
})

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
  var response = fetchUrl(url, async function (error, meta, body) {
    var data = JSON.parse(body.toString())
    // Retrieve the first non-blacklisted GIF
    var blacklist = await getData('blacklist')

    var gif = data.results.find((result) => !blacklist.includes(result.itemurl))

    if (gif) sendMessage(gif.itemurl, 'GIF')
  })
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
