const discordBotkit = require('botkit-discord')
const firebase = require('./firebase.js')
const fetchUrl = require('fetch').fetchUrl
const fs = require('fs')

const data_config = {
  token: process.env.DATA_DISCORD_TOKEN,
}
const minutes_config = {
  token: process.env.MINUTES_DISCORD_TOKEN,
}

const dataBot = discordBotkit(data_config)
const minutesBot = discordBotkit(minutes_config)

require('./skills/data.js')(dataBot)
require('./skills/minutes.js')(minutesBot)
module.exports = {
  dataBot,
  minutesBot,
}

var gifSent = false
var status = null

function checkGIF() {
  if (Math.random() * 2000 < 1 || !status) {
    var statuses = [
      'Designing traps.',
      'Recording tapes.',
      'Videoing Billy.',
      'Making Billys.',
      'Following potential subjects.',
      'Kidnapping subjects.',
      'Appreciating life',
      'Visiting the bathroom',
      'Building a trap.',
      'Buying trap supplies.',
    ]

    if (status) statuses.splice(statuses.indexOf(status), 1)

    status = statuses[Math.floor(Math.random() * statuses.length)]

    // Set the bot's presence
    jigClient.user.setPresence({
      activities: [
        {
          name: `ACTIVITY: ${status}`,
          type: 0,
        },
      ],
    })
  }

  var currenttime = new Date()

  // Send a gif every 2 hours from 8am till 2am
  if (
    [8, 10, 12, 14, 16, 18, 20, 22, 0, 2].includes(currenttime.getHours()) &&
    currenttime.getMinutes() == 0 &&
    !gifSent
  ) {
    jigGIF()
    gifSent = true
  }
  // Reset the gifSent variable when a gif hasn't been sent
  else {
    gifSent = false
  }
}

async function checkSneeze(client) {
  // Get current sneeze data
  let sneezeData = await getData('sneezeData')

  await client.channels.fetch('1146256683748827177').then(async (channel) => {
    let user = await channel.guild.members.fetch('390419737915555840')
    let presence = await user.presence

    if (presence) {
      let activities = presence.activities

      if (activities.length) {
        let sneezes = parseInt(activities[0].state.split(' ')[0])
        let updated = activities[0].createdTimestamp


        if (sneezes != sneezeData.count) {
          let change = `${(sneezes - sneezeData.count) > 0 ? '+' : ''}${sneezes - sneezeData.count}`
          user.send(`${change} sneezes:\n${sneezeData.count} -> ${sneezes}`)
          sneezeData = {
            ...sneezeData,
            count: sneezes,
            updated,

          }
          setData('sneezeData', sneezeData)

          let day = new Date().toLocaleDateString('en-NZ')

          setSneeze(day, change, false)
        }
      }
    }
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

async function setSneeze(day, count = '0', confirmed = false) {
  let sneezeData = await getData('sneezeData')

  let oldCount = sneezeData.calendar[day] ? sneezeData.calendar[day].count : 0

  switch (String(count).charAt(0)) {
    case '+': // Add
      count = oldCount + parseInt(count.slice(1))
      break;

    case '-': // Minus
      count = oldCount - parseInt(count.slice(1))
      break;

    default: // Set
      count = parseInt(count)
      break;
  }

  sneezeData.calendar[day] = {
    count,
    confirmed
  }

  setData('sneezeData', sneezeData)
}

async function getSupeData(id) {
  // Get the timeline with the given document ID
  const docRef = firebase.collection(firebase.supedb, 'timelines')
  const docSnap = await firebase.getDocs(docRef)
  const doc = docSnap.docs.find((doc) => doc.id == id)
  const final = JSON.parse(doc.data().map)
  return final
}

async function getSupeBackupData(id) {
  // Get the timeline with the given document ID
  const docRef = firebase.collection(firebase.datacord, 'timelines')
  const docSnap = await firebase.getDocs(docRef)
  const doc = docSnap.docs.find((doc) => doc.id == id)
  const final = JSON.parse(doc.data().map)
  return final
}

function setSupeBackupData(id, map) {
  // Set the timeline with the given document ID
  const docRef = firebase.collection(firebase.datacord, 'timelines')
  const docSnap = firebase.doc(docRef, id)
  firebase.setDoc(docSnap, { map: JSON.stringify(map) })
}

var linesdata = ''

// Data has a set of activities that it will cycle through
// These are all activities that Data would do/has done in the show
// Each one has a name, type, duration, variance, and condition

// Types:
//   0 = Playing (Playing {name})
//   1 = Streaming (Streaming {name})
//   2 = Listening (Listening to {name})
//   3 = Watching (Watching {name})
//   5 = Competing (Competing in {name})

// Examples of conditions:
//   Activities involving people will won't be allowed if Data is off-duty during the night shift
//   Senior crew plays a poker game every Tuesday night, so he will play with them if it's Tuesday night, and he will not be on duty

// The Enterprise D runs on a 24 hour clock, with 3 sets of 8 hour shifts
// The shifts are as follows:
// Day shift: 0800 - 1600 (Data usually works this shift, maybe 95% of the time)
// Swing shift: 1600 - 0000 (Data will be off duty, assuming there is no emergency)
// Night shift: 0000 - 0800 (Data will work this shift 75% of the time, and will be off duty the other 25% of the time)
// If off-duty for the Day shift, Data will perform activities on his own
// If off-duty for the Swing shift, Data will perform any activities including those that involve other crew members
// If off-duty for the Night shift, Data will perform activities on his own or engage in dream simulation / hibernation
// After each activity, Data will have a small break to account for travel time and crew interaction

var shift = '' // Current shift
var onDuty = false // Is Data on duty?

const dataActivities = [
  // Array of random activities
  {
    name: 'ACTIVITY: Playing poker with Stephen Hawking, Albert Einstein, and Isaac Newton on the holodeck.',
    duration: 1000 * 60 * 60 * 2, // 2 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1.5 and 2.5 hours
    condition: () => true, // Can play any time
  },
  {
    name: 'ACTIVITY: Playing a Sherlock Holmes holonovel with Geordi.',
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 20, // 20 minutes, variance for this activity, so it can be between 0.8 and 1.2 hours
    condition: () => shift !== 'night', // La Forge is unavailable during the night shift
  },
  {
    name: 'ACTIVITY: Playing a Dixon Hill holonovel with Picard.',
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 20, // 20 minutes, variance for this activity, so it can be between 0.8 and 1.2 hours
    condition: () => shift !== 'night', // Picard is unavailable during the night shift
  },
  {
    name: 'ACTIVITY: Playing the violin in Ten Forward.',
    duration: 1000 * 60 * 60 * 1.5, // 1.5 hours, average time for this activity
    variance: 1000 * 60 * 60, // 1 hour, variance for this activity, so it can be between 0.5 and 2.5 hours
    condition: () => shift !== 'night', // Data won't play during the night shift to avoid waking up the crew
  },
  {
    name: 'ACTIVITY: Playing the oboe in Ten Forward.',
    duration: 1000 * 60 * 60 * 0.5, // 1.25 hours, average time for this activity
    variance: 1000 * 60 * 60 * 0.25, // 15 minutes, variance for this activity, so it can be between 0.25 and 0.75 hours
    condition: () => shift !== 'night', // Data won't play during the night shift to avoid waking up the crew
  },
  {
    name: 'ACTIVITY: Playing the flute in Ten Forward.',
    duration: 1000 * 60 * 60 * 0.5, // 1.25 hours, average time for this activity
    variance: 1000 * 60 * 60 * 0.25, // 15 minutes, variance for this activity, so it can be between 0.25 and 0.75 hours
    condition: () => shift !== 'night', // Data won't play during the night shift to avoid waking up the crew
  },
  {
    name: [
      'ACTIVITY: Performing "Blue Skies" in Ten Forward.',
      'ACTIVITY: Singing "Blue Skies" in Ten Forward.',
    ],
    duration: 1000 * 60 * 4, // 4 minutes, average time for this activity
    variance: 1000 * 30, // 30 seconds, variance for this activity, so it can be between 3.5 and 4.5 minutes long
    condition: () => shift !== 'night', // Data won't play during the night shift to avoid waking up the crew
  },
  {
    name: 'ACTIVITY: Playing a game of Strategema against a holographic Kolrami.',
    duration: 1000 * 60 * 7, // 7 minutes, average time for this activity
    variance: 1000 * 60 * 2, // 2 minutes, variance for this activity, so it can be between 5 and 9 minutes long
    condition: () => true, // Can play any time
  },
  {
    name: 'ACTIVITY: Playing the titular character of Henry V in a performance of Shakespeare\'s play, "Henry V" in Ten Forward.',
    duration: 1000 * 60 * 60 * 3.1, // 3.1 hours, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 3 and 3.2 hours long
    condition: () => shift !== 'night', // Data won't play during the night as people will be unavailable
  },
  {
    name: 'ACTIVITY: Playing the psychiatrist in a performance of Beverly Crusher\'s play, "Frame of Mind" in Ten Forward.',
    duration: 1000 * 60 * 60 * 2.1, // 2.1 hours, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 2 and 2.2 hours long
    condition: () => shift !== 'night', // Data won't play during the night as people will be unavailable
  },
  {
    name: 'ACTIVITY: Playing Prospero in Shakespeare\'s play, "The Tempest".',
    duration: 1000 * 60 * 60 * 2.1, // 2.1 hours, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 2 and 2.2 hours long
    condition: () => shift !== 'night', // Data won't play during the night as people will be unavailable
  },
  {
    name: 'ACTIVITY: Reciting "Ode to Spot" in Ten Forward.',
    duration: 1000 * 60 * 2.5, // 2.5 minutes, average time for this activity
    variance: 1000 * 30, // 30 seconds, variance for this activity, so it can be between 2 and 3 minutes long
    condition: () => shift !== 'night', // Data won't play during the night as people will be unavailable
  },
  {
    name: 'ACTIVITY: Playing with Spot.',
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => true, // Can play any time
  },
  {
    name: 'ACTIVITY: Watching Spot sleep.',
    duration: 1000 * 60 * 45, // 45 minutes, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 0.5 and 1 hour long
    condition: () => true, // Can play any time
  },
  {
    name: 'ACTIVITY: Playing in a chess tournament.',
    duration: 1000 * 60 * 60 * 5, // 5 hours, average time for this activity
    variance: 1000 * 60 * 60, // 1 hour, variance for this activity, so it can be between 4 and 6 hours long
    condition: () => shift !== 'night' && Math.random() < 0.3, // Won't play at night and is rarer as tournaments are less common
  },
  {
    name: 'ACTIVITY: Playing in a holographic chess tournament.',
    duration: 1000 * 60 * 60 * 5, // 5 hours, average time for this activity
    variance: 1000 * 60 * 60, // 1 hour, variance for this activity, so it can be between 4 and 6 hours long
    condition: () => true, // Can play any time
  },
  {
    name: [
      'ACTIVITY: Playing Vulcan chess against Ambassador Spock.',
      'ACTIVITY: Playing Vulcan chess against Tuvok.',
    ],
    duration: 1000 * 60 * 60 * 1.25, // 1.25 hours, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 1 and 1.5 hours long
    condition: () => shift !== 'night' && Math.random() < 0.1, // Won't play at night and is rarer as the character must be visiting the Enterprise
  },
  {
    name: 'ACTIVITY: Playing a benign version of the unnamed Ktarian game.',
    duration: 1000 * 60 * 30, // 20 minutes, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 5 and 35 minutes long
    condition: () => true, // Can play any time
  },
  {
    name: [
      'ACTIVITY: Playing Kotra against Garak.',
      'ACTIVITY: Playing Kotra against Nog.',
      "ACTIVITY: Playing Kotra against O'Brien.",
      'ACTIVITY: Playing Kotra against a holographic Dukat.',
    ],
    duration: 1000 * 60 * 60 * 1.5, // 1.5 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1 and 2 hours long
    condition: () => shift !== 'night' && Math.random() < 0.1, // Won't play at night and is rarer as the character must be visiting the Enterprise
  },
  {
    name: 'ACTIVITY: Playing Baccarat against Bashir.',
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => shift !== 'night' && Math.random() < 0.1, // Bashir will not be available during the night shift, and is rarer as Bashir must be visiting the Enterprise
  },
  {
    name: 'ACTIVITY: Playing Blackjack with Fontaine.',
    duration: 1000 * 60 * 30, // 30 minutes, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 15 and 45 minutes long
    condition: () => true, // Can play any time
  },
  {
    name: 'ACTIVITY: Playing the video game, "Matrix of Doom".',
    duration: 1000 * 60 * 60 * 2, // 2 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1.5 and 2.5 hours long
    condition: () => true, // Can play any time
  },
  {
    name: [
      'ACTIVITY: Playing Gin Rummy against Fontaine',
      'ACTIVITY: Playing Gin Rummy with Tuvok',
      'ACTIVITY: Playing Gin Rummy against Chakotay',
    ],
    duration: 1000 * 60 * 60 * 1, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => shift !== 'night' && Math.random() < 0.1, // Won't play at night and is rarer as the character must be visiting the Enterprise
  },
  {
    name: 'ACTIVITY: Attending a wedding ceremony in Ten Forward.',
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => shift == 'swing' && Math.random() < 0.5, // Weddings will only happen during the evening shift and are rarer as they are less common
  },
  {
    name: 'ACTIVITY: Listening to a concert in Ten Forward.',
    duration: 1000 * 60 * 60 * 2, // 2 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1.5 and 2.5 hours long
    condition: () => shift == 'swing', // Concerts will only happen during the evening shift
  },
  {
    name: 'ACTIVITY: Listening to Picard perform "The Inner Light" on his Ressikan flute in Ten Forward.',
    duration: 1000 * 60 * 30, // 30 minutes, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 15 and 45 minutes long
    condition: () => shift !== 'night', // Picard won't play during the night as people will be unavailable
  },
  {
    name: 'ACTIVITY: Listening to Riker play his trombone in Ten Forward.',
    duration: 1000 * 60 * 20, // 20 minutes, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 10 and 30 minutes long
    condition: () => shift !== 'night', // Riker won't play during the night as people will be unavailable
  },
  {
    name: 'ACTIVITY: Listening to Worf sing Klingon opera in Ten Forward.',
    duration: 1000 * 60 * 20, // 20 minutes, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 10 and 30 minutes long
    condition: () => shift !== 'night', // Worf won't sing during the night as people will be unavailable
  },
  {
    name: "ACTIVITY: Watching Worf compete in a Bat'leth tournament on the holodeck.",
    duration: 1000 * 60 * 60 * 2, // 2 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1.5 and 2.5 hours long
    condition: () => shift !== 'night' && Math.random() < 0.3, // Won't watch at night and is rarer as tournaments are less common
  },
  {
    name: 'ACTIVITY: Watching a performance of Beverly Crusher\'s play, "Something for Breakfast" in Ten Forward.',
    duration: 1000 * 60 * 60 * 2, // 2.1 hours, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 1.9 and 2.1 hours long
    condition: () => shift !== 'night', // Performance will only happen during the day
  },
  {
    name: 'ACTIVITY: Trying to create new nutrient supplements for Spot.',
    duration: 1000 * 60 * 40, // 40 minutes, average time for this activity
    variance: 1000 * 60 * 20, // 20 minutes, variance for this activity, so it can be between 20 and 60 minutes long
    condition: () => true, // Can do this any time
  },
  {
    name: 'ACTIVITY: Writing poetry.',
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => true, // Can do this any time
  },
  {
    name: [
      'ACTIVITY: Rehearsing for an upcoming play with the rest of the cast.',
      'ACTIVITY: In an acting class run by Beverly Crusher.',
    ],
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => shift == 'swing', // Rehearsals will only happen during the evening shift
  },
  {
    name: [
      'ACTIVITY: Painting a portrait of Spot.',
      'ACTIVITY: Painting the Enterprise.',
      'ACTIVITY: Painting a nebula.',
      'ACTIVITY: Painting elements from his latest dream.',
    ],
    duration: 1000 * 60 * 60 * 1.5, // 1.5 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1 and 2 hours long
    condition: () => true, // Can do this any time
  },
  {
    name: 'ACTIVITY: Discussing classical music with Picard.',
    duration: 1000 * 60 * 20, // 20 minutes, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 10 and 30 minutes long
    condition: () => shift !== 'night', // Picard won't be available during the night
  },
  {
    name: 'ACTIVITY: In Ten Forward, trying out new foods and beverages with his emotion chip engaged.',
    duration: 1000 * 60 * 30, // 30 minutes, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 15 and 45 minutes long
    condition: () => shift !== 'night', // Guinan will not be serving during the night
  },
  {
    name: 'ACTIVITY: Trying out new foods and beverages with his replicator and his emotion chip engaged.',
    duration: 1000 * 60 * 20, // 20 minutes, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 10 and 30 minutes long
    condition: () => true, // Can do this any time
  },
  {
    name: "ACTIVITY: Viewing and discussing Picard's archeology collection with him.",
    duration: 1000 * 60 * 45, // 45 minutes, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 30 and 60 minutes long
    condition: () => shift !== 'night', // Picard won't be available during the night
  },
  {
    name: 'ACTIVITY: Reading "Anslem" by Jake Sisko.',
    duration: 1000 * 60 * 60 * 1.5, // 1.5 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1 and 2 hours long
    condition: () => true, // Can do this any time
  },
]

// Data may be interupted by several events, including those listed below:
const interupts = [
  {
    class: 'emergency',
    name: [
      'EMERGENCY: Fighting a Borg invasion.',
      'EMERGENCY: Crew members trapped in malfunctioning holodeck.',
      'EMERGENCY: Warp core breach imminent.',
      'EMERGENCY: Biological contamination detected in the air supply.',
      'EMERGENCY: Q is testing the Enterprise.',
      'EMERGENCY: Temporal displacement detected, attempting to return to the present.',
      'EMERGENCY: Lore has infiltrated and taken control of the Enterprise.',
      'EMERGENCY: Moriarty has escaped and has taken control of the Enterprise.',
      'EMERGENCY: Away team has been captured during a mission.',
      'EMERGENCY: Responding to situation with the Mirror Universe.',
      'EMERGENCY: The Enterprise is being attacked by a Crystalline Entity.',
      'EMERGENCY: The Enterprise has been overrun by a Tribble infestation.',
      'EMERGENCY: Romulan forces have ambushed the Enterprise.',
      'EMERGENCY: Klingon forces have ambushed the Enterprise.',
      'EMERGENCY: Cardassian forces have ambushed the Enterprise.',
      'EMERGENCY: The Enterprise has been trapped in a time loop.',
      'EMERGENCY: The Enterprise is trapped in a spatial anomaly.',
      'EMERGENCY: Responding to a Bluegill invasion.',
    ],
    duration: 1000 * 60 * 60 * 6, // 6 hours, average time for this activity
    variance: 1000 * 60 * 60 * 2, // 2 hours, variance for this activity, so it can be between 4 and 8 hours long
    condition: () => true, // Can occur at any time
  },
  {
    class: 'task',
    name: [
      'TASK: In a meeting with the senior staff.',
      'TASK: Aiding Geordi in Main Engineering.',
      'TASK: Monitoring probe readings.',
      'TASK: Analyzing asteroid sample.',
      'TASK: Contacting liaison aboard Starbase 4514.',
      'TASK: Giving an Ambassador a tour of the Enterprise.',
      'TASK: Reviewing sensor logs from recovered shuttle.',
      'TASK: Reviewing Delta radiation readings in this sector.',
      'TASK: Analyzing nebula composition.',
      'TASK: Helping the Beverly Crusher synthesize a cure for a disease.',
      'TASK: Commanding the Bridge while Picard and Riker are absent.',
      'TASK: In the landing party investigating a planet.',
      'TASK: Orbiting a star in a shuttlecraft.',
    ],
    duration: 1000 * 60 * 60 * 1.5, // 1.5 hours, average time for this activity
    variance: 1000 * 60 * 60 * 0.5, // 0.5 hours, variance for this activity, so it can be between 1 and 2 hours long
    condition: () => true, // Can occur at any time
  },
]

// Login to minutesBot and dataBot with discord.js
// Require discord.js
const { Client, GatewayIntentBits } = require('discord.js')
const { time, error } = require('console')

// Create the new clients instances including the intents needed for the bots like presence and guild messages
const minutesClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
})

const dataClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
  ],
})

const jigClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ],
})
// Log in to Discord with your clients tokens
minutesClient.login(process.env.MINUTES_DISCORD_TOKEN)
dataClient.login(process.env.DATA_DISCORD_TOKEN)
jigClient.login(process.env.JIG_DISCORD_TOKEN)

jigClient.on('ready', (client) => {
  var gifLoop = setInterval(() => { checkGIF() }, 40000) // Every 40 seconds, check if a gif should be sent

  // Only start the bots after the first check is done
  checkGIF()
})

// Generate southern greetings
function genGreeting(plural = true, user = null) {
  var greets = ['howdy', "mornin'", 'hello', 'hiya', 'hey', 'good morning']
  var subjects = [null, 'there']

  if (plural) {
    subjects.push('folks')
    subjects.push("y'all")
    subjects.push('guys')
    subjects.push('everybody')
  } else {
    subjects.push('partner')
    subjects.push('friend')
    subjects.push('pal')
    subjects.push('buddy')
  }

  // Get the parts of the greeting (1 in 3 chance of the subject being the user's name)
  var g = greets[Math.floor(Math.random() * greets.length)]
  var s =
    user && Math.floor(Math.random() * 3) == 0
      ? user
      : subjects[Math.floor(Math.random() * subjects.length)]

  // Check for exceptions
  // "hiya" can't be used with "y'all", it will just be "hey"
  if (g == 'hiya' && s == "y'all") g = 'hey'

  // Generate the greeting
  var greeting = g + (s ? ' ' + s : '')

  // Return the greeting with the first letter capitalized
  return greeting.charAt(0).toUpperCase() + greeting.slice(1)
}

// Use order and depth to create a nested JSON
// e.g. [{depth: 0, title: A, content:a}, {depth: 1, title: B, content: b}, {depth: 2, title: C, content: c}, {depth: 1, title: D, content: d}], becomes
// {title: A, content: a, children: [{title: B, content: b, children: [{title: C, content: c}]}, {title: D, content: d}]}
function createNestedJSON(data) {
  var nestedJSON = {}
  var stack = []

  data.forEach((item) => {
    var current = nestedJSON
    while (stack.length > 0 && item.depth <= stack[stack.length - 1].depth) {
      stack.pop()
    }
    for (var i = 0; i < stack.length; i++) {
      current = current.children[current.children.length - 1]
    }
    var newItem = {}
    Object.keys(item).forEach((key) => {
      if (key !== 'depth') newItem[key] = item[key]
    })
    if (!current.children) {
      current.children = []
    }
    current.children.push(newItem)
    stack.push(item)
  })

  return nestedJSON.children ? nestedJSON.children : []
}

function emailFormat(data, top = true) {
  // Convert data into elements
  // e.g. {title: A, content: a, children: [{title: B, content: b, children: [{title: C, content: c}]}, {title: D, content: d}]}, becomes
  // <li><span>A</span><p>a</p><ul><li><span>B</span><p>b</p><ul><li><span>C</span><p>c</p></li></ul></li><li><span>D</span><p>d</p></li></ul></li>
  var start = top ? '' : `<li><span>${data.title}</span><p>${data.content}</p>`
  var end = top ? '' : '</li>'

  if (top) {
    data.forEach((item) => {
      if (item instanceof Array) start += emailFormat(item[0], false)
    })
  } else if (data.children) {
    start += '<ul>'
    data.children.forEach((item) => {
      start += emailFormat(item, false)
    })
    start += '</ul>'
  }

  return start + end
}

// Run when each client is ready
minutesClient.on('ready', async (client) => {
  // Run the timer loop right away
  timer(client, true)

  // Set a timeout to wait 1.111 seconds for every timer to be set
  var timecheck = await getData('timers').then((timers) => {
    return timers.length
  })
  console.log('Waiting ' + timecheck + ' seconds for timers to be set...')

  setTimeout(() => {
    // Run the timer loop just over every second
    setInterval(() => { timer(client) }, 800)
    console.log('Timers set and are being checked every 800ms.')
  }, timecheck * 1111)

  // Set the bot's presence
  minutesClient.user.setPresence({
    activities: [
      {
        name: 'over the Sacred Timelines',
        type: 3,
      },
    ],
  })

  // Get midnight tonight
  var reportTime = new Date()
  reportTime.setHours(24, 0, 0, -1)

  // Get the ms until then
  let msLeft = reportTime - Date.now()

  // Set a timeout to run the 'sendReport' function
  setTimeout(() => { sendReport(client, reportTime) }, msLeft)
})

dataClient.on('ready', () => {
  // Run the presence function
  dataPresence()

  // Run the interrupt function
  interuptEvent()
})

minutesClient.on('messageCreate', async (message) => {
  //
  if (message.content == 'RUN SEND REPORT') {
    sendReport(minutesClient, '11/01/2023')
    return
  }
  // Exit if a bot
  if (
    message.author.bot
  )
    return

  // Blacklist commands
  if (['.blacklist', '.bl'].includes(message.content.toLowerCase())) {
    // Blacklisting GIFS
    var blacklist = await getData('blacklist')

    // Try to get the reply
    message.channel.messages
      .fetch(message.reference.messageId)
      .then((msg) => {
        // Toogle that GIF's status
        var removing = blacklist.includes(msg.content)

        if (removing) {
          blacklist.splice(blacklist.indexOf(msg.content), 1)
        } else {
          // Add instead
          blacklist.push(msg.content)
        }

        msg.channel.send(
          `GIF has been ${removing ? 'removed from' : 'added to'} the blacklist.`
        )

        // Update the blacklist
        setData('blacklist', blacklist)
      })
      .catch((err) => {
        if (message.reference == null) {
          msg.channel.send(
            'This command must be used in a reply to the GIF in question.'
          )
        } else {
          console.log(err)
        }
      })
  }
  // Sneeze update
  else {
    // Try to get the reply
    message.channel.messages
      .fetch(message.reference.messageId)
      .then(async (msg) => {
        console.log(msg)

        let embed;

        try {
          embed = msg.embeds[0].data

          if (embed && !embed.title.endsWith('✅') && ['-', '+'].includes(message.content[0])) {
            let sneezeData = await getData('sneezeData')

            let day = new Date(embed.timestamp).toLocaleDateString('en-NZ')
            let today = new Date().toLocaleDateString('en-NZ')

            let count = parseInt(embed.title.split(' ')[0])
            let todayCount = sneezeData.calendar[today].count

            let change = parseInt(message.content)

            count += change
            todayCount -= change

            embed.title = `${count} sneeze${count != 1 ? 's' : ''} recorded today`,

              message.edit({ embeds: [embed] })

            setSneeze(day, count, false)
            setSneeze(today, todayCount, false)

            msg.channel.send(
              `${Math.abs(change)} sneeze${Math.abs(change) != 1 ? 's' : ''} transferred from ${change >= 0 ? `${today} to ${day}` : `${day} to ${today}`}.`,
            )
          }
        }
        catch (error) {
          console.error(error)
        }
      })
  }
})

let colors = {
  green: 0x008A0E,
  blue: 0x1071E5,
  yellow: 0xFCCE14,
  orange: 0xCC4E00,
  red: 0xE81313,
  black: 0x000000,
}

async function sendReport(client, time) {
  // Get the current time and date
  var now = new Date(time)
  var closeTime = now.toISOString()

  // Get the data for this day
  let sneezeData = await getData('sneezeData')
  let total = sneezeData.count
  let count = 0

  try {
    count = sneezeData.calendar[now.toLocaleDateString('en-NZ')].count
  }
  catch (err) {
    console.error(err)
  }

  var embed = {
    embeds: [
      {
        type: 'rich',
        title: `${count} sneeze${count != 1 ? 's' : ''} recorded today`,
        description: `Please confirm the count for this day, or reply with a change or new count`,
        color: colors.blue,
        timestamp: closeTime,
        footer: {
          text: `Total: ${total}`,
        }
      },
    ]
  }

  let channel = client.channels.cache.get(process.env.MINUTES_ID)

  channel.send(embed).then(msg => msg.react("👍"))

  // Prepare for next week

  // Get midnight tonight
  var reportTime = new Date()
  reportTime.setHours(24, 0, 0, -1)

  // Get the ms until then
  let msLeft = reportTime - Date.now()

  // Set a timeout to run the 'sendReport' function
  setTimeout(() => { sendReport(client, reportTime) }, msLeft)
}

minutesClient.on('messageReactionAdd', async (reaction, user) => {
  // Get the message reacted to
  message.channel.messages
    .fetch(message.reference.messageId)
    .then((msg) => {
      console.log(msg)

      if (msg.author.id === user.id) {
        // the reaction is coming from the same user who posted the message
        return;
      }

      let embed;

      try {
        embed = msg.embeds[0].data
      }
      catch (error) {
        console.error(error)
      }

      if (reaction.emoji.name == "👍") {

        if (!embed.title.endsWith('✅')) {
          embed.color = colors.green
          embed.title = `${embed.title}\n✅`
          delete embed.description

          msg.edit({ embeds: [embed] })

          let day = new Date(embed.timestamp).toLocaleDateString('en-NZ')
          // reaction.message.channel.send(parseInt(embed.title.split(' ')[0]))

          let count = embed.title.split(' ')[0]

          setSneeze(day, count, true)
        }

        msg.reactions.removeAll()
      }
    })
});

jigClient.on('messageCreate', async (message) => {
  // Exit if a bot, or not the right command
  if (
    message.author.bot ||
    !['.blacklist', '.bl'].includes(message.content.toLowerCase())
  )
    return
  // Blacklisting GIFS
  var jiggy = await getData('jiggy')
  var blacklist = jiggy.blacklist

  // Try to get the reply
  message.channel.messages
    .fetch(message.reference.messageId)
    .then((msg) => {
      // Toogle that GIF's status
      var removing = blacklist.includes(msg.content)

      if (removing) {
        blacklist.splice(blacklist.indexOf(msg.content), 1)
      } else {
        // Add instead
        blacklist.push(msg.content)
      }

      msg.channel.send(
        `This GIF will ${removing ? 'no longer' : 'now'
        } be excluded from selection.`
      )

      jiggy.blacklist = blacklist

      // Update the blacklist
      setData('jiggy', jiggy)
    })
    .catch((err) => {
      if (message.reference == null) {
        msg.channel
          .send('This command must be used in reply to a GIF.')
          .finally((reply) => {
            setTimeout(function () {
              reply.delete()
            }, 5000)
          })
      } else {
        console.log(err)
      }
    })
})

async function jigGIF() {
  await jigClient.channels
    .fetch('1145973830918094848')
    .then(async (channel) => {
      var jig = await getData('jiggy')

      // Get a random prompt from a random topic
      var topic = jig.prompts[Math.floor(Math.random() * jig.prompts.length)]
      var prompt = topic[Math.floor(Math.random() * topic.length)]

      // Get the blacklist ready
      var jigBL = jig.blacklist

      // Use fetch and the Giphy API to get a random gif
      var url =
        'https://tenor.googleapis.com/v2/search?q=' +
        prompt +
        '&key=' +
        process.env.TENOR_KEY +
        '&client_key=gif_bot&limit=10&random=true'
      var response = fetchUrl(url, function (error, meta, body) {
        var data = JSON.parse(body.toString())
        // Retrieve the first non-blacklisted GIF
        var gif = data.results.find((result) => !jigBL.includes(result.itemurl))

        if (gif) channel.send(gif.itemurl)
      })
    })
}

function dataPresence(trigger = 'reset') {
  // Get Data's current activity (unless the trigger is "reset")
  var activity = ''

  try {
    if (trigger !== 'reset')
      activity = dataClient.user.presence.activities[0].name
    else if (trigger == 'shift' && activity == 'TASK: Bridge duty')
      activity = ''
    else if (
      trigger == 'interrupt' &&
      (activity.startsWith('EMERGENCY: ') || activity.startsWith('TASK: '))
    )
      activity = ''
    else if (
      trigger == 'activity' &&
      activity != 'TASK: Bridge duty' &&
      !activity.startsWith('EMERGENCY: ') &&
      !activity.startsWith('TASK: ')
    )
      activity = ''
  } catch (err) {
    console.log(err)
  }

  // Update the shift variable
  var time = new Date()
  var endTime // Will be the the difference between the current time and time the shift ends

  var oldShift = shift

  if (time.getHours() < 8) {
    shift = 'night'
    endTime =
      new Date(time.getFullYear(), time.getMonth(), time.getDate(), 8, 0, 0) -
      time
  } else if (time.getHours() >= 16) {
    shift = 'swing'
    endTime =
      new Date(time.getFullYear(), time.getMonth(), time.getDate(), 24, 0, 0) -
      time
  } else {
    shift = 'day'
    endTime =
      new Date(time.getFullYear(), time.getMonth(), time.getDate(), 16, 0, 0) -
      time
  }

  // Check if Data can change shifts (not in an emergency)
  if (oldShift !== shift && !activity.startsWith('EMERGENCY: ')) {
    // Run shift change checks

    // Day shift has a 75% chance of being rostered on
    if (shift == 'day' && Math.random() < 0.95) {
      onDuty = true
    }
    // Night shift has a 50% chance of being rostered on
    else if (shift == 'night' && Math.random() < 0.5) {
      onDuty = true
    }
    // Data will be off duty otherwise
    else {
      onDuty = false
    }
  }

  // Set up to repeat the function after the shift ends (with trigger "shift")
  setTimeout(() => {
    dataPresence('shift')
  }, endTime)
  // Log the time Data's shift ends (hours, minutes and seconds)
  console.log(`Shift: ${onDuty ? shift : 'off'} duty`)
  console.log(
    `Shift ends in ${Math.floor(endTime / 1000 / 60 / 60)} hours, ${Math.floor(
      (endTime / 1000 / 60) % 60
    )} minutes and ${Math.floor((endTime / 1000) % 60)} seconds.`
  )

  // Set Data's activity if he is on duty, he will be doing his bridge dutys by default
  if (onDuty) {
    dataClient.user.setPresence({
      activities: [
        {
          type: 0, // Playing
          name: 'TASK: Bridge duty.',
        },
      ],
    })
  }
  // Then if it's the night shift, Data will have a 50% chance of running his dream program
  else if (shift == 'night' && Math.random() < 0.5) {
    dataClient.user.setPresence({
      activities: [
        {
          type: 0, // Playing
          name: 'ACTIVITY: Running dream subroutines.',
        },
      ],
    })
  }
  // If not then check if it's time for the weekly poker game (on Tuesday in the first 5 mins of 4pm and if not during an emergency)
  else if (
    time.getDay() == 2 &&
    time.getHours() == 16 &&
    time.getMinutes() < 5 &&
    !activity.startsWith('EMERGENCY: ')
  ) {
    dataClient.user.setPresence({
      activities: [
        {
          type: 0, // Playing
          name: 'ACTIVITY: Playing weekly poker game with the senior staff.',
        },
      ],
    })

    var duration = 1000 * 60 * 60 * 1.5 // 1.5 hours
    var variance = 1000 * 60 * 60 * 0.5 // 0.5 hours, so the game will last between 1 and 2 hours

    // Set a random timeout between the activity's (duration - variance) and (duration + variance)
    var offset = Math.floor(Math.random() * (variance * 2)) - variance
    setTimeout(() => {
      dataPresence('activity')
    }, duration + offset)
    // Log the time Data's activity ends (hours, minutes and seconds)
    console.log(
      `Activity ends in ${Math.floor(
        (duration + offset) / 1000 / 60 / 60
      )} hours, ${Math.floor(
        ((duration + offset) / 1000 / 60) % 60
      )} minutes and ${Math.floor(((duration + offset) / 1000) % 60)} seconds.`
    )
  }
  // If not then check if it's time for First Contact celebrations (on the 6th of April in the first 5 mins of 4pm and if not during an emergency)
  else if (
    time.getDate() == 6 &&
    time.getMonth() == 3 &&
    time.getHours() == 16 &&
    time.getMinutes() < 5 &&
    !activity.startsWith('EMERGENCY: ')
  ) {
    dataClient.user.setPresence({
      activities: [
        {
          type: 0, // Playing
          name: 'ACTIVITY: Attending First Contact celebrations in Ten Forward.',
        },
      ],
    })

    var duration = 1000 * 60 * 60 * 4 // 4 hours
    var variance = 1000 * 60 * 60 * 1 // 1 hour, so the celebrations will last between 3 and 5 hours

    // Set a random timeout between the activity's (duration - variance) and (duration + variance)
    var offset = Math.floor(Math.random() * (variance * 2)) - variance
    setTimeout(() => {
      dataPresence('activity')
    }, duration + offset)
    // Log the time Data's activity ends (hours, minutes and seconds)
    console.log(
      `Activity ends in ${Math.floor(
        (duration + offset) / 1000 / 60 / 60
      )} hours, ${Math.floor(
        ((duration + offset) / 1000 / 60) % 60
      )} minutes and ${Math.floor(((duration + offset) / 1000) % 60)} seconds.`
    )
  }
  // If not then check if it's time for the Captain Picard Day celebrations and competition (on the 17th of July in the first 5 mins of 4pm and if not during an emergency)
  else if (
    time.getDate() == 17 &&
    time.getMonth() == 6 &&
    time.getHours() == 16 &&
    time.getMinutes() < 5 &&
    !activity.startsWith('EMERGENCY: ')
  ) {
    dataClient.user.setPresence({
      activities: [
        {
          type: 0, // Playing
          name: 'ACTIVITY: Attending the Captain Picard Day celebrations and contest.',
        },
      ],
    })

    var duration = 1000 * 60 * 60 * 4 // 4 hours
    var variance = 1000 * 60 * 60 * 1 // 1 hour, so the celebrations will last between 3 and 5 hours

    // Set a random timeout between the activity's (duration - variance) and (duration + variance)
    var offset = Math.floor(Math.random() * (variance * 2)) - variance
    setTimeout(() => {
      dataPresence('activity')
    }, duration + offset)
    // Log the time Data's activity ends (hours, minutes and seconds)
    console.log(
      `Activity ends in ${Math.floor(
        (duration + offset) / 1000 / 60 / 60
      )} hours, ${Math.floor(
        ((duration + offset) / 1000 / 60) % 60
      )} minutes and ${Math.floor(((duration + offset) / 1000) % 60)} seconds.`
    )
  }
  // If not then pick a random activity
  else {
    // Start by filtering out all available activities (all activities with conditions returning true)
    var activities = dataActivities.filter((activity) => {
      return activity.condition()
    })

    // Now filter out all activities that are not the same as Data's current activity
    activities = activities.filter((activity) => {
      // Check if string and doesn't match
      if (typeof activity.name == 'string' && activity.name != activity)
        return true
      // Check if array and doesn't contain the activity
      else if (
        typeof activity.name == 'object' &&
        !activity.name.includes(activity)
      )
        return true
      // If it is an array, then drop the matching element and return true
      else if (typeof activity.name == 'object') {
        activity.name = activity.name.splice(activity.name.indexOf(activity), 1)
        return true
      }
      // Otherwise, return false
      else return false
    })

    // Now, pick a random activity from the filtered list
    var activity = activities[Math.floor(Math.random() * activities.length)]

    // Set Data's activity
    // If there is an array of names then pick a random one
    dataClient.user.setPresence({
      activities: [
        {
          type: 0, // Playing
          name:
            typeof activity.name == 'string'
              ? activity.name
              : activity.name[Math.floor(Math.random() * activity.name.length)],
        },
      ],
    })

    // Set a random timeout between the activity's (duration - variance) and (duration + variance)
    var offset =
      Math.floor(Math.random() * (activity.variance * 2)) - activity.variance
    setTimeout(() => {
      dataPresence('activity')
    }, activity.duration + offset)
    // Log the time Data's activity ends (hours, minutes and seconds)
    console.log(
      `Activity ends in ${Math.floor(
        (activity.duration + offset) / 1000 / 60 / 60
      )} hours, ${Math.floor(
        ((activity.duration + offset) / 1000 / 60) % 60
      )} minutes and ${Math.floor(
        ((activity.duration + offset) / 1000) % 60
      )} seconds.`
    )
  }
}

// Every 100 seconds, check for adding a task or emergency
setInterval(interuptEvent, 100000)

function interuptEvent() {
  console.log('Checking for interupts...')
  var interrupt

  // Emergencies will happen just over once a week, but will decrease as the day goes on
  // Day shift has a 1.5c chance of happening, swing shift has a 1c chance of happening, and night shift has a 0.5c chance of happening
  // C will be equal to 1/1500 chance of happening (Just over 1 in 2016, just over once a week)
  // Emergencies will not happen if another emergency is already in progress

  // Run emergency checks if an emergency is not already happening
  if (!dataClient.user.presence.activities[0].name.startsWith('EMERGENCY: ')) {
    // Run check depending on current shift
    if (shift == 'day' && Math.random() < 1.5 / 1500) interrupt = interupts[0]
    else if (shift == 'swing' && Math.random() < 1 / 1500)
      interrupt = interupts[0]
    else if (shift == 'night' && Math.random() < 0.5 / 1500)
      interrupt = interupts[0]
    // Now can run task checks if no task (except if the task is bridge duty) is being done also and it's not night
    else if (
      shift !== 'night' &&
      (dataClient.user.presence.activities[0].name == 'TASK: Bridge duty' ||
        !dataClient.user.presence.activities[0].name.startsWith('TASK: '))
    ) {
      // If on-duty (and therefore not doing a task), then there is a one in 25 chance of a task starting
      // If off-duty and not doing an activity, then there is also a one in 50 chance of a task starting
      // But if you are off-duty and doing an activity, then there is a one in 100

      // Run the checks defined above
      if (onDuty && Math.random() < 1 / 25) interrupt = interupts[1]
      else if (
        !onDuty &&
        dataClient.user.presence.activities[0].name == `${shift} shift` &&
        Math.random() < 1 / 50
      )
        interrupt = interupts[1]
      else if (
        !onDuty &&
        dataClient.user.presence.activities[0].name !== `${shift} shift` &&
        Math.random() < 1 / 100
      )
        interrupt = interupts[1]
    }
  }

  // If an interrupt event was chosen, update the presence
  if (interrupt) {
    // Set Data's activity
    // Since there is an array of names, pick a random one
    dataClient.user.setPresence({
      activities: [
        {
          type: 0, // Playing
          name: interrupt.name[
            Math.floor(Math.random() * interrupt.name.length)
          ],
        },
      ],
    })

    // Set a random timeout between the interrupt's (duration - variance) and (duration + variance)
    var offset =
      Math.floor(Math.random() * (interrupt.variance * 2)) - interrupt.variance
    setTimeout(() => {
      dataPresence('interrupt')
    }, interrupt.duration + offset)
    // Log the time Data's interrupt ends (hours, minutes and seconds)
    console.log('Interrupt event initiated.')
    console.log(
      `Interrupt ends in ${Math.floor(
        (interrupt.duration + offset) / 1000 / 60 / 60
      )} hours, ${Math.floor(
        ((interrupt.duration + offset) / 1000 / 60) % 60
      )} minutes and ${Math.floor(
        ((interrupt.duration + offset) / 1000) % 60
      )} seconds.`
    )
  } else {
    console.log('No interrupt event.')
  }
}

async function timer(client, sort = false) {
  // Get the timers
  // It will be in the following format:
  // [
  //   {
  //     "id": (string), // The ID of the message that will be updated
  //     "channel": (string), // The ID of the channel that the message is in
  //     "title": (string), // The title of the event that is being counted down to
  //     "datetime": (string), // The datetime that the event will occur
  //     "estimated": (boolean) // Whether the datetime is estimated or not
  //   },
  //   ...
  // ]

  var timecheck = await getData('timers')

  var tcText = JSON.stringify(timecheck)

  // If sort is true, then sort the events by datetime
  if (sort) {
    // Sort the events by datetime
    var sorted = timecheck.sort((a, b) => {
      return new Date(b.datetime) - new Date(a.datetime)
    })

    // If the sorted array is different to the original array, then update the timers
    if (JSON.stringify(sorted) !== JSON.stringify(timecheck)) {
      timecheck = sorted
    }
  }

  // Loop through each event
  // The client is minutesClient, which is the bot that sends the messages
  timecheck = timecheck.filter(async (event) => {
    // Get the message that will be updated
    var message = null
    // First get the message as if it's a server
    try {
      await minutesClient.channels
        .fetch(event.channel)
        .then((channel) =>
          channel.messages.fetch(event.id).then((msg) => (message = msg))
        )
    } catch (error) {
      console.error(error)
    }

    var date = new Date()

    // Get the time difference between now and the event
    var difference = new Date(event.datetime) - date

    // If the event has already happened, then delete the message and the event from the array
    if (difference < 1000) {
      try {
        message.delete()
      } catch (error) {
        console.error(error)
      }

      var newTimers = (await getData('timers')) || []

      newTimers.splice(newTimers.indexOf(event), 1)

      setData('timers', newTimers)

      return false
    }
    // Otherwise, update the message
    else {
      // Only display the uppermost unit (years, months, days, hours, minutes or seconds)
      // Seconds will be in units of 10 when paired with minutes, otherwise in units of 1
      var messages = [
        Math.floor(difference / (1000 * 3600 * 24 * 365)) +
        ' years and ' +
        Math.floor((difference / (1000 * 3600 * 24 * 30)) % 12) +
        ' months',
        Math.floor(difference / (1000 * 3600 * 24 * 30)) +
        ' months and ' +
        Math.floor((difference / (1000 * 3600 * 24 * 7)) % 4) +
        ' weeks',
        Math.floor(difference / (1000 * 3600 * 24 * 7)) +
        ' weeks and ' +
        Math.floor((difference / (1000 * 3600 * 24)) % 7) +
        ' days',
        Math.floor(difference / (1000 * 3600 * 24)) +
        ' days and ' +
        Math.floor((difference / (1000 * 3600)) % 24) +
        ' hours',
        Math.floor(difference / (1000 * 3600)) +
        ' hours and ' +
        Math.floor((difference / (1000 * 60)) % 60) +
        ' minutes',
        Math.floor(difference / (1000 * 60)) +
        ' minutes and ' +
        Math.floor(((difference / 1000) % 60) / 10) +
        '0 seconds',
        Math.floor(difference / 1000) + ' seconds',
      ]

      // Set diffmessage to the first message that does not begin with "0 "
      var diffmessage = messages.find((message) => !message.startsWith('0 '))

      // If the message begins with "1 ", replace the "s and " with " and "
      if (diffmessage.startsWith('1 '))
        diffmessage = diffmessage.replace('s and ', ' and ')

      // If the message contains " and 1 ", delete the final letter
      if (diffmessage.includes(' and 1 '))
        diffmessage = diffmessage.slice(0, -1)
      // Else if the message contains " and 0", delete everything after (and including) " and 0"
      else if (diffmessage.includes(' and 0'))
        diffmessage = diffmessage.slice(0, diffmessage.indexOf(' and 0'))

      var text = `**${event.title}**\n... in ${event.estimated ? 'approximately ' : ''
        }${diffmessage}`

      // Try to update the message, if that fails then send a new message and update the event in the array
      try {
        // Only update the message if the text is different, but not undefined
        if (message.content !== undefined && message.content !== text)
          message.edit(text)
      } catch (error) {
        console.error(error)
      }
    }
    return true
  })

  // If the timers need to be updated, then update them
  if (tcText !== JSON.stringify(timecheck)) setData('timers', timecheck)

  // Check/Update the sneeze count
  checkSneeze(client)
}

async function getPeople() {
  // Get the 'notify' data from the users from firebase
  const docRef = firebase.collection(firebase.supedb, 'users')
  const docSnap = await firebase.getDocs(docRef)
  const docs = docSnap.docs.filter((doc) => doc.data().notify)
  const final = docs.map((doc) => {
    return {
      name: doc.data().name,
      email: doc.data().email,
      discord: doc.data().discord || null,
      watching: doc.data().notify,
    }
  })
  return final
}