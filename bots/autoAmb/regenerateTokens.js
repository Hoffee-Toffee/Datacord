import { google } from 'googleapis'
import { readFileSync, writeFileSync } from 'fs'
import { createInterface } from 'readline'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Define __dirname for ES module scope
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(join(__filename, '..'))

// Load client secrets from a local file.
const credentialsPath = join(__dirname, './autoAmb/credentials.json')
const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'))

const { client_secret, client_id, redirect_uris } =
  credentials.installed || credentials.web
const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0] // Ensure this matches the authorized redirect URI
)

// Load token from a local file.
const tokenPath = join(__dirname, 'token.json')
let token
try {
  token = JSON.parse(readFileSync(tokenPath, 'utf8'))
  oauth2Client.setCredentials(token)
} catch (err) {
  console.error('Error loading token:', err)
}

// Function to get a new token
async function getNewToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
    response_type: 'code',
  })

  console.log('Authorize this app by visiting this url:', authUrl)

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  rl.question('Enter the code from that page here: ', (code) => {
    rl.close()
    oauth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err)
      oauth2Client.setCredentials(token)
      writeFileSync(tokenPath, JSON.stringify(token))
      console.log('Token stored to', tokenPath)
    })
  })
}

// Function to list live broadcasts
async function listLiveBroadcasts() {
  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  })

  try {
    const response = await youtube.liveBroadcasts.list({
      part: ['id', 'snippet'],
      mine: true,
    })

    console.log('Live Broadcasts:')
    response.data.items.forEach((item) => {
      console.log(`Broadcast ID: ${item.id}, Title: ${item.snippet.title}`)
    })
  } catch (err) {
    console.error('Error listing live broadcasts:', err)
  }
}

// Function to list live streams
async function listLiveStreams() {
  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  })

  try {
    const response = await youtube.liveStreams.list({
      part: ['id', 'snippet'],
      mine: true,
    })

    console.log('Live Streams:')
    response.data.items.forEach((item) => {
      console.log(`Stream ID: ${item.id}, Title: ${item.snippet.title}`)
    })
  } catch (err) {
    console.error('Error listing live streams:', err)
  }
}

// Main function to handle the flow
async function main() {
  if (!token) {
    await getNewToken()
  } else {
    await listLiveBroadcasts()
    await listLiveStreams()
  }
}

// Run the main function
main()
