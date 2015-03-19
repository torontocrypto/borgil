var Bot = require('./bot');
var config = require('./config');


var borgil = new Bot(config);

//borgil.use(require('./plugins/echo'));
borgil.use(require('./plugins/url'));
