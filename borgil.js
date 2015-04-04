var Bot = require('./bot/bot');
var config = require('./config');


var borgil = new Bot(config);

//borgil.use('echo');
//borgil.use('errortest');
borgil.use('broadcast');
borgil.use('ddg-scraper');
borgil.use('sed');
borgil.use('url');
