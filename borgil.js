var Bot = require('./bot/bot');
var config = require('./config');


var borgil = new Bot(config);

//borgil.use(require('./plugins/echo'));
borgil.use(require('./plugins/broadcast'));
borgil.use(require('./plugins/ddg-scraper'));
borgil.use(require('./plugins/sed'));
borgil.use(require('./plugins/url'));
