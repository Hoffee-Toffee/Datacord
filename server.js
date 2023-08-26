// require('dotenv').config();
var timezoneoffset = 12 * 1000 * 3600

const fs = require("fs");
const express = require("express");
const discordBotkit = require("botkit-discord");
const app = express();
const fetchUrl = require("fetch").fetchUrl;

const discordBot = require("./bot");

app.use(express.static("public"));
app.get("/wakeup", function (request, response) {
    response.send("Wakeup successful.")
    console.log(`Pinged at ${new Date()}`)
});

const listener = app.listen(process.env.PORT, function () {
    console.log("Your app is listening on port " + listener.address().port);
});

var kill = setTimeout(() => {
    process.exit()
}, 1000 * 60)