const build = "9e7fe96367d37f0a4ca69a0f216e822b"

var timezoneoffset = 12 * 1000 * 3600

var gifSent = false
var gifQueries = [
    {
        "query": "dua lipa",
        "weight": 3 // 3 
    },
    {
        "query": "jess bush star trek nurse christine chapel",
        "weight": 5 // 2
    },
    {
        "query": "death on the nile emma mackey jacqueline de bellefort",
        "weight": 6 // 1
    },
    {
        "query": "sylvie sophia di martino",
        "weight": 8 // 2
    },
    {
        "query": "gal gadot",
        "weight": 10 // 2
    },
    {
        "query": "ava max",
        "weight": 12 // 2
    }
]

const fs = require("fs");
const express = require("express");
const discordBotkit = require("botkit-discord");
const app = express();
const fetchUrl = require("fetch").fetchUrl;

var gifLoop = setInterval(checkGIF, 40000); // Every 40 seconds, check if a gif should be sent

// Only start the bots after the first check is done
checkGIF()

const discordBot = require("./bot");

function sendMessage(message, hookname) {
    console.log("Sending message \"" + message + "\" to " + hookname + " webhook")
    if (message == null || message.lenght < 1) {
        return
    }

    if (hookname == "MEDIA") {
        var id = process.env.MEDIA_ID;
        var token = process.env.MEDIA_TOKEN;
    }
    else if (hookname == "GIF") {
        var id = process.env.GIF_ID;
        var token = process.env.GIF_TOKEN;
    }
    else if (hookname == "TEST") {
        var id = process.env.TEST_ID;
        var token = process.env.TEST_TOKEN;
    }
    else if (hookname == "TRISBOT") {
        var id = process.env.TBOT_ID;
        var token = process.env.TBOT_TOKEN;
    }

    const Discord = require("discord.js");
    const webhook = new Discord.WebhookClient({
        id: id,
        token: token
    })

    webhook.send(message).catch(err => { console.log(err) } );
}

app.use(express.static("public"));
app.get("/wakeup", function (request, response) {
    response.send("Wakeup successful.")
    console.log(`Pinged at ${new Date()}`)
});
app.get("/notify", function (request, response) {
    // Send a message to the req
    var message = request.query.message
    var hook = request.query.hook
    sendMessage(message, hook)
    response.send("Message sent")
});
app.get("/vote", function (request, response) {
    var title = request.query.title
    var description = request.query.description
    var color = request.query.color
    var id = request.query.id

    // Get 12 hours from now
    var date = new Date();
    date.setHours(date.getHours() + 12);

    var embed = {
      "content": `New proposal \"${title}\"`,
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
              "custom_id": `review`,
              "disabled": false,
              "type": 2
            }
          ]
        }
      ],
      "embeds": [
        {
          "type": "rich",
          "title": title,
          "description": description,
          "color": parseInt(color),
          "timestamp": date.toISOString(),
          "footer": {
            "text": `Voting close`
          },
          "url": `https://transit-lumber.github.io/supedb/map.html?id=${id}`,
        }
      ]
    }

    sendMessage(embed, "TEST")
    response.send("Message sent")
});
app.get("/build", function (request, response) {
    response.send(build)
});
app.get("/import", function (request, response) {
    // Convert the content into a JSON object
    var content = request.query.content
    var json = JSON.parse(content)

    // Loop through each file, creating it with the given content (in the JSON folder)
    for (var file in json) {
        fs.writeFile(`./json/${file}.json`, json[file])
    }
    // Send a response
    response.send("Import successful")
});
app.get("/export", function (request, response) {
    // Convert the JSON folder into a JSON object
    var json = {}
    var files = fs.readdirSync("./json")
    for (var file of files) {
        var filePath = `./json/${file}`
        var fileContent = fs.readFileSync(filePath, "utf8")
        json[file] = fileContent
    }
    // Send a response with the JSON in the content param
    response.send("<a href=\"https://datacord.onrender.com/import?content=" + encodeURIComponent(JSON.stringify(json)) + "\">Click here to import</a>")
});
const listener = app.listen(process.env.PORT, function () {
    console.log("Your app is listening on port " + listener.address().port);
});

function getGif() {
    // Get a random number between 0 and the weight of the last gif
    var random = Math.floor(Math.random() * gifQueries[gifQueries.length - 1].weight);

    // Get a random query from the array based on the random number
    var query = gifQueries.find(x => random <= x.weight - 1).query

    // Use fetch and the Giphy API to get a random gif
    var url = "https://tenor.googleapis.com/v2/search?q=" + query + "&key=" + process.env.TENOR_KEY + "&client_key=gif_bot&limit=1&random=true"
    var response = fetchUrl(url, function (error, meta, body) {
        var data = JSON.parse(body.toString())
        sendMessage(data.results[0].itemurl, "GIF")
    })
}

function checkGIF() {
    var currenttime = new Date();

    console.log("Checking for gif, current time is " + currenttime.getHours() + ":" + currenttime.getMinutes())

    // Send a gif every 2 hours from 7am till 1am
    if ([18, 20, 22, 0, 2, 4, 6, 8, 10, 12].includes(currenttime.getHours()) && currenttime.getMinutes() == 0 && !gifSent) {
        console.log("Time matches, sending gif")
        getGif()
        gifSent = true
    }
    // Reset the gifSent variable when a gif hasn't been sent
    else {
        gifSent = false
    }

    // Update the new version of the site, then kill this instance
    if (process.env.BUILD != build) {
        console.log("New build detected, updating")

        var toSend = {}
        
        // Loop through each file in the JSON folder, to send to the new version
        fs.readdirSync("./JSON").forEach(file => {
            toSend[file] = JSON.parse(fs.readFileSync("./JSON/" + file, "utf8"))
        })
    }
}
