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
var gifQueries = [
    {
        "query": "dua lipa",
        "weight": 3
    },
    {
        "query": "jess bush star trek nurse christine chapel",
        "weight": 5
    },
    {
        "query": "death on the nile emma mackey jacqueline de bellefort",
        "weight": 6
    },
    {
        "query": "sylvie sophia di martino",
        "weight": 8
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

    const Discord = require("discord.js");
    const webhook = new Discord.WebhookClient({
        id: id,
        token: token
    })

    console.log(webhook)

    webhook.send({
        content: message
    }).catch(console.error);
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

const listener = app.listen(process.env.PORT, function () {
    console.log("Your app is listening on port " + listener.address().port);
});

function getGif() {
    // Get a random number between 0 and 8
    var random = Math.floor(Math.random() * 8)

    // Get a random query from the array based on the random number
    var query = gifQueries.find(x => random <= x.weight - 1).query

    // Use fetch and the Giphy API to get a random gif
    var url = "https://tenor.googleapis.com/v2/search?q=" + query + "&key=" + process.env.TENOR_KEY + "&client_key=gif_bot&limit=1&random=true"
    var response = fetchUrl(url, function (error, meta, body) {
        var data = JSON.parse(body.toString())
        sendMessage(data.results[0].url, "GIF")
    })
}

function checkGIF() {
    if (gifSent) {
        gifSent = false
        return
    }

    var currenttime = new Date();

    console.log("Checking for gif, current time is " + currenttime.getHours() + ":" + currenttime.getMinutes())

    // Send a gif every 2 hours from 7am till 1am
    if (![18, 20, 22, 0, 2, 4, 6, 8, 10, 12].includes(currenttime.getHours())) {
        return
    }

    if (currenttime.getMinutes() == 0) {
        console.log("Time matches, sending gif")
        getGif()
        gifSent = true
    }
}