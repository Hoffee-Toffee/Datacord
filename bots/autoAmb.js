// AutoAmb: 24/7 Perpetual Dead Space Ambience (YouTube Live Stream Bot)

/* Description:
    This is the only non-Discord bot, it is a YouTube Live Stream bot that generate perpetual Dead Space ambience using the sounds from the games.

    YT Title: 🔴 Dead Space Ambience | 24/7 Perpetual Soundscape

    YT Description: --start--
      24/7 Perpetual Dead Space Ambience, generated using sounds from the Dead Space games.
      
      This stream is generated using a custom algorithm that mixes ambient sounds, music, and sound effects from the Dead Space games.
      The algorithm is designed after the Dead Space games' sound design, after analyzing the sound files from the games, and the atmospheres produced by them in-game.

      --end--
    Includes sounds from:
      - Dead Space (2008)
      - Dead Space: Downfall (2008) - Planned
      - Dead Space: Extraction (2009) - Planned
      - Dead Space: Ignition (2010) - Planned
      - Dead Space (mobile) (2011) - Planned
      - Dead Space: Aftermath (2011) - Planned
      - Dead Space 2 (2011)
      - Dead Space 2: Severed (2011) - Planned
      - Dead Space 3 (2013) - Planned
      - Dead Space 3: Awakened (2013) - Planned
      - Dead Space (2023)
      - Dead Space: Deep Cover (2024) - Planned

    Each sound has varying settings, used by the algorithm:
      - Location: A mixture of panning, volume, and reverb / echo effects to simulate the sound coming from a specific location.
      - Class: The sound basic sound class, such as:
        - amb: General ambience
        - vac: Vacuum ambience
        - nec: Necromorph sounds
        - mus: Musical ambience
        - uix: UI sounds
        - npc: NPC vocalizations
        - env: Environmental sounds
        - wep: Weapon sounds
        - isa: Isaac's breathing
      - Tags: Additional tags that can be used to filter sounds, such as:
        - Water
        - Electricity
        - Machinery
        - Necromorph
        - ...

    There are layers for each class, these are defined by sounds we don't want to overlap


*/

import { google } from 'googleapis'
import {
  readFileSync,
  writeFileSync,
  createReadStream,
  createWriteStream,
} from 'fs'
import { createInterface } from 'readline'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { PassThrough } from 'stream'

let streamProcess = null

// Set the path to the ffmpeg binary provided by @ffmpeg-installer/ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

// Define __dirname for ES module scope
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Create credentials from environment variables
const credentials = {
  web: {
    client_id: process.env.YT_CLIENT_ID,
    project_id: 'dead-space-ambience',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_secret: process.env.YT_CLIENT_SECRET,
    redirect_uris: [
      'https://tristan-bulmer.onrender.com',
      'http://localhost:8080',
    ],
    javascript_origins: [
      'https://tristan-bulmer.onrender.com',
      'http://localhost:8080',
    ],
  },
}

const token = {
  access_token: process.env.YT_ACCESS_TOKEN,
  refresh_token: process.env.YT_REFRESH_TOKEN,
  scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
  token_type: 'Bearer',
  expiry_date: process.env.YT_EXPIRY_DATE,
}

const { client_secret, client_id, redirect_uris } = credentials.web
const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
)

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
      console.log('Token retrieved:', token)
    })
  })
}

// Main function to handle the flow
export default async function autoAmb() {
  if (!token) {
    await getNewToken()
  } else {
    await startStream()
  }
}

// Run the main function
const bgImage = __dirname + '/autoAmb/bg.jpg'
const demoSounds = [
  __dirname + '/autoAmb/demo-1.mp3',
  __dirname + '/autoAmb/demo-2.mp3',
  __dirname + '/autoAmb/demo-3.mp3',
  __dirname + '/autoAmb/demo-4.mp3',
]

config()

// Start the stream (unlisted, for testing)
async function startStream(retryCount = 0) {
  // const youtube = google.youtube({
  //   version: 'v3',
  //   auth: oauth2Client,
  // })

  // const now = new Date()
  // const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour later

  try {
    /*
    const broadcast = await youtube.liveBroadcasts.insert({
      part: ['snippet', 'status', 'contentDetails'],
      requestBody: {
        snippet: {
          title: '🔴 Dead Space Ambience | 24/7 Perpetual Soundscape',
          description:
            "24/7 Perpetual Dead Space Ambience, generated using sounds from the Dead Space games.\n\nThis stream is generated using a custom algorithm that mixes ambient sounds, music, and sound effects from the Dead Space games.\nThe algorithm is designed after the Dead Space games' sound design, after analyzing the sound files from the games, and the atmospheres produced by them in-game.",
          scheduledStartTime: now.toISOString(),
          scheduledEndTime: oneHourLater.toISOString(),
        },
        status: {
          privacyStatus: 'unlisted',
        },
        contentDetails: {
          monitorStream: {
            enableMonitorStream: false,
          },
        },
      },
    })

    const stream = await youtube.liveStreams.insert({
      part: ['snippet', 'cdn'],
      requestBody: {
        snippet: {
          title: 'Dead Space Ambience Stream',
        },
        cdn: {
          format: '1080p',
          ingestionType: 'rtmp',
          resolution: 'variable',
          frameRate: 'variable',
        },
      },
    })

    // Bind the stream to the broadcast
    youtube.liveBroadcasts.bind({
      part: ['id', 'snippet'],
      id: broadcast.data.id,
      streamId: stream.data.id,
    })
    */

    // Get the stream URL

    // const streamURL =
    //   stream.data.cdn.ingestionInfo.ingestionAddress +
    //   '/' +
    //   stream.data.cdn.ingestionInfo.streamName

    let streamURL = 'rtmp://x.rtmp.youtube.com/live2/'
    let streamKey = process.env.YT_STREAM_KEY

    // Use the demo sound (pick a random one to play, 2 seconds after it finishes, play another one)
    const audioStream = new PassThrough()
    let i = 0
    const playSound = () => {
      const soundStream = createReadStream(demoSounds[i])
      soundStream.pipe(audioStream, { end: false })
      soundStream.on('end', () => {
        i = (i + 1) % demoSounds.length
        setTimeout(playSound, 2000)
      })
    }
    playSound()

    // Combine together for stream
    streamProcess = ffmpeg()
      .addInput(bgImage)
      .inputFormat('image2')
      .inputFPS(1)
      .inputOptions(['-stream_loop -1', '-re'])
      .addInput(audioStream)
      .inputFormat('mp3')
      .inputOptions(['-re'])
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-f flv',
        '-g 8',
        '-b:v 13500k',
        '-maxrate 13500k',
        '-bufsize 27000k',
        '-b:a 128k',
      ])
      .output(streamURL + streamKey)
      .on('start', () => {
        console.log('Stream started')
      })
      .on('end', () => {
        console.log('Stream ended')
      })
      .on('error', (err) => {
        console.error('Error during stream:', err)
      })
      .run()

    // End the stream after 10 minutes (for testing purposes)
    setTimeout(() => {
      streamProcess.kill('SIGINT')
      console.log('Stream timed out')
    }, 600000)
  } catch (err) {
    if (
      err.code === 403 &&
      err.errors &&
      err.errors[0].reason === 'userRequestsExceedRateLimit'
    ) {
      // Exponential backoff with a max delay of 1 hour
      const delay = Math.min(2 ** retryCount * 1000, 3600000)
      console.log(`Rate limit exceeded. Retrying in ${delay / 1000} seconds...`)
      setTimeout(() => startStream(retryCount + 1), delay)
    } else {
      console.error('Error starting stream:', err)
    }
  }
}
