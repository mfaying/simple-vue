# 实例方法和全局API
# 事件相关的实例方法
在eventsMixin中挂载到Vue构造函数的prototype中
## vm.$on
将回调fn注册到事件列表中即可，_events在实例初始化时创建。
```js
Vue.prototype.$on = function(event, fn) {
  const vm = this;
  if (Array.isArray(event)) {
    for (let i = 0, l = event.length; i < l; i++) {
      this.$on(event[i], fn);
    }
  } else {
    (vm._events[event] || (vm._events[event] = [])).push(fn);
  }
  return vm;
};
```
## vm.$off
支持`off`、`off('eventName')`、`off('eventName', fn)`、`off(['eventName1', 'eventName2'])`、`off(['eventName1', 'eventName2'], fn)`多种情况
```js
Vue.prototype.$off = function(event, fn) {
  const vm = this;
  if (!arguments.length) {
    vm._events = Object.create(null);
    return vm;
  }

  if (Array.isArray(event)) {
    for (let i = 0, l = event.length; i < l; i++) {
      this.$off(event[i], fn);
    }
    return vm;
  }

  const cbs = vm._events[event];
  if (!cbs) {
    return vm;
  }
  if (!fn) {
    vm._events[event] = null;
    return vm;
  }

  if (fn) {
    const cbs = vm._events[event];
    let cb;
    let i = cbs.length;
    while (i--) {
      cb = cbs[i];
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1);
        break;
      }
    }
  }

  return vm;
};
```
## vm.$once
先移除事件监听，再执行函数。
```js
Vue.prototype.$once = function(event, fn) {
  const vm = this;
  function on() {
    vm.$off(event, on)
    fn.apply(vm, arguments)
  }
  on.fn = fn;
  vm.$on(event, on);
  return vm;
};
```
## vm.$emit
取出对应event回调函数列表，再遍历执行
```js
Vue.prototype.$emit = function(event) {
  const vm = this;
  let cbs = vm._events[event];
  if (cbs) {
    const args = Array.from(arguments).slice(1)
    for (let i = 0, l = cbs.length; i < l; i ++) {
      try {
        cbs[i].apply(vm, args)
      } catch (e) {
        console.error(e, vm, `event handler for "${event}"`)
      }
    }
  }
  return vm;
};
```
# 生命周期相关的实例方法
## vm.$forceUpdate
执行_watcher.update(前面介绍过原理)，手动通知实例重新渲染
```js
Vue.prototype.$forceUpdate = function() {
  const vm = this;
  if (vm._watcher) {
    vm._watcher.update();
  }
};
```
## vm.$destroy
vm.$destroy可以销毁一个实例
1. 先触发beforeDestroy生命周期
2. 删除当前组件与父组件之间的连接
3. 从状态的依赖列表中将watcher移除
4. 销毁用户使用vm.$watch所创建的watcher实例
5. 将模板中所有指令解绑`vm.__patch__(vm._vnode, null)`
6. 触发destroyed生命周期
7. 移除所有事件监听器
```js
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
```
## vm.$nextTick
nextTick接收一个回调函数作为参数，它的作用是将回调延迟到下次DOM更新周期之后执行。如果没有提供回调且支持Promise的环境中，则返回一个Promise。

使用示例：
```js
new Vue({
  // ...
  methods: {
    example: function() {
      this.msg = 1;
      this.$nextTick(function () {
        // DOM现在更新了
      })
    }
  }
})
```
### 异步更新队列
在同一轮事件循环中即使有数据发生了两次相同的变化，也不会渲染两次。因为Vue.js会将受到通知的watcher实例添加到队列中缓存起来，添加到队列之前会检查是否已经存在相同的watcher，只有不存在，才会将watcher实例添加到队列中。下次事件循环会让队列里的watcher触发渲染流程并清空队列。

### 什么是事件循环
JavaScript是单线程的脚本语言，任何时候都只有一个主线程来处理任务。当处理异步任务时，主线程会挂起这任务，当任务处理完毕，JavaScript会将这个事件加入一个队列，我们叫`事件队列`，被放入事件队列中的事件不会立即执行其回调，而是等待当前执行栈中的所有任务执行完毕后，主线程会去查找事件队列中是否有任务。

异步任务有两种类型：微任务和宏任务。当执行栈中的所有任务都执行完毕后，会去检查微任务队列中是否有事件存在，如果有则一次执行微任务队列中事件对应的回调，直到为空。然后去宏任务队列中取出一个事件，把对应的回调加入当前执行栈，当执行栈中的所有任务都执行完毕后，检查微任务队列，如此往复，这个循环就是`事件循环`。

属于微任务的事件有：
1. Promise.then
2. MutationObserver
3. Object.observe
4. process.nextTick
5. ...

属于宏任务的事件有
1. setTimeout
2. setInterval
3. setImmediate
4. MessageChannel
5. requestAnimationFrame
6. I/O
7. UI交互事件
8. ...

下次DOM更新周期其实是下次微任务执行时更新DOM。vm.$nextTick其实是将回调添加到微任务中。只有特殊情况下才会降级成宏任务。
### nextTick的实现
nextTick一般情况会使用Promise.then将`flushCallbacks`添加到微任务队列中
`withMacroTask`包裹的函数所使用的nextTick方法会将回调添加到宏任务中。
```js
const callbacks = [];
let pending = false;

function flushCallbacks() {
  pending = false;
  const copies = callbacks.slice(0);
  callbacks.length = 0;
  for (let i = 0; i < copies.length; i++) {
    copies[i]();
  }
}

let microTimerFunc;
let macroTimerFunc;
function isNative() {
  // 实现忽略
  return true;
}
if (typeof setImmediate !== "undefined" && isNative(setImmediate)) {
  macroTimerFunc = () => {
    setImmediate(flushCallbacks);
  };
} else if (
  typeof MessageChannel !== "undefined" &&
  (isNative(MessageChannel) ||
    MessageChannel.toString() === "[object MessageChannelConstructor]")
) {
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = flushCallbacks;
  macroTimerFunc = () => {
    port.postMessage(1);
  };
} else {
  macroTimerFunc = () => {
    setTimeout(flushCallbacks, 0);
  };
}
let useMacroTask = false;

if (typeof Promise !== "undefined" && isNative(Promise)) {
  const p = Promise.resolve();
  microTimerFunc = () => {
    p.then(flushCallbacks);
  };
} else {
  microTimerFunc = macroTimerFunc;
}

export function withMacroTask(fn) {
  return (
    fn._withTask ||
    (fn._withTask = function() {
      useMacroTask = true;
      const res = fn.apply(null, arguments);
      useMacroTask = false;
      return res;
    })
  );
}

export function nextTick(cb, ctx) {
  let _resolve;
  callbacks.push(() => {
    if (cb) {
      cb.call(ctx);
    } else if (_resolve) {
      _resolve(ctx);
    }
  });
  if (!pending) {
    pending = true;
    if (useMacroTask) {
      macroTimerFunc();
    } else {
      microTimerFunc();
    }
  }
  if (!cb && typeof Promise !== "undefined") {
    return new Promise(resolve => {
      _resolve = resolve;
    });
  }
}
```
## vm.$mount
想让Vue.js实例具有关联的DOM元素，只有使用vm.$mount方法这一种途经。
```js
  Vue.prototype.$mount = function(el) {
    el = el && query(el);

    const options = this.$options;
    if (!options.render) {
      let template = options.template;
      if (template) {
        if (typeof template === "string") {
          if (template.charAt(0) === "#") {
            template = idToTemplate(template);
          }
        } else if (template.nodeType) {
          template = template.innerHTML;
        } else {
          if (process.env.NODE_ENV !== "production") {
            console.warn("invalid template option:" + template, this);
          }
          return this;
        }
      } else if (el) {
        template = getOuterHTML(el);
      }

      if (template) {
        const { render } = compileToFunctions(template, options, this);
        options.render = render;
      }
    }

    return mountComponent(this, el);

    // return mount.call(this, el);
  };
}

function mountComponent(vm, el) {
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode;
    if (process.env.NODE_ENV !== "production") {
      // 在开发环境发出警告
    }
    callHook(vm, "beforeMount");

    // 挂载
    // _update 调用patch方法执行节点的比对和渲染操作
    // _render 执行渲染函数，得到一份最新的VNode节点树
    // vm._watcher = new Watcher(
    //   vm,
    //   () => {
    //     vm._update(vm._render());
    //   },
    //   noop
    // );

    callHook(vm, "mounted");
    return vm;
  }
}

function createEmptyVNode() {}
function callHook() {}

function idToTemplate(id) {
  const el = query(id);
  return el && el.innerHTML;
}

function query(el) {
  if (typeof el === "string") {
    const selected = document.querySelector(el);
    if (!selected) {
      return document.createElement("div");
    }
    return selected;
  } else {
    return el;
  }
}

function getOuterHTML(el) {
  if (el.outerHTML) {
    return el.outerHTML;
  } else {
    const container = document.createElement("div");
    container.appendChild(el.cloneNode(true));
    return container.innerHTML;
  }
}

const cache = {};

function compile() {
  // 03章节介绍过的生成代码字符串
  return {
    render: ""
  };
}

function compileToFunctions(template, options, vm) {
  // options = extend({}, options);

  // 检查缓存
  const key = options.delimiters
    ? String(options.delimiters) + template
    : template;
  if (cache[key]) {
    return cache[key];
  }

  const compiled = compile(template, options);

  const res = {};
  res.render = createFunction(compiled.render);

  return (cache[key] = res);
}

function createFunction(code) {
  return new Function(code);
}
```
## Vue.extend
使用基础Vue构造器创建一个"子类"
```js
let cid = 1;
const ASSET_TYPES = ["component", "directive", "filter"];

exports.extend = function(Vue) {
  Vue.extend = function(extendOptions) {
    extendOptions = extendOptions || {};
    const Super = this;
    const SuperId = Super.cid;
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId];
    }

    // const name = extendOptions.name || Super.options.name;
    const name = extendOptions.name;
    if (process.env.NODE_ENV !== "production") {
      if (!/^[a-zA-Z][\w-]*$/.test(name)) {
        console.warn("");
      }
    }
    const Sub = function VueComponent(options) {
      this._init(options);
    };

    Sub.prototype = Object.create(Super.prototype);
    Super.prototype.constructor = Sub;
    Sub.cid = cid++;

    Sub.options = { ...Super.options, ...extendOptions };

    Sub["super"] = Super;

    if (Sub.options.props) {
      initProps(Sub);
    }

    if (Sub.options.computed) {
      initComputed(Sub);
    }

    Sub.extend = Super.extend;
    Sub.mixin = Super.mixin;
    Sub.use = Super.use;

    ASSET_TYPES.forEach(type => {
      Sub[type] = Super[type];
    });

    if (name) {
      Sub.options.components[name] = Sub;
    }

    Sub.superOptions = Super.options;
    Sub.extendOptions = extendOptions;
    Sub.sealedOptions = Object.assign({}, Sub.options);

    cachedCtors[SuperId] = Sub;
    return Sub;
  };
};

function initProps(Comp) {
  const props = Comp.options.props;
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key);
  }
}

function proxy(target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter() {
    return this[sourceKey][key];
  };
  sharedPropertyDefinition.set = function proxySetter(val) {
    this[sourceKey][key] = val;
  };
  Object.defineProperties(target, key, sharedPropertyDefinition);
}

function initComputed(Comp) {
  const computed = Comp.options.computed;
  for (const key in computed) {
    definedComputed(Comp.prototype, key, computed[key]);
  }
}
```
## Vue.nextTick
和前面介绍过的原理一样
## Vue.set
和前面介绍过的原理一样
## Vue.delete
和前面介绍过的原理一样
## Vue.directive、Vue.filter、Vue.component
```js
// Vue.filter、Vue.component、Vue.directive原理
const ASSET_TYPES = ["component", "directive", "filter"];

function isPlainObject() {}

exports.filterAndOther = function(Vue) {
  Vue.options = Object.create(null);
  ASSET_TYPES.forEach(type => {
    Vue.options[type + "s"] = Object.create(null);
  });

  ASSET_TYPES.forEach(type => {
    Vue.directive = function(id, definition) {
      ASSET_TYPES.forEach(type => {
        Vue.options[type + "s"] = Object.create(null);
      });
      ASSET_TYPES.forEach(type => {
        Vue[type] = function(id, definition) {
          if (!definition) {
            return this.options[type + "s"][id];
          } else {
            if (type === "component" && isPlainObject(definition)) {
              definition.name = definition.name || id;
              definition = Vue.extend(definition);
            }
            if (type === "directive" && typeof definition === "function") {
              definition = { bind: definition, update: definition };
            }
            this.options[type + "s"][id] = definition;
            return definition;
          }
        };
      });
    };
  });
};
```
## Vue.use
会调用install方法，将Vue作为参数传入，install方法会被同一个插件多次调用，插件只会安装一次。
```js
exports.use = function(Vue) {
  Vue.use = function(plugin) {
    const installedPlugins =
      this._installedPlugins || (this._installedPlugins = []);
    if (installedPlugins.indexOf(plugin) > -1) {
      return this;
    }

    const args = Array.from(arguments).slice(1);
    args.unshift(this);
    if (typeof plugin.install === "function") {
      plugin.install.apply(plugin, args);
    } else if (typeof plugin === "function") {
      plugin.apply(null, args);
    }
    installedPlugins.push(plugin);
    return this;
  };
};
```
## Vue.mixin
全局注册一个混入（mixin）,影响注册之后创建的每个Vue.js实例。插件作者可以使用混入向组件注入自定义行为（例如：监听生命周期钩子）。不推荐在应用代码中使用
```js
function mergeOptions() {}
exports.mixin = function(Vue) {
  Vue.mixin = function(mixin) {
    this.options = mergeOptions(this.options, mixin);
    return this;
  };
};
```
## Vue.compile
前面介绍过的将模板编译成渲染函数的原理
## Vue.version
返回Vue.js安装版本号，从Vue构建文件配置中取





