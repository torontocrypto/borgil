module.exports = function (plugin) {
    var pattern = new RegExp(
        '(?:(\\S+):\\s+)?' +      // optional nick + colon
        '\\bs\\/' +               // s + slash
        '((?:\\\\/|[^\/])+)\\/' + // search term + slash
        '((?:\\\\/|[^\\/])*)' +   // optional replacement
        '(?:\\/(\\S+))?'          // optional slash + flags
    );

    plugin.listen(pattern, function (msg) {
        var other = msg.match[1],
            search = msg.match[2],
            replace = msg.match[3],
            flags = msg.match[4];

        var regex = new RegExp(search, flags);

        plugin.buffers[msg.transport.name][msg.replyto].slice(1).some(function (oldmsg) {
            // check for messages from the other nick if specified, else the same nick
            // try not to match other substitutions, i.e. messages starting with s/
            if (oldmsg.from == (other || msg.from) && oldmsg.text.slice(0, 2) != 's/') {
                var m = oldmsg.text.match(regex);
                if (m) {
                    // send a message back to the channel with the correction
                    var pre = other ? (msg.from + ' thinks ' + other) : msg.from
                    msg.transport.say(msg.replyto, pre + ' meant to say: ' + oldmsg.text.replace(regex, replace));
                    return true;
                }
            }
        });
    });
};
