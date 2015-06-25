var MockPlugin = require('../helpers/mock-plugin');


describe('Admin plugin', function () {
    var admin;

    beforeEach(function () {
        admin = new MockPlugin('admin');
    });

    it('should join the channel', function () {
        admin._sendMessage('network1', 'admin', '#channel1', '.join #newchannel');
        expect(admin.join).toHaveBeenCalledWith('network1', '#newchannel', jasmine.any(Function));
    });

    it('should refuse to join channels the bot is already in', function () {
        admin._sendMessage('network1', 'admin', '#channel1', '.join #channel1');
        expect(admin.join).not.toHaveBeenCalled();
        expect(admin.say).toHaveBeenCalledWith('network1', '#channel1', "I'm already in that channel.");
    });

    it('should refuse to join channels if the caller is not an admin', function () {
        admin._sendMessage('network1', 'notadmin', '#channel1', '.join #newchannel');
        expect(admin.join).not.toHaveBeenCalled();
    });

    it('should part the channel', function () {
        admin._sendMessage('network1', 'admin', '#channel1', '.part #channel1');
        expect(admin.part).toHaveBeenCalledWith('network1', '#channel1', null, jasmine.any(Function));
    });

    it('should part the channel with a message', function () {
        admin._sendMessage('network1', 'admin', '#channel1', '.part #channel1 Later, dudes!');
        expect(admin.part).toHaveBeenCalledWith('network1', '#channel1', 'Later, dudes!', jasmine.any(Function));
    });

    it('should refuse to part channels the bot is not in', function () {
        admin._sendMessage('network1', 'admin', '#channel1', '.part #newchannel');
        expect(admin.part).not.toHaveBeenCalled();
        expect(admin.say).toHaveBeenCalledWith('network1', '#channel1', "I'm not in that channel.");
    });

    it('should refuse to part channels if the caller is not an admin', function () {
        admin._sendMessage('network1', 'notadmin', '#channel1', '.part #channel1');
        expect(admin.part).not.toHaveBeenCalled();
    });
});
