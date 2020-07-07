function mergeOptions() {}
exports.mixin = function(Vue) {
  Vue.mixin = function(mixin) {
    this.options = mergeOptions(this.options, mixin);
    return this;
  };
};
