// Login to minutesBot and dataBot with discord.js
// Require discord.js
const { Client, GatewayIntentBits } = require('discord.js')

// Create the new client instance including the intents needed for the bot (like presence and guild messages)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
})

// Log in to Discord with your client's token
client.login(process.env.CLARKE_DISCORD_TOKEN)

client.on('ready', async (bot) => {
  // State that the bot is online
  await bot.channels
    .fetch('1199976538930688040')
    .then(async (channel) => {
      channel.send('Bot Online')
    })
})