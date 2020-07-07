// import { nextTick } from "./utils";

exports.nextTick = function(Vue) {
  Vue.nextTick = function() {
    // 和utils的nextTick一样
    // Vue.set、Vue.delete也和之前一样的原理
  };
};
