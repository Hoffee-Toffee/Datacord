const discordBotkit = require("botkit-discord");
const firebase = require("./firebase.js");
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

const timezoneoffset = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

async function getData(field) {
  // Get the data from local.json or from firebase if it's not there (and save it to local.json)
  var fetchedData = JSON.parse(fs.readFileSync("./local.json"));
  if (fetchedData[field] == null) {
    const docRef = firebase.collection(firebase.datacord, "data");
    const docSnap = await firebase.getDocs(docRef);
    const doc = docSnap.docs.find(doc => doc.id == field);
    const final = JSON.parse(doc.data().data);
    fetchedData[field] = final;
    fs.writeFileSync("./local.json", JSON.stringify(fetchedData));
    return final;
  }
  else {
    return fetchedData[field];
  }
}

function setData(field, data) {
  // Update the firebase data and local.json
  const docRef = firebase.collection(firebase.datacord, "data");
  const docSnap = firebase.doc(docRef, field);
  firebase.setDoc(docSnap, { data: JSON.stringify(data) });
  var fetchedData = JSON.parse(fs.readFileSync("./local.json"));
  fetchedData[field] = data;
  fs.writeFileSync("./local.json", JSON.stringify(fetchedData));
}

async function getSupeData(id) {
  // Get the timeline with the given document ID
  const docRef = firebase.collection(firebase.supedb, "timelines");
  const docSnap = await firebase.getDocs(docRef);
  const doc = docSnap.docs.find(doc => doc.id == id);
  const final = JSON.parse(doc.data().map)
  return final;
}

async function getSupeBackupData(id) {
  // Get the timeline with the given document ID
  const docRef = firebase.collection(firebase.datacord, "timelines");
  const docSnap = await firebase.getDocs(docRef);
  const doc = docSnap.docs.find(doc => doc.id == id);
  const final = JSON.parse(doc.data().map)
  return final;
}

function setSupeBackupData(id, map) {
  // Set the timeline with the given document ID
  const docRef = firebase.collection(firebase.datacord, "timelines");
  const docSnap = firebase.doc(docRef, id);
  firebase.setDoc(docSnap, { map: JSON.stringify(map) });
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
// If off-duty for the Night shift, Data will perform activities on his own or engage in dream simulation / hibernation
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
    condition: () => shift !== "night" && Math.random() < 0.3 // Won't play at night and is rarer as tournaments are less common
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
    condition: () => shift !== "night" && Math.random() < 0.1 // Won't play at night and is rarer as the character must be visiting the Enterprise
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
    condition: () => shift !== "night" && Math.random() < 0.1 // Won't play at night and is rarer as the character must be visiting the Enterprise
  },
  {
    name: "ACTIVITY: Playing Baccarat against Bashir.",
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => shift !== "night" && Math.random() < 0.1 // Bashir will not be available during the night shift, and is rarer as Bashir must be visiting the Enterprise
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
    condition: () => shift !== "night" && Math.random() < 0.1 // Won't play at night and is rarer as the character must be visiting the Enterprise
  },
  {
    name: "ACTIVITY: Attending a wedding ceremony in Ten Forward.",
    duration: 1000 * 60 * 60, // 1 hour, average time for this activity
    variance: 1000 * 60 * 30, // 30 minutes, variance for this activity, so it can be between 0.5 and 1.5 hours long
    condition: () => shift == "swing" && Math.random() < 0.5 // Weddings will only happen during the evening shift and are rarer as they are less common
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
    condition: () => shift !== "night" && Math.random() < 0.3 // Won't watch at night and is rarer as tournaments are less common
  },
  {
    name: "ACTIVITY: Watching a performance of Beverly Crusher's play, \"Something for Breakfast\" in Ten Forward.",
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
    name: ["TASK: In a meeting with the senior staff.", "TASK: Aiding Geordi in Main Engineering.", "TASK: Monitoring probe readings.", "TASK: Analyzing asteroid sample.", "TASK: Contacting liaison aboard Starbase 4514.", "TASK: Giving an Ambassador a tour of the Enterprise.", "TASK: Reviewing sensor logs from recovered shuttle.", "TASK: Reviewing Delta radiation readings in this sector.", "TASK: Analyzing nebula composition.", "TASK: Helping the Beverly Crusher synthesize a cure for a disease.", "TASK: Commanding the Bridge while Picard and Riker are absent.", "TASK: In the landing party investigating a planet.", "TASK: Orbiting a star in a shuttlecraft."],
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
const minutesClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences
  ]
});

const dataClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences
  ]
});

// Log in to Discord with your clients tokens
minutesClient.login(process.env.MINUTES_DISCORD_TOKEN)
dataClient.login(process.env.DATA_DISCORD_TOKEN)


// Generate southern greetings
function genGreeting(plural = true, user = null) {
  var greets = ["howdy", "mornin'", "hello", "hiya", "hey", "good morning"]
  var subjects = [null, "there"]

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
  }

  // Get the parts of the greeting (1 in 3 chance of the subject being the user's name)
  var g = greets[Math.floor(Math.random() * greets.length)];
  var s = (user && Math.floor(Math.random() * 3) == 0) ? user : subjects[Math.floor(Math.random() * subjects.length)];

  // Check for exceptions
  // "hiya" can't be used with "y'all", it will just be "hey"
  if (g == "hiya" && s == "y'all") g = "hey";

  // Generate the greeting
  var greeting = g + (s ? " " + s : "");

  // Return the greeting with the first letter capitalized
  return greeting.charAt(0).toUpperCase() + greeting.slice(1);
}

// Use order and depth to create a nested JSON
// e.g. [{depth: 0, title: A, content:a}, {depth: 1, title: B, content: b}, {depth: 2, title: C, content: c}, {depth: 1, title: D, content: d}], becomes
// {title: A, content: a, children: [{title: B, content: b, children: [{title: C, content: c}]}, {title: D, content: d}]}
function createNestedJSON(data) {
  var nestedJSON = {};
  var stack = [];

  data.forEach((item) => {
    var current = nestedJSON;
    while (stack.length > 0 && item.depth <= stack[stack.length - 1].depth) {
      stack.pop();
    }
    for (var i = 0; i < stack.length; i++) {
      current = current.children[current.children.length - 1];
    }
    var newItem = {};
    Object.keys(item).forEach((key) => {
      if (key !== "depth") newItem[key] = item[key];
    });
    if (!current.children) {
      current.children = [];
    }
    current.children.push(newItem);
    stack.push(item);
  });

  return nestedJSON.children ? nestedJSON.children : [];
}

function emailFormat(data, top = true) {
  // Convert data into elements
  // e.g. {title: A, content: a, children: [{title: B, content: b, children: [{title: C, content: c}]}, {title: D, content: d}]}, becomes
  // <li><span>A</span><p>a</p><ul><li><span>B</span><p>b</p><ul><li><span>C</span><p>c</p></li></ul></li><li><span>D</span><p>d</p></li></ul></li>
  var start = (top) ? "" : `<li><span>${data.title}</span><p>${data.content}</p>`;
  var end = (top) ? "" : "</li>";

  if (top) {
    data.forEach((item) => {
      if (item instanceof Array) start += emailFormat(item[0], false)
    })
  }
  else if (data.children) {
    start += "<ul>";
    data.children.forEach((item) => { start += emailFormat(item, false) })
    start += "</ul>";
  }

  return start + end;
}

// Run when each client is ready
minutesClient.on("ready", async () => {
  // Run the timer loop right away
  timer(true);

  // Set a timeout to wait 1.111 seconds for every timer to be set
  var timecheck = await getData("timers").then((timers) => { return timers.length });
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

  // Adjust for the timezone
  now.setTime(now.getTime() + timezoneoffset);

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
  else if (now.getHours() >= 15 && now.getDay() == 5) { now.setDate(now.getDate() + 3); now.setTime(15, 0, 0, 0) }

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
          },
          {
            "style": 1,
            "label": `See Full Report`,
            "custom_id": `report`,
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

      // Check if they are wanting the report
      if (interaction.customId == "report") {
        // Send the report
        sendReport();
        reply = `Sending report...`
      }
      else {    
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
      }

      // DM the user with the message and delete it after 15 seconds
      interaction.user.send(reply).then(msg => { setTimeout(() => { msg.delete() }, 15000) });

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

  // Get the next Monday at 8am
  var reportTime = new Date();
  reportTime.setDate(reportTime.getDate() + (7 - reportTime.getDay()) % 7);
  reportTime.setHours(8, 0, 0, 0);
  // Adjust for the timezone
  reportTime.setTime(reportTime.getTime() + timezoneoffset);

  // Get the ms until then, if negative then add a week
  reportTime = reportTime - Date.now();
  if (reportTime < 0) reportTime += 604800000;

  // State how many days, hours, and minutes till the report is sent
  console.log("Report to be sent at " + new Date(Date.now() + reportTime).toLocaleString() + " (" + reportTime / 1000 / 60 / 60 / 24 + " days, " + reportTime / 1000 / 60 / 60 % 24 + " hours and " + reportTime / 1000 / 60 % 60 + " minutes from now).");

  // Set a timeout to run the 'sendReport' function
  setTimeout(sendReport, reportTime);

});

dataClient.on("ready", () => {
  // Run the presence function
  dataPresence();

  // Run the interrupt function
  interuptEvent();
});

function dataPresence(trigger = "reset") {
  // Get Data's current activity (unless the trigger is "reset")
  var activity = "";

  try {
    if (trigger !== "reset") activity = dataClient.user.presence.activities[0].name;
    else if (trigger == "shift" && activity == "TASK: Bridge duty") activity = "";
    else if (trigger == "interrupt" && (activity.startsWith("EMERGENCY: ") || activity.startsWith("TASK: "))) activity = "";
    else if (trigger == "activity" && activity != "TASK: Bridge duty" && !activity.startsWith("EMERGENCY: ") && !activity.startsWith("TASK: ")) activity = "";
  }
  catch (err) {
    console.log(err);
  }

  // Update the shift variable
  var time = new Date();
  var endTime; // Will be the the difference between the current time and time the shift ends

  // Account for the timezone
  time.setTime(time.getTime() + timezoneoffset);

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
  console.log(`Shift: ${(onDuty ? shift : "off")} duty`);
  console.log(`Shift ends in ${Math.floor(endTime / 1000 / 60 / 60)} hours, ${Math.floor(endTime / 1000 / 60 % 60)} minutes and ${Math.floor(endTime / 1000 % 60)} seconds.`);

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
    console.log(`Activity ends in ${Math.floor((duration + offset) / 1000 / 60 / 60)} hours, ${Math.floor((duration + offset) / 1000 / 60 % 60)} minutes and ${Math.floor((duration + offset) / 1000 % 60)} seconds.`);
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
    console.log(`Activity ends in ${Math.floor((duration + offset) / 1000 / 60 / 60)} hours, ${Math.floor((duration + offset) / 1000 / 60 % 60)} minutes and ${Math.floor((duration + offset) / 1000 % 60)} seconds.`);
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
    console.log(`Activity ends in ${Math.floor((duration + offset) / 1000 / 60 / 60)} hours, ${Math.floor((duration + offset) / 1000 / 60 % 60)} minutes and ${Math.floor((duration + offset) / 1000 % 60)} seconds.`);
  }
  // If not then pick a random activity
  else {
    // Start by filtering out all available activities (all activities with conditions returning true)
    var activities = dataActivities.filter(activity => { return activity.condition() });

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
    console.log(`Activity ends in ${Math.floor((activity.duration + offset) / 1000 / 60 / 60)} hours, ${Math.floor((activity.duration + offset) / 1000 / 60 % 60)} minutes and ${Math.floor((activity.duration + offset) / 1000 % 60)} seconds.`);
  }
}

// Every 100 seconds, check for adding a task or emergency
setInterval(interuptEvent, 100000);

function interuptEvent() {
  console.log("Checking for interupts...");
  var interrupt;

  // Emergencies will happen just over once a week, but will decrease as the day goes on
  // Day shift has a 1.5c chance of happening, swing shift has a 1c chance of happening, and night shift has a 0.5c chance of happening
  // C will be equal to 1/1500 chance of happening (Just over 1 in 2016, just over once a week) 
  // Emergencies will not happen if another emergency is already in progress

  // Run emergency checks if an emergency is not already happening
  if (!dataClient.user.presence.activities[0].name.startsWith("EMERGENCY: ")) {
    // Run check depending on current shift
    if (shift == "day" && Math.random() < 1.5 / 1500) interrupt = interupts[0];
    else if (shift == "swing" && Math.random() < 1 / 1500) interrupt = interupts[0];
    else if (shift == "night" && Math.random() < 0.5 / 1500) interrupt = interupts[0];
    // Now can run task checks if no task (except if the task is bridge duty) is being done also and it's not night
    else if (shift !== "night" && (dataClient.user.presence.activities[0].name == "TASK: Bridge duty" || !dataClient.user.presence.activities[0].name.startsWith("TASK: "))) {
      // If on-duty (and therefore not doing a task), then there is a one in 25 chance of a task starting
      // If off-duty and not doing an activity, then there is also a one in 50 chance of a task starting
      // But if you are off-duty and doing an activity, then there is a one in 100

      // Run the checks defined above
      if (onDuty && Math.random() < 1 / 25) interrupt = interupts[1];
      else if (!onDuty && dataClient.user.presence.activities[0].name == `${shift} shift` && Math.random() < 1 / 50) interrupt = interupts[1];
      else if (!onDuty && dataClient.user.presence.activities[0].name !== `${shift} shift` && Math.random() < 1 / 100) interrupt = interupts[1];
    }
  }

  // If an interrupt event was chosen, update the presence
  if (interrupt) {
    // Set Data's activity
    // Since there is an array of names, pick a random one
    dataClient.user.setPresence({
      activities: [{
        type: 0, // Playing
        name: interrupt.name[Math.floor(Math.random() * interrupt.name.length)]
      }]
    });

    // Set a random timeout between the interrupt's (duration - variance) and (duration + variance)
    var offset = Math.floor(Math.random() * (interrupt.variance * 2)) - interrupt.variance;
    setTimeout(() => { dataPresence("interrupt") }, interrupt.duration + offset);
    // Log the time Data's interrupt ends (hours, minutes and seconds)
    console.log("Interrupt event initiated.");
    console.log(`Interrupt ends in ${Math.floor((interrupt.duration + offset) / 1000 / 60 / 60)} hours, ${Math.floor((interrupt.duration + offset) / 1000 / 60 % 60)} minutes and ${Math.floor((interrupt.duration + offset) / 1000 % 60)} seconds.`);
  }
  else {
    console.log("No interrupt event.");
  }
}

async function timer(sort = false) {
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

  var timecheck = await getData("timers")

  // Store if the timers need to be updated
  var update = false;

  // If sort is true, then sort the events by datetime
  if (sort) {
    // Sort the events by datetime
    var sorted = timecheck.sort((a, b) => {
      return new Date(b.datetime) - new Date(a.datetime);
    });

    // If the sorted array is different to the original array, then update the timers
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

    var date = new Date();
    date.setTime(date.getTime() + timezoneoffset);

    // Get the time difference between now and the event
    var difference = new Date(event.datetime) - date;

    // If the event has already happened, then delete the message and the event from the array
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
      // Seconds will be in units of 10 when paired with minutes, otherwise in units of 1
      var messages = [
        Math.floor(difference / (1000 * 3600 * 24 * 365)) + " years and " + Math.floor(difference / (1000 * 3600 * 24 * 30) % 12) + " months",
        Math.floor(difference / (1000 * 3600 * 24 * 30)) + " months and " + Math.floor(difference / (1000 * 3600 * 24 * 7) % 4) + " weeks",
        Math.floor(difference / (1000 * 3600 * 24 * 7)) + " weeks and " + Math.floor(difference / (1000 * 3600 * 24) % 7) + " days",
        Math.floor(difference / (1000 * 3600 * 24)) + " days and " + Math.floor(difference / (1000 * 3600) % 24) + " hours",
        Math.floor(difference / (1000 * 3600)) + " hours and " + Math.floor(difference / (1000 * 60) % 60) + " minutes",
        Math.floor(difference / (1000 * 60)) + " minutes and " + Math.floor(difference / 1000 % 60 / 10) + "0 seconds",
        Math.floor(difference / 1000) + " seconds"
      ];

      // Set diffmessage to the first message that does not begin with "0 "
      var diffmessage = messages.find(message => !message.startsWith("0 "));

      // If the message begins with "1 ", replace the "s and " with " and "
      if (diffmessage.startsWith("1 ")) diffmessage = diffmessage.replace("s and ", " and ");

      // If the message contains " and 1 ", delete the final letter
      if (diffmessage.includes(" and 1 ")) diffmessage = diffmessage.slice(0, -1);
      // Else if the message contains " and 0", delete everything after (and including) " and 0"
      else if (diffmessage.includes(" and 0")) diffmessage = diffmessage.slice(0, diffmessage.indexOf(" and 0"));

      var text = `**${event.title}**\n... in ${(event.estimated ? "approximately " : "")}${diffmessage}`;

      // Try to update the message, if that fails then send a new message and update the event in the array
      try {
        // Only update the message if the text is different, but not undefined
        if (message.content !== undefined && message.content !== text) message.edit(text);
      }
      catch (error) {
        // Send a new message in the channel that the event is in
        minutesClient.channels.cache.get(event.channel).send(text).then(res => {
          // Update the event in the array
          event.id = res.id;
          event.channel = res.channelId;

          setData("timers", timecheck);
        });
      }
    }
  });

  // If the timers need to be updated, then update them
  if (update) setData("timers", timecheck);
}

async function getPeople() {
  // Get the 'notify' data from the users from firebase
  const docRef = firebase.collection(firebase.supedb, "users");
  const docSnap = await firebase.getDocs(docRef);
  const docs = docSnap.docs.filter(doc => doc.data().notify);
  const final = docs.map(doc => {
    return {
      name: doc.data().name,
      email: doc.data().email,
      discord: doc.data().discord || null,
      watching: doc.data().notify
    };
  });
  return final;
}

async function sendReport() {
  // Get all the people
  const config = await getPeople();

  // Generate reports for each person and send them
  const reportPromises = config.map(person => generateReport(person));
  const reports = await Promise.all(reportPromises);

  // Send the reports
  reports.forEach(report => {
    if (report.email) {
      // Send an email
      emailReport(report);
    }
    if (report.discord) {
      // Send a DM
      discordReport(report);
    }
  });
}

async function generateReport(person) {
  const newPromises = person.watching.map(id => getSupeData(id));
  const resolvedNew = await Promise.all(newPromises);

  const oldPromises = person.watching.map(id => getSupeBackupData(id));
  const resolvedOld = await Promise.all(oldPromises);

  var reportData = {
    name: person.name,
    email: person.email || null,
    discord: person.discord || null,
    old: resolvedOld,
    new: resolvedNew,
    ids: person.watching
  };

  return reportData;
}

function emailReport(data) {
  const emailjs = import("emailjs").then(emailjs => {

    // Compare the files
    var output = [];

    data.old.forEach((old, i) => {
      output.push(compare([], old, old, data.new[i]))
    });

    if (output.length === 0) output.push("No changes were detected.");

    // Send an email with this content
    const client = new emailjs.SMTPClient({
      user: 'miss_minutes@outlook.com',
      password: process.env.MINUTES_EMAIL_PASSWORD,
      host: 'smtp-mail.outlook.com',
      tls: {
        ciphers: 'SSLv3',
      }
    });

    // Get the current year and which week it is of that year
    const date = new Date();

    const year = date.getFullYear();

    const week = Math.ceil((Math.floor((date - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);

    // Pick a color checking how many weeks it has been over time
    var color = ["#084298", "#432874", "#801f4f", "#842029", "#984c0c", "#0f5132", "#087990"][Math.floor(date.getTime() / 1000 / 60 / 60 / 24 / 7) % 7];

    console.log(emailFormat(output))

    const message = new emailjs.Message({
      text: output.join("\n"),
      from: "Miss Minutes <miss_minutes@outlook.com>",
      to: data.email,
      subject: `SupeDB - Weekly Update\n(Week ${week}, ${year})`,
      attachment: [
        {
          data: `
          <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
          <html>
            <head>
              <!-- Compiled with Bootstrap Email version: 1.3.1 --><meta http-equiv="x-ua-compatible" content="ie=edge">
              <meta name="x-apple-disable-message-reformatting">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
              <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
              <style type="text/css">
                ul{padding: 0}ul p{margin:0; margin-left: 1em}body,table,td{font-family:Helvetica,Arial,sans-serif !important}.ExternalClass{width:100%}.ExternalClass,.ExternalClass p,.ExternalClass span,.ExternalClass font,.ExternalClass td,.ExternalClass div{line-height:150%}a{text-decoration:none}*{color:inherit}a[x-apple-data-detectors],u+#body a,#MessageViewBody a{color:inherit;text-decoration:none;font-size:inherit;font-family:inherit;font-weight:inherit;line-height:inherit}img{-ms-interpolation-mode:bicubic}table:not([class^=s-]){font-family:Helvetica,Arial,sans-serif;mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;border-collapse:collapse}table:not([class^=s-]) td{border-spacing:0px;border-collapse:collapse}@media screen and (max-width: 600px){.w-full,.w-full>tbody>tr>td{width:100% !important}*[class*=s-lg-]>tbody>tr>td{font-size:0 !important;line-height:0 !important;height:0 !important}.s-2>tbody>tr>td{font-size:8px !important;line-height:8px !important;height:8px !important}.s-3>tbody>tr>td{font-size:12px !important;line-height:12px !important;height:12px !important}.s-5>tbody>tr>td{font-size:20px !important;line-height:20px !important;height:20px !important}.s-10>tbody>tr>td{font-size:40px !important;line-height:40px !important;height:40px !important}}
              </style>
            </head>
            <body class="text-white" style="outline: 0; width: 100%; min-width: 100%; height: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: Helvetica, Arial, sans-serif; line-height: 24px; font-weight: normal; font-size: 16px; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; box-sizing: border-box; color: #ffffff; margin: 0; padding: 0; border-width: 0;" bgcolor="${color}">
              <table class="text-white body" valign="top" role="presentation" border="0" cellpadding="0" cellspacing="0" style="outline: 0; width: 100%; min-width: 100%; height: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: Helvetica, Arial, sans-serif; line-height: 24px; font-weight: normal; font-size: 16px; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; box-sizing: border-box; color: #ffffff; margin: 0; padding: 0; border-width: 0;" bgcolor="${color}">
                <tbody>
                  <tr>
                    <td valign="top" style="line-height: 24px; font-size: 16px; color: #ffffff; margin: 0;" align="left" bgcolor="${color}">
                      <table class="container" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                        <tbody>
                          <tr>
                            <td align="center" style="line-height: 24px; font-size: 16px; margin: 0; padding: 0 16px;">
                              <!--[if (gte mso 9)|(IE)]>
                                <table align="center" role="presentation">
                                  <tbody>
                                    <tr>
                                      <td width="600">
                              <![endif]-->
                              <table align="center" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; margin: 0 auto;">
                                <tbody>
                                  <tr>
                                    <td style="line-height: 24px; font-size: 16px; margin: 0;" align="left">
                                      <table class="s-10 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                        <tbody>
                                          <tr>
                                            <td style="line-height: 40px; font-size: 40px; width: 100%; height: 40px; margin: 0;" align="left" width="100%" height="40">
                                              &#160;
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                      <table class="card  bg-dark" role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-radius: 6px; border-collapse: separate !important; width: 100%; overflow: hidden; border: 1px solid #e2e8f0;" bgcolor="#1a202c">
                                        <tbody>
                                          <tr>
                                            <td style="line-height: 24px; font-size: 16px; width: 100%; margin: 0;" align="left" bgcolor="#1a202c">
                                              <table class="card-body" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                                                <tbody>
                                                  <tr>
                                                    <td style="line-height: 24px; font-size: 16px; width: 100%; margin: 0; padding: 20px;" align="left">
                                                      <h1 class="h3  text-orange-500" style="color: #fd7e14; padding-top: 0; padding-bottom: 0; font-weight: 500; vertical-align: baseline; font-size: 28px; line-height: 33.6px; margin: 0;" align="left">
                                                        Weekly Update
                                                        <span class="h6  text-gray-400" style="color: #cbd5e0; padding-top: 0; padding-bottom: 0; font-weight: 500; text-align: left; vertical-align: baseline; font-size: 16px; line-height: 19.2px; margin: 0;">(Week ${week}, ${year})</span>
                                                        <table class="s-2 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                                          <tbody>
                                                            <tr>
                                                              <td style="line-height: 8px; font-size: 8px; width: 100%; height: 8px; margin: 0;" align="left" width="100%" height="8">
                                                                &#160;
                                                              </td>
                                                            </tr>
                                                          </tbody>
                                                        </table>
                                                      </h1>
                                                      <table class="s-2 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                                        <tbody>
                                                          <tr>
                                                            <td style="line-height: 8px; font-size: 8px; width: 100%; height: 8px; margin: 0;" align="left" width="100%" height="8">
                                                              &#160;
                                                            </td>
                                                          </tr>
                                                        </tbody>
                                                      </table>
                                                      <h6 class="text-red-200 text-xs" style="color: #f1aeb5; padding-top: 0; padding-bottom: 0; font-weight: 500; vertical-align: baseline; font-size: 12px; line-height: 14.4px; margin: 0;" align="left">
                                                        ${genGreeting(false, data.name)}!
                                                        <br>
                                                        Miss Minutes here with your weekly report.
                                                        <br>
                                                        <br>
                                                        Here is a rundown of all that has changed in your projects over the last week.
                                                      </h6>
                                                      <table class="s-5 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                                        <tbody>
                                                          <tr>
                                                            <td style="line-height: 20px; font-size: 20px; width: 100%; height: 20px; margin: 0;" align="left" width="100%" height="20">
                                                              &#160;
                                                            </td>
                                                          </tr>
                                                        </tbody>
                                                      </table>
                                                      <table class="hr" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                                                        <tbody>
                                                          <tr>
                                                            <td style="line-height: 24px; font-size: 16px; border-top-width: 1px; border-top-color: #e2e8f0; border-top-style: solid; height: 1px; width: 100%; margin: 0;" align="left">
                                                            </td>
                                                          </tr>
                                                        </tbody>
                                                      </table>
                                                      <table class="s-5 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                                        <tbody>
                                                          <tr>
                                                            <td style="line-height: 20px; font-size: 20px; width: 100%; height: 20px; margin: 0;" align="left" width="100%" height="20">
                                                              &#160;
                                                            </td>
                                                          </tr>
                                                        </tbody>
                                                      </table>
                                                      <div class="space-y-3">
                                                        <h2 class="h4 text-orange-300" style="color: #feb272; padding-top: 0; padding-bottom: 0; font-weight: 500; vertical-align: baseline; font-size: 24px; line-height: 28.8px; margin: 0;" align="left">Changes:</h2>
                                                        <table class="s-3 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                                          <tbody>
                                                            <tr>
                                                              <td style="line-height: 12px; font-size: 12px; width: 100%; height: 12px; margin: 0;" align="left" width="100%" height="12">
                                                                &#160;
                                                              </td>
                                                            </tr>
                                                          </tbody>
                                                        </table>
                                                        <ul class="list-disc list-inside" style="padding-left: 10px; font-size: x-small; line-height: 24px; margin: 0;">
                                                          ${emailFormat(output)}
                                                        </ul>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                      <table class="s-10 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                        <tbody>
                                          <tr>
                                            <td style="line-height: 40px; font-size: 40px; width: 100%; height: 40px; margin: 0;" align="left" width="100%" height="40">
                                              &#160;
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                              <!--[if (gte mso 9)|(IE)]>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                              <![endif]-->
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </body>
          </html>
          
          `,
          alternative: true,
        },
      ],
    });

    client.send(message, (err, message) => {
      console.log(err || message);

      // Now update the backups with the current data
      data.ids.forEach((id, i) => {
        setSupeBackupData(id, data.new[i]);
      });
    });
  }, 1000);
}

function compare(output, old, oldObj, newObj, path = "") {
  // Check if an array, return "a" if true or just the first letter of it's typeof result
  switch ((Array.isArray(oldObj) ? "a" : (typeof oldObj).charAt(0)) + (Array.isArray(newObj) ? "a" : (typeof newObj).charAt(0))) {
    case "aa": // Comparing two arrays
      if (JSON.stringify(oldObj) == JSON.stringify(newObj)) {
        return;
      }

      log(output, old, path, "M");

      // Check what we can use for comparison
      var compAttr = ["id", "title", "key"].find((attr) =>
        newObj.concat(oldObj).every((obj) => obj[attr] !== undefined)
      );

      if (compAttr != undefined) {
        // If we can, use it to compare the two arrays
        for (var i = 0; i < oldObj.length; i++) {
          // Check for additions and modifications
          // Check if it exists in the new array
          var index = newObj.findIndex(
            (obj) => obj[compAttr] == oldObj[i][compAttr]
          );
          if (index != -1) {
            // If it does, compare the two objects
            compare(output, old, oldObj[i], newObj[index], path + "[" + i + "]");
          } else {
            // If it doesn't, it was deleted
            log(output, old, `${path}[${i}]`, "D");
          }
        }

        for (var i = 0; i < newObj.length; i++) {
          // Check for additions
          // Check if the id exists in the old array
          var index = oldObj.findIndex(
            (obj) => obj[compAttr] == newObj[i][compAttr]
          );
          if (index == -1) {
            // If it doesn't, it was added
            log(output, old, `${path}[${i}]`, "A");
          }
        }
        // If all are strings/numbers, check for additions and deletions only
      } else if (newObj.concat(oldObj).every((obj) => typeof obj == "string" || typeof obj == "number")) {
        for (var i = 0; i < oldObj.length; i++) { // Check for deletions
          // Check if it exists anywhere in the new array
          var index = newObj.findIndex((obj) => obj == oldObj[i]);
          if (index == -1) { // If it doesn't, it was deleted
            log(output, old, `${path}[${i}]`, "D", oldObj[i]);
          }
        }

        for (var i = 0; i < newObj.length; i++) { // Check for additions
          // Check if it exists anywhere in the old array
          var index = oldObj.findIndex((obj) => obj == newObj[i]);
          if (index == -1) { // If it doesn't, it was added
            log(output, old, `${path}[${i}]`, "A", newObj[i]);
          }
        }
      } else { // If we can't, compare the two arrays as strings
        if (JSON.stringify(oldObj) == JSON.stringify(newObj)) {
          return;
        }

        log(output, old, path, "M", JSON.stringify(oldObj), JSON.stringify(newObj));
      }
      break;
    case "oo": // Comparing two objects
      if (JSON.stringify(oldObj) == JSON.stringify(newObj)) {
        return;
      }

      log(output, old, path, "M");

      // Run though each key in the old object
      for (var key in oldObj) {
        // Check if the key exists in the new object
        if (newObj.hasOwnProperty(key)) {
          // If it does, compare the two values
          compare(output, old, oldObj[key], newObj[key], path + "." + key);
        } else { // If it doesn't, it was deleted
          log(output, old, `${path}.${key}`, "D", oldObj[key]);
        }
      }

      // Run though each key in the new object
      for (var key in newObj) {
        // Check if the key exists in the old object
        if (!oldObj.hasOwnProperty(key)) { // If it doesn't, it was added
          log(output, old, `${path}.${key}`, "A", newObj[key]);
        }
      }

      break;
    case "ss": // Comparing two strings or
    case "nn": // Comparing two numbers
      if (oldObj == newObj) {
        return;
      }

      log(output, old, `${path}`, "M", oldObj, newObj);
      break;
    default:
      // State the type of the two values
      log(output, old, path, "F", oldObj, newObj);
  }

  if (path == "") {
    return createNestedJSON(output)
  }
}

function log(arr, old, path, type, mainObj = null, secObj = null) {
  // Polishes the info ready for converting into it's final format (email, html, discord...)

  // Break down the path, using it to get the data at the end
  // Will be in format like '[23].content[7][1].content.title'
  var obj = path.split('[').join('.').split(']').join('').split('.').filter((val) => val != "").reduce((obj, key) => obj[key], old)

  // Get the final value in the path
  // e.g. '[23].content[7][1].content.title' -> 'title'
  var finalKey = path.split('.').pop().split('[').pop().split(']').shift()

  var toAdd = {
    depth: path.split('.').length + path.split('[').length - 2, // How deep the change is
    title: (path == "") ? "PROJECT NAME" : (obj && obj.title) ? obj.title : (obj && obj.key) ? obj.key : (finalKey) ? (!isNaN(finalKey) ? th(parseInt(finalKey) + 1) : finalKey) : (obj && obj.id) ? obj.id : "Unknown", // The title of the change
    type: (path == "") ? "Project" : (obj && obj.class) ? (obj.class == "Link" ? "Node Link" : `${obj.class} Node`) : (obj && obj.type) ? obj.type : "", // The type of the data
    content: ""
  }

  switch (type) {
    case "M": // Modified
      toAdd.title = `${toAdd.title} (Modified)`
      if (mainObj && secObj) toAdd.content = `Old: ${JSON.stringify(mainObj)}<br>New: ${JSON.stringify(secObj)}`
      break;
    case "A": // Added
      toAdd.title = `${toAdd.title} (Added)`
      if (mainObj) toAdd.content = `New: ${JSON.stringify(mainObj)}`
      break;
    case "D": // Deleted
      toAdd.title = `${toAdd.title} (Deleted)`
      if (mainObj) toAdd.content = `Old: ${JSON.stringify(mainObj)}`
      break;
    case "F": // Failed
      toAdd.title = `${toAdd.title} (Failed)`
      if (mainObj && secObj) toAdd.content = `Old: ${JSON.stringify(mainObj)}<br>New: ${JSON.stringify(secObj)}`
      break;
  }

  arr.push(toAdd)
}

function th(i) {
  return i + (
    [11, 12, 13].includes(i % 100) ? 'th' :
      i % 10 === 1 ? 'st' :
        i % 10 === 2 ? 'nd' :
          i % 10 === 3 ? 'rd' :
            'th'
  ) + " Entry"
}
