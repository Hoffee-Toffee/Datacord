const discordBotkit = require("botkit-discord");
const fs = require("fs");

const test_config = {
  token: "MTE0NDkwMTA0MDQ5MjI1NzMxMA.G6E4td.2OhiWPjA8lMQenw70q_Oz6ayBiFuoODyymQycY"
};

const testBot = discordBotkit(test_config);

require("./skills/test.js")(testBot);
module.exports = {
  testBot,
}

const timezoneoffset = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// Login to minutesBot and dataBot with discord.js
// Require discord.js
const { Client, GatewayIntentBits } = require('discord.js');
const { time } = require("console");

// Create the new clients instances including the intents needed for the bots like presence and guild messages
const testClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences
  ]
});

// Log in to Discord with your clients tokens
testClient.login(test_config.token)

testClient.on("ready", () => {
  // ...
});