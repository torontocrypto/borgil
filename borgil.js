var Bot = require('./bot/bot');
var repl = require('repl');

var borgil = new Bot('config.json');
repl.start('Borgil> ').context.bot = borgil;

//borgil.use('echo');
//borgil.use('errortest');
borgil.use('broadcast');
borgil.use('ddg-scraper');
borgil.use('quote');
borgil.use('rss');
borgil.use('sed');
borgil.use('url');
borgil.use('youtube');
//borgil.use('eightball');
//borgil.use('ircutil');
borgil.use('plugin-manager');

