import ffmpeg from 'fluent-ffmpeg'
import { PassThrough, Readable } from 'stream'
import fetch from 'node-fetch'
import concat from 'concat-stream'
import { readdir, unlink, createReadStream, writeFileSync } from 'fs'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import getMP3Duration from 'get-mp3-duration'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Env setup
import { config } from 'dotenv'
config()

// define __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

ffmpeg.setFfmpegPath(ffmpegPath.path)

let segNum = 3 // Number of segments to keep in memory
let minSegs = 2 // Start streaming when there are at least this many segments in memory
let segLen = 60 // Length of each segment in seconds
let segOverlap = 5 // Overlap between segments in seconds

let playSeg = 0
let streaming = false

let { AMB, BG } = JSON.parse(readFileSync(__dirname + '/files.json'))

let fileHost = 'https://od.lk/s/'

let bgImage

let timeline = []
let processes = []

const weights = Array.from({ length: 30 }, () => Math.floor(Math.random() * 10)) // Random initial weights

const addSound = async () => {
  const totalWeight = weights.reduce((acc, weight) => acc + weight, 0)

  let random = Math.floor(Math.random() * totalWeight)

  let nextIndex = weights.findIndex((weight) => {
    random -= weight
    return random <= 0
  })

  weights[nextIndex]++

  // Get a readable stream of the sound file
  let song = fileHost + AMB[nextIndex]
  song = await new Promise((resolve, reject) => {
    fetch(song)
      .then((res) => {
        if (res.ok) {
          console.log('Fetched one-time access URL:', res.url)
          fetch(res.url)
            .then((res) => {
              if (res.ok) {
                // console.log('Fetched sound file:', res)
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

  console.log(`Song ${nextIndex} has duration:`, duration)

  let playDuration = Math.floor(Math.random() * 480000) + 60000 // 1-9 minutes in milliseconds
  let startTimeOffset = Math.floor(Math.random() * duration) // Random start time in milliseconds
  let startTime =
    timeline.length > 0
      ? timeline[timeline.length - 1].end - segOverlap * 1000
      : 0

  while (playDuration > 0) {
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

const makeTemp = async (tempSeg = minSegs * -1) => {
  if (tempSeg === -1 * minSegs) {
    console.log('Deleting temp files...')
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
                console.log('Deleted file:', file)
              }
            })
          }
        })
      }
    })

    console.log('Getting background image...')

    bgImage = await new Promise((resolve, reject) => {
      fetch(fileHost + BG)
        .then((res) => {
          if (res.ok) {
            console.log('Fetched one-time access URL:', res.url)
            fetch(res.url)
              .then((res) => {
                if (res.ok) {
                  // console.log('Fetched background image:', res)
                  // create buffer from the PassThrough stream given in the response body
                  let stream = new PassThrough()
                  res.body.pipe(stream)
                  stream.pipe(concat((buffer) => resolve(buffer)))
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

    // Save to file 'bg.jpg'
    writeFileSync(__dirname + '/bg.jpg', bgImage)

    bgImage = __dirname + '/bg.jpg'
  }

  let oldVal = tempSeg

  tempSeg = (tempSeg + minSegs) % segNum

  console.log('Populating timeline...')

  let target = segLen * 1000

  // Add sounds until the timeline is at least target segments long
  while (
    timeline.length === 0 ||
    timeline[timeline.length - 1].end < target * segNum
  ) {
    await addSound()
  }

  // console.log('Timeline populated')
  console.log(`Building file: ${tempSeg}`)

  let overlap = timeline.find(
    (sound) => sound.end - 1000 <= target && sound.end >= target
  )

  if (overlap) {
    // Compare the end - half an overlap time to the segment length
    if (overlap.end - segOverlap * 1000 <= target) {
      target = overlap.end
    } else {
      target = overlap.end - segOverlap * 1000
    }
  }

  let tempHalf = []

  // console.log('Splitting timeline at', target)
  // console.log('Timeline Before:', timeline)

  timeline.forEach((sound, index) => {
    // Finishes on or before
    if (sound.end <= target) {
      tempHalf.push(sound)
      timeline[index] = null
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
        fadeIn: false,
      }
    }
    // Starts and ends after
    else {
      timeline[index] = {
        ...sound,
        start: sound.start - target,
        end: sound.end - target,
      }
    }
  })

  timeline = timeline.filter(Boolean)

  // console.log('Timeline After:', timeline)
  // console.log('Temp Half:', tempHalf)

  const tempFile = __dirname + `/temp${tempSeg}.mp3`
  const tempA = __dirname + `/temp${tempSeg}A.mp3`
  const tempB = __dirname + `/temp${tempSeg}B.mp3`

  // Must wait for each sound before to finish before starting the next
  for (let i = 0; i < tempHalf.length; i++) {
    const sound = tempHalf[i]
    // console.log('Processing sound', i)
    await new Promise(async (resolve, reject) => {
      let outputFile =
        tempHalf.length % 2 === 1 && i === 0
          ? tempFile
          : tempHalf.length % 2 === 0 && i === 1
          ? tempB
          : tempA

      // Process sound
      await processSound(sound, outputFile)
      // Merge with previous sound (if any)
      if (i > 0) {
        let mergeFile =
          tempHalf.length % 2 === 0 && i == 1
            ? tempA
            : tempHalf.length % 2 === i % 2
            ? tempFile
            : tempB
        let mergeOutput = tempHalf.length % 2 === i % 2 ? tempB : tempFile
        await mergeSounds(outputFile, mergeFile, mergeOutput)
      }
      resolve()
    })
  }

  // Start the stream if this is the last negative
  if (!streaming && oldVal === -1) {
    startStream()
    streaming = true
  }
  // If still negative, then we are still loading the initial segments
  else if (oldVal < 0) {
    // Pass one greater than the initial value given to makeTemp
    makeTemp(oldVal + 1)
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
        '-threads 1',
      ])
      .complexFilter(
        [
          sound.fadeIn && `afade=t=in:st=0:d=${segOverlap}`,
          sound.fadeOut &&
            `afade=t=out:st=${
              (sound.end - sound.start) / 1000 - segOverlap
            }:d=${segOverlap}`,
          `adelay=${sound.offset / 1000}|${sound.offset / 1000}`,
        ]
          .filter(Boolean)
          .join(',')
      )
      .output(outputFile)
      .on('start', () => {
        console.log('Started processing sound')
        processes.push(command)
        pInd = processes.length - 1
      })
      .on('end', () => {
        console.log('Finished processing sound')
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
  // Use ffmpeg to merge the two sounds
  return new Promise((resolve, reject) => {
    let pInd
    let command = ffmpeg()
      .input(soundA)
      .inputFormat('mp3')
      .inputOptions(['-threads 1'])
      .addInput(soundB)
      .inputFormat('mp3')
      .inputOptions(['-threads 1'])
      .complexFilter(['amix=inputs=2:duration=longest'])
      .output(outputFile)
      .on('start', () => {
        console.log('Started merging sounds')
        processes.push(command)
        pInd = processes.length - 1
      })
      .on('end', () => {
        console.log('Finished merging sounds')
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

// Function to start the stream
async function startStream() {
  const fullStreamURL = `rtmp://x.rtmp.youtube.com/live2/${process.env.YT_STREAM_KEY}`

  // Make audio stream from the temp file
  const audioStream = new PassThrough()
  const streamSegment = () => {
    const soundStream = createReadStream(__dirname + `/temp${playSeg}.mp3`)
    console.log(`Streaming temp${playSeg}`)
    soundStream.pipe(audioStream, { end: false })
    soundStream.on('end', () => {
      console.log(`temp${playSeg} finished streaming`)
      playSeg = (playSeg + 1) % segNum

      streamSegment() // Start the next segment
      makeTemp(playSeg) // Make the next segment
    })
  }
  streamSegment()

  try {
    let pInd
    let command = ffmpeg()
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
        '-g 120',
        '-b:v 3000k',
        '-maxrate 3000k',
        '-bufsize 6000k',
        '-b:a 128k',
        '-vf eq=brightness=0.1:saturation=1.5',
        '-s 1920x1080',
      ])
      .output(fullStreamURL)
      .on('start', () => {
        console.log('Stream started')
        processes.push(command)
        pInd = processes.length - 1
        // Make the next segment
        makeTemp(playSeg)
      })
      .on('end', function (err, stdout, stderr) {
        console.log('Stream ended')
        streaming = false
        playSeg = 0
        timeline = []
        weights.fill(0)
        processes.splice(pInd, 1)
      })
      .on('error', (err) => {
        console.error('Error during stream:', err)
      })
      .run()
  } catch (err) {
    console.error('Error starting stream:', err)
  }
}

const killProcess = () => {
  // Stop all streams and functions in this file
  processes.forEach((process) => {
    process.kill('SIGINT')
  })
  streaming = false
  playSeg = 0
  timeline = []
  weights.fill(0)
  console.log('Process killed')
}

export default { start: startStream, stop: killProcess }
