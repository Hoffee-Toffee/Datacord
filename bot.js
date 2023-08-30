const discordBotkit = require('botkit-discord')
const fs = require('fs')

const test_config = {
  token:
    'MTE0NjI0OTM2Nzc1NDM3NTE4OA.GR1Y_5.2RaudV_2Tjdz7EX6mrqmQhamNQP1LpgU56Zh7o',
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
    .fetch('1146256683748827177')
    .then((channel) => channel.send('Hello there.'))
})
