// require('dotenv').config();
var timezoneoffset = 12 * 1000 * 3600

import express, { static as go } from 'express'
const app = express()

import { client } from '@gradio/client'

async function run(text) {
  const app = await client('https://mosaicml-mpt-30b-chat.hf.space/')
  const result = await app.predict(0, [
    text, // string  in 'Chat Message Box' Textbox component
    'null', // any (any valid json) in 'parameter_2' Chatbot component
  ])

  console.log(result?.data)
}

const test_config = {
  token:
    'MTE0NjI0OTM2Nzc1NDM3NTE4OA.GR1Y_5.2RaudV_2Tjdz7EX6mrqmQhamNQP1LpgU56Zh7o',
}

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

  if (message.channel.id == '1146742345447002153') {
    message.channel.startTyping()

    var reply = await run(message.content)

    message.channel.send(reply)
    message.channel.stopTyping()
    return
  }

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

app.use(go('public'))
app.get('/wakeup', function (request, response) {
  response.send('Wakeup successful.')
  console.log(`Pinged at ${new Date()}`)
})

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port)
})
