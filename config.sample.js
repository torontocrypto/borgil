module.exports = {
    "networks": {
        "oftc": {
            "host": "irc.oftc.net",
            "nick": "borgil",
            "opts": {
                "port": 6697,
                "secure": true,
                "selfSigned": true,
                "userName": "borgil",
                "realName": "Borgil of Menelvagor"
            },
            "channels": ["#torontocrypto"],
            "nickserv": "password"
        },
        "i2p": {
            "host": "localhost",
            "nick": "borgil",
            "opts": {
                "port": 6668,
                "userName": "borgil",
                "realName": "Borgil of Menelvagor"
            },
            "channels": ["#torontocrypto"],
            "nickserv": "password"
        }
    }
};
