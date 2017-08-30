var Bot = require('./bot/bot');


var borgil = new Bot();

// borgil.use('echo');
// borgil.use('errortest');
borgil.use('admin');
borgil.use('broadcast');
borgil.use('ddg-scraper');
borgil.use('eightball');
borgil.use('modes');
borgil.use('nickserv');
borgil.use('quote');
borgil.use('rss');
borgil.use('sed');
borgil.use('url');
borgil.use('youtube');
borgil.use('phabfeed');
