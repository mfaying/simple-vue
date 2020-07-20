# 虚拟DOM
虚拟DOM将虚拟节点vnode和旧虚拟节点oldVnode进行对比，得出真正需要更新的节点进行DOM操作。对两个虚拟节点进行对比是虚拟DOM中最核心的算法（即patch）。

由于Vue.js的变化侦测粒度很细，一定程度上可以知道哪些状态发生了变化，所以可以通过细粒度的绑定来更新视图，Vue.js1.0就是这样实现的。但是由于粒度太细，会有很多watcher同时观察某状态，会有一些内存开销以及一些依赖追踪的开销，所以Vue.js采用了一个中等粒度的解决方案。状态侦测不再细化到某个具体节点，而是某个组件，组件内部通过虚拟DOM来渲染视图，这可以大大缩减依赖数量和watcher数量。
## VNode
在Vue.js中存在一个VNode类，使用它可以实例化不同类型的vnode实例，而不同类型的vnode实例各自表示不同类型的DOM元素。vnode可以理解为JavaScript对象版本的DOM元素。
## VNode的作用
Vue.js可以将上一次渲染视图时创建的vnode缓存起来，将新创建的vnode和缓存的vnode进行对比，找出不一样的方法并基于此去修改真实的DOM。
## VNode的类型
1. 注释节点
2. 文本节点
3. 元素节点
4. 组件节点
5. 函数式组件
6. 克隆节点
## 注释节点
```js
export const createEmptyVNode = text => {
  const node = new VNode();
  node.text = text;
  node.isComment = true;
  return node;
}
```
## 文本节点
```js
export function createTextVNode (val) {
  return new VNode(undefined, undefined, undefined, String(val))
}
```
## 克隆节点
克隆节点是将现有节点的属性复制到新节点中，让新创建的节点和被克隆接节点的属性保持一致，从而实现克隆效果。它的作用是优化静态节点和插槽节点（slot node）。

以静态节点为例，静态节点因为它的内容不会改变，除了首次渲染需要执行渲染函数获取VNode之外，后续更新不需要执行渲染函数重新生成vnode。因此就会使用创建克隆节点的方法将vnode克隆一份，使用克隆节点进行渲染。
```js
export function cloneVNode (vnode, deep) {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    vnode.children,
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  )
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isComment = vnode.isCommet
  cloned.isCloned = true
  if (deep && vnode.children) {
    cloned.children = cloneVNodes(vnode.children)
  }
  return cloned;
}
```
克隆节点与被克隆节点之间的唯一区别是isCloned属性。
## 元素节点
元素节点通常会存在以下4种有效属性：
1. tag: 节点名称，例如p、ul、li等
2. data: 节点上的数据，比如attrs、class和style等。
3. children: 当前节点的子节点列表
4. context: 当前组件的Vue.js实例
## 组件节点
和元素节点类似，此外它还有以下两个独有的属性
1. componentOptions: 组件节点的选项参数，包含propsData、tag和children等信息。
2. componentInstance: 组件的实例，也是Vue.js的实例。
## 函数式组件
和元素节点类似，此外它还有以下两个独有的属性
1. functionalOptions
2. functionalContext
## patch


