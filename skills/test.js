var fs = require('fs');
const { Exception } = require('handlebars');

const timezoneoffset = 12 * 60 * 60 * 1000;

module.exports = function(controller) {
    controller.hears(".", ["ambient", "direct_message", "mention"], (bot, message) => {
        if (message.text !== ".") return;
        bot.reply(message, (message.message_reference == undefined) ? "False" : "True")
    });
}