module.exports = {
    "debug": false,
    "commandchar": ".",
    "buffer": 100,
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
            "nickserv_channels": ["#torontocrypto"],
            "nickserv_password": "password"
        },
        "i2p": {
            "host": "localhost",
            "nick": "borgil",
            "opts": {
                "port": 6668,
                "userName": "borgil",
                "realName": "Borgil of Menelvagor"
            },
            "nickserv_channels": ["#torontocrypto"],
            "nickserv_password": "password"
        }
    }
};
