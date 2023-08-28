const discordBotkit = require('botkit-discord')
const fs = require('fs')

var messageID = '1145580607372533821'

const test_config = {
  token:
    'MTE0NDkwMTA0MDQ5MjI1NzMxMA.G6E4td.2OhiWPjA8lMQenw70q_Oz6ayBiFuoODyymQycY',
}

const timezoneoffset = 12 * 60 * 60 * 1000 // 12 hours in milliseconds

// Login to minutesBot and dataBot with discord.js
// Require discord.js
const { Client, GatewayIntentBits, Message } = require('discord.js')
const { time } = require('console')
const { channel } = require('diagnostics_channel')

// Create the new clients instances including the intents needed for the bots like presence and guild messages
const testClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ],
})

// Log in to Discord with your clients tokens
testClient.login(test_config.token)

testClient.on('messageCreate', async (message = new Message()) => {
  // Exit and stop if the prefix is not there or if user is a bot
  if (message.author.bot) return

  if (message.content.toLowerCase() == '.') {
    message.channel.send(
      message.guild.members.cache.get(message.author.id).nickname ||
        message.author.globalName
    )
  }

  if (message.content.toLowerCase().startsWith('.update')) {
    console.log(message.content.slice(8))
    await message.channel.messages
      .get(
        message.content.toLowerCase().startsWith('.update ')
          ? message.content.slice(8)
          : messageID
      )
      .edit(`Updated at ${new Date().toLocaleTimeString()}!`)
  }

  if (
    ['.kill', '.stop', '.end', '.exit'].includes(message.content.toLowerCase())
  ) {
    message.channel.send('Ended bot.').finally(() => {
      process.exit()
    })
  }
})

testClient.on('ready', async () => {
  await testClient.channels
    .fetch('1145523077443235962')
    .then((channel) =>
      channel.messages
        .fetch(messageID)
        .then((message) =>
          message.edit(`Updated at ${new Date().toLocaleTimeString()}!`)
        )
    )
})
