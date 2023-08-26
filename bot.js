const discordBotkit = require("botkit-discord");
const fs = require("fs");

const test_config = {
  token: "MTE0NDkwMTA0MDQ5MjI1NzMxMA.G6E4td.2OhiWPjA8lMQenw70q_Oz6ayBiFuoODyymQycY"
};

const timezoneoffset = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// Login to minutesBot and dataBot with discord.js
// Require discord.js
const { Client, GatewayIntentBits, Message } = require('discord.js');
const { time } = require("console");

// Create the new clients instances including the intents needed for the bots like presence and guild messages
const testClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent
  ]
});

// Log in to Discord with your clients tokens
testClient.login(test_config.token)

testClient.on("messageCreate", (message = new Message()) => {
  // Exit and stop if the prefix is not there or if user is a bot
  if (message.author.bot) return;
    
  if ([".blacklist", ".bl"].includes(message.content.toLowerCase())) {
    message.channel.messages.fetch(message.reference.messageId)
    .then(msg => {
      console.log(msg)
      if (msg.author.id == "GIF BOT ID") {
        // Add {msg.content} to blacklist
        // Send message stating the update
      }
    })
    .catch(console.error);
  }
});