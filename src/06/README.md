# 指令
指令是Vue.js提供的带有v-前缀的特殊特性。指令属性的值预期是单个JavaScript表达式。指令的职责是，当表达式的值改变时，将其产生的连带影响响应式地作用于DOM。
## 指令原理概述
在模板解析阶段，我们在将指令解析到AST，然后使用AST生成代码字符串的过程中实现某些内置指令的功能，最后在虚拟DOM渲染的过程中触发自定义指令的钩子函数使指令生效。在模板解析阶段，会将节点上的指令解析出来并添加到AST的directives属性中。
当虚拟DOM进行修补时，会根据节点的对比结果触发一些钩子函数。更新指令的程序会监听create、update和destroy钩子函数，并在这三个钩子函数触发时对VNode和oldVNode进行对比，最终根据对比结果触发指令的钩子函数。(使用自定义指令时，可以监听5种钩子函数：bind、inserted、update、componentUpdated与unbind)。
## v-if指令的原理
在模板编辑阶段事项，在代码生成时，生成一个特殊的代码字符串来实现指令的功能。
```tpl
<li v-if="has">if</li>
<li v-else="has">else</li>
```
->
```
(has)?_c('li', [_v("if")]):_c('li',[_v("else")])
```
会根据has变量的值来选择创建哪个节点。
## v-for指令的原理
与v-if同理
```tpl
<li v-for="(item, index) in list">v-for {{index}}<li>
```
->
```
_l((list),function(item,index){return _c('li',[_v("v-for"+_s(index))])})
```
_l是函数renderList的别名
## v-on指令
v-on指令的作用是绑定事件监听器，事件类型由参数指定。它用在普通元素上时，可以监听原生DOM事件；用在自定义元素组件上时，可以监听子组件触发的自定义事件。

从模板解析到生成VNode，最终事件会被保存在VNode中，然后可以通过vnode.data.on得到一个节点注册的所有事件。

虚拟DOM在修补（patch）的过程中会根据不同的时机触发不同的钩子函数。事件绑定相关的处理逻辑分别设置了create与update钩子函数，也就是说在修补的过程中，每当一个DOM元素被创建或更新时，都会触发事件绑定相关的处理逻辑。

事件绑定相关的处理逻辑是一个叫updateDOMListeners的函数，而create与update钩子函数执行的都是这个函数。
```js
let target;
function updateDOMListeners(oldVnode, vnode) {
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return;
  }
  const on = vnode.data.on || {};
  const oldOn = oldVnode.data.on || {};
  target = vnode.elm;
  normalizeEvent(on);
  updateListenners(on, oldOn, add, remove, vnode.context);
  target = undefined;
}

function add(event, handler, once, capture, passive) {
  handler = withMacroTask(handler);
  if (once) handler = createOnceHandler(handler, event, capture);
  target.addEventListener(
    event,
    handler,
    supportsPassive ? { capture, passive } : capture
  );
}

function createOnceHandler(handler, event, capture) {
  const _target = target;
  return function onceHanler() {
    const res = handler.apply(null, arguments);
    if (res !== null) {
      remove(event, onceHanler, capture, _target);
    }
  };
}

function remove(event, handler, capture, _target) {
  (_target || target).removeEventListener(
    event,
    handler._withTask || handler,
    capture
  );
}
```
## 自定义指令的内部原理
事件、指令、属性等相关处理逻辑都需要监听虚拟DOM在渲染时触发的钩子函数，在钩子函数触发时执行相关处理。
```js
export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives(vnode) {
    updateDirectives(vnode, emptyNode);
  }
};

function updateDirectives(oldVnode, vnode) {
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode);
  }
}

function _update(oldVnode, vnode) {
  const isCreate = oldVnode === emptyNode;
  const isDestroy = vnode === emptyNode;
  const oldDirs = normalizeDirectives(
    oldVnode.data.directives,
    oldVnode.context
  );
  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context);

  const dirsWithInsert = [];
  const dirsWithPostpatch = [];

  let key, oldDir, dir;
  for (key in newDirs) {
    oldDir = oldDirs[key];
    dir = newDirs[key];
    if (!oldDir) {
      // 新指令，触发bind
      callHook(dir, "bind", vnode, oldVnode);
      if (dir.def && dir.def.inserted) {
        dirsWithInsert.push(dir);
      }
    } else {
      // 指令已存在，触发update
      dir.oldValue = oldDir.value;
      callHook(dir, "update", vnode, oldVnode);
      if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir);
      }
    }
  }

  if (dirsWithInsert.length) {
    const callInsert = () => {
      for (let i = 0; i < dirsWithInsert.length; i++) {
        callHook(dirsWithInsert[i], "inserted", vnode, oldVnode);
      }
    };
    if (isCreate) {
      mergeVNodeHook(vnode, "insert", callInsert);
    } else {
      callInsert();
    }
  }

  if (dirsWithPostpatch.length) {
    mergeVNodeHook(vnode, "postpatch", () => {
      for (let i = 0; i < dirsWithPostpatch.length; i++) {
        callHook(dirsWithPostpatch[i], "componentUpdated", vnode, oldVnode);
      }
    });
  }

  if (!isCreate) {
    for (key in oldDirs) {
      if (!newDirs[key]) {
        // 指令不再存在，触发unbind
        callHook(oldDirs[key], "unbind", oldVnode, oldVnode, isDestroy);
      }
    }
  }
}

function callHook(dir, hook, vnode, oldVnode, isDestroy) {
  const fn = dir.def && dir.def[hook];
  if (fn) {
    try {
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy);
    } catch (e) {
      handleError(e, vnode.context, `directive ${dir.name} ${hook} hook`);
    }
  }
}
```




