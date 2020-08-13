const express = require("express");
const fs = require("fs");
const discordBotkit = require("botkit-discord");
const puns = require("puns.dev");
var Client = require("uptime-robot");
const app = express();
const discordBot = require("./bot");
app.use(require("./guides"));
app.use(express.static("public"));
const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
