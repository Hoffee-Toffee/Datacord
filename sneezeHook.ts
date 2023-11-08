const express = require('express')
const router = express.Router()
const fs = require('fs')
const firebase = require('./firebase.js')

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
// Define a route to serve initial data and register webhooks
router.post('/webhook', async (req, res) => {
  const payload = req.body

  // Error checks
  // Expiry is integer between 60,000 and 86,400,000
  if (payload.expiry < 60000 || payload.expiry > 86400000) {
    res
      .status(400)
      .send(
        "Invalid payload.\n - Expected 'expiry' to be an Integer value between 60,000 (One Minute) and 86,400,000 (24 Hours)."
      )
    return
  }

  // Convert
  let expires = new Date()
  expires.setMilliseconds(expires.getMilliseconds() + payload.expiry)

  // Register the webhook and store the connection details
  const webhook = {
    id: `${new Date().getTime()}${Math.floor(Math.random() * 90000) + 10000}`,
    expires,
    webhookUrl: payload.webhookUrl,
    /* Store the connection details here */
  }

  // Get current webhooks
  let hooks = await getData('hooks')

  console.log(hooks)

  // Add to hooks
  hooks.push(webhook)

  // Update hooks
  setData('hooks', hooks)

  // Respond to the webhook with the initial data and a success status
  const initialData = await getData('sneezeData')
  res.json({ initialData, webhookId: webhook.id })
})

// Simple get for simply sending the current data (no hook)
// Define a route to serve initial data and register webhooks
router.get('/data', async (req, res) => {
  const currentData = await getData('sneezeData')
  res.json(currentData)
})

function setData(field, data) {
  // Update the firebase data and local.json
  const docRef = firebase.collection(firebase.datacord, 'data')
  const docSnap = firebase.doc(docRef, field)
  firebase.setDoc(docSnap, { data: JSON.stringify(data) })
  var fetchedData = JSON.parse(fs.readFileSync('./local.json'))
  fetchedData[field] = data
  fs.writeFileSync('./local.json', JSON.stringify(fetchedData))
}

module.exports = router