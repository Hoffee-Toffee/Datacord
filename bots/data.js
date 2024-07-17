import { readFile } from 'fs'
var linesdata = ''
readFile('./lines.json', function (err, data) {
  linesdata = JSON.parse(data)
})
var realbotname = process.env.REALBOTNAME
var botname = 'Data'

var prefix = process.env.PREFIX
var display
var repeat
var print
var last_message = ''
var last_user = ''
var game = false
var mess = null
var code = null
var test = null
var text = null
var codes = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

var repeat2
var real = []
var test
var disemoji = []
var line = ''

var x
var y
export default function (controller) {
  controller.hears(
    prefix + 'line',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        var txt = message.text
        if (txt.toLowerCase() == (prefix + 'line').toLowerCase()) {
          var line =
            linesdata.lines[
              Math.round(Math.floor(Math.random() * linesdata.lines.length))
            ]
          bot.reply(message, line.line + '\n||Said by ' + line.speaker + '||')
        } else if (txt.toLowerCase() == (prefix + 'line names').toLowerCase()) {
          var names = ''
          for (let i = 0; i < linesdata.lines.length; i++) {
            if (!names.includes(linesdata.lines[i].speaker)) {
              names += linesdata.lines[i].speaker + '\n'
            }
          }
          names = names.toString()
          names = names.replace(/,/g, '\n')
          bot.reply(message, '**Quotes available for:**\n' + names)
        } else if (txt[7] == '"') {
          var phrase = txt.slice(8, message.text.length - 1).toLowerCase()
          var lines = []
          var names = []
          for (let i = 0; i < linesdata.lines.length; i++) {
            if (linesdata.lines[i].line.toLowerCase().includes(phrase)) {
              lines.push(linesdata.lines[i].line)
              names.push(linesdata.lines[i].speaker)
            }
          }
          if (lines.length != 0) {
            var num = Math.round(Math.floor(Math.random() * lines.length))
            var line = lines[num]
            var name = names[num]
            bot.reply(message, line + '\n||Said by ' + name + '||')
          } else {
            bot.reply(message, 'No lines matching your criteria found.')
          }
        } else {
          name = txt.slice(7, message.text.lenght).toLowerCase()
          var lines = []
          var names = []
          for (let i = 0; i < linesdata.lines.length; i++) {
            if (linesdata.lines[i].speaker.toLowerCase() == name) {
              lines.push(linesdata.lines[i].line)
              names.push(linesdata.lines[i].speaker)
            }
          }
          if (lines.length != 0) {
            var num = Math.round(Math.floor(Math.random() * lines.length))
            var line = lines[num]
            var name = names[num]
            bot.reply(message, line + '\n||Said by ' + name + '||')
          } else {
            bot.reply(message, 'No lines matching your criteria found.')
          }
        }
      }
    }
  )

  controller.hears(
    prefix + 'sentient mode',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (mess == null) {
        mess = message
        bot.reply(mess, 'Sentient mode enabled')
      } else {
        print = message.text.slice(16, message.text.length)
        bot.reply(mess, print)
      }
    }
  )

  // PRIORITY

  controller.hears(
    prefix + 'help',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        if (message.text == (prefix + 'help').toLowerCase()) {
          bot.reply(message, 'https://datacord.glitch.me')
        } else if (message.text == (prefix + 'help supes').toLowerCase()) {
          bot.reply(
            message,
            'https://datacord.glitch.me/#commands.superhero_commands'
          )
        }
      }
    }
  )

  // Silly Functions and Easter Eggs

  controller.hears(
    'lost the game',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        bot.reply(message, '<:lostthegame:687198759590952966>')
      }
    }
  )

  controller.hears(
    'hello there',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (
        message.user.username !== realbotname &&
        message.text.toLowerCase() == 'hello there'
      ) {
        bot.reply(message, 'General ' + message.user.username)
      }
    }
  )

  controller.hears(
    ['Paul', '💀'],
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        bot.reply(
          message,
          '░░░░░░▄▄▄░░▄██▄░░░ \n░░░░░▐▀█▀▌░░░░▀█▄░░░ \n░░░░░▐█▄█▌░░░░░░▀█▄░░ \n░░░░░░▀▄▀░░░▄▄▄▄▄▀▀░░ \n░░░░▄▄▄██▀▀▀▀░░░░░░░ \n░░░█▀▄▄▄█░▀▀░░ \n░░░▌░▄▄▄▐▌▀▀▀░░ \n▄░▐░░░▄▄░█░▀▀ ░░ \n▀█▌░░░▄░▀█▀░▀ ░░  \n░░░░░░░▄▄▐▌▄▄░░░ \n░░░░░░░▀███▀█░▄░░ \n░░░░░░▐▌▀▄▀▄▀▐▄░░ \n░░░░░░▐▀░░░░░░▐▌░░ \n░░░░░░█░░░░░░░░▐▌'
        )
      }
    }
  )

  controller.hears(
    ['Vector', ':squid::gun:', 'Squidgun', ':squid: :gun:', 'Squid Gun'],
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        bot.reply(
          message,
          '.............//| |\n            | |/ |......................................\n            |     |  <O>\n            |     |......|...............................\n            |   /        b\n            |   |.........|_..L........................\n.............|  /        Hey.\n\n`(Credit to Cal)`'
        )
      }
    }
  )

  controller.hears(
    'pi',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname && message.text.length == 2) {
        bot.reply(
          message,
          '**3.141592653589793**23846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196442881097566593344612847564823378678316527120190914564856692346034861045432664821339360726024914127372458700660631558817488152092096282925409171536436789259036001133053054882046652138414695194151160943305727036575959195309218611738193261179310511854807446237996274956735188575272489122793818301194912983367336244065664308602139494639522473719070217986094370277053921717629317675238467481846766940513200056812714526356082778577134275778960917363717872146844090122495343014654958537105079227968925892354201995611212902196086403441815981362977477130996051870721134**999999**83729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632788659361533818279682303019520353018529689957736225994138912497217752834791315155748572424541506959508295331168617278558890750983817546374649393192550604009277016711390098488240128583616035637076601047101819429555961989467678374494482553797747268471040475346462080466842590694912933136770289891521047521620569660240580381501935112533824300355876402474964732639141992726042699227967823547816360093417216412199245863150302861829745557067498385054945885869269956909272107975093029553211653449872027559602364806654991198818347977535663698074265425278625518184175746728909777727938000816470600161452491921732172147723501414419735685481613611573525521334757418494684385233239073941433345477624168625189835694855620992192221842725502542568876717904946016534668049886272327917860857843838279679766814541009538837863609506800642251252051173929848960841284886269456042419652850222106611863067442786220391949450471237137869609563643719172874677646575739624138908658326459958133904'
        )
      }
    }
  )

  controller.hears(
    prefix + 'getlucky',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        bot.reply(
          message,
          'https://www.youtube.com/watch?v=4D7u5KF7SP8\nI did the robot vocals for this song'
        )
      }
    }
  )

  controller.hears(
    ["I'm", 'Imma', 'I am'],
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var name =
        message.guild.members.cache.fetch(message.author.id).nickname ||
        message.author.globalName
      if (name !== realbotname && Math.random() * 10 < 1) {
        var word
        var choice
        word = message.text.toLowerCase()
        word = word.replace('  ', ' ')
        word = word.replace('?', '')

        if (word.includes("i'm")) {
          word = word.slice(word.search("i'm") + 4)
        } else if (word.includes('imma')) {
          word = word.slice(word.search('imma') + 5)
        } else {
          word = word.slice(word.search('i am') + 5)
        }

        choice = Math.round(Math.floor(Math.random() * 3))
        var greeting = ['Hi ', 'Hello ']
        if (choice == 0) {
          bot.reply(
            message,
            greeting[Math.round(Math.floor(Math.random() * 2))] +
              word +
              ", I'm " +
              botname +
              '!'
          )
        } else if (choice == 1) {
          bot.reply(
            message,
            greeting[Math.round(Math.floor(Math.random() * 2))] +
              word +
              ', I thought you were ' +
              name +
              '?'
          )
        } else {
          bot.reply(message, 'But I thought you were ' + name + '?')
        }
      }
    }
  )

  controller.hears(
    ['hehe', 'jk'],
    ['ambient', 'direct_message'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        var replys = [
          'I fail to see how this is amusing',
          'Was that comedy?',
          'Is that a joke?',
          'I do not understand',
          'Inquiry...',
        ]
        var leng = replys.length
        var reply = replys[Math.round(Math.floor(Math.random() * leng))]
        bot.reply(message, reply)
      }
    }
  )

  controller.hears(
    'jared',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        bot.reply(message, '<:jessicaofborg:803934332875178015>')
      }
    }
  )

  controller.hears(
    '<:crab:654633753758400513>',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (
        message.user.username !== realbotname &&
        message.user.username !== 'Bruh Bot'
      ) {
        bot.reply(message, '<:crab:654633753758400513>')
      }
    }
  )

  controller.hears(
    'rip',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        var replys = [
          '<:sadcat:689053484351225915>',
          ':regional_indicator_f:',
          'Rip',
          "'F' in the chat",
          "'F' in the chat for our fallen comrade",
          '<:salute:689916526702493730>',
        ]
        var leng = replys.length
        var reply = replys[Math.round(Math.floor(Math.random() * leng))]
        bot.reply(message, reply)
      }
    }
  )

  // Misc tools

  controller.hears(
    prefix + 'getavatar',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        bot.reply(
          message,
          'https://cdn.discordapp.com/avatars/' +
            message.user.id +
            '/' +
            message.user.avatar +
            '.png?size=128'
        )
      }
    }
  )

  controller.hears(
    prefix + 'getbot',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        bot.reply(message, botname)
        bot.reply(message, '<:Data:692509900982452254>')
      }
    }
  )

  controller.hears(
    prefix + 'getreal',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        var word
        word = message.text
        word = word.slice(9, word.lenght)
        bot.reply(message, '`' + word.trim() + '`')
      }
    }
  )

  controller.hears(
    prefix + 'getemojilink',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var emoji
      emoji = message.text.toLowerCase()
      emoji = emoji.slice(14, emoji.lenght).trim()
      emoji = emoji.replace(':', '')
      emoji = emoji.replace('>', '.png?v=1')
      emoji = emoji.slice(emoji.search(':') + 1, emoji.lenght)
      bot.reply(message, 'https://cdn.discordapp.com/emojis/' + emoji)
    }
  )

  controller.hears(
    prefix + 'getemoji',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var emoji
      emoji = message.text.toLowerCase()
      emoji = emoji.slice(10, emoji.lenght).trim()
      if (emoji == 'bruh') {
        bot.reply(message, '<:image1:692504019947618394>')
      }
      if (emoji == 'data') {
        bot.reply(message, '<:Data:692509900982452254>')
      }
      if (emoji == 'ow') {
        bot.reply(message, '<:ow:692566169651249232>')
      }
      if (emoji == 'thiccard') {
        bot.reply(message, '<:thiccard:693676742484819990>')
      }
    }
  )

  controller.hears(
    prefix + 's ',
    ['ambient', 'direct_message'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        var search
        search = message.text.toLowerCase()
        search = search.slice(4, search.lenght).trim()
        search = search.replace(/ /g, '+')
        bot.reply(
          message,
          '**Google:**\n    `All Results:`\n    :small_blue_diamond:    <https://www.google.com/search?q=' +
            search +
            '>\n    `Most Relevent Result: Will redirect if none found`\n    :small_blue_diamond:    <https://www.google.com/search?q=' +
            search +
            '&btnI>\n**Wikipedia\n**    `All Results:`\n    :small_blue_diamond:    <https://en.wikipedia.org/wiki/Special:Search?search=' +
            search +
            '>\n**Youtube**\n    `All Results:`\n    :small_blue_diamond:    <https://www.youtube.com/search?q=' +
            search +
            '>'
        )
      }
    }
  )

  // Random Prompt Responders

  controller.hears(
    'Are you',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        var botnamelc
        botnamelc = botname.toLowerCase()
        message.text = message.text.toLowerCase()
        message.text = message.text.replace('<@!647224894953619492>', botname)
        message.text = message.text.replace(' my ', ' your ')
        message.text = message.text.replace(' our ', ' your ')
        if (message.text.toLowerCase().includes(botnamelc)) {
          var word
          word = message.text
          word = word.slice(word.search('are you') + 8, word.lenght)
          word = word.replace('?', ' ')
          word = word.replace(' you are ', ' sjfnjenfjenf ')
          word = word.replace(" you're ", ' sjfnjenfjenf ')
          word = word.replace(' you ', ' I1231221133 ')
          word = word.replace(' your ', ' my ')
          word = word.replace(' I am', ' you are ')
          word = word.replace(' i am ', ' you are ')
          word = word.replace(' I ', ' you ')
          word = word.replace(' i ', ' you ')
          word = word.replace(' me ', ' you ')
          word = word.replace(' I1231221133 ', ' I ')
          word = word.replace(' sjfnjenfjenf ', ' I am ')
          word = word.replace(botnamelc, '')
          word = word.replace(botname, '')
          word = word.replace(' yourself ', ' myself ')
          word = word.replace('  ', ' ')
          word = ' ' + word
          word = word.replace('  ', ' ')
          word = word.slice(1, word.lenght)
          if (word.charAt(word.length - 2) == ',') {
            word = word.slice(0, -2)
          }
          var replys = ['Yes I am', 'I am not']
          var leng = replys.length
          var reply = replys[Math.round(Math.floor(Math.random() * leng))]
          bot.reply(message, reply + ' ' + word)
        }
      }
    }
  )

  controller.hears(
    'Do you',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (message.user.username !== realbotname) {
        var botnamelc
        botnamelc = botname.toLowerCase()
        message.text = message.text.replace('<@!647224894953619492>', botname)
        message.text = message.text.replace(' my ', ' your ')
        message.text = message.text.replace(' our ', ' your ')
        if (message.text.toLowerCase().includes(botnamelc)) {
          var word
          word = message.text
          if (word.search('do you') == -1) {
            word = word.slice(word.search('Do you') + 7, word.lenght)
          } else {
            word = word.slice(word.search('do you') + 7, word.lenght)
          }
          word = word.replace('?', ' ')
          word = word.replace(' you are ', ' sjfnjenfjenf ')
          word = word.replace(" you're ", ' sjfnjenfjenf ')
          word = word.replace(' you ', ' I1231221133 ')
          word = word.replace(' your ', ' my ')
          word = word.replace(' I am', ' you are ')
          word = word.replace(' i am ', ' you are ')
          word = word.replace(' I ', ' you ')
          word = word.replace(' i ', ' you ')
          word = word.replace(' me ', ' you ')
          word = word.replace(' I1231221133 ', ' I ')
          word = word.replace(' sjfnjenfjenf ', ' I am ')
          word = word.replace(botnamelc, '')
          word = word.replace(botname, '')
          word = word.replace(' yourself ', ' myself ')
          word = word.replace('  ', ' ')
          if (word.charAt(word.length - 2) == ',') {
            word = word.slice(0, -2)
          }
          var replys = [
            'I',
            'I obviously',
            'I obviously do not',
            'I do not',
            'Silly question, everyone knows I',
            'Silly question, everyone knows I do not',
          ]
          var leng = replys.length
          var reply = replys[Math.round(Math.floor(Math.random() * leng))]
          bot.reply(message, reply + ' ' + word)
        }
      }
    }
  )

  // Supe Database

  controller.hears(
    prefix + 'listsupes',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/profiles',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
        },
      }

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        repeat = 0
        display = '**ALL SUPES**'
        while (body.includes('{')) {
          repeat = repeat + 1
          body = body.replace('{', '}')
          display =
            display +
            '\n' +
            body.slice(body.search('Alias') + 8, body.search('Forename') - 3)
          body = body.replace('Alias', '}')
          body = body.replace('Forename', '}')
        }
        bot.reply(message, display)
      })
    }
  )

  controller.hears(
    prefix + 'listtables',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var mysql = require('mysql')
      var connection = mysql.createConnection({
        host: 'sql12.freemysqlhosting.net',
        user: 'sql12329885',
        password: 'zdBq5DyQgI',
        database: 'sql12329885',
      })

      connection.connect()

      connection.query('SHOW TABLES', function (error, results, fields) {
        var result = 0
        var text = ''
        while (results[result] != null) {
          text = text + '\n' + results[result].Tables_in_sql12329885
          result = result + 1
        }
        bot.reply(message, text)
      })

      connection.end()
    }
  )

  controller.hears(
    prefix + 'listpowers',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/powers',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
        },
      }

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        repeat = 0
        display = '**ALL POWERS**'
        while (body.includes('{')) {
          repeat = repeat + 1
          body = body.replace('{', '}')
          display =
            display +
            '\n' +
            body.slice(body.search('Name') + 7, body.search('Description') - 3)
          body = body.replace('Name', '}')
          body = body.replace('Description', '}')
        }
        bot.reply(message, display)
      })
    }
  )

  controller.hears(
    prefix + 'listteams',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/teams',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
        },
      }

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        repeat = 0
        display = '**ALL TEAMS**'
        while (body.includes('{')) {
          repeat = repeat + 1
          body = body.replace('{', '}')
          display =
            display +
            '\n' +
            body.slice(body.search('Name') + 7, body.search('Description') - 3)
          body = body.replace('Name', '}')
          body = body.replace('Description', '}')
        }
        bot.reply(message, display)
      })
    }
  )

  controller.hears(
    prefix + 'listitems',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/items',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
        },
      }

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        repeat = 0
        display = '**ALL ITEMS**'
        while (body.includes('{')) {
          repeat = repeat + 1
          body = body.replace('{', '}')
          display =
            display +
            '\n' +
            body.slice(body.search('Name') + 7, body.search('Description') - 3)
          body = body.replace('Name', '}')
          body = body.replace('Description', '}')
        }
        bot.reply(message, display)
      })
    }
  )

  controller.hears(
    prefix + 'getsupe',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var query
      query = message.text
      query = query.slice(9, query.lenght).trim()
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/profiles',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
          'content-type': 'application/json',
        },
      }

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        display = null
        while (body.includes('{') && display == null) {
          if (body.slice(body.search('{'), body.search('}')).includes(query)) {
            display = body.slice(body.search('{'), body.search('}'))
          }
          body = body.replace('{', '.')
          body = body.replace('}', '.')
        }
        display = display.slice(display.search('Alias'), display.length)
        display = display.replace(/"/g, '')
        display = display.replace(/,/g, '`\n**')
        display = display.replace(/:/g, '**\n    `')
        display = display.replace(/~/g, '`\n    `')
        bot.reply(message, '**' + display + '`')
      })
    }
  )

  controller.hears(
    prefix + 'setpower',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var query
      var disobj = new Object()
      query = message.text
      query = query.slice(10, query.lenght).trim()
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/powers',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
          'content-type': 'application/json',
        },
      }

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        display = null
        while (body.includes('{') && display == null) {
          if (body.slice(body.search('{'), body.search('}')).includes(query)) {
            display = body.slice(body.search('{'), body.search('}'))
          }
          body = body.replace('{', '.')
          body = body.replace('}', '.')
        }
        display = display.slice(display.search('Name'), display.length)
        display = display.replace(/"/g, '')
        while (display.includes(',')) {
          if (display.slice(0, display.search(':')) != place) {
            disobj[display.slice(0, display.search(':'))] = display.slice(
              display.search(':') + 1,
              display.search(',')
            )
          } else {
            disobj[place] = value
          }
          display = display.slice(display.search(',') + 1, display.lenght)
        }
        if (display.slice(0, display.search(':')) != place) {
          disobj[display.slice(0, display.search(':'))] = display.slice(
            display.search(':') + 1,
            display.lenght
          )
        } else {
          disobj[place] = value
        }
      })
      var query
      var place
      var value
      query = message.text
      query = query.slice(10, query.search('{')).trim()
      place = message.text
      place = place.slice(place.search('{') + 1, place.search('=')).trim()
      value = message.text
      value = value.slice(value.search('=') + 1, value.search('}')).trim()
      bot.reply(message, 'Changing `' + place + '` to `' + value + '`')
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/powers',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
          'content-type': 'application/json',
        },
      }
      ;``

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        display = null
        while (body.includes('{') && display == null) {
          if (body.slice(body.search('{'), body.search('}')).includes(query)) {
            display = body.slice(body.search('{'), body.search('}'))
          }
          body = body.replace('{', '.')
          body = body.replace('}', '.')
        }
        display = display.slice(
          display.search('id') + 2,
          display.search('Name')
        )
        display = display.replace(/"/g, '')
        display = display.replace(/,/g, '')
        display = display.replace(/:/g, '')
        var request = require('request')
        var options = {
          method: 'PUT',
          url: 'https://superheros-59a4.restdb.io/rest/powers/' + display,
          headers: {
            'cache-control': 'no-cache',
            'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
            'content-type': 'application/json',
          },
          body: disobj,
          json: true,
        }
        request(options, function (error, response, body) {
          if (error) throw new Error(error)
          if (error == null) {
            bot.reply(message, 'Query Successful')
          } else {
            bot.reply(message, '**ERROR:**\n' + error)
          }
        })
      })
    }
  )

  controller.hears(
    prefix + 'getpower',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var query
      query = message.text
      query = query.slice(10, query.lenght).trim()
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/powers',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
        },
      }

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        display = null
        while (body.includes('{') && display == null) {
          if (body.slice(body.search('{'), body.search('}')).includes(query)) {
            display = body.slice(body.search('{'), body.search('}'))
          }
          body = body.replace('{', '.')
          body = body.replace('}', '.')
        }
        display = display.slice(display.search('Name'), display.length)
        display = display.replace(/"/g, '')
        display = display.replace(/,/g, '`\n**')
        display = display.replace(/:/g, '**\n    `')
        bot.reply(message, '**' + display + '`')
      })
    }
  )

  controller.hears(
    prefix + 'setsupe',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var query
      var disobj = new Object()
      query = message.text
      query = query.slice(9, query.lenght).trim()
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/profiles',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
          'content-type': 'application/json',
        },
      }

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        display = null
        while (body.includes('{') && display == null) {
          if (body.slice(body.search('{'), body.search('}')).includes(query)) {
            display = body.slice(body.search('{'), body.search('}'))
          }
          body = body.replace('{', '.')
          body = body.replace('}', '.')
        }
        display = display.slice(display.search('Alias'), display.length)
        display = display.replace(/"/g, '')
        while (display.includes(',')) {
          if (display.slice(0, display.search(':')) != place) {
            disobj[display.slice(0, display.search(':'))] = display.slice(
              display.search(':') + 1,
              display.search(',')
            )
          } else {
            disobj[place] = value
          }
          display = display.slice(display.search(',') + 1, display.lenght)
        }
        if (display.slice(0, display.search(':')) != place) {
          disobj[display.slice(0, display.search(':'))] = display.slice(
            display.search(':') + 1,
            display.lenght
          )
        } else {
          disobj[place] = value
        }
      })

      var query
      var place
      var value
      query = message.text
      query = query.slice(9, query.search('{')).trim()
      place = message.text
      place = place.slice(place.search('{') + 1, place.search('=')).trim()
      value = message.text
      value = value.slice(value.search('=') + 1, value.search('}')).trim()
      bot.reply(message, 'Changing `' + place + '` to `' + value + '`')
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/profiles',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
          'content-type': 'application/json',
        },
      }
      ;``

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        display = null
        while (body.includes('{') && display == null) {
          if (body.slice(body.search('{'), body.search('}')).includes(query)) {
            display = body.slice(body.search('{'), body.search('}'))
          }
          body = body.replace('{', '.')
          body = body.replace('}', '.')
        }
        display = display.slice(
          display.search('id') + 2,
          display.search('Alias')
        )
        display = display.replace(/"/g, '')
        display = display.replace(/,/g, '')
        display = display.replace(/:/g, '')
        var request = require('request')
        var options = {
          method: 'PUT',
          url: 'https://superheros-59a4.restdb.io/rest/profiles/' + display,
          headers: {
            'cache-control': 'no-cache',
            'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
            'content-type': 'application/json',
          },
          body: disobj,
          json: true,
        }
        request(options, function (error, response, body) {
          if (error) throw new Error(error)
          if (error == null) {
            bot.reply(message, 'Query Successful')
          } else {
            bot.reply(message, '**ERROR:**\n' + error)
          }
        })
      })
    }
  )

  controller.hears(
    prefix + 'setitem',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var query
      var disobj = new Object()
      query = message.text
      query = query.slice(9, query.lenght).trim()
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/items',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
          'content-type': 'application/json',
        },
      }

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        display = null
        while (body.includes('{') && display == null) {
          if (body.slice(body.search('{'), body.search('}')).includes(query)) {
            display = body.slice(body.search('{'), body.search('}'))
          }
          body = body.replace('{', '.')
          body = body.replace('}', '.')
        }
        display = display.slice(display.search('Name'), display.length)
        display = display.replace(/"/g, '')
        while (display.includes(',')) {
          if (display.slice(0, display.search(':')) != place) {
            disobj[display.slice(0, display.search(':'))] = display.slice(
              display.search(':') + 1,
              display.search(',')
            )
          } else {
            disobj[place] = value
          }
          display = display.slice(display.search(',') + 1, display.lenght)
        }
        if (display.slice(0, display.search(':')) != place) {
          disobj[display.slice(0, display.search(':'))] = display.slice(
            display.search(':') + 1,
            display.lenght
          )
        } else {
          disobj[place] = value
        }
      })

      var query
      var place
      var value
      query = message.text
      query = query.slice(9, query.search('{')).trim()
      place = message.text
      place = place.slice(place.search('{') + 1, place.search('=')).trim()
      value = message.text
      value = value.slice(value.search('=') + 1, value.search('}')).trim()
      bot.reply(message, 'Changing `' + place + '` to `' + value + '`')
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/items',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
          'content-type': 'application/json',
        },
      }
      ;``

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        display = null
        while (body.includes('{') && display == null) {
          if (body.slice(body.search('{'), body.search('}')).includes(query)) {
            display = body.slice(body.search('{'), body.search('}'))
          }
          body = body.replace('{', '.')
          body = body.replace('}', '.')
        }
        display = display.slice(
          display.search('id') + 2,
          display.search('Name')
        )
        display = display.replace(/"/g, '')
        display = display.replace(/,/g, '')
        display = display.replace(/:/g, '')
        var request = require('request')
        var options = {
          method: 'PUT',
          url: 'https://superheros-59a4.restdb.io/rest/items/' + display,
          headers: {
            'cache-control': 'no-cache',
            'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
            'content-type': 'application/json',
          },
          body: disobj,
          json: true,
        }
        request(options, function (error, response, body) {
          if (error) throw new Error(error)
          if (error == null) {
            bot.reply(message, 'Query Successful')
          } else {
            bot.reply(message, '**ERROR:**\n' + error)
          }
        })
      })
    }
  )
  controller.hears(
    prefix + 'setteam',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var query
      var disobj = new Object()
      query = message.text
      query = query.slice(9, query.lenght).trim()
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/teams',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
          'content-type': 'application/json',
        },
      }

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        display = null
        while (body.includes('{') && display == null) {
          if (body.slice(body.search('{'), body.search('}')).includes(query)) {
            display = body.slice(body.search('{'), body.search('}'))
          }
          body = body.replace('{', '.')
          body = body.replace('}', '.')
        }
        display = display.slice(display.search('Name'), display.length)
        display = display.replace(/"/g, '')
        while (display.includes(',')) {
          if (display.slice(0, display.search(':')) != place) {
            disobj[display.slice(0, display.search(':'))] = display.slice(
              display.search(':') + 1,
              display.search(',')
            )
          } else {
            disobj[place] = value
          }
          display = display.slice(display.search(',') + 1, display.lenght)
        }
        if (display.slice(0, display.search(':')) != place) {
          disobj[display.slice(0, display.search(':'))] = display.slice(
            display.search(':') + 1,
            display.lenght
          )
        } else {
          disobj[place] = value
        }
      })

      var query
      var place
      var value
      query = message.text
      query = query.slice(9, query.search('{')).trim()
      place = message.text
      place = place.slice(place.search('{') + 1, place.search('=')).trim()
      value = message.text
      value = value.slice(value.search('=') + 1, value.search('}')).trim()
      bot.reply(message, 'Changing `' + place + '` to `' + value + '`')
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/teams',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
          'content-type': 'application/json',
        },
      }
      ;``

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        display = null
        while (body.includes('{') && display == null) {
          if (body.slice(body.search('{'), body.search('}')).includes(query)) {
            display = body.slice(body.search('{'), body.search('}'))
          }
          body = body.replace('{', '.')
          body = body.replace('}', '.')
        }
        display = display.slice(
          display.search('id') + 2,
          display.search('Name')
        )
        display = display.replace(/"/g, '')
        display = display.replace(/,/g, '')
        display = display.replace(/:/g, '')
        var request = require('request')
        var options = {
          method: 'PUT',
          url: 'https://superheros-59a4.restdb.io/rest/teams/' + display,
          headers: {
            'cache-control': 'no-cache',
            'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
            'content-type': 'application/json',
          },
          body: disobj,
          json: true,
        }
        request(options, function (error, response, body) {
          if (error) throw new Error(error)
          if (error == null) {
            bot.reply(message, 'Query Successful')
          } else {
            bot.reply(message, '**ERROR:**\n' + error)
          }
        })
      })
    }
  )

  controller.hears(
    prefix + 'getpower',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var query
      query = message.text
      query = query.slice(10, query.lenght).trim()
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/powers',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
        },
      }

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        display = null
        while (body.includes('{') && display == null) {
          if (body.slice(body.search('{'), body.search('}')).includes(query)) {
            display = body.slice(body.search('{'), body.search('}'))
          }
          body = body.replace('{', '.')
          body = body.replace('}', '.')
        }
        display = display.slice(display.search('Name'), display.length)
        display = display.replace(/"/g, '')
        display = display.replace(/,/g, '`\n**')
        display = display.replace(/:/g, '**\n    `')
        bot.reply(message, '**' + display + '`')
      })
    }
  )

  controller.hears(
    prefix + 'getteam',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var query
      query = message.text
      query = query.slice(9, query.lenght).trim()
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/teams',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
          'content-type': 'application/json',
        },
      }

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        display = null
        while (body.includes('{') && display == null) {
          if (body.slice(body.search('{'), body.search('}')).includes(query)) {
            display = body.slice(body.search('{'), body.search('}'))
          }
          body = body.replace('{', '.')
          body = body.replace('}', '.')
        }
        display = display.slice(display.search('Name'), display.length)
        display = display.replace(/"/g, '')
        display = display.replace(/,/g, '`\n**')
        display = display.replace(/:/g, '**\n    `')
        bot.reply(message, '**' + display + '`')
      })
    }
  )

  controller.hears(
    prefix + 'getitem',
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      var query
      query = message.text
      query = query.slice(9, query.lenght).trim()
      var request = require('request')
      var options = {
        method: 'GET',
        url: 'https://superheros-59a4.restdb.io/rest/items',
        headers: {
          'cache-control': 'no-cache',
          'x-apikey': '3dd8abccfaaef1f2eadb73028f76b26e40a71',
          'content-type': 'application/json',
        },
      }

      request(options, function (error, response, body) {
        if (error) throw new Error(error)
        display = null
        while (body.includes('{') && display == null) {
          if (body.slice(body.search('{'), body.search('}')).includes(query)) {
            display = body.slice(body.search('{'), body.search('}'))
          }
          body = body.replace('{', '.')
          body = body.replace('}', '.')
        }
        display = display.slice(display.search('Name'), display.length)
        display = display.replace(/"/g, '')
        display = display.replace(/,/g, '`\n**')
        display = display.replace(/:/g, '**\n    `')
        display = display.replace(/~/g, '`\n    `')
        bot.reply(message, '**' + display + '`')
      })
    }
  )

  // Generic

  controller.hears(
    [''],
    ['ambient', 'direct_message', 'mention'],
    (bot, message) => {
      if (
        message.user.username !== realbotname &&
        Math.round(Math.floor(Math.random() * 10)) == 1
      ) {
        //bot.reply(message, faces[Math.round(Math.floor(Math.random() * faces.length))].toLowerCase());
      }
      if (
        message.user.username !== realbotname &&
        Math.round(Math.floor(Math.random() * 1000000)) == 1
      ) {
        bot.reply(
          message,
          '**WOW!!!!!**\nThis message has a 1 in a million chance of appearing after a user sends a message.\nThis is quite boring tho, I doubt it was worth it.'
        )
      }
    }
  )
}
