// Generate southern greetings
function genGreeting(plural = true) {
  var greets = ['howdy', "mornin'", 'hello', 'hiya', 'hey', 'good morning']
  var subjects = [null, 'there']
  var users = [null]

  if (plural) {
    subjects.push('folks')
    subjects.push("y'all")
    subjects.push('guys')
    subjects.push('everybody')
  } else {
    subjects.push('partner')
    subjects.push('friend')
    subjects.push('pal')
    subjects.push('buddy')
    // subjects.push("USERNAME"); // Will be used in DMs in the future
  }

  // Get the parts of the greeting
  var g = greets[Math.floor(Math.random() * greets.length)]
  var s = subjects[Math.floor(Math.random() * subjects.length)]
  var u = users[Math.floor(Math.random() * users.length)]

  // Check for exceptions
  // "hiya" can't be used with "y'all", it will just be "hi"
  if (g == 'hiya' && s == "y'all") g = 'hi'

  // Generate the greeting
  var greeting = g + (s ? ' ' + s : '') + (u ? ' ' + u : '') + '!'

  // Return the greeting with the first letter capitalized
  return greeting.charAt(0).toUpperCase() + greeting.slice(1)
}

var fs = require('fs')

const timezoneoffset = 12 * 60 * 60 * 1000

const firebase = require('../firebase.js')

module.exports = function (controller) {
  /*
    .greet                        - Replies with a random greeting.

    .add "<title>" <datetime>    - Adds the timer to the list.
    .add "<title>" ~ <datetime>  - (Approximate)

    .remove "<title>"             - Removes the timer from the list.

    .edit "<title>" "<new_title>" <new_datetime> - Can be used to change the attributes of the timer.
    .edit "<title>" "<new_title>"
    .edit "<title>" <new_datetime>
    .edit "<title>" ~ <new_datetime>

    .list                         - Lists all the timers.

    .help                         - Shows this message.
    */

  // Reply with a greeting when someone says "greet"
  controller.hears(
    '.greet',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.text !== '.greet') return
      bot.reply(message, genGreeting())
    }
  )

  // Add a timer to the list
  controller.hears(
    '.add',
    ['ambient', 'direct_message', 'mention'],
    async (bot, message) => {
      // Exit if the message doesn't start with ".add "
      if (!message.text.startsWith('.add ')) return

      // Exit if the message does not contain at least 2 double quotes
      if (message.text.split('"').length < 3) {
        bot.reply(message, 'Invalid format!')
        return
      }

      // Get the title and datetime from the message
      var text = message.text
      var title = text.split('"')[1]
      var datetime = text.split('"')[2].trim()

      // Check if the datetime is approximate (starts with "~")
      var estimated = false
      if (datetime.startsWith('~')) {
        estimated = true
        datetime = datetime.substring(1)
      }

      // Data will be in the following format:
      // [
      //   {
      //     "id": (string), // The ID of the message that will be updated
      //     "channel": (string), // The ID of the channel containing the message
      //     "title": (string), // The title of the event that is being counted down to
      //     "datetime": (string), // The datetime that the event will occur
      //     "estimated": (boolean) // Whether the datetime is estimated or not
      //   },
      //   ...
      // ]

      var timers = await getData('timers')

      // Exit if the title is already in the list for this channel
      if (
        timers.some(
          (timer) => timer.title == title && timer.channel == message.channel.id
        )
      ) {
        bot.reply(message, 'Title already exists!')
        return
      }

      // Exit if the datetime is invalid
      if (isNaN(Date.parse(datetime))) {
        bot.reply(message, 'Invalid datetime!')
        return
      }

      // Send a message for the countdown
      bot.reply(message, `**${title}**\n...`, (err, res) => {
        // Handle errors
        if (err) return console.log(err)

        // Get the id of that message
        console.log(res)
        // Add the timer to the list
        timers.push({
          id: res.id,
          channel: res.channel.id,
          title: title,
          datetime: datetime,
          estimated: estimated,
        })

        // Save the list
        setData('timers', timers)
      })
    }
  )

  controller.hears(
    '.fresh',
    ['ambient', 'direct_message', 'mention'],
    async (bot, message) => {
      // Exit if the message doesn't match completely
      if (!message.text == '.fresh') return

      var timers = await getData('timers')

      var any = false

      timers = timers.map((timer) => {
        if (timer.channel == message.channel.id) {
          if (!any) bot.reply(message, '-'.repeat(50))
          any = true

          // Send a message for the countdown
          bot.reply(message, `**${timer.title}**\n...`, (err, res) => {
            // Handle errors
            if (err) return console.log(err)

            // Update the id
            timer.id = res.id
          })
        }
        return timer
      })

      // Get all timers for this channel and send new messages for them
      if (any) setData('timers', timers)
    }
  )

  // Remove/delete a timer from the list
  controller.hears(
    ['.remove', '.delete'],
    ['ambient', 'direct_message', 'mention'],
    async (bot, message) => {
      // Exit if the message doesn't start with ".remove " or ".delete "
      if (
        !message.text.startsWith('.remove ') &&
        !message.text.startsWith('.delete ')
      )
        return

      // Exit if the message does not contain at least 2 double quotes
      if (message.text.split('"').length < 3) {
        bot.reply(message, 'Invalid format!')
        return
      }

      // Get the title from the message
      var title = message.text.split('"')[1]

      // Data will be in the following format:
      // [
      //   {
      //     "id": (string), // The ID of the message that will be updated
      //     "channel": (string), // The ID of the channel containing the message
      //     "title": (string), // The title of the event that is being counted down to
      //     "datetime": (string), // The datetime that the event will occur
      //     "estimated": (boolean) // Whether the datetime is estimated or not
      //   },
      //   ...
      // ]

      var timers = await getData('timers')

      // Exit if the title is not in the list for this channel
      if (
        !timers.some(
          (timer) => timer.title == title && timer.channel == message.channel.id
        )
      ) {
        bot.reply(message, 'Title does not exist!')
        return
      }

      // Remove the timer from the list for this channel
      timers = timers.filter(
        (timer) => timer.title != title || timer.channel != message.channel.id
      )

      // Save the list
      setData('timers', timers)

      // Reply with a confirmation
      bot.reply(message, 'Timer removed!')
    }
  )

  // Edit a timer in the list
  controller.hears(
    '.edit',
    ['ambient', 'direct_message', 'mention'],
    async (bot, message) => {
      // Exit if the message doesn't start with ".edit "
      if (!message.text.startsWith('.edit ')) return

      // Exit if the message does not contain at least 2 double quotes
      if (message.text.split('"').length < 3) {
        bot.reply(message, 'Invalid format!')
        return
      }

      // Get the title from the message
      var text = message.text
      var title = text.split('"')[1]

      // Get the text remaining after the title
      text = text.substring(text.indexOf(title) + title.length + 2)

      // Get the new title if it exists
      if (text.startsWith('"')) {
        var newTitle = text.split('"')[1]
        text = text.substring(newTitle.length + 2)
      }

      // Get the new datetime if it exists
      if (text != '') {
        var newDatetime = text.trim()
      }

      // Check if the datetime is approximate (starts with "~")
      var estimated = null
      if (newDatetime && newDatetime.startsWith('~')) {
        estimated = true
        newDatetime = newDatetime.substring(1)
      } else if (newDatetime) {
        estimated = false
      }

      // Data will be in the following format:
      // [
      //   {
      //     "id": (string), // The ID of the message that will be updated
      //     "channel": (string), // The ID of the channel containing the message
      //     "title": (string), // The title of the event that is being counted down to
      //     "datetime": (string), // The datetime that the event will occur
      //     "estimated": (boolean) // Whether the datetime is estimated or not
      //   },
      //   ...
      // ]

      var timers = await getData('timers')

      // Exit if the title is not in the list for this channel
      if (
        !timers.some(
          (timer) => timer.title == title && timer.channel == message.channel.id
        )
      ) {
        bot.reply(message, 'Title does not exist!')
        return
      }

      // Exit if the new title is already in the list for this channel
      if (
        newTitle &&
        timers.some(
          (timer) =>
            timer.title == newTitle && timer.channel == message.channel.id
        )
      ) {
        bot.reply(message, 'Title already exists!')
        return
      }

      // Exit if the new datetime is invalid
      if (newDatetime && isNaN(Date.parse(newDatetime))) {
        bot.reply(message, 'Invalid datetime!')
        return
      }

      // Edit the timer in the list for this channel
      timers = timers.map((timer) => {
        if (timer.title == title && timer.channel == message.channel.id) {
          if (newTitle) timer.title = newTitle
          if (newDatetime) timer.datetime = newDatetime
          if (estimated != null) timer.estimated = estimated
        }
        return timer
      })

      // Save the list
      setData('timers', timers)

      // Reply with a confirmation
      bot.reply(message, 'Timer edited!')
    }
  )

  // List all timers for this channel
  controller.hears(
    '.list',
    ['ambient', 'direct_message', 'mention'],
    async (bot, message) => {
      if (message.text != '.list') return

      // Get the timers for this channel
      var timers = await getData('timers')
      timers = timers.filter((timer) => timer.channel == message.channel.id)

      // Exit if the list is empty
      if (timers.length == 0) {
        bot.reply(message, 'No timers in this channel!')
        return
      }

      // Make a formatted list of all timers
      var list = 'Timers: \n'

      timers.forEach((timer) => {
        list += `**${timer.title}** - ${timer.datetime}${
          timer.estimated ? ' (approx)' : ''
        }\n`
      })

      // Reply with a list of all timers
      bot.reply(message, list)
    }
  )

  // Show the full amount of time left for a timer
  controller.hears(
    '.full',
    ['ambient', 'direct_message', 'mention'],
    async (bot, message) => {
      if (!message.text.startsWith('.full ')) return

      // Get the title from the message (first double quote to second double quote after the command)
      var title = message.text.substring(6).split('"')[1]

      // Get the timers for this channel
      var timers = await getData('timers')
      timers = timers.filter((timer) => timer.channel == message.channel.id)

      // Exit if the title is not in the list for this channel
      if (
        !timers.some(
          (timer) => timer.title == title && timer.channel == message.channel.id
        )
      ) {
        bot.reply(message, 'Title does not exist!')
        return
      }

      // Get the timer from the list for this channel
      var timer = timers.find(
        (timer) => timer.title == title && timer.channel == message.channel.id
      )

      // Get the time difference between now and the event
      var date = new Date()
      date.setTime(date.getTime() + timezoneoffset)

      var difference = Date.parse(timer.datetime) - date.getTime()

      var units = [
        // Years
        Math.floor(difference / (1000 * 60 * 60 * 24 * 365)) + ' years',
        // Months until the next year
        (Math.floor(difference / (1000 * 60 * 60 * 24 * 30)) % 12) + ' months',
        // Days until the next month
        (Math.floor(difference / (1000 * 60 * 60 * 24)) % 30) + ' days',
        // Hours until the next day
        (Math.floor(difference / (1000 * 60 * 60)) % 24) + ' hours',
        // Minutes until the next hour
        (Math.floor(difference / (1000 * 60)) % 60) + ' minutes',
        // Seconds until the next minute
        (Math.floor(difference / 1000) % 60) + ' seconds',
      ]

      // Remove any units that begin with "0 "
      units = units.filter((unit) => !unit.startsWith('0 '))

      // If the unit begins with "1 ", delete the final letter
      units = units.map((unit) =>
        unit.startsWith('1 ') ? unit.slice(0, -1) : unit
      )

      // Join the units with commas and "and" at the end
      var diffmessage = units.join(', ').replace(/, ([^,]*)$/, ' and $1')

      var text = `**${timer.title}**\n... in ${
        timer.estimated ? 'approximately ' : ''
      }${diffmessage}`

      // Reply with the time difference
      bot.reply(message, text)
    }
  )

  // Movie command (.pick/.spin/.movie/.wheel)
  controller.hears(
    ['.pick', '.spin', '.movie', '.wheel'],
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => async () => {
      // Exit if the command is not an exact match
      if (!['.pick', '.spin', '.movie', '.wheel'].includes(message.text)) return

      // Get the movies list
      // It contains an array of movie series', each of which contains an array of movies
      // Most however, only contain one movie
      var movies = await getData('movies')

      // Exit if the list is empty
      if (movies.length == 0) {
        bot.reply(message, 'No movies left on the list!')
        return
      }

      // Get a random movie series
      var index = Math.floor(Math.random() * movies.length)
      var series = movies[index]

      // Get and remove the first movie in the series
      var movie = series.shift()

      // Reply with the movie
      bot.reply(message, `**${movie}** has been chosen!`)

      // If the series is now empty, remove it from the movies list, if not then save the movies list
      if (series.length == 0) {
        // Remove the series from the movies list
        movies.splice(index, 1)
        console.log('Removed series')
      } else {
        // Save the changed series array to the movies list
        movies[index] = series
        console.log('Removed movie')
      }

      // Save the movies list
      setData('movies', movies)
    }
  )

  // Help command
  controller.hears(
    '.help',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.text != '.help') return

      // Reply with a list of all commands
      bot.reply(
        message,
        'Commands: \n' +
          '**.add ' +
          '"title" "datetime"' +
          '** - Add a timer \n' +
          '**.remove ' +
          '"title"' +
          '** - Remove a timer \n' +
          '**.edit ' +
          '"title" "new title" "new datetime"' +
          '** - Edit a timer \n' +
          '**.list** - List all timers \n' +
          '**.full ' +
          '"title"' +
          '** - Show the full amount of time left for a timer \n' +
          // "**.pick/.spin/.movie/.wheel** - Pick a random movie from the list \n" +
          '**.help** - Show this message'
      )
    }
  )
}

async function getData(field) {
  // Get the data from local.json or firebase (then save it to local.json)
  var fetchedData = JSON.parse(fs.readFileSync('local.json', 'utf8'))
  if (fetchedData[field] == null) {
    const docRef = firebase.collection(firebase.datacord, 'data')
    const docSnap = await firebase.getDocs(docRef)
    const doc = docSnap.docs.find((doc) => doc.id == field)
    const final = JSON.parse(doc.data().data)
    fetchedData[field] = final
    fs.writeFileSync('local.json', JSON.stringify(fetchedData))
    return final
  } else {
    return fetchedData[field]
  }
}

function setData(field, data) {
  // Update the data in local.json and firebase
  const docRef = firebase.collection(firebase.datacord, 'data')
  const docSnap = firebase.doc(docRef, field)
  firebase.setDoc(docSnap, { data: JSON.stringify(data) })
  var fetchedData = JSON.parse(fs.readFileSync('local.json', 'utf8'))
  fetchedData[field] = data
  fs.writeFileSync('local.json', JSON.stringify(fetchedData))
}
