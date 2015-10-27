var Bot = require('./bot/bot');
//var repl = require('repl');

var borgil = new Bot('config.yml');
//repl.start('Borgil> ').context.bot = borgil;

// borgil.use('echo');
// borgil.use('errortest');
borgil.use('admin');
// borgil.use('broadcast');
borgil.use('ddg-scraper');
borgil.use('eightball');
borgil.use('modes');
borgil.use('nickserv');
borgil.use('quote');
borgil.use('rss');
borgil.use('sed');
borgil.use('url');
borgil.use('youtube');
