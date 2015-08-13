var MockConfig = module.exports = function (paths) {
    this.paths = paths;
};

MockConfig.prototype.get = function (path) {
    return this.paths[path];
};
