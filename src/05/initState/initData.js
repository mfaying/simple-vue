import { noop } from "rxjs";

function initData(vm) {
  let data = vm.$options.data;
  data = vm._data = typeof data === "function" ? getData(data, vm) : data || {};
  if (!isPlainObject(data)) {
    data = {};
    process.env.NODE_ENV !== "production" && console.warn("");
  }

  const keys = object.keys(data);
  const props = vm.$options.props;
  const methods = vm.$options.methods;
  let i = keys.length;
  while (i--) {
    const key = keys[i];
    if (process.env.NODE_ENV !== "production") {
      if (methods && hasOwn(methods, key)) {
        console.warn("");
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== "production" && console.warn("");
    } else if (!isReserved(key)) {
      proxy(vm, `_data`, key);
    }
  }
  // 观察数据
  observe(data, true /* asRootData */);
}

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
};

function proxy(target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter() {
    return this[sourceKey][key];
  };
  sharedPropertyDefinition.set = function proxySetter() {
    this[sourceKey][key] = val;
  };
  Object.defineProperties(target, key, sharedPropertyDefinition);
}
