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
## _nit方法的内部原理
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
## callback

