import ffmpeg from 'fluent-ffmpeg'
import { PassThrough, Readable } from 'stream'
import fetch from 'node-fetch'
import concat from 'concat-stream'
import {
  readdir,
  unlink,
  createReadStream,
  readFileSync,
  writeFileSync,
  writeFile,
} from 'fs'
// import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import getMP3Duration from 'get-mp3-duration'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

import { config } from 'dotenv'

// define __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
let testLogPath = join(__dirname, 'testLog.txt')
let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

let side = process.env.YT_STREAM_KEY === undefined ? 'render' : 'glitch'

let render = 'https://tristan-bulmer.onrender.com/projects/datacord'
let glitch = 'https://autoamb.glitch.me'

// Render: (use dotenv)
//  - Send start request to glitch
//  - Listen for chunks from glitch
//  - Stream chunks to YouTube
//  - Send stop request to glitch
//  - Stop listening and streaming

// Glitch: (install ffmpeg)
//  - Listen for start request
//  - Process chunks
//  - Send chunks to render
//  - Listen for stop request
//  - Stop processing and sending

if (side === 'render') {
  config()
} else {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path)
  console.log(ffmpegInstaller.version)
}

// GLITCH SIDE: Generator
let segNum = 3 // Number of segments to keep in memory
let minSegs = 2 // Start streaming when there are at least this many segments in memory
let segLen = 120 // Length of each segment in seconds
let segOverlap = 5 // Overlap between segments in seconds

// Convert JSONC to JSON
let { AMB, BG, MUS } = JSON.parse(
  readFileSync(__dirname + '/files.jsonc', 'utf8').replace(/\/\/.*/g, '')
)

let files = [...AMB, ...MUS]

let fileHost = 'https://od.lk/s/'

let timeline = []
let processes = []
let testing = false

const weights = Array.from({ length: 30 }, () => Math.floor(Math.random() * 10)) // Random initial weights

const makeTemp = async (tempSeg = minSegs * -1) => {
  if (tempSeg === -1 * minSegs) {
    // Reset the test log
    writeFileSync(testLogPath, `${new Date().toLocaleString()}: Test Log\n\n`)
    log('Deleting temp files...')
    // Get all temp files './temp*.mp3' and delete them
    readdir(__dirname, (err, files) => {
      if (err) {
        console.error('Error reading directory:', err)
        return
      } else {
        files.forEach((file) => {
          if (file.startsWith('temp') && file.endsWith('.mp3')) {
            unlink(__dirname + '/' + file, (err) => {
              if (err) {
                console.error('Error deleting file:', err)
              } else {
                log(`Deleted file: ${file}`)
              }
            })
          }
        })
      }
    })
  }

  // Delete the test log if not testing
  if (!testing)
    unlink(testLogPath, (err) => {
      if (err) {
        console.error('Error deleting test log:', err)
      } else {
        log('Deleted test log')
      }
    })

  let oldVal = tempSeg

  tempSeg = (tempSeg + minSegs) % segNum

  log('Populating timeline...')

  let target = segLen * 1000

  // Add sounds until the timeline is at least target segments long
  while (
    timeline.length === 0 ||
    timeline[timeline.length - 1].end < target * segNum
  ) {
    await addSound()
  }

  // log('Timeline populated')
  log(`Building file: ${tempSeg}`)

  let overlap = timeline.find(
    (sound) => sound.end - segOverlap * 1000 <= target && sound.end >= target
  )

  log(`Target Split Time: ${target}`)

  if (overlap) {
    log(`Overlap found at ${overlap.end}`, false)
    // Compare the end - half an overlap time to the segment length
    if (overlap.end - segOverlap * 1000 <= target) {
      target = overlap.end
    } else {
      target = overlap.end - segOverlap * 1000
    }
    log(`Adjusted Split Time to ${target}`)
  } else {
    log('No overlap, splitting on target')
  }

  let tempHalf = []

  log('Timeline:', false)

  timeline.forEach((sound, index) => {
    log(` - ${index}: ${JSON.stringify({ ...sound, sound: 'Buffer' })}`, false)

    // Finishes on or before
    if (sound.end <= target) {
      tempHalf.push(sound)
      timeline[index] = null
      log('   \\-> Moved', false)
    }
    // Starts before or on, ends after
    else if (sound.start <= target && sound.end > target) {
      tempHalf.push({
        ...sound,
        end: target,
        fadeOut: false,
      })
      timeline[index] = {
        ...sound,
        start: 0,
        offset: target - sound.start + sound.offset,
        end: sound.end - target,
        fadeIn: false,
      }
      log('   \\-> Split', false)
    }
    // Starts and ends after
    else {
      timeline[index] = {
        ...sound,
        start: sound.start - target,
        end: sound.end - target,
      }
      log('   \\-> Slid', false)
    }
  })

  timeline = timeline.filter(Boolean)

  log('Timeline After:', false)
  timeline.forEach((sound, index) => {
    log(` - ${index}: ${JSON.stringify({ ...sound, sound: 'Buffer' })}`, false)
  })

  log('Temp Half:', false)
  tempHalf.forEach((sound, index) => {
    log(` - ${index}: ${JSON.stringify({ ...sound, sound: 'Buffer' })}`, false)
  })

  const tempFile = __dirname + `/temp${tempSeg}.mp3`
  const tempA = __dirname + `/temp${tempSeg}A.mp3`
  const tempB = __dirname + `/temp${tempSeg}B.mp3`

  // Must wait for each sound before to finish before starting the next
  for (let i = 0; i < tempHalf.length; i++) {
    const sound = tempHalf[i]
    await new Promise(async (resolve, reject) => {
      let outputFile = testing
        ? `${__dirname}/temp${tempSeg}${alphabet[Math.max(0.5, i) * 2 - 1]}.mp3`
        : tempHalf.length % 2 === 1 && i === 0
        ? tempFile
        : tempHalf.length % 2 === 0 && i === 1
        ? tempB
        : tempA

      // Process sound
      await processSound(sound, outputFile)
      // Merge with previous sound (if any)
      if (i > 0) {
        let mergeFile = testing
          ? `${__dirname}/temp${tempSeg}${alphabet[(i - 1) * 2]}.mp3`
          : tempHalf.length % 2 === 0 && i == 1
          ? tempA
          : tempHalf.length % 2 === i % 2
          ? tempFile
          : tempB

        let mergeOutput = testing
          ? `${__dirname}/temp${tempSeg}${alphabet[i * 2]}.mp3`
          : tempHalf.length % 2 === i % 2
          ? tempB
          : tempFile
        await mergeSounds(outputFile, mergeFile, mergeOutput)
      }
      resolve()
    })
  }

  // Tell render that the chunk is ready (unless testing)
  if (!testing) fetch(`${render}/chunkReady/${tempSeg}`)

  // If still negative, then we are still loading the initial segments
  if (oldVal < 0) {
    // Pass one greater than the initial value given to makeTemp
    makeTemp(oldVal + 1)
  }

  log('File built')

  return
}

const addSound = async () => {
  const totalWeight = weights.reduce((acc, weight) => acc + weight, 0)

  let random = Math.floor(Math.random() * totalWeight)

  let nextIndex = weights.findIndex((weight) => {
    random -= weight
    return random <= 0
  })

  weights[nextIndex]++

  // Get a readable stream of the sound file
  let song = fileHost + files[nextIndex]
  song = await new Promise((resolve, reject) => {
    fetch(song)
      .then((res) => {
        if (res.ok) {
          log(`Fetched one-time access URL: ${res.url}`)
          fetch(res.url)
            .then((res) => {
              if (res.ok) {
                // log('Fetched sound file:', res)
                // create buffer from the PassThrough stream given in the response body
                let stream = new PassThrough()
                res.body.pipe(stream)
                stream.pipe(concat((buffer) => resolve(buffer)))
              } else {
                reject(new Error('Failed to fetch sound file', res))
              }
            })
            .catch(reject)
        } else {
          reject(new Error('Failed to fetch one-time access URL', res))
        }
      })
      .catch(reject)
  })

  // Get the duration of the song (in milliseconds)
  let duration = getMP3Duration(song)

  // Convert the song from a buffer to a readable stream
  // let songStream = new Readable()
  // songStream.push(song)
  // songStream.push(null)
  // song = songStream

  log(`Song ${nextIndex} has duration: ${duration}`)

  // 1-5 minutes in milliseconds
  let playDuration = Math.floor(Math.random() * 240000) + 60000
  let startTimeOffset =
    Math.floor(Math.random() * (duration - segOverlap * 2000)) +
    segOverlap * 1000
  let startTime =
    timeline.length > 0
      ? timeline[timeline.length - 1].end - segOverlap * 1000
      : 0

  while (playDuration >= segOverlap * 1000) {
    let segmentDuration = Math.min(duration - startTimeOffset, playDuration)

    timeline.push({
      sound: song,
      offset: startTimeOffset,
      start: startTime,
      end: startTime + segmentDuration,
      fadeIn: true,
      fadeOut: true,
    })

    playDuration -= segmentDuration
    startTime = startTime + segmentDuration - segOverlap * 1000
    startTimeOffset = 0
  }

  return
}

const processSound = async (sound, outputFile) => {
  // Use ffmpeg to process the buffer
  let readStream = new Readable()
  readStream.push(sound.sound)
  readStream.push(null)

  // Use ffmpeg to process the sound to the temp file
  return new Promise((resolve, reject) => {
    let pInd
    let command = ffmpeg()
      .input(readStream)
      .inputFormat('mp3')
      .inputOptions([
        '-ss ' + sound.offset / 1000,
        '-to ' + (sound.end - sound.start + sound.offset) / 1000,
      ])
      .complexFilter(
        [
          sound.fadeIn && `afade=t=in:st=0:d=${segOverlap}`,
          sound.fadeOut &&
            `afade=t=out:st=${
              (sound.end - sound.start) / 1000 - segOverlap
            }:d=${segOverlap}`,
          `adelay=${sound.start}|${sound.start}`,
        ]
          .filter(Boolean)
          .join(',')
      )
      .output(outputFile)
      .on('start', () => {
        log('Started processing sound')
        processes.push(command)
        pInd = processes.length - 1
      })
      .on('end', () => {
        log('Finished processing sound')
        processes.splice(pInd, 1)
        resolve()
      })
      .on('error', (err) => {
        // console.error('Error during processing:', err)
        reject(err)
      })
      .run()
  })
}

const mergeSounds = async (soundA, soundB, outputFile) => {
  return new Promise((resolve, reject) => {
    let pInd
    let command = ffmpeg()
      .input(soundA)
      .inputFormat('mp3')
      .addInput(soundB)
      .inputFormat('mp3')
      .complexFilter(['[0a][1a]amix=inputs=2:duration=longest'])
      .output(outputFile)
      .on('start', () => {
        log('Started merging sounds')
        processes.push(command)
        pInd = processes.length - 1
      })
      .on('end', () => {
        log('Finished merging sounds')
        processes.splice(pInd, 1)
        resolve()
      })
      .on('error', (err) => {
        console.error('Error during merge:', err)
        reject(err)
      })
      .run()
  })
}

const killProcess = () => {
  // Stop all streams and functions in this file
  processes.forEach((process) => {
    process.kill('SIGINT')
  })
  playSeg = 0
  timeline = []
  weights.fill(0)
  log('Process killed')
}

// RENDER SIDE: Streamer
let playSeg = 0
let bgImage

// Function to start the stream
async function startStream(testing = false) {
  const fullStreamURL = testing
    ? __dirname + '/output.mp4'
    : `rtmp://x.rtmp.youtube.com/live2/${process.env.YT_STREAM_KEY}`

  if (!bgImage) {
    log('Getting background image...')

    bgImage = await new Promise((resolve, reject) => {
      fetch(fileHost + BG)
        .then((res) => {
          if (res.ok) {
            log(`Fetched one-time access URL: ${res.url}`)
            fetch(res.url)
              .then((res) => {
                if (res.ok) {
                  // log('Fetched background image:', res)
                  // create buffer from the PassThrough stream given in the response body
                  // Save to file 'bg.jpg' (asynchronously)
                  let stream = new PassThrough()
                  res.body.pipe(stream)
                  stream.pipe(
                    concat((buffer) => {
                      writeFile(join(__dirname, 'bg.jpg'), buffer, (err) => {
                        if (err) {
                          reject(err)
                        } else {
                          resolve(join(__dirname, 'bg.jpg'))
                        }
                      })
                    })
                  )
                } else {
                  reject(new Error('Failed to fetch background image', res))
                }
              })
              .catch(reject)
          } else {
            reject(new Error('Failed to fetch one-time access URL', res))
          }
        })
        .catch(reject)
    })

    bgImage = join(__dirname, 'bg.jpg')
  }

  let audioStream = new PassThrough()

  // Run each segment in sequence, looping back to the start once the end is reached
  let streamNext = async () => {
    let file = join(__dirname, '..', `chunk${playSeg}.mp3`)
    let segStream = createReadStream(file)

    segStream.pipe(audioStream, { end: false })

    segStream.on('end', () => {
      playSeg = (playSeg + 1) % segNum
      streamNext()

      // Tell glitch that it can generate over the last played file
      let next = (segNum + playSeg - minSegs + 1) % segNum
      fetch(`${glitch}/chunkReady?chunk=${next}`)
    })
  }

  try {
    let pInd
    let command = ffmpeg()
      .addInput(bgImage)
      .inputFormat('image2')
      .inputOptions([`-stream_loop -1`, `-re`])
      .inputFPS(1)
      .addInput(audioStream)
      .inputFormat('mp3')
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-f flv',
        '-b:v 3000k',
        '-maxrate 2000k',
        '-bufsize 4000k',
        '-b:a 96k',
        '-threads 2',
        '-s 1280x720',
        '-r 30',
        '-preset ultrafast',
        '-max_alloc 8192',
      ])
      .output(fullStreamURL)
      .on('start', () => {
        log('Stream started')
        processes.push(command)
        pInd = processes.length - 1
        streamNext()
      })
      .on('end', function (err, stdout, stderr) {
        log(`Finished stream: ${err}`)
        processes.splice(pInd, 1)
      })
      .on('stderr', (stderr) => {
        log(`stderr: ${stderr}`)
      })
      .on('stdout', (stdout) => {
        log(`stdout: ${stdout}`)
      })
      .on('error', (err) => {
        console.error('Error during stream:', err)
      })
      .run()
  } catch (err) {
    console.error('Error starting stream:', err)
  }
}

// Function to log messages
function log(message, show = true) {
  if (show) console.log(message)

  // Append to test log
  writeFileSync(
    testLogPath,
    message + '\n' + new Date().toLocaleTimeString('en-GB'),
    { flag: 'a' }
  )
}

export default {
  start: makeTemp,
  stop: killProcess,
  stream: startStream,
  test: (cycles = minSegs) => {
    testing = !testing
    if (testing) makeTemp(cycles * -1)
    else killProcess()
  },
}
