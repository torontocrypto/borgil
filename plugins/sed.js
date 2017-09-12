'use strict';

module.exports = function sedPlugin(plugin) {
    const pattern = new RegExp(
        '(?:(\\S+):\\s+)?' +     // optional nick + colon
        '\\bs\\/' +              // s + slash
        '((?:\\\\/|[^/])+)\\/' + // search term + slash
        '((?:\\\\/|[^\\/])*)' +  // optional replacement
        '(?:\\/(\\S+))?');       // optional slash + flags

    plugin.listen(pattern, (msg) => {
        const other = msg.match[1];
        const search = msg.match[2];
        const replace = msg.match[3];
        const flags = msg.match[4];

        const regex = new RegExp(search, flags);

        plugin.buffers[msg.transport.name][msg.replyto].slice(1).some((oldmsg) => {
            // check for messages from the other nick if specified, else the same nick
            // try not to match other substitutions, i.e. messages starting with s/
            if (oldmsg.from === (other || msg.from) && oldmsg.text.slice(0, 2) !== 's/') {
                const m = oldmsg.text.match(regex);
                if (m) {
                    // send a message back to the channel with the correction
                    msg.transport.say(msg.replyto, other ? `${msg.from} thinks ${other}` : msg.from,
                        'meant to say:', oldmsg.text.replace(regex, replace));
                    return true;
                }
            }

            return false;
        });
    });
};
