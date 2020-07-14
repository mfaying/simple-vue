const computedWatcherOptions = { lazy: true };

function initComputed(vm, computed) {
  const watchers = (vm._computedWatchers = Object.create(null));
  // 计算属性在SSR环境中，只是一个普通的getter方法
  const isSSR = isServerRendering();

  for (const key in computed) {
    const userDef = computed[key];
    const getter = typeof userDef === "function" ? userDef : userDef.get;
    if (process.env.NODE_ENV !== "production" && getter === null) {
      console.warn("");
    }

    // 在非SSR环境中，为计算属性创建内部观察器
    if (!isSSR) {
      watchers[key] = new watchers(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      );
    }

    if (!(key in vm)) {
      defineComputed(vm, key, userDef);
    } else if (process.env.NODE_ENV !== "prodution") {
      if (key in vm.$data) {
        console.warn();
      } else if (vm.$options.props && key in vm.$options.props) {
        console.warn();
      }
    }
  }
}

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
};

function defineComputed(target, key, userDef) {
  const shouldCache = !isServerRendering();
  if (typeof userDef === "function") {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : userDef;
    sharedPropertyDefinition.set = noop;
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : userDef.get
      : noop;

    sharedPropertyDefinition.set = userDef.set ? userDef.set : noop;
  }
  if (
    process.env.NODE_ENV !== "production" &&
    sharedPropertyDefinition.set === noop
  ) {
    sharedPropertyDefinition.set = function() {
      console.warn();
    };
  }
  Object.defineProperties(target, key, sharedPropertyDefinition);
}

// v.2.5.2
function createComputedGetter(key) {
  return function computedGetter() {
    const watcher = this._computedWatchers && this._computedWatchers[key];
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate();
      }
      if (Dep.target) {
        watcher.depend();
      }
      return watcher.value;
    }
  };
}

// v2.5.17
function createComputedGetter(key) {
  return function computedGetter() {
    const watcher = this._computedWatchers && this._computedWatchers[key];
    if (watcher) {
      watcher.depend();
      return watcher.evaluate();
    }
  };
}

// Watcher专门定义了depend和evaluate方法用于实现计算属性相关的功能
import { parsePath } from "./util";
import { isObject } from "util";

// v.2.5.2
export default class Watcher {
  constructor(vm, expOrFn, cb, options) {
    // 隐藏无关代码
    if (options) {
      this.lazy = !!options.lazy;
    } else {
      this.lazy = false;
    }

    this.dirty = this.lazy;

    this.value = this.lazy ? undefined : this.get();
  }

  evaluate() {
    this.value = this.get();
    this.dirty = false;
  }

  depend() {
    let i = this.deps.length;
    while (i--) {
      this.deps[i].depend();
    }
  }
}

// v2.5.17
class Watcher {
  constructor(vm, expOrFn, cb, options) {
    // 隐藏无关代码
    if (options) {
      this.computed = !!options.computed;
    } else {
      this.computed = false;
    }

    this.dirty = this.computed;

    if (this.computed) {
      this.value = undefined;
      this.dep = new Dep();
    } else {
      this.value = this.get();
    }
  }

  update() {
    if (this.computed) {
      if (this.dep.subs.length === 0) {
        this.dirty = true;
      } else {
        this.getAndInvoke(() => {
          this.dep.notify();
        });
      }
    }
    // 隐藏无关代码
  }

  getAndInvoke(cb) {
    const value = this.get();
    if (value !== this.value || isObject(value) || this.deep) {
      const oldValue = this.value;
      this.value = value;
      this.dirty = false;
      if (this.user) {
        try {
          cb.call(this.vm, value, oldValue);
        } catch (e) {
          console.error("");
        }
      } else {
        cb.call(this.vm, value, oldValue);
      }
    }
  }

  evaluate() {
    if (this.dirty) {
      this.value = this.get();
      this.dirty = false;
    }
    return this.value;
  }

  depend() {
    if (this.dep && Dep.target) {
      this.dep.depend();
    }
  }
}
