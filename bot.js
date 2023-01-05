const discordBotkit = require("botkit-discord");
const fs = require("fs");

const data_config = {
  token: process.env.DATA_DISCORD_TOKEN
};
const minutes_config = {
  token: process.env.MINUTES_DISCORD_TOKEN
};

const dataBot = discordBotkit(data_config);
const minutesBot = discordBotkit(minutes_config);

require("./skills/data.js")(dataBot);
require("./skills/minutes.js")(minutesBot);
module.exports = {
    dataBot,
    minutesBot
}

var linesdata = ""

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
// If off-duty for the Night shift, Data will perform activities on his own or engage in dream simulation / hybernation
// After each activity, Data will have a small break to account for travel time and crew interaction

var shift = ""; // Current shift
var onDuty = false; // Is Data on duty?

const dataActivities = [ // Array of random activities
  {
    name: "ACTIVITY: Playing poker with Stephen Hawking, Albert Einstein, and Isaac Newton on the holodeck.",
    duration: 1000 * 60 * 60 * 2, // 2 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1.5 and 2.5 hours
    condition: () => true // Can play any time
  },
  {
    name: "ACTIVITY: Playing a Sherlock Holmes holonovel with Geordi.",
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 20, // 20 minutes, variance for this activity, so it can be between 0.8 and 1.2 hours
    condition: () => shift !== "night" // La Forge is unavailable during the night shift
  },
  {
    name: "ACTIVITY: Playing a Dixon Hill holonovel with Picard.",
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 20, // 20 minutes, variance for this activity, so it can be between 0.8 and 1.2 hours
    condition: () => shift !== "night" // Picard is unavailable during the night shift
  },
  {
    name: "ACTIVITY: Playing the violin in Ten Forward.",
    duration: 1000 * 60 * 60 * 1.5, // 1.5 hours, average time for this activity
    variance: 1000 * 60 * 60, // 1 hour, variance for this activity, so it can be between 0.5 and 2.5 hours
    condition: () => shift !== "night" // Data won't play during the night shift to avoid waking up the crew
  },
  {
    name: "ACTIVITY: Playing the oboe in Ten Forward.",
    duration: 1000 * 60 * 60 * 0.5, // 1.25 hours, average time for this activity
    variance: 1000 * 60 * 60 * 0.25, // 15 minutes, variance for this activity, so it can be between 0.25 and 0.75 hours
    condition: () => shift !== "night" // Data won't play during the night shift to avoid waking up the crew
  },
  {
    name: "ACTIVITY: Playing the flute in Ten Forward.",
    duration: 1000 * 60 * 60 * 0.5, // 1.25 hours, average time for this activity
    variance: 1000 * 60 * 60 * 0.25, // 15 minutes, variance for this activity, so it can be between 0.25 and 0.75 hours
    condition: () => shift !== "night" // Data won't play during the night shift to avoid waking up the crew
  },
  {
    name: ["ACTIVITY: Performing \"Blue Skies\" in Ten Forward.", "ACTIVITY: Singing \"Blue Skies\" in Ten Forward."],
    duration: 1000 * 60 * 4, // 4 minutes, average time for this activity
    variance: 1000 * 30, // 30 seconds, variance for this activity, so it can be between 3.5 and 4.5 minutes long
    condition: () => shift !== "night" // Data won't play during the night shift to avoid waking up the crew
  },
  {
    name: "ACTIVITY: Playing a game of Strategema against a holographic Kolrami.",
    duration: 1000 * 60 * 7, // 7 minutes, average time for this activity
    variance: 1000 * 60 * 2, // 2 minutes, variance for this activity, so it can be between 5 and 9 minutes long
    condition: () => true // Can play any time
  },
  {
    name: "ACTIVITY: Playing the titular character of Henry V in a performance of Shakespeare's play, \"Henry V\" in Ten Forward.",
    duration: 1000 * 60 * 60 * 3.1, // 3.1 hours, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 3 and 3.2 hours long
    condition: () => shift !== "night" // Data won't play during the night as people will be unavailable
  },
  {
    name: "ACTIVITY: Playing the psychiatrist in a performance of Beverly Crusher's play, \"Frame of Mind\" in Ten Forward.",
    duration: 1000 * 60 * 60 * 2.1, // 2.1 hours, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 2 and 2.2 hours long
    condition: () => shift !== "night" // Data won't play during the night as people will be unavailable
  },
  {
    name: "ACTIVITY: Playing Prospero in Shakespeare's play, \"The Tempest\".",
    duration: 1000 * 60 * 60 * 2.1, // 2.1 hours, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 2 and 2.2 hours long
    condition: () => shift !== "night" // Data won't play during the night as people will be unavailable
  },
  {
    name: "ACTIVITY: Reciting \"Ode to Spot\" in Ten Forward.",
    duration: 1000 * 60 * 2.5, // 2.5 minutes, average time for this activity
    variance: 1000 * 30, // 30 seconds, variance for this activity, so it can be between 2 and 3 minutes long
    condition: () => shift !== "night" // Data won't play during the night as people will be unavailable
  },
  {
    name: "ACTIVITY: Playing with Spot.",
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => true // Can play any time
  },
  {
    name: "ACTIVITY: Watching Spot sleep.",
    duration: 1000 * 60 * 45, // 45 minutes, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 0.5 and 1 hour long
    condition: () => true // Can play any time
  },
  {
    name: "ACTIVITY: Playing in a chess tournament.",
    duration: 1000 * 60 * 60 * 5, // 5 hours, average time for this activity
    variance: 1000 * 60 * 60, // 1 hour, variance for this activity, so it can be between 4 and 6 hours long
    condition: () => shift !== "night" // Data won't play during the night as people will be unavailable
  },
  {
    name: "ACTIVITY: Playing in a holographic chess tournament.",
    duration: 1000 * 60 * 60 * 5, // 5 hours, average time for this activity
    variance: 1000 * 60 * 60, // 1 hour, variance for this activity, so it can be between 4 and 6 hours long
    condition: () => true // Can play any time
  },
  {
    name: ["ACTIVITY: Playing Vulcan chess against Ambassador Spock.", "ACTIVITY: Playing Vulcan chess against Tuvok."],
    duration: 1000 * 60 * 60 * 1.25, // 1.25 hours, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 1 and 1.5 hours long
    condition: () => shift !== "night" // Data won't play during the night as people will be unavailable
  },
  {
    name: "ACTIVITY: Playing a benign version of the unnamed Ktarian game.",
    duration: 1000 * 60 * 30, // 20 minutes, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 5 and 35 minutes long
    condition: () => true // Can play any time
  },
  {
    name: ["ACTIVITY: Playing Kotra against Garak.", "ACTIVITY: Playing Kotra against Nog.", "ACTIVITY: Playing Kotra against O'Brien.", "ACTIVITY: Playing Kotra against a holographic Dukat."],
    duration: 1000 * 60 * 60 * 1.5, // 1.5 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1 and 2 hours long
    condition: () => shift !== "night" // Data won't play during the night as people will be unavailable
  },
  {
    name: "ACTIVITY: Playing Baccarat against Bashir.",
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => shift !== "night" // Data won't play during the night as people will be unavailable
  },
  {
    name: "ACTIVITY: Playing Blackjack with Fontaine.",
    duration: 1000 * 60 * 30, // 30 minutes, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 15 and 45 minutes long
    condition: () => true // Can play any time
  },
  {
    name: "ACTIVITY: Playing the video game, \"Matrix of Doom\".",
    duration: 1000 * 60 * 60 * 2, // 2 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1.5 and 2.5 hours long
    condition: () => true // Can play any time
  },
  {
    name: ["ACTIVITY: Playing Gin Rummy against Fontaine", "ACTIVITY: Playing Gin Rummy with Tuvok", "ACTIVITY: Playing Gin Rummy against Chakotay"],
    duration: 1000 * 60 * 60 * 1, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => shift !== "night" // Data won't play during the night as people will be unavailable
  },
  {
    name: "ACTIVITY: Attending a wedding ceremony in Ten Forward.",
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => shift == "swing" // Wedding ceremonies will only happen during the evening shift
  },
  {
    name: "ACTIVITY: Listening to a concert in Ten Forward.",
    duration: 1000 * 60 * 60 * 2, // 2 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1.5 and 2.5 hours long
    condition: () => shift == "swing" // Concerts will only happen during the evening shift
  },
  {
    name: "ACTIVITY: Listening to Picard perform \"The Inner Light\" on his Ressikan flute in Ten Forward.",
    duration: 1000 * 60 * 30, // 30 minutes, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 15 and 45 minutes long
    condition: () => shift !== "night" // Picard won't play during the night as people will be unavailable
  },
  {
    name: "ACTIVITY: Listening to Riker play his trombone in Ten Forward.",
    duration: 1000 * 60 * 20, // 20 minutes, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 10 and 30 minutes long
    condition: () => shift !== "night" // Riker won't play during the night as people will be unavailable
  },
  {
    name: "ACTIVITY: Listening to Worf sing Klingon opera in Ten Forward.",
    duration: 1000 * 60 * 20, // 20 minutes, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 10 and 30 minutes long
    condition: () => shift !== "night" // Worf won't sing during the night as people will be unavailable
  },
  {
    name: "ACTIVITY: Watching Worf compete in a Bat'leth tournament on the holodeck.",
    duration: 1000 * 60 * 60 * 2, // 2 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1.5 and 2.5 hours long
    condition: () => shift !== "night" // Worf won't play during the night as he will be unavailable
  },
  {
    name: "ACTIVITY: Watching a performance of Bevery Crusher's play, \"Something for Breakfast\" in Ten Forward.",
    duration: 1000 * 60 * 60 * 2, // 2.1 hours, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 1.9 and 2.1 hours long
    condition: () => shift !== "night" // Performance will only happen during the day
  },
  {
    name: "ACTIVITY: Trying to create new nutrient supplements for Spot.",
    duration: 1000 * 60 * 40, // 40 minutes, average time for this activity
    variance: 1000 * 60 * 20, // 20 minutes, variance for this activity, so it can be between 20 and 60 minutes long
    condition: () => true // Can do this any time
  },
  {
    name: "ACTIVITY: Writing poetry.",
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => true // Can do this any time
  },
  {
    name: ["ACTIVITY: Rehearsing for an upcoming play with the rest of the cast.", "ACTIVITY: In an acting class run by Beverly Crusher."],
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => shift == "swing" // Rehearsals will only happen during the evening shift
  },
  {
    name: ["ACTIVITY: Painting a portrait of Spot.", "ACTIVITY: Painting the Enterprise.", "ACTIVITY: Painting a nebula.", "ACTIVITY: Painting elements from his latest dream."],
    duration: 1000 * 60 * 60 * 1.5, // 1.5 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1 and 2 hours long
    condition: () => true // Can do this any time
  },
  {
    name: "ACTIVITY: Discussing classical music with Picard.",
    duration: 1000 * 60 * 20, // 20 minutes, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 10 and 30 minutes long
    condition: () => shift !== "night" // Picard won't be available during the night
  },
  {
    name: "ACTIVITY: In Ten Forward, trying out new foods and beverages with his emotion chip engaged.",
    duration: 1000 * 60 * 30, // 30 minutes, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 15 and 45 minutes long
    condition: () => shift !== "night" // Guinan will not be serving during the night
  },
  {
    name: "ACTIVITY: Trying out new foods and beverages with his replicator and his emotion chip engaged.",
    duration: 1000 * 60 * 20, // 20 minutes, average time for this activity
    variance: 1000 * 60 * 10, // 10 minutes, variance for this activity, so it can be between 10 and 30 minutes long
    condition: () => true // Can do this any time
  },
  {
    name: "ACTIVITY: Viewing and discussing Picard's archeology collection with him.",
    duration: 1000 * 60 * 45, // 45 minutes, average time for this activity
    variance: 1000 * 60 * 15, // 15 minutes, variance for this activity, so it can be between 30 and 60 minutes long
    condition: () => shift !== "night" // Picard won't be available during the night
  },
  {
    name: "ACTIVITY: Reading \"Anslem\" by Jake Sisko.",
    duration: 1000 * 60 * 60 * 1.5, // 1.5 hours, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 1 and 2 hours long
    condition: () => true // Can do this any time
  }
]

// Data may be interupted by several events, including those listed below:
const interupts = [
  {
    class: "emergency",
    name: ["EMERGENCY: Fighting a Borg invasion.", "EMERGENCY: Crew members trapped in malfunctioning holodeck.", "EMERGENCY: Warp core breach imminent.", "EMERGENCY: Biological contamination detected in the air supply.", "EMERGENCY: Q is testing the Enterprise.", "EMERGENCY: Temporal displacement detected, attempting to return to the present.", "EMERGENCY: Lore has infiltrated and taken control of the Enterprise.", "EMERGENCY: Moriarty has escaped and has taken control of the Enterprise.", "EMERGENCY: Away team has been captured during a mission.", "EMERGENCY: Responding to situation with the Mirror Universe.", "EMERGENCY: The Enterprise is being attacked by a Crystalline Entity.", "EMERGENCY: The Enterprise has been overrun by a Tribble infestation.", "EMERGENCY: Romulan forces have ambushed the Enterprise.", "EMERGENCY: Klingon forces have ambushed the Enterprise.", "EMERGENCY: Cardassian forces have ambushed the Enterprise.", "EMERGENCY: The Enterprise has been trapped in a time loop.", "EMERGENCY: The Enterprise is trapped in a spatial anomaly.", "EMERGENCY: Responding to a Bluegill invasion."],
    duration: 1000 * 60 * 60 * 6, // 6 hours, average time for this activity
    variance: 1000 * 60 * 60 * 2, // 2 hours, variance for this activity, so it can be between 4 and 8 hours long
    condition: () => true // Can occur at any time
  },
  {
    class: "task",
    name: ["TASK: In a meeting with the senior staff.", "TASK: Aiding Geordi in Main Engineering.", "TASK: Monitoring probe readings.", "TASK: Analysing asteroid sample.", "TASK: Contacting liason aboard Starbase 4514.", "TASK: Giving an Ambassador a tour of the Enterprise.", "TASK: Reviewing sensor logs from recovered shuttle.", "TASK: Reviewing Delta radiation readings in this sector.", "TASK: Analyzing nebula composition.", "TASK: Helping the Doctor synthesize a cure for a disease.", "TASK: Commanding the Bridge while Picard and Riker are absent.", "TASK: In the landing party investigating a planet.", "TASK: Orbiting a star in a shuttlecraft."],
    duration: 1000 * 60 * 60 * 1.5, // 1.5 hours, average time for this activity
    variance: 1000 * 60 * 60 * 0.5, // 0.5 hours, variance for this activity, so it can be between 1 and 2 hours long
    condition: () => true // Can occur at any time
  }
]

// Login to minutesBot and dataBot with discord.js
// Require discord.js
const { Client, GatewayIntentBits } = require('discord.js');
const { time } = require("console");

// Create the new clients instances including the intents needed for the bots like presence and guild messages
const minutesClient = new Client( { intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildPresences
] } );

const dataClient = new Client( { intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildPresences
] } );

// Log in to Discord with your clients tokens
minutesClient.login(process.env.MINUTES_DISCORD_TOKEN)
dataClient.login(process.env.DATA_DISCORD_TOKEN)


// Generate southern greetings
function genGreeting(plural = true) {
    var greets = ["howdy", "mornin'", "hello", "hiya", "hey", "good morning"]
    var subjects = [null, "there"]
    var users = [null];

    if (plural) {
        subjects.push("folks");
        subjects.push("y'all");
        subjects.push("guys");
        subjects.push("everybody");
    }
    else {
        subjects.push("partner");
        subjects.push("friend");
        subjects.push("pal");
        subjects.push("buddy");
        // subjects.push("USERNAME"); // Will be used in DMs in the future
    }

    // Get the parts of the greeting
    var g = greets[Math.floor(Math.random() * greets.length)];
    var s = subjects[Math.floor(Math.random() * subjects.length)];
    var u = users[Math.floor(Math.random() * users.length)];

    // Check for exceptions
    // "hiya" can't be used with "y'all", it will just be "hi"
    if (g == "hiya" && s == "y'all") g = "hi";

    // Generate the greeting
    var greeting = g + (s ? " " + s : "") + (u ? " " + u : "") + "!";

    // Return the greeting with the first letter capitalized
    return greeting.charAt(0).toUpperCase() + greeting.slice(1);
}

// Run when each client is ready
minutesClient.on("ready", () => {
    // Run the timer loop right away, but after ten seconds it will begin to run just over every second

    // Run the timer loop right away
    timer(true);

    // Set a timeout to wait 1.111 seconds for every timer in "timecheck.json" to be set
    var timecheck = JSON.parse(fs.readFileSync("./timecheck.json")).length;
    console.log("Waiting " + timecheck + " seconds for timers to be set...")

    setTimeout(() => {
        // Run the timer loop just over every second
        setInterval(timer, 800);
        console.log("Timers set and are being checked every 800ms.")
    }, timecheck * 1111);

    // Set the bot's presence
    minutesClient.user.setPresence({
        activities: [{
            name: "over the Sacred Timelines",
            type: 3,
        }]
    })
    
    // Send a greeting to the channel provided by the api
    minutesClient.channels.cache.get(process.env.MINUTES_ID).send(genGreeting());

    // Also send an embed test message
    // The embed timestamp depends on the time and weekday as the conditions below:
    // 1. Voting always closes on at 3pm on a weekday, never on a weekend
    // 2. The time between submitting a proposal and voting closing is always at least 72 hours (3 days)

    // Get the current time and date
    var now = new Date();

      // Add 13 hours to the time due to the time zone difference
    now.setHours(now.getHours() + 13);

    // Shift the date three days into the future
    now.setDate(now.getDate() + 3);

    // If this date is a weekend, shift it to the next Monday at 3pm
    if (now.getDay() == 0) { now.setDate(now.getDate() + 1); now.setTime(15, 0, 0, 0) }
    else if (now.getDay() == 6) { now.setDate(now.getDate() + 2); now.setTime(15, 0, 0, 0) }
    // Otherwise, if time is before 3pm, set it to 3pm
    else if (now.getHours() < 15) now.setTime(15, 0, 0, 0);
    // Otherwise, if time is after 3pm, set it to 3pm on the next weekday
    else if (now.getHours() >= 15 && now.getDay() != 5) { now.setDate(now.getDate() + 1); now.setTime(15, 0, 0, 0) }
    // Otherwise, if time is after 3pm on a Friday, set it to 3pm on the next Monday
    else if (now.getHours() >= 15 && now.getDay() == 5) {now.setDate(now.getDate() + 3); now.setTime(15, 0, 0, 0) }

    var closeTime = now.toISOString();


    var embed = {
        "content": `New proposal \"title\"`,
        "tts": false,
        "components": [
          {
            "type": 1,
            "components": [
              {
                "style": 3,
                "label": `Accept`,
                "custom_id": `accept`,
                "disabled": false,
                "type": 2
              },
              {
                "style": 4,
                "label": `Reject`,
                "custom_id": `reject`,
                "disabled": false,
                "type": 2
              }
            ]
          }
        ],
        "embeds": [
          {
            "type": "rich",
            "title": `Proposal Title`,
            "description": `Short description`,
            "color": 0xb2f703,
            "fields": [
              {
                "name": "0/3 votes",
                "value": "\u200b"
              }
            ],
            "timestamp": closeTime,
            "footer": {
              "text": `Voting close`
            },
            "url": `https://transit-lumber.github.io/supedb`
          }
        ]
    };

    minutesClient.channels.cache.get(process.env.MINUTES_ID).send(embed).then(msg => {
      // Create a function to handle the button clicks

      var votes = []

      function buttonHandler(interaction) {
        if (interaction.message.id !== msg.id) return;

        var reply = ``

        // Check if the user has already voted
        if (!votes.find(vote => vote.user == interaction.user.id)) {
          // If they haven't, add their vote to the array
          votes.push({ user: interaction.user.id, vote: interaction.customId });
          reply = `You voted to ${interaction.customId} the ${interaction.message.embeds[0].title} proposal.`
        }
        // If they have, then check if they are changing their vote
        else if (votes.find(vote => vote.user == interaction.user.id).vote !== interaction.customId) {
          // If they are, change their vote
          votes.find(vote => vote.user == interaction.user.id).vote = interaction.customId;
          reply = `You changed your vote to ${interaction.customId} the ${interaction.message.embeds[0].title} proposal.`
        }
        else {
          // Remove their vote from the array
          votes.splice(votes.findIndex(vote => vote.user == interaction.user.id), 1);
          reply = `You removed your vote to ${interaction.customId} the ${interaction.message.embeds[0].title} proposal.`
        }

        // DM the user with the message and delete it after 5 seconds
        interaction.user.send(reply).then(msg => { setTimeout(() => { msg.delete() }, 5000) });

        // Get the total number of votes
        var total = votes.length;
        embed.embeds[0].fields[0].name = `${total}/3 votes`;
        
        // Now, check if the vote is over (three users have voted)
        if (votes.length >= 3) {
          // If it is over, then disable the buttons
          embed.components[0].components.forEach(button => { button.disabled = true; });

          // Get the results
          var accept = votes.filter(vote => vote.vote == "accept").length;
          var reject = votes.filter(vote => vote.vote == "reject").length;

          reply = `Results:\n    Accept: ${accept}\n    Reject: ${reject}\n\n`
          reply += accept > reject ? `Proposal accepted!` : `Proposal rejected.`;

          // Reply to the proposal with the results
          interaction.message.reply(reply);
        }

        msg.edit(embed);

        // Acknowledge the interaction
        interaction.deferUpdate();
      }

      // Create a listener for the button clicks
      minutesClient.on("interactionCreate", buttonHandler);
    });

  });

dataClient.on("ready", () => {
    // Run the presence function
    dataPresence();
  
    // Run the interupt function
    interuptEvent();
});

function dataPresence(trigger = "reset") {
  // Get Data's current activity (unless the trigger is "reset")
  var activity = "";

  try {
    if (trigger !== "reset") activity = dataClient.user.presence.activities[0].name;
    else if (trigger == "shift" && activity == "TASK: Bridge duty") activity = "";
    else if (trigger == "interupt" && (activity.startsWith("EMERGENCY: ") || activity.startsWith("TASK: "))) activity = "";
    else if (trigger == "activity" && activity != "TASK: Bridge duty" && !activity.startsWith("EMERGENCY: ") && !activity.startsWith("TASK: ")) activity = "";
  }
  catch (err) {
    console.log(err);
  }

  // Update the shift variable
  var time = new Date();
  var endTime; // Will be the the difference between the current time and time the shift ends

  // Add 13 hours to the time due to the time zone difference
  time.setHours(time.getHours() + 13);

  var oldShift = shift;

  if (time.getHours() < 8) { shift = "night"; endTime = new Date(time.getFullYear(), time.getMonth(), time.getDate(), 8, 0, 0) - time; }
  else if (time.getHours() >= 16) { shift = "swing"; endTime = new Date(time.getFullYear(), time.getMonth(), time.getDate(), 24, 0, 0) - time; }
  else { shift = "day"; endTime = new Date(time.getFullYear(), time.getMonth(), time.getDate(), 16, 0, 0) - time; }

  // Check if Data can change shifts (not in an emergency)
  if (oldShift !== shift && !activity.startsWith("EMERGENCY: ")) {
      // Run shift change checks

      // Day shift has a 75% chance of being rostered on
      if (shift == "day" && Math.random() < 0.95) {
        onDuty = true;
      }
      // Night shift has a 50% chance of being rostered on
      else if (shift == "night" && Math.random() < 0.5) {
        onDuty = true;
      }
      // Data will be off duty otherwise
      else {
        onDuty = false;
      }
  }

  // Set up to repeat the function after the shift ends (with trigger "shift")
  setTimeout(() => { dataPresence("shift") }, endTime);
  // Log the time Data's shift ends (hours, minutes and seconds)  
  // console.log(`Shift: ${(onDuty ? shift : "off")} duty`);
  // console.log(`Shift ends in ${Math.floor(endTime / 1000 / 60 / 60)} hours, ${Math.floor(endTime / 1000 / 60 % 60)} minutes and ${Math.floor(endTime / 1000 % 60)} seconds.`);

  // Set Data's activity if he is on duty, he will be doing his bridge dutys by default
  if (onDuty) {
    dataClient.user.setPresence({
      activities: [{
        type: 0, // Playing
        name: "TASK: Bridge duty."
      }]
    });
  }
  // Then if it's the night shift, Data will have a 50% chance of running his dream program
  else if (shift == "night" && Math.random() < 0.5) {
    dataClient.user.setPresence({
      activities: [{
        type: 0, // Playing
        name: "ACTIVITY: Running dream subroutines."
      }]
    });
  }
  // If not then check if it's time for the weekly poker game (on Tuesday in the first 5 mins of 4pm and if not during an emergency)
  else if (time.getDay() == 2 && time.getHours() == 16 && time.getMinutes() < 5 && !activity.startsWith("EMERGENCY: ")) {
    dataClient.user.setPresence({
      activities: [{
        type: 0, // Playing
        name: "ACTIVITY: Playing weekly poker game with the senior staff."
      }]
    });

    var duration = 1000 * 60 * 60 * 1.5; // 1.5 hours
    var variance = 1000 * 60 * 60 * 0.5; // 0.5 hours, so the game will last between 1 and 2 hours

    // Set a random timeout between the activity's (duration - variance) and (duration + variance)
    var offset = Math.floor(Math.random() * (variance * 2)) - variance;
    setTimeout(() => { dataPresence("activity") }, duration + offset);
    // Log the time Data's activity ends (hours, minutes and seconds)
    // console.log(`Activity ends in ${Math.floor((duration + offset) / 1000 / 60 / 60)} hours, ${Math.floor((duration + offset) / 1000 / 60 % 60)} minutes and ${Math.floor((duration + offset) / 1000 % 60)} seconds.`);
  }
  // If not then check if it's time for First Contact celebrations (on the 6th of April in the first 5 mins of 4pm and if not during an emergency)
  else if (time.getDate() == 6 && time.getMonth() == 3 && time.getHours() == 16 && time.getMinutes() < 5 && !activity.startsWith("EMERGENCY: ")) {
    dataClient.user.setPresence({
      activities: [{
        type: 0, // Playing
        name: "ACTIVITY: Attending First Contact celebrations in Ten Forward."
      }]
    });

    var duration = 1000 * 60 * 60 * 4; // 4 hours
    var variance = 1000 * 60 * 60 * 1; // 1 hour, so the celebrations will last between 3 and 5 hours

    // Set a random timeout between the activity's (duration - variance) and (duration + variance)
    var offset = Math.floor(Math.random() * (variance * 2)) - variance;
    setTimeout(() => { dataPresence("activity") }, duration + offset);
    // Log the time Data's activity ends (hours, minutes and seconds)
    // console.log(`Activity ends in ${Math.floor((duration + offset) / 1000 / 60 / 60)} hours, ${Math.floor((duration + offset) / 1000 / 60 % 60)} minutes and ${Math.floor((duration + offset) / 1000 % 60)} seconds.`);
  }
  // If not then check if it's time for the Captain Picard Day celebrations and competition (on the 17th of July in the first 5 mins of 4pm and if not during an emergency)
  else if (time.getDate() == 17 && time.getMonth() == 6 && time.getHours() == 16 && time.getMinutes() < 5 && !activity.startsWith("EMERGENCY: ")) {
    dataClient.user.setPresence({
      activities: [{
        type: 0, // Playing
        name: "ACTIVITY: Attending the Captain Picard Day celebrations and contest."
      }]
    });

    var duration = 1000 * 60 * 60 * 4; // 4 hours
    var variance = 1000 * 60 * 60 * 1; // 1 hour, so the celebrations will last between 3 and 5 hours

    // Set a random timeout between the activity's (duration - variance) and (duration + variance)
    var offset = Math.floor(Math.random() * (variance * 2)) - variance;
    setTimeout(() => { dataPresence("activity") }, duration + offset);
    // Log the time Data's activity ends (hours, minutes and seconds)
    // console.log(`Activity ends in ${Math.floor((duration + offset) / 1000 / 60 / 60)} hours, ${Math.floor((duration + offset) / 1000 / 60 % 60)} minutes and ${Math.floor((duration + offset) / 1000 % 60)} seconds.`);
  }
  // If not then pick a random activity
  else {
    // Start by filtering out all available activities (all activities with conditions returning true)
    var activities = dataActivities.filter(activity => { return activity.condition() } );

    // Now filter out all activities that are not the same as Data's current activity
    activities = activities.filter(activity => {
      // Check if string and doesn't match
      if (typeof activity.name == "string" && activity.name != activity) return true;
      // Check if array and doesn't contain the activity
      else if (typeof activity.name == "object" && !activity.name.includes(activity)) return true;
      // If it is an array, then drop the matching element and return true
      else if (typeof activity.name == "object") {
        activity.name = activity.name.splice(activity.name.indexOf(activity), 1);
        return true;
      }
      // Otherwise, return false
      else return false;
    });

    // Now, pick a random activity from the filtered list
    var activity = activities[Math.floor(Math.random() * activities.length)];

    // Set Data's activity
    // If there is an array of names then pick a random one
    dataClient.user.setPresence({
      activities: [{
        type: 0, // Playing
        name: (typeof activity.name == "string" ? activity.name : activity.name[Math.floor(Math.random() * activity.name.length)])
      }]
    });

    // Set a random timeout between the activity's (duration - variance) and (duration + variance)
    var offset = Math.floor(Math.random() * (activity.variance * 2)) - activity.variance;
    setTimeout(() => { dataPresence("activity") }, activity.duration + offset);
    // Log the time Data's activity ends (hours, minutes and seconds)
    // console.log(`Activity ends in ${Math.floor((activity.duration + offset) / 1000 / 60 / 60)} hours, ${Math.floor((activity.duration + offset) / 1000 / 60 % 60)} minutes and ${Math.floor((activity.duration + offset) / 1000 % 60)} seconds.`);
  }
}

// Every 100 seconds, check for adding a task or emergency
setInterval(interuptEvent, 100000);

function interuptEvent() {
  // console.log("Checking for interupts...");
  var interupt;

  // Emergencies will happen just over once a week, but will decrease as the day goes on
  // Day shift has a 1.5c chance of happening, swing shift has a 1c chance of happening, and night shift has a 0.5c chance of happening
  // C will be equal to 1/1500 chance of happening (Just over 1 in 2016, just over once a week) 
  // Emergencies will not happen if another emergency is already in progress

  // Run emergency checks if an emergency is not already happening
  if (!dataClient.user.presence.activities[0].name.startsWith("EMERGENCY: ")) {
    // Run check depending on current shift
    if (shift == "day" && Math.random() < 1.5 / 1500) interupt = interupts[0];
    else if (shift == "swing" && Math.random() < 1 / 1500) interupt = interupts[0];
    else if (shift == "night" && Math.random() < 0.5 / 1500) interupt = interupts[0];
    // Now can run task checks if no task (except if the task is bridge duty) is being done also and it's not night
    else if (shift !== "night" && (dataClient.user.presence.activities[0].name == "TASK: Bridge duty" || !dataClient.user.presence.activities[0].name.startsWith("TASK: "))) {
      // If on-duty (and therefore not doing a task), then there is a one in 25 chance of a task starting
      // If off-duty and not doing an activity, then there is also a one in 50 chance of a task starting
      // But if you are off-duty and doing an activity, then there is a one in 100

      // Run the checks defined above
      if (onDuty && Math.random() < 1 / 25) interupt = interupts[1];
      else if (!onDuty && dataClient.user.presence.activities[0].name == `${shift} shift` && Math.random() < 1 / 50) interupt = interupts[1];
      else if (!onDuty && dataClient.user.presence.activities[0].name !== `${shift} shift` && Math.random() < 1 / 100) interupt = interupts[1];
    }
  }

  // If an interupt event was chosen, update the presence
  if (interupt) {
    // Set Data's activity
    // Since there is an array of names, pick a random one
    dataClient.user.setPresence({
      activities: [{
        type: 0, // Playing
        name: interupt.name[Math.floor(Math.random() * interupt.name.length)]
      }]
    });

    // Set a random timeout between the interupt's (duration - variance) and (duration + variance)
    var offset = Math.floor(Math.random() * (interupt.variance * 2)) - interupt.variance;
    setTimeout(() => { dataPresence("interupt") }, interupt.duration + offset);
    // Log the time Data's interupt ends (hours, minutes and seconds)
    // console.log("Interupt event initiated.");
    // console.log(`Interupt ends in ${Math.floor((interupt.duration + offset) / 1000 / 60 / 60)} hours, ${Math.floor((interupt.duration + offset) / 1000 / 60 % 60)} minutes and ${Math.floor((interupt.duration + offset) / 1000 % 60)} seconds.`);
  }
  else {
    // console.log("No interupt event.");
  }
}

function timer(sort = false) {
  // Get the contents of timecheck.json
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

  // Read the file
  var timecheck = JSON.parse(fs.readFileSync("./timecheck.json"));

  // Store if the json file needs to be updated
  var update = false;

  // If sort is true, then sort the events by datetime
  if (sort) {
    // Sort the events by datetime
    var sorted = timecheck.sort((a, b) => {
      return new Date(b.datetime) - new Date(a.datetime);
    });

    // If the sorted array is different to the original array, then update the json file
    if (JSON.stringify(sorted) !== JSON.stringify(timecheck)) {
      update = true;
      timecheck = sorted;
    }

    // Extract the channels from the sorted array (no duplicates)
    var channels = [...new Set(timecheck.map(event => event.channel))];

    // Send a brief message to each channel
    channels.forEach(channel => {
        // Get the channel
        var channel = minutesClient.channels.cache.get(channel);
    
        // Send a message
        channel.send("-".repeat(50));
    });
  }

  // Loop through each event
  // The client is minutesClient, which is the bot that sends the messages
  timecheck.forEach(event => {
    // Get the message that will be updated

    // First get the message as if it's a server
    try {
      var message = minutesClient.channels.cache.get(event.channel).messages.cache.get(event.id);
    }
    catch (error) {
      // If failed, then attempt to get the channel as if it's a DM
      var message = minutesClient.users.cache.get(event.channel).messages.cache.get(event.id);
    }

    // Get the time difference between now and the event
    var difference = new Date(event.datetime) - new Date();

    // Minus 13 hours due to timezone difference
    difference -= 13 * 60 * 60 * 1000;

    // If the event has already happened, then delete the message and the event from the json file
    if (difference <= 0) {
      try {
        message.delete();
      }
      catch (error) {

      }

      timecheck.splice(timecheck.indexOf(event), 1);
      update = true;
    }
    // Otherwise, update the message
    else {
      // Only display the uppermost unit (years, months, days, hours, minutes or seconds)
      var messages = [
        Math.floor(difference / (1000 * 3600 * 24 * 365)) + " years and " + Math.floor(difference / (1000 * 3600 * 24 * 30) % 12) + " months",
        Math.floor(difference / (1000 * 3600 * 24 * 30)) + " months and " + Math.floor(difference / (1000 * 3600 * 24 * 7) % 4) + " weeks",
        Math.floor(difference / (1000 * 3600 * 24 * 7)) + " weeks and " + Math.floor(difference / (1000 * 3600 * 24) % 7) + " days",
        Math.floor(difference / (1000 * 3600 * 24)) + " days and " + Math.floor(difference / (1000 * 3600) % 24) + " hours",
        Math.floor(difference / (1000 * 3600)) + " hours and " + Math.floor(difference / (1000 * 60) % 60) + " minutes",
        Math.floor(difference / (1000 * 60)) + " minutes and " + Math.floor(difference / 1000 % 60) + " seconds",
        Math.floor(difference / 1000) + " seconds"
      ];

      // Set diffmessage to the first message that does not begin with "0 "
      var diffmessage = messages.find(message => !message.startsWith("0 "));

      // If the message begins with "1 ", replace the "s and " with " and "
      if (diffmessage.startsWith("1 ")) diffmessage = diffmessage.replace("s and ", " and ");

      // If the message contains " and 1 ", delete the final letter
      if (diffmessage.includes(" and 1 ")) diffmessage = diffmessage.slice(0, -1);
      // Else if the message contains " and 0 ", delete everything after (and including) " and 0 "
      else if (diffmessage.includes(" and 0 ")) diffmessage = diffmessage.slice(0, diffmessage.indexOf(" and 0 "));

      var text = `**${event.title}**\n... in ${(event.estimated ? "approximately " : "")}${diffmessage}`;

      // Try to update the message, if that fails then send a new message and update the event in the json file
      try {
        // Only update the message if the text is different, but not undefined
        if (message.content !== undefined && message.content !== text) message.edit(text);
      }
      catch (error) {
        // Send a new message in the channel that the event is in
        minutesClient.channels.cache.get(event.channel).send(text).then(res => {
          // Update the event in the json file
          event.id = res.id;
          event.channel = res.channelId;
          
          fs.writeFileSync("./timecheck.json", JSON.stringify(timecheck));
        });
      }
    }
  });

  // If the json file needs to be updated, then update it
  if (update) fs.writeFileSync("./timecheck.json", JSON.stringify(timecheck));
}