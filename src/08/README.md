# 虚拟DOM
虚拟DOM将虚拟节点vnode和旧虚拟节点oldVnode进行对比，得出真正需要更新的节点进行DOM操作。对两个虚拟节点进行对比是虚拟DOM中最核心的算法（即patch）。

由于Vue.js的变化侦测粒度很细，一定程度上可以知道哪些状态发生了变化，所以可以通过细粒度的绑定来更新视图，Vue.js1.0就是这样实现的。但是由于粒度太细，会有很多watcher同时观察某状态，会有一些内存开销以及一些依赖追踪的开销，所以Vue.js采用了一个中等粒度的解决方案。状态侦测不再细化到某个具体节点，而是某个组件，组件内部通过虚拟DOM来渲染视图，这可以大大缩减依赖数量和watcher数量。
# VNode
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
# patch
虚拟DOM最核心的部分是patch，它可以将vnode渲染成真实的DOM。patch也可以叫作patching算法。

patch不是暴力替换节点，而是在现有DOM上进行修改来达到渲染视图的目的。对现有DOM进行修改需要做三件事：
1. 创建新增的节点
2. 删除已经废弃的节点
3. 修改需要更新的节点
## 新增节点
新增节点的一个很明显的场景就是，当oldVnode不存在而vnode存在时，就需要使用vnode生成真实的DOM元素并将其插入到视图中。

当vnode和oldVnode完全不是同一个节点时（相同的位置节点都存在），需要使用vnode生成真实的DOM元素并将其插入到视图中。
## 删除节点
当一个节点只在oldVnode中存在时，我们需要把它从DOM中删除。

当vnode和oldVnode完全不是同一个节点时，在DOM中需要使用vnode创建的新节点替换oldVnode所对应的旧节点，而替代过程中是将新创建的DOM节点插入旧节点的旁边，然后再将旧节点删除。
## 更新节点
当新旧两个节点是相同的节点，我们需要对这两个节点进行比较细致的比对，然后对oldVnode在视图中所对应的真实节点进行更新。
## 创建节点
只有三种类型的节点会被创建并插入到DOM中：元素节点、注释节点和文本节点。

判断vnode是否是元素节点，只需要判断它是否具有tag属性即可。我们可以调用当前环境下的createElement方法（在浏览器环境下是document.createElement）来创建元素节点。

将元素渲染到视图，只需要调用当前环境下的appendChild方法（在浏览器环境下是parendNode.appendChild）

元素通常都会有子节点（children)，所以当一个元素节点被创建后，我们需要将它的子节点也创建出来并插入到这个刚创建出的节点下面。这是一个递归的过程，只需要将vnode中的children属性循环一遍，将每个子虚拟节点都执行一遍创建元素的逻辑。

如果vnode不存在tag属性，那么它可能是另外两个节点：注释节点和文本节点。当isComment属性为true时，vnode是注释节点，否则为文本节点。如果是文本节点，调用当前环境下的createTextNode方法（在浏览器环境下是document.createTextNode)来创建真实的文本节点并将其插入到指定的父节点中。如果是注释节点，则调用当前环境下的createComment方法（在浏览器环境下是document.createComment)来创建真实的注释节点并将其插入到指定的父节点。
## 删除节点
```js
function removeVnodes (vnodes, startIdx, endIdx) {
  for (; startIdx <= endIdx; ++startIdx) {
    const ch = vnodes[startIdx]
    if (isDef(ch)) {
      removeNode(ch.elm)
    }
  }
}

const nodeOps = {
  removeChild (node, child) {
    node.removeChild(child)
  }
}

function removeNode(el) {
  const parent = nodeOps.parentNode(el)
  if (isDef(parent)) {
    nodeOps.removeChild(parent, el)
  }
}
```
将节点操作封装成函数放在nodeOps里是为了预留跨平台渲染接口。
## 更新节点
1.静态节点
如果新旧两个虚拟节点都是静态节点，就不需要进行更新操作，可以直接跳过更新节点的过程。
2.新虚拟节点有文本属性
根据新节点（vnode）是否有text属性，更新节点可以分为两种不同的情况。如果有text属性，不论之前旧节点的子节点是什么，直接调用setTextContent方法（浏览器为node.textContent）将视图中DOM节点的内容改为虚拟节点的text属性所保存的文字。若新旧节点都是文本，且文本相同，则不执行。
3.新虚拟节点无文本属性
如果新虚拟节点没有text属性，那么它是一个元素节点。
3.1有children的情况
若旧虚拟节点也有children属性，那么需要对新旧两个虚拟节点的children进行一个更详细的对比并更新。更新children可能会移动某个子节点的位置，也可能会删除或新增某个节点，具体更新children后面会介绍。

若无children属性，说明旧虚拟节点要么是一个空标签，要么是一个文本节点。如果是文本节点，那么先把文本清空让它变成空标签，然后将新虚拟节点中的children挨个创建成真实的DOM元素节点并将其插入到视图中的DOM节点下面。
3.1无children的情况
说明新创建的节点是一个空节点，旧虚拟节点有子节点、有文本都需要删除，达到视图是空标签的目的。
## 更新子节点
前面讨论了当新节点的子节点和旧节点的子节点都存在并且不相同，会进行子节点的更新操作。下面我们详细讨论这种情况。

更新子节点大概可以分为4种操作：更新节点、新增节点、删除节点、移动节点。

对比两个子节点列表（children）,首先需要做的事情是循环。循环newChildren，每循环到一个新子节点，就去oldChildren找到和当前节点相同的那个旧子节点。如果找不到，就新增，创建节点并插入视图；如果找到了，就做更新操作；如果位置不同，就移动节点。
## 更新策略
1.创建子节点
如果在oldChildren中没有找到与本次循环所指向的新子节点相同的节点，我们需要执行创建节点的操作，将新创建的节点插入到oldChildren中所有未处理节点（未处理就是没有任何更新操作的节点）的前面。不能插入已处理节点后面，这是因为旧虚拟节点已处理节点不包括我们新插入的节点，如果连续插入多个新节点，新节点的顺序就会是反的。
2.更新子节点
节点在newChildren和oldChildren中都存在且位置相同，需要进行更新节点的操作。更新节点操作之前已经介绍过。
3.移动子节点
节点在newChildren和oldChildren中都存在但位置不同，需要将这个节点的位置以新虚拟节点的位置为基准进行移动。

通过Node.insertBefore()方法，我们可以将一个已有节点移动到一个指定的位置。

那么如何得知新虚拟节点的位置在哪里呢？其实并不难。

对比两个子节点列表是通过从左到右循环newChildren这个列表，然后每循环一个节点，就去oldChildren中寻找与这个节点相同的节点进行处理。也就是说，newChildren中当前被循环到的这个节点的左边是被处理过的。那就不难发现，这个节点的位置是所有未处理节点的第一个节点。所以，只要把需要移动的节点移动到所有未处理节点的最前面就可以了。

关于怎么分辨哪些节点是处理过的，哪些节点是未处理的，后面会介绍。

4.删除子节点
当newChildren中所有节点都被循环了一遍后，如果oldChildren中还有没有被处理的节点，那么这些节点就是需要被删除的。
## 优化策略
通过情况下，并不是所有子节点的位置都会发生移动，一个列表中总有几个节点的位置是不变的。针对这些位置不变的或者说位置可以预测的节点，我们不需要循环来查找，我们有4种快捷查找方式：
1. 新前与旧前
2. 新后与旧后
3. 新后与旧前
4. 新前与旧后
新前：newChildren中所有未处理的第一个节点
新后：newChildren中所有未处理的最后一个节点
旧前：oldChildren中所有未处理的第一个节点
旧后：oldChildren中所有未处理的最后一个节点
## 新前与旧前
如果新前与旧前是同一个节点，由于位置相同，所以更新节点即可。如果不是，换下一个快捷查找方式。
## 新后与旧后
如果新后与旧后是同一个节点，由于位置相同，所以更新节点即可。
## 新后与旧前
如果新后与旧前是同一个节点，由于位置不同，除了更新节点以外，还需要执行移动节点的操作，将节点移动到oldChildren中所有未处理节点的最后面。
## 新前与旧后
如果新前与旧后是同一个节点，由于位置不同，除了更新节点以外，还需要执行移动节点的操作，将节点移动到oldChildren中所有未处理节点的最前面。

如果前面这4种方式对比之后都没有找到相同的节点，这时再通过循环的方式去oldChildren中详细找一圈。
## 哪些节点是未处理过的
因为我们的逻辑都是在循环体内处理的，所以只要让循环条件保证只有未处理过的节点才能进入循环体内即可。

一个正常的循环都能实现这个效果，但是由于我们的优化策略，节点是有可能从后面对比的，对比成功就会进行更新处理。也就是说，循环不再是只处理所以未处理过的节点的第一个，有可能会处理最后一个，这种情况下就不能从前往后循环，而应该是从两边向中间循环。

那么，怎样实现从两边向中间循环呢？

首先，我们先准备4个变量：oldStartIdx、oldEndIdx、newStartIdx、newEndIdx。在循环体内，每处理一个节点，就将下标向指定的方向移动一个位置。通常情况下是对新旧两个节点进行更新操作，就相当于一次性处理两个节点，将新旧两个节点的下标都向指定方向移动一个位置。

开始位置所表示的节点被处理后，就向后移动一个位置；结束位置的节点被处理后，则向前移动一个位置。也就是说，oldStartIdx和newStartIdx只能向后移动，而oldEndIdx和newEndIdx只能向前移动。

当开始位置大于等于结束位置，说明所以节点都遍历过了，则结束循环。
```js
while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
  // 做点什么
}
```
你可能会发现，无论newChildren或者oldChildren，只要有一个循环完毕，就会退出循环。那么，当新子节点和旧子节点的节点数量不一致时，会导致循环结束后仍然有未处理的节点，也就是说这个循环不需要覆盖所有节点。

因为如果oldChildren先循环完毕，这个时候如果newChildren中还有剩余节点，那么说明这些节点都是新增的节点，直接把这些节点插入DOM中就行了。

如果newChildren先循环完毕，如果oldChildren还有剩余的节点，说明这些节点都是被废弃的节点，将这些节点从DOM中移除即可。

在patch中，还有一部分逻辑是建立key和index索引的对应关系。在Vue.js的模板中，渲染列表时可以为节点设置一个属性key,这个属性可以标示一个节点的唯一ID。在更新子节点时，需要在oldChildren中循环去找一个节点。如果我们为子节点设置了属性key，建立了key和index索引的对应关系，就生成了一个key对应着一个节点下标这样一个对象。那么在oldChildren中找相同节点时，可以直接通过key拿到下标，从而获取节点，根本不需要通过循环来查找节点。
