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
    client.channels.cache.get(process.env.MINUTES_ID).send(genGreeting());

    // Also send an embed test message

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
            "timestamp": `2022-11-27T23:20:00.000Z`,
            "footer": {
              "text": `Voting close`
            },
            "url": `https://transit-lumber.github.io/supedb`
          }
        ]
    };

    client.channels.cache.get(process.env.MINUTES_ID).send(embed).then(msg => {
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
      client.on("interactionCreate", buttonHandler);
    });

  });