# Object 的变化侦测

通过 Object.defineProperty 可以实现变化侦测

```js
Object.defineProperty(data, key, {
  enumerable: true,
  configurable: true,
  get: function() {
    dep.depend();
    return val;
  },
  set: function(newVal) {
    if (val === newVal) {
      return;
    }
    val = newVal;
    dep.notify();
  }
});
```

我们在 get 中收集依赖，在 set 中触发依赖。依赖收集在 dep 中，它的定义如下：

```js
export default class Dep {
  constructor() {
    this.subs = [];
  }
  addSub(sub) {
    this.subs.push(sub);
  }
  removeSub(sub) {
    remove(this.subs, sub);
  }
  depend() {
    if (window.target) {
      this.addSub(window.target);
    }
  }
  notify() {
    const subs = this.subs.slice();
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update();
    }
  }
}

function remove(arr, item) {
  if (arr.length) {
    const index = arr.indexOf(item);
    if (index > -1) {
      return arr.splice(index, 1);
    }
  }
}
```

Dep 将依赖管理的逻辑解耦出来了。它的原理也很简单，基于数组来管理依赖。

那么依赖被通知了，它会执行什么呢？答案是 watcher。watcher 可以理解为任意数据改变需要触发操作的东西，如视图更新。

```js
import { parsePath } from "./util";

export default class Watcher {
  constructor(vm, expOrFn, cb) {
    this.vm = vm;
    this.getter = parsePath(expOrFn);
    this.cb = cb;
    this.value = this.get();
  }

  get() {
    window.target = this;
    let value = this.getter.call(this.vm, this.vm);
    window.target = undefined;
    return value;
  }
  update() {
    const oldValue = this.value;
    this.value = this.get();
    this.cb.call(this.vm, this.value, oldValue);
  }
}
```

Watcher 和 Dep 通过一个共同变量 window.target，可以实现依赖的自动收集。

最后，我们需要一个 Observer 类，它可以将一个普通对象完全转换为响应式数据。无论 key 在对象的什么位置，因为它在实现上使用了递归。

```js
class Observer {
  constructor(value) {
    this.value = value;

    if (!Array.isArray(value)) {
      this.walk(value);
    }
  }

  walk(obj) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]]);
    }
  }
}

function defineReactive(data, key, val) {
  if (typeof val === "object") {
    new Observer(val);
  }
  let dep = new Dep();
  Object.defineProperty(data, key, {
    enumerable: true,
    configurable: true,
    get: function() {
      dep.depend();
      return val;
    },
    set: function(newVal) {
      if (val === newVal) {
        return;
      }
      val = newVal;
      dep.notify();
    }
  });
}
```

最后让我们来验证一下

```js
import Observer from "./Observer";
import Watcher from "./Watcher";

window.data = {
  a: {
    b: {
      c: 1
    }
  }
};
new Observer(window.data);
new Watcher(window.data, "a.b", () => {
  console.log("watcher");
});
// 执行后打印watcher
window.data.a.b = 1;
```
