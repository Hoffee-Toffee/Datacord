var checkdate = new Date("August 30 2022 18:13");
var eventname = "Something Boring"
var timezoneoffset = 12 * 1000 * 3600

const fs = require("fs");
const express = require("express");
const discordBotkit = require("botkit-discord");
const discordBot = require("./bot");
const app = express();
const fetchUrl = require("fetch").fetchUrl;

var gifSent = false
var trisGifSent = false
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

// var faces = [":smiley:", ":grin:", ":blush:", ":innocent:", ":smiling_face_with_3_hearts:", ":heart_eyes:", ":star_struck:", ":kissing_heart:", ":relaxed:", ":kissing_closed_eyes:", ":hugging:", ":drooling_face:", ":hot_face:", ":sunglasses:", ":flushed:", ":pleading_face:", ":scream:", ":smiling_imp:"]
var faces = [""] // Temporary
var intervals = ["reset", "80 days", "69 days", "60 days", "50 days", "40 days", "30 days", "21 days", "14 days", "7 days", "5 days", "3 days", "2 days", "24 hours", "12 hours", "8 hours", "5 hours", "3 hours", "2 hours", "60 minutes", "30 minutes", "10 minutes", "5 minutes", "0 minutes"]

try {
    var update_stage = fs.readFileSync("./time_status.txt", "utf8");
    var currentpos = intervals.indexOf(update_stage) + 1
}
catch (err) {
    var currentpos = 0;
}

var intervalID = setInterval(timecheck, 10000); // Every 10 seconds, check the coundown
var gifLoop = setInterval(checkGIF, 40000); // Every 40 seconds, check if a gif should be sent

function timecheck() {
    var currentdate = new Date();
    var diff = checkdate.getTime() - currentdate.getTime() - timezoneoffset;

    var daydiff = Math.ceil(diff / (1000 * 3600 * 24))
    var hourdiff = Math.ceil(diff / (1000 * 3600))
    var mindiff = Math.ceil(diff / (1000 * 60))

    var diffmessage = (daydiff + " days")

    if (daydiff < 2) {
        if (hourdiff < 2) {
            diffmessage = (mindiff + " minutes")
        }
        else {
            diffmessage = (hourdiff + " hours")
        }
    }

    if (diffmessage == intervals[currentpos]) {
        if (diffmessage == "0 minutes") {
            sendMessage(`${eventname} time ${faces[Math.round(Math.floor(Math.random() * faces.length))]}`, "MEDIA")
        }
        else {
            sendMessage(`${diffmessage} until ${eventname} ${faces[Math.round(Math.floor(Math.random() * faces.length))]}`, "MEDIA")
        }
        currentpos += 1
        fs.writeFile('./time_status.txt', diffmessage, function (err) {
            if (err) sendMessage("Error message received from the JS Server:\n`" + err + "`", "MEDIA");
        });
    }
}

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
    response.send("Wakeup successful");
    console.log("Pinged")
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

    // Send a gif every 30 minutes from 7am till 1am (except for every 2 hours)
    if ([18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(currenttime.getHours())) {
        // If the hour is even, only send a gif if the minute is 30 and the gif hasn't been sent yet
        if (currenttime.getHours() % 2 == 0 && currenttime.getMinutes() == 30 && !trisGifSent) {
            console.log("Time matches, sending gif")
            trisGif()
            trisGifSent = true
        }
        // If the hour is odd, only send a gif if the minute is 0 or 30 and the gif hasn't been sent yet
        else if (currenttime.getHours() % 2 == 1 && [0, 30].includes(currenttime.getMinutes()) && !trisGifSent) {
            console.log("Time matches, sending gif")
            trisGif()
            trisGifSent = true
        }
        // Reset the trisGifSent variable when a gif hasn't been sent
        else {
            trisGifSent = false
        }
    }
}

function trisGif() {
    // Get a random url from the 'gifUrls.json' file
    fs.readFile('gifUrls.json', 'utf8', function (err, data) {
        if (err) throw err;
        var urls = JSON.parse(data);
        var random = Math.floor(Math.random() * urls.length);
        sendMessage(urls[random], "TRISBOT")
    });
}