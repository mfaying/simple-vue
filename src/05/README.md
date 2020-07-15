# 生命周期
## 初始化阶段
new Vue()到created之间的阶段叫作初始化阶段，这个阶段的主要目的是在Vue.js实例上初始化一些属性、事件以及响应式数据。如props、methods、data、computed、watch、provide和inject
## 模板编译阶段
在created钩子函数与beforeMout钩子函数之间的阶段是模板编译阶段。
这个阶段的目的是将模板编译为渲染函数，只存在于完整版中。
## 挂载阶段
beforeMount钩子函数到mounted钩子函数之间是挂载阶段。
在这个阶段，Vue.js会将其实例挂载到DOM元素上，通俗地讲，就是将模板渲染到指定的DOM元素中。在挂载的过程中，Vue.js会开启Watcher来持续追踪依赖的变化。
当数据（状态）发生变化时，Watcher会通知虚拟DOM重新渲染视图，并且会在渲染视图前触发beforeUpdate钩子函数，渲染完毕后触发updated钩子函数。
## 卸载阶段
应用调用vm.$destroy方法后，Vue.js的生命周期会进入卸载阶段。
在这个阶段，Vue.js会将自身从父组件中删除，取消实例上所有依赖的追踪并且移除所有的事件监听器。

## 卸载阶段
原理就是vm.$destroy方法的内部原理
## 模板编译阶段和挂载阶段
也是前面介绍过的。
## new Vue()被调用时发生了什么
当new Vue()被调用时，会首先进行一些初始化操作，然后进入模板编译阶段，最后进入挂载阶段。
其具体实现是这样的
```js
function Vue(options) {
  this._init(options);
}
```
this._init(options)执行了生命周期的初始化流程。
## _init方法的内部原理
```js
export function initMixin(Vue) {
  Vue.prototype._init = function(options) {
    vm.$options = mergeOptions(
      // 获取当前实例中构造函数的options及其所有父级实例构造函数的options
      resolveConstructorOptions(vm.constructor),
      options || {},
      vm
    )

    // 初始化lifecycle
    initLifecycle(vm);
    // 初始化事件
    initEvents(vm);
    initRender(vm);
    callHook(vm, 'beforeCreate')
    // 初始化inject
    initInjections(vm); // 在 data/props前初始化inject
    // 初始化状态，这里的状态指的是props、methods、data、computed以及watch
    iniiState(vm);
    // 初始化provide
    initProvide(vm); // 在 data/props后初始化provide
    callHook(vm, 'created')


    // 如果有el选项，则自动开启模板编译阶段与挂载阶段
    // 如果没有传递el选项，则不进入下一个生命周期流程
    // 用户需要执行vm.$mount方法，手动开启模板编译阶段与挂载阶段

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  };
}
```
## callHook函数的内部原理
Vue.js通过callHook函数来触发生命周期钩子

Vue.js在合并options的过程中会找出options中所有key是否钩子函数的名字，并将它转换成数组。数组因为Vue.mixin方法，同一生命周期，会执行多个同名生命周期方法。

下面列出了所有生命周期钩子的函数名
1. beforeCreate
2. created
3. beforeMount
4. mounted
5. beforeUpdate
6. updated
7. beforeDestroy
8. destroyed
9. activated
10. deactivated
11. errorCaptured

实现代码如下：
```js
export function callHook(vm, hook) {
  const handlers = vm.$options[hook];
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      try {
        handlers[i].call(vm);
      } catch (e) {
        handleError(e, vm, `${hook} hook`);
      }
    }
  }
}
```
## errorCaptured与错误处理
它可以实现
1. 将错误发送给config.errorHandler
2. 如果一个组件继承的链路或其父级从属链路中存在多个errorCaptured钩子函数，则它们将会被相同的错误逐个唤起。
3. 一个errorCaptured钩子函数能够返回false来阻止错误继续向上传播。它会阻止其他被这个错误唤起的errorCaptured钩子函数和全局的config.errorHandler。
```js
function handleError(err, vm, info) {
  if (vm) {
    let cur = vm;
    while ((cur = cur.$parent)) {
      const hooks = cur.$options.errorCaptured;
      if (hooks) {
        for (let i = 0; i < hooks.length; i++) {
          try {
            const capture = hooks[i].call(cur, err, vm, info) === false;
            if (capture) return;
          } catch (e) {
            globalHandleError(e, cur, "errorCaptured hook");
          }
        }
      }
    }
  }
  globalHandleError(err, vm, info);
}

function globalHandleError(err, vm, info) {
  if (config.errorHandler) {
    try {
      return config.errorHandler.call(null, err, vm, info);
    } catch (e) {
      logError(e);
    }
  }
  logError(err);
}

function logError(err) {
  console.log(err);
}
```
## 初始化实例属性
Vue.js通过initLifecycle函数向实例中挂载属性。
```js
export function initLifecycle(vm) {
  const options = vm.$options;

  // 找出第一个非抽象父类
  let parent = options.parent;
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent;
    }
    parent.$children.push(vm);
  }

  vm.$parent = parent;
  vm.$root = parent ? parent.$root : vm;

  vm.$children = [];
  vm.$refs = {};

  vm._watcher = null;
  vm._isDestroyed = false;
  vm._isBeingDestroyed = false;
}
```
## 初始化事件
初始化事件是指将父组件在模板中使用的v-on注册的事件添加到子组件的事件系统（Vue.js的事件系统）中。
这里的事件是父组件在模板中使用v-on监听子组件内触发的事件，不是浏览器事件。在初始化Vue.js实例时，有可能会接收父组件向子组件注册的事件。而子组件自身在模板中注册的事件，只有在渲染的时候才会根据虚拟DOM的对比结果来确定是注册事件还是解绑事件。

Vue.js通过initEvents函数来执行初始化事件相关的逻辑
```js
import { updateComponentListeners } from "./updateComponentListeners";

export function initEvents(vm) {
  vm._events = Object.create(null);
  // 初始化父组件附加的事件
  const listeners = vm.$options._parentListeners;
  if (listeners) {
    updateComponentListeners(vm, listeners);
  }
}
```
updateComponentListeners
1. 如果listeners对象中存在某个key（也就是事件名）在oldListeners中不存在，那么说明这个事件是需要新增的事件；如果oldListeners中存在某些key在listeners中不存在，那么说明这个事件是需要从事件系统中移除的。
```js
let target;

function add(event, fn, once) {
  if (once) {
    target.$once(event, fn);
  } else {
    target.$on(event, fn);
  }
}

function remove(event, fn) {
  target.$off(event, fn);
}

export function updateComponentListeners(vm, listeners, oldListeners) {
  target = vm;
  updateListeners(listeners, oldListeners || {}, add, remove, vm);
}

function isUndef(i) {
  return i === null || i === undefined;
}

function normalizeEvent(name) {
  const passive = name.charAt(0) === "&";
  name = passive ? name.slice(1) : name;
  const once = name.charAt(0) === "~";
  name = once ? name.slice(1) : name;
  const capture = name.charAt(0) === "!";
  name = capture ? name.slice(1) : name;
  return {
    name,
    once,
    capture,
    passive
  };
}

function updateListeners(on, oldOn, add, remove, vm) {
  let name, cur, old, event;
  for (name in on) {
    cur = on[name];
    old = oldOn[name];
    event = normalizeEvent(name);
    if (isUndef(cur)) {
      console.warn("");
    } else if (isUndef(old)) {
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur);
      }
      add(event.name, cur, event.once, event.capture, event, passive);
    } else if (cur !== old) {
      old.fns = cur;
      on[name] = old;
    }
  }
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name);
      remove(event.name, oldOn[name], event.capture);
    }
  }
}
```
## 初始化inject
inject和provide选项需要一起使用，它们允许祖先组件向其所有子孙后代注入依赖，并在其上下游关系成立的时间里始终生效（无论组件层次有多深）。和react的上下文特性很相似。

inject在data/props之前初始化，而provide在data/props后面初始化。这样做的目的是让用户可以在data/props中使用inject所注入的内容。

初始化inject就是使用inject配置的key从当前组件读取内容，读取不到则读取它的父组件，以此类推。它是一个自底向上获取内容的过程，最终将找到的内容保存到实例（this）中，这样就可以直接在this上读取通过inject导入的注入内容。
```js
export function initInjections(vm) {
  const result = resolveInject(vm.$options.inject, vm);
  if (result) {
    // 原理之前介绍过，不将内容转换为响应式。
    observableState.shouldConvert = false;
    Object.keys(result).forEach(key => {
      defineReactive(vm, key, result[key]);
    });
    observerState.shouldConvert = true;
  }
}

function resolveInject(inject, vm) {
  if (inject) {
    const result = Object.create(null);
    const keys = hasSymbol
      ? Reflect.ownKeys(inject).filter(key => {
          return Object.getOwnPropertyDescriptor(inject, key).enumerable;
        })
      : Object.keys(inject);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const provideKey = inject[key].from;
      let source = vm;
      while (source) {
        if (source._provided && provideKey in source._provided) {
          result[key] = source._provided[provideKey];
          break;
        }
        source = source.$parent;
      }
      if (!source) {
        if ("default" in inject[key]) {
          const provideDefault = inject[key].default;
          result[key] =
            typeof provideDefault === "function"
              ? provideDefault.call(vm)
              : provideDefault;
        } else if (process.env.NODE_ENV !== "production") {
          // warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result;
  }
}
```
## 初始化状态
props、methods、data、computed、watch都是状态。
```js
export function initState(vm) {
  vm._watchers = [];
  const opts = vm.$options;
  if (opts.props) initProps(vm, opts.props);
  if (opts.methods) initMethods(vm, opts.methods);
  if (opts.data) {
    initData(vm);
  } else {
    observable((vm._data = {}), true /* asRootData */);
  }
  if (opts.computed) initComputed(vm, opts.computed);
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch);
  }
}
```
## 初始化props
props是父组件提供数据，子组件通过props字段选择自己需要哪些内容，vue.js内部通过子组件的props选项将需要的数据筛选出来之后添加到子组件的上下文中。

1.子组件被实例化时，会先对props进行规格化处理，规格化之后的props为对象的格式。
```js
function normalizeProps(options, vm) {
  const props = options.props;
  if (!props) return;
  const res = {};
  let i, val, name;
  if (Array.isArray(props)) {
    i = props.length;
    while (i--) {
      val = props[i];
      if (typeof val === "string") {
        name = camelize(val);
        res[name] = { type: null };
      } else if (process.env.NODE_ENV !== "production") {
        console.warn("props must be strings when using array syntax");
      }
    }
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key];
      name = camelize(key);
      res[name] = isPlainObject(val) ? val : { type: val };
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.warn("");
  }
  options.props = res;
}
```
2.初始化props
通过规格化之后的props从父组件传入的props数据中或从使用new创建实例时传入的propsData参数中，筛选出需要的数据保存在vm._props中，然后在vm上设置一个代理，实现通过vm.x访问vm._props.x的目的。
```js
function initProps(vm, propsOptions) {
  const propsData = vm.$options.propsData || {};
  const props = (vm._props = {});
  // 缓存props的key
  const keys = (vm.$options._propKeys = []);
  const isRoot = !vm.$parent;
  // root实例的props属性应该被转换成响应式数据
  if (!isRoot) {
    toggleObserving(false);
  }
  for (const key in propsOptions) {
    keys.push(key);
    const value = validateProp(key, propsOptions, propsData, vm);
    defineReactive(props, key, value);
    if (!(key in vm)) {
      proxy(vm, `_props`, key);
    }
  }
  toggleObserving(true);
}
```
validateProp可以得到prop key对应的value。
```js
function validateProp(key, propsOptions, propsData, vm) {
  const prop = propOptions[key];
  const absent = !hasOwn(propsData, key);
  let value = propsData[key];
  // 处理布尔类型的props
  if (isType(Boolean, prop.type)) {
    if (absent && !hasOwn(prop, "default")) {
      value = false;
    } else if (
      !isType(String, prop.type) &&
      // hyphenate驼峰转换
      (value === "" || value === hyphenate(key))
    ) {
      value = true;
    }
  }
  // 检查默认值
  if (value === undefined) {
    value = getPropDefaultValue(vm, prop, key);
    // 因为默认值是新的数据，所以需要将它转换成响应式的
    const prevShouldConvert = observerState.shouldConvert;
    observerState.shouldConvert = true;
    observe(value);
    observerState.shouldConvert = prevShouldConvert;
  }
  if (process.env.NODE_ENV !== "production") {
    // 断言判断prop是否有效
    assertProp(prop, key, value, vm, absent);
  }
  return value;
}
```
assertProp的作用是当prop验证失败的时候，在非生产环境下，Vue.js将会产生一个控制台警告。
```js
function assertProp(prop, name, value, vm, absent) {
  if (prop.required && absent) {
    console.warn('Missing required prop: "' + name + '"', vm);
    return;
  }
  if (value === null && !prop.required) {
    return;
  }
  let type = prop.type;
  let valid = !type || type === true;
  const expectedTypes = [];
  if (type) {
    if (!Array.isArray(type)) {
      type = [type];
    }
    for (let i = 0; i < type.length && !valid; i++) {
      const assertedType = assertType(value, type[i]);
      expectedTypes.push(assertedType.expectedTypes || "");
      valid = assertedType.valid;
    }
  }
  if (!valid) {
    console.warn("");
    return;
  }
  const validator = prop.validator;
  if (validator) {
    if (!validator(value)) {
      console.warn("");
    }
  }
}
```
## 初始化methods
循环选项中的methods对象，并将每个属性依次挂载到vm上即可。
```js
function initMethods(vm, methods) {
  const props = vm.$options.props;
  for (const key in methods) {
    if (process.env.NODE_ENV !== "production") {
      if (methods[key] == null) {
        console.warn("");
      }
      if (props && hasOwn(props, key)) {
        console.warn("");
      }
      // isReserved判断字符串是否以$或_开头
      if (key in vm && isReserved(key)) {
        console.warn("");
      }
    }
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm);
  }
}
```
## 初始化data
data中的数据最终会被保存到vm._data中，然后在vm上设置一个代理，使得通过vm.x可以访问到vm._data中的属性。最后调用observe函数将data转换成响应式数据。
```js
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
```
## 初始化computed
computed是定义在vm上的一个特殊的getter方法，get并不是用户提供的函数，而是vue.js内部的一个代理函数。在代理函数中可以结合Watcher实现缓存与收集依赖等功能。

当dirty属性为true时，说明需要重新计算”计算属性“的返回值，当dirty属性为false时，说明计算属性的值并没有变，不需要重新计算。

当计算属性中的内容发生变化后，计算属性的Watcher与组件的Watcher都会得到通知。计算属性的Watcher会将自己的dirty属性设置为true,当下一次读取计算属性时，就会重新计算一次值。然后组件的Watcher也会收到通知，从而执行render函数进行重新渲染的操作。由于要重新执行render函数，所以会重新计算读取计算属性的值，这时候计算属性的Watcher已经把自己的dirty属性设置为true，所以会重新计算一次计算属性的值，用于本次渲染。

v2.5.17修改为判断最终计算属性的返回值是否变化。
```js
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
```
## 初始化watch
只需要循环watch选项，将对象中的每一项依次调用vm.$watch方法来观察表达式即可。
```js
function initWatch(vm, watch) {
  for (const key in watch) {
    const handler = watch[key];
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]);
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher(vm, expOrFn, handler, options) {
  if (isPlainObject(handler)) {
    options = handler;
    handler = handler.handler;
  }
  if (typeof handler === "string") {
    handler = vm[handler];
  }
  return vm.$watch(expOrFn, handler, options);
}
```
## 初始化provide
赋值给vm._provided即可
```js
function initProvide(vm) {
  const provide = vm.$options.provide;
  if (provide) {
    vm._provided = typeof provide === "function" ? provide.call(vm) : provide;
  }
}
```