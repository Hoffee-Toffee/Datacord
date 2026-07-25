import { Client, GatewayIntentBits } from 'discord.js'

var shift = '' // Current shift
var onDuty = false // Is Data on duty?
var currentDataActivity = 'TASK: Bridge duty.'
var dataShiftTimeout = null
var dataActivityTimeout = null

const dataActivities = [
  {
    name: 'ACTIVITY: Playing poker with Stephen Hawking, Albert Einstein, and Isaac Newton on the holodeck.',
    duration: 1000 * 60 * 60 * 2,
    variance: 1000 * 60 * 30,
    condition: () => true,
  },
  {
    name: 'ACTIVITY: Playing a Sherlock Holmes holonovel with Geordi.',
    duration: 1000 * 60 * 60,
    variance: 1000 * 60 * 20,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Playing a Dixon Hill holonovel with Picard.',
    duration: 1000 * 60 * 60,
    variance: 1000 * 60 * 20,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Playing the violin in Ten Forward.',
    duration: 1000 * 60 * 60 * 1.5,
    variance: 1000 * 60 * 60,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Playing the oboe in Ten Forward.',
    duration: 1000 * 60 * 60 * 0.5,
    variance: 1000 * 60 * 60 * 0.25,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Playing the flute in Ten Forward.',
    duration: 1000 * 60 * 60 * 0.5,
    variance: 1000 * 60 * 60 * 0.25,
    condition: () => shift !== 'night',
  },
  {
    name: [
      'ACTIVITY: Performing "Blue Skies" in Ten Forward.',
      'ACTIVITY: Singing "Blue Skies" in Ten Forward.',
    ],
    duration: 1000 * 60 * 4,
    variance: 1000 * 30,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Playing a game of Strategema against a holographic Kolrami.',
    duration: 1000 * 60 * 7,
    variance: 1000 * 60 * 2,
    condition: () => true,
  },
  {
    name: 'ACTIVITY: Playing the titular character of Henry V in a performance of Shakespeare\'s play, "Henry V" in Ten Forward.',
    duration: 1000 * 60 * 60 * 3.1,
    variance: 1000 * 60 * 10,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Playing the psychiatrist in a performance of Beverly Crusher\'s play, "Frame of Mind" in Ten Forward.',
    duration: 1000 * 60 * 60 * 2.1,
    variance: 1000 * 60 * 10,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Playing Prospero in Shakespeare\'s play, "The Tempest".',
    duration: 1000 * 60 * 60 * 2.1,
    variance: 1000 * 60 * 10,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Reciting "Ode to Spot" in Ten Forward.',
    duration: 1000 * 60 * 2.5,
    variance: 1000 * 30,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Playing with Spot.',
    duration: 1000 * 60 * 60,
    variance: 1000 * 60 * 30,
    condition: () => true,
  },
  {
    name: 'ACTIVITY: Watching Spot sleep.',
    duration: 1000 * 60 * 45,
    variance: 1000 * 60 * 15,
    condition: () => true,
  },
  {
    name: 'ACTIVITY: Playing in a chess tournament.',
    duration: 1000 * 60 * 60 * 5,
    variance: 1000 * 60 * 60,
    condition: () => shift !== 'night' && Math.random() < 0.3,
  },
  {
    name: 'ACTIVITY: Playing in a holographic chess tournament.',
    duration: 1000 * 60 * 60 * 5,
    variance: 1000 * 60 * 60,
    condition: () => true,
  },
  {
    name: [
      'ACTIVITY: Playing Vulcan chess against Ambassador Spock.',
      'ACTIVITY: Playing Vulcan chess against Tuvok.',
    ],
    duration: 1000 * 60 * 60 * 1.25,
    variance: 1000 * 60 * 15,
    condition: () => shift !== 'night' && Math.random() < 0.1,
  },
  {
    name: 'ACTIVITY: Playing a benign version of the unnamed Ktarian game.',
    duration: 1000 * 60 * 30,
    variance: 1000 * 60 * 15,
    condition: () => true,
  },
  {
    name: [
      'ACTIVITY: Playing Kotra against Garak.',
      'ACTIVITY: Playing Kotra against Nog.',
      "ACTIVITY: Playing Kotra against O'Brien.",
      'ACTIVITY: Playing Kotra against a holographic Dukat.',
    ],
    duration: 1000 * 60 * 60 * 1.5,
    variance: 1000 * 60 * 30,
    condition: () => shift !== 'night' && Math.random() < 0.1,
  },
  {
    name: 'ACTIVITY: Playing Baccarat against Bashir.',
    duration: 1000 * 60 * 60,
    variance: 1000 * 60 * 30,
    condition: () => shift !== 'night' && Math.random() < 0.1,
  },
  {
    name: 'ACTIVITY: Playing Blackjack with Fontaine.',
    duration: 1000 * 60 * 30,
    variance: 1000 * 60 * 15,
    condition: () => true,
  },
  {
    name: 'ACTIVITY: Playing the video game, "Matrix of Doom".',
    duration: 1000 * 60 * 60 * 2,
    variance: 1000 * 60 * 30,
    condition: () => true,
  },
  {
    name: [
      'ACTIVITY: Playing Gin Rummy against Fontaine',
      'ACTIVITY: Playing Gin Rummy with Tuvok',
      'ACTIVITY: Playing Gin Rummy against Chakotay',
    ],
    duration: 1000 * 60 * 60 * 1,
    variance: 1000 * 60 * 30,
    condition: () => shift !== 'night' && Math.random() < 0.1,
  },
  {
    name: 'ACTIVITY: Attending a wedding ceremony in Ten Forward.',
    duration: 1000 * 60 * 60,
    variance: 1000 * 60 * 30,
    condition: () => shift == 'swing' && Math.random() < 0.5,
  },
  {
    name: 'ACTIVITY: Listening to a concert in Ten Forward.',
    duration: 1000 * 60 * 60 * 2,
    variance: 1000 * 60 * 30,
    condition: () => shift == 'swing',
  },
  {
    name: 'ACTIVITY: Listening to Picard perform "The Inner Light" on his Ressikan flute in Ten Forward.',
    duration: 1000 * 60 * 30,
    variance: 1000 * 60 * 15,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Listening to Riker play his trombone in Ten Forward.',
    duration: 1000 * 60 * 20,
    variance: 1000 * 60 * 10,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Listening to Worf sing Klingon opera in Ten Forward.',
    duration: 1000 * 60 * 20,
    variance: 1000 * 60 * 10,
    condition: () => shift !== 'night',
  },
  {
    name: "ACTIVITY: Watching Worf compete in a Bat'leth tournament on the holodeck.",
    duration: 1000 * 60 * 60 * 2,
    variance: 1000 * 60 * 30,
    condition: () => shift !== 'night' && Math.random() < 0.3,
  },
  {
    name: 'ACTIVITY: Watching a performance of Beverly Crusher\'s play, "Something for Breakfast" in Ten Forward.',
    duration: 1000 * 60 * 60 * 2,
    variance: 1000 * 60 * 10,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Trying to create new nutrient supplements for Spot.',
    duration: 1000 * 60 * 40,
    variance: 1000 * 60 * 20,
    condition: () => true,
  },
  {
    name: 'ACTIVITY: Writing poetry.',
    duration: 1000 * 60 * 60,
    variance: 1000 * 60 * 30,
    condition: () => true,
  },
  {
    name: [
      'ACTIVITY: Rehearsing for an upcoming play with the rest of the cast.',
      'ACTIVITY: In an acting class run by Beverly Crusher.',
    ],
    duration: 1000 * 60 * 60,
    variance: 1000 * 60 * 30,
    condition: () => shift == 'swing',
  },
  {
    name: [
      'ACTIVITY: Painting a portrait of Spot.',
      'ACTIVITY: Painting the Enterprise.',
      'ACTIVITY: Painting a nebula.',
      'ACTIVITY: Painting elements from his latest dream.',
    ],
    duration: 1000 * 60 * 60 * 1.5,
    variance: 1000 * 60 * 30,
    condition: () => true,
  },
  {
    name: 'ACTIVITY: Discussing classical music with Picard.',
    duration: 1000 * 60 * 20,
    variance: 1000 * 60 * 10,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: In Ten Forward, trying out new foods and beverages with his emotion chip engaged.',
    duration: 1000 * 60 * 30,
    variance: 1000 * 60 * 15,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Trying out new foods and beverages with his replicator and his emotion chip engaged.',
    duration: 1000 * 60 * 20,
    variance: 1000 * 60 * 10,
    condition: () => true,
  },
  {
    name: "ACTIVITY: Viewing and discussing Picard's archeology collection with him.",
    duration: 1000 * 60 * 45,
    variance: 1000 * 60 * 15,
    condition: () => shift !== 'night',
  },
  {
    name: 'ACTIVITY: Reading "Anslem" by Jake Sisko.',
    duration: 1000 * 60 * 60 * 1.5,
    variance: 1000 * 60 * 30,
    condition: () => true,
  },
]

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
    duration: 1000 * 60 * 60 * 6,
    variance: 1000 * 60 * 60 * 2,
    condition: () => true,
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
    duration: 1000 * 60 * 60 * 1.5,
    variance: 1000 * 60 * 60 * 0.5,
    condition: () => true,
  },
]

const dataClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
  ],
})

dataClient.login(process.env.DATA_DISCORD_TOKEN)

dataClient.on('ready', () => {
  dataPresence()
  interuptEvent()
})

function setBotPresence(activityName) {
  currentDataActivity = activityName
  dataClient.user.setPresence({
    activities: [
      {
        type: 0, // Playing
        name: activityName,
      },
    ],
  })
}

function dataPresence(trigger = 'reset') {
  var activity = ''

  if (trigger !== 'reset') {
    activity = currentDataActivity
  }

  if (trigger == 'shift' && activity == 'TASK: Bridge duty.') {
    activity = ''
  } else if (
    trigger == 'interrupt' &&
    (activity.startsWith('EMERGENCY: ') || activity.startsWith('TASK: '))
  ) {
    activity = ''
  } else if (
    trigger == 'activity' &&
    activity != 'TASK: Bridge duty.' &&
    !activity.startsWith('EMERGENCY: ') &&
    !activity.startsWith('TASK: ')
  ) {
    activity = ''
  }

  var time = new Date()
  var endTime

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

  if (oldShift !== shift && !activity.startsWith('EMERGENCY: ')) {
    if (shift == 'day' && Math.random() < 0.95) {
      onDuty = true
    } else if (shift == 'night' && Math.random() < 0.5) {
      onDuty = true
    } else {
      onDuty = false
    }
  }

  if (dataShiftTimeout) clearTimeout(dataShiftTimeout)
  dataShiftTimeout = setTimeout(() => {
    dataPresence('shift')
  }, endTime)

  console.log(`Shift: ${onDuty ? shift : 'off'} duty`)
  console.log(
    `Shift ends in ${Math.floor(endTime / 1000 / 60 / 60)} hours, ${Math.floor(
      (endTime / 1000 / 60) % 60,
    )} minutes and ${Math.floor((endTime / 1000) % 60)} seconds.`,
  )

  if (activity === '') {
    if (onDuty) {
      setBotPresence('TASK: Bridge duty.')
    } else if (shift == 'night' && Math.random() < 0.5) {
      setBotPresence('ACTIVITY: Running dream subroutines.')
    } else if (
      time.getDay() == 2 &&
      time.getHours() == 16 &&
      time.getMinutes() < 5
    ) {
      setBotPresence('ACTIVITY: Playing weekly poker game with the senior staff.')

      var duration = 1000 * 60 * 60 * 1.5
      var variance = 1000 * 60 * 60 * 0.5

      var offset = Math.floor(Math.random() * (variance * 2)) - variance
      if (dataActivityTimeout) clearTimeout(dataActivityTimeout)
      dataActivityTimeout = setTimeout(() => {
        dataPresence('activity')
      }, duration + offset)

      console.log(
        `Activity ends in ${Math.floor(
          (duration + offset) / 1000 / 60 / 60,
        )} hours, ${Math.floor(
          ((duration + offset) / 1000 / 60) % 60,
        )} minutes and ${Math.floor(((duration + offset) / 1000) % 60)} seconds.`,
      )
    } else if (
      time.getDate() == 6 &&
      time.getMonth() == 3 &&
      time.getHours() == 16 &&
      time.getMinutes() < 5
    ) {
      setBotPresence('ACTIVITY: Attending First Contact celebrations in Ten Forward.')

      var duration = 1000 * 60 * 60 * 4
      var variance = 1000 * 60 * 60 * 1

      var offset = Math.floor(Math.random() * (variance * 2)) - variance
      if (dataActivityTimeout) clearTimeout(dataActivityTimeout)
      dataActivityTimeout = setTimeout(() => {
        dataPresence('activity')
      }, duration + offset)

      console.log(
        `Activity ends in ${Math.floor(
          (duration + offset) / 1000 / 60 / 60,
        )} hours, ${Math.floor(
          ((duration + offset) / 1000 / 60) % 60,
        )} minutes and ${Math.floor(((duration + offset) / 1000) % 60)} seconds.`,
      )
    } else if (
      time.getDate() == 17 &&
      time.getMonth() == 6 &&
      time.getHours() == 16 &&
      time.getMinutes() < 5
    ) {
      setBotPresence('ACTIVITY: Attending the Captain Picard Day celebrations and contest.')

      var duration = 1000 * 60 * 60 * 4
      var variance = 1000 * 60 * 60 * 1

      var offset = Math.floor(Math.random() * (variance * 2)) - variance
      if (dataActivityTimeout) clearTimeout(dataActivityTimeout)
      dataActivityTimeout = setTimeout(() => {
        dataPresence('activity')
      }, duration + offset)

      console.log(
        `Activity ends in ${Math.floor(
          (duration + offset) / 1000 / 60 / 60,
        )} hours, ${Math.floor(
          ((duration + offset) / 1000 / 60) % 60,
        )} minutes and ${Math.floor(((duration + offset) / 1000) % 60)} seconds.`,
      )
    } else {
      var activities = dataActivities.filter((act) => act.condition())

      activities = activities.filter((act) => {
        if (typeof act.name == 'string') return act.name !== currentDataActivity
        else if (typeof act.name == 'object') {
          const idx = act.name.indexOf(currentDataActivity)
          if (idx !== -1) act.name.splice(idx, 1)
          return act.name.length > 0
        }
        return false
      })

      if (activities.length > 0) {
        var activityObj = activities[Math.floor(Math.random() * activities.length)]
        var activityName =
          typeof activityObj.name == 'string'
            ? activityObj.name
            : activityObj.name[Math.floor(Math.random() * activityObj.name.length)]

        setBotPresence(activityName)

        var offset =
          Math.floor(Math.random() * (activityObj.variance * 2)) - activityObj.variance
        if (dataActivityTimeout) clearTimeout(dataActivityTimeout)
        dataActivityTimeout = setTimeout(() => {
          dataPresence('activity')
        }, activityObj.duration + offset)

        console.log(
          `Activity ends in ${Math.floor(
            (activityObj.duration + offset) / 1000 / 60 / 60,
          )} hours, ${Math.floor(
            ((activityObj.duration + offset) / 1000 / 60) % 60,
          )} minutes and ${Math.floor(
            ((activityObj.duration + offset) / 1000) % 60,
          )} seconds.`,
        )
      }
    }
  }
}

setInterval(interuptEvent, 100000)

function interuptEvent() {
  console.log('Checking for interupts...')
  var interrupt = null

  if (currentDataActivity.startsWith('EMERGENCY: ')) {
    console.log('Emergency in progress, no interrupt.')
    return
  }

  if (shift == 'day' && Math.random() < 1.5 / 1500) interrupt = interupts[0]
  else if (shift == 'swing' && Math.random() < 1 / 1500) interrupt = interupts[0]
  else if (shift == 'night' && Math.random() < 0.5 / 1500) interrupt = interupts[0]
  else if (
    shift !== 'night' &&
    (currentDataActivity == 'TASK: Bridge duty.' || !currentDataActivity.startsWith('TASK: '))
  ) {
    if (onDuty && Math.random() < 1 / 25) interrupt = interupts[1]
    else if (
      !onDuty &&
      currentDataActivity == `${shift} shift` &&
      Math.random() < 1 / 50
    )
      interrupt = interupts[1]
    else if (
      !onDuty &&
      currentDataActivity !== `${shift} shift` &&
      Math.random() < 1 / 100
    )
      interrupt = interupts[1]
  }

  if (interrupt) {
    var interruptName = interrupt.name[Math.floor(Math.random() * interrupt.name.length)]
    setBotPresence(interruptName)

    var offset =
      Math.floor(Math.random() * (interrupt.variance * 2)) - interrupt.variance
    if (dataActivityTimeout) clearTimeout(dataActivityTimeout)
    dataActivityTimeout = setTimeout(() => {
      dataPresence('interrupt')
    }, interrupt.duration + offset)

    console.log('Interrupt event initiated.')
    console.log(
      `Interrupt ends in ${Math.floor(
        (interrupt.duration + offset) / 1000 / 60 / 60,
      )} hours, ${Math.floor(
        ((interrupt.duration + offset) / 1000 / 60) % 60,
      )} minutes and ${Math.floor(((interrupt.duration + offset) / 1000) % 60)} seconds.`,
    )
  } else {
    console.log('No interrupt event.')
  }
}
