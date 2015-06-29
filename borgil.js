var Bot = require('./bot/bot');


var borgil = new Bot('config.json');

// borgil.use('echo');
// borgil.use('errortest');
borgil.use('admin');
borgil.use('broadcast');
borgil.use('ddg-scraper');
borgil.use('eightball');
borgil.use('nickserv');
borgil.use('quote');
borgil.use('rss');
borgil.use('sed');
borgil.use('url');
borgil.use('youtube');
