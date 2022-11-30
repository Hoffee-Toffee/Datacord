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

module.exports = function(controller) {
    // Reply with a greeting when someone says "greet"
    controller.hears(".greet", ["ambient", "direct_message", "mention"], (bot, message) => {
        if (message.text !== ".greet") return;
        bot.reply(message, genGreeting());
    });
}