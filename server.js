// require('dotenv').config();
var timezoneoffset = 12 * 1000 * 3600

const express = require('express')
const app = express()
const fs = require('fs')
const https = require('https')
const ffmpeg = require('ffmpeg')
const Jimp = require('jimp')

const test_config = {
  token:
    'MTE0NjI0OTM2Nzc1NDM3NTE4OA.GR1Y_5.2RaudV_2Tjdz7EX6mrqmQhamNQP1LpgU56Zh7o',
}

// Login to minutesBot and dataBot with discord.js
// Require discord.js
const { Client, GatewayIntentBits, Message } = require('discord.js')
const { time, error } = require('console')
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

  if (message.channel.id == '1146742345447002153') {
    message.channel.send(message.author.id)
    return
  }

  if (message.content.toLowerCase() == '.') {
    console.log(message.author)
    console.log(guild.members)
  }

  if (
    ['.kill', '.stop', '.end', '.exit'].includes(message.content.toLowerCase())
  ) {
    message.channel.send('Ended bot.').finally(() => {
      process.exit()
    })
  }
})


let sneezeData = {
  count: 1823,
  updated: 1698348176197
}

let oldCount = sneezeData.count
let lastUpdated = sneezeData.updated

testClient.on('ready', async () => {
  await testClient.channels.fetch('1146256683748827177').then(async (channel) => {
    channel.send("STATUS")
    let user = await channel.guild.members.fetch('390419737915555840')
    let presence = await user.presence

    if (presence) {
      let activities = presence.activities

      if (activities) {
        let sneezes = parseInt(activities[0].state.split(' ')[0])
        let updated = new Date(activities[0].createdTimestamp)

        if (sneezes > oldCount) {
          user.send(`+${sneezes - oldCount} sneezes:\n${oldCount} -> ${sneezes}`)
          oldCount = sneezes
          lastUpdated = updated
          channel.send(`${sneezes} sneezes, updated on the ${updated}`)
        }
      }
    }

    // process.exit()
  })
})

app.get('/wakeup', function (request, response) {
  response.send('Wakeup successful.')
  console.log(`Pinged at ${new Date()}`)
})

async function sendMessage(message) {
  if (message == null || message.length < 1) {
    return
  }

  await testClient.channels
    .fetch('1146256683748827177')
    .then((channel) => channel.send(message))
}

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port)
})