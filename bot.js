const discordBotkit = require("botkit-discord");

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

// Login to minutesBot with discord.js
// Require discord.js
const Discord = require("discord.js");

// Create a new client instance
const client = new Discord.Client( { intents: ["GUILDS", "GUILD_MESSAGES"] } );

// Log in to Discord with your client's token
client.login(process.env.MINUTES_DISCORD_TOKEN);

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

// Run when the client is ready
client.on("ready", () => {
    console.log("I am ready!");

    // Change the bot's presence
    client.user.setPresence({ activities: [{ name: "over the Sacred Timelines", type: "WATCHING", details: "" }] });

    // Send a greeting to the channel provided by the api
    // client.channels.cache.get(process.env.MINUTES_ID).send(genGreeting());
  });