var bot = require('./bot');
var config = require('./config');
var url = require('./plugins/url');

var borgil = bot(config);

borgil.use(url);
