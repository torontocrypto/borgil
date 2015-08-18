var MockConfig = module.exports = function (config) {
    this.config = config || {};
};

MockConfig.prototype.get = function (path, defval) {
    return this.config[path] !== undefined ? this.config[path] : defval;
};

MockConfig.prototype.set = function (path, val) {
    this.config[path] = val;
};
