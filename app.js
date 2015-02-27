var irc = require('irc');

var networks = {
	'oftc': {
		host: 'irc.oftc.net',
		nick: 'borgil',
		opts: {
			userName: 'borgil',
			realName: 'Borgil of Menelvagor',
			channels: ['#torontocrypto'],
		}
	},
	'i2p': {
		host: 'localhost',
		nick: 'borgil',
		opts: {
			port: 6668,
			userName: 'borgil',
			realName: 'Borgil of Menelvagor',
			channels: ['#torontocrypto'],
		}
	}
};

for (var id in networks) {
	// create client
	client = new irc.Client(networks[id].host, networks[id].nick, networks[id].opts);
	client.id = id;
	networks[id].client = client;

	// debug
	client.addListener('raw', function (msg) {
		switch(msg.rawCommand) {

		case '001':
			console.log(this.id + ': Received welcome message from ' + msg.server);
			break;

		case 'JOIN':
			console.log(this.id + ': Joined channel ' + msg.args[0]);
		}
	});

	// broadcast to all channels on all other clients
	client.addListener('message', function (nick, to, text, msg) {
		if (networks[this.id].opts.channels.indexOf(to) > -1) {
			for (var oid in networks) {
				if (oid == this.id) continue;
				networks[oid].opts.channels.forEach(function (channel) {
					networks[oid].client.say(channel, '<' + this.id + '> [' + nick + '] ' + text);
				}, this);
			}
		}
	});
}
