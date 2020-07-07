import { remove } from "./utils";

export function lifecycleMixin(Vue) {
  Vue.prototype.$forceUpdate = function() {
    const vm = this;
    if (vm._watcher) {
      vm._watcher.update();
    }
  };

  Vue.prototype.$destroy = function() {
    const vm = this;
    if (vm._isBeingDestroyed) {
      return;
    }
    // callHook(vm, 'beforeDestroy')
    vm._isBeingDestroyed = true;
    const parent = vm.$parent;
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm);
    }
    if (vm._watcher) {
      vm._watcher.teardown();
    }
    let i = vm._watchers.length;
    while (i--) {
      vm._watchers[i].teardown();
    }
    vm._isDestroyed = true;
    // vm.__patch__(vm._vnode, null);
    // callHook(vm, 'destroyed')
    vm.$off();
  };
}
