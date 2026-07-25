import dotenv from 'dotenv'
dotenv.config()

import path from 'path'
import { fileURLToPath } from 'url'
import Discord from 'discord.js'
import { readFileSync, writeFileSync } from 'fs'
import express, { urlencoded, json as _json } from 'express'
import {
  collection,
  datacord,
  getDocs,
  doc as _doc,
  setDoc,
} from './firebase.js'
import { join } from 'path'

// define __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Only start the bots after the first check is done
import './bot.js'

function sendMessage(message, hookname) {
  console.log('Sending message "' + message + '" to ' + hookname + ' webhook')
  if (message == null || message.length < 1) {
    return
  }

  let id, token
  if (hookname == 'MEDIA') {
    id = process.env.MEDIA_ID
    token = process.env.MEDIA_TOKEN
  } else if (hookname == 'GIF') {
    id = process.env.GIF_ID
    token = process.env.GIF_TOKEN
  } else if (hookname == 'TEST') {
    id = process.env.TEST_ID
    token = process.env.TEST_TOKEN
  } else if (hookname == 'TRISBOT') {
    id = process.env.TBOT_ID
    token = process.env.TBOT_TOKEN
  } else {
    console.log(`Unknown webhook: ${hookname}`)
    return
  }

  const webhook = new Discord.WebhookClient({ id, token })

  webhook.send(message).catch((err) => {
    console.log(err)
  })
}

app.use(urlencoded({ extended: true }))
app.use(_json())

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

app.post('/test', function (req, res) {
  console.log(req.body)
  res.sendStatus(200)
})

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

const port = process.env.PORT || 3000
const listener = app.listen(port, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

export default app
