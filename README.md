## Caution: the developer of this project has ghosted leaving this project in an unworkable state
## Bug fixes are helpful!

# Borgil, the multi-purpose messaging bot

Borgil is a messaging bot that can talk over multiple network protocols.
It currently supports IRC and Telegram, but is designed to be extensible enough
that others can be added easily.

Like many bots, Borgil's functionality is extensible as well, through the use of plugins.
Several plugins are included by default, and you can write or include others.

Borgil is written in Node.js, and is currently experimental.
Features may change without notice, and many are unstable.
But that's the fun part.

## Dependencies

Borgil requires the following packages (on Debian/Ubuntu):
* `nodejs-legacy`
* `nodejs`
* `npm`

## Setup

Execute `npm install` from its directory. 

To run it, you need a startup script.
A default, `borgil.js`, is included.
All this does is instantiate the bot with some configuration options, and add some plugins.

#### Add your configuration

`var borgil = new Bot('config.yml')`

This line in the startup script instantiates the bot,
passing it either a config object, or the path to a config file.
The config file can be in JSON or YAML format, and an example of each is provided.

#### Add plugins

Plugins reside in the `/plugins` directory. Include them from the startup script like this:

`borgil.use('echo')`

This line will look for the `/plugins/echo.js` file, and add its functionality to the bot.

#### Start the bot

Customize your script if you need to, and run it: `node borgil.js` or `npm start`.


## How it works

Borgil can connect to multiple networks via one or more different protocols.
An individual connection, e.g. to an IRC server, is called a **transport**.
Transports can have multiple **channels**; e.g. IRC channels.

Transports emit **events** that Borgil's plugins can listen for,
and provide a few methods that plugins can use to respond.
There are various kinds of events,
but the most common are messages from other users on the network.

Messages can also contain **commands** that tell the bot to do things.
Commands are keywords prefixed with a dot (or a character of your choosing).


## Configuration

Configuration is passed via a Javascript object, either stored in a variable or a file.
For example files, look at `config.sample.json` and `config.sample.yml`.

Currently, the following global config options are available:

- `commandchar` `.` The prefix that identifies incoming messages as commands.
- `buffer` `100` The number of past messages to remember for each channel.
- `log`
    `dir` `'logs'` The relative path where log files will be stored.
    `filename_template` `'borgil--{{date}}.log'` A Handlebars template to use for log filenames.
    `date_format` `'YYYY-MM-DD--HH-mm-ss'` A Moment.js date format to use for log filenames.
    `console` `true` Whether to log to the console.
    `debug` `false` Whether to log messages that aren't errors.
- `dbdir` `'db'` The relative path where any database files required by plugins will be stored.
- `admins` `[]` A list of users who are considered admins.
- `transports` `{}` An object containing configuration objects for one or more transports.
- `plugins` `{}` An object containing configuration objects for one or more plugins.

#### Configuring transports

To add a transport to the bot, specify it in the `transports` object of the config.
Each transport must have a `type` option; the rest of the options depend on the protocol.

IRC options:

- `type` Set this to `irc`.
- `host` The hostname of the server you're connecting to.
- `nick` The nick to use on the server.
- `opts` Additional options that will be passed to the IRC client, documented here:
    https://node-irc.readthedocs.org/en/latest/API.html

Telegram options:

- `type` Set this to `telegram`.
- `token` Your authorization token for Telegram Bot API, documented here:
    https://core.telegram.org/bots/api
- `chat_ids` A list of Telegram chat IDs (user IDs or group chat IDs) to listen to.

#### Configuring plugins

Each plugin can have its own optional configuration object.
See the example configuration files.


## Extending the bot

There are two main ways to extend the bot: transports and plugins.

Transports live in the `/bot/transports` directory and extend from a base `Transport` object.
The interface for these right now is very simple:
they should emit `message` and `command` events,
and implement a few basic methods: `say`, `join`, `leave`, `connect` and `disconnect`.

Plugins are functions that live in the `/plugins` directory.
They are passed a plugin API object with a few methods and properties
that can be used to add functionality to the bot:

#### Plugin methods

`listen(pattern, callback)` -
Listen for a message that matches the string or regex `pattern` and run the callback.
The callback is passed an object containing information about the message,
and the transport it came from.

`addCommand(commands, callback)` -
Like `listen`, but only triggered on messages that start with the command character
and whose first word matches `commands`.
The `commands` argument can be a string or an array of strings.

`log(message)` -
Add a debug message to the log.

`error(message)` -
Add an error message to the log.

#### Plugin properties

`name` The name of the plugin.
`bot` The bot object.
`config` The configuration object.
`buffers` An object containing lists of the last few messages from each transport and channel.
`memory` An empty object that is shared across plugins.
`transports` A list of all the active transports.


## Contributing

While this bot is very experimental, please feel free to try it out,
and extend it with more transports or plugins if you so desire.

Bug reports are welcome; just submit them to the
[issue tracker](https://github.com/torontocrypto/borgil/issues).

Borgil has unit tests, using [Jasmine](https://jasmine.github.io).
Adding unit tests is a great way to demonstrate bugs or define new features.
Tests live in the `/spec` folder, and are run with `jasmine` or `npm test`.
