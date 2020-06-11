import Dep from "./Dep";
import { arrayMethods } from "./array";
import { def } from "./util";

const hasProto = "__proto__" in {};
const arrayKeys = Object.getOwnPropertyNames(arrayMethods);

class Observer {
  constructor(value) {
    this.value = value;
    this.dep = new Dep();
    def(value, "__ob__", this);

    if (Array.isArray(value)) {
      this.observeArray(value);
      const augment = hasProto ? protoAugment : copyAugment;
      augment(value, arrayMethods, arrayKeys);
      value.__proto__ = arrayMethods;
    } else {
      this.walk(value);
    }
  }

  walk(obj) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]]);
    }
  }

  observeArray(items) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  }
}

function protoAugment(target, src, keys) {
  target.__proto__ = src;
}

function copyAugment(target, src, keys) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    def(target, key, src[key]);
  }
}

export function observe(value, asRootData) {
  if (typeof value !== "object") {
    return;
  }
  // if (typeof value !== "object" && !Array.isArray(value)) {
  //   return;
  // }
  // if (!isObject(value)) {
  //   return;
  // }
  let ob;
  if (value.hasOwnProperty("__ob__") && value["__ob__"] instanceof Observer) {
    ob = value["__ob__"];
  } else {
    ob = new Observer(value);
  }
  return ob;
}

function defineReactive(data, key, val) {
  let childOb = observe(val);
  if (typeof val === "object") {
    new Observer(val);
  }
  let dep = new Dep();
  Object.defineProperty(data, key, {
    enumerable: true,
    configurable: true,
    get: function() {
      dep.depend();

      if (childOb) {
        childOb.dep.depend();
        // childOb.dep.notify();
      }
      return val;
    },
    set: function(newVal) {
      if (val === newVal) {
        return;
      }
      dep.notify();
      val = newVal;
    }
  });
}

export default Observer;
