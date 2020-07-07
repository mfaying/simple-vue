export function initMixin(Vue) {
  Vue.prototype._init = function(options) {
    const vm = this;
    vm._events = Object.create(null);
    vm._watchers = [];
  };
}
