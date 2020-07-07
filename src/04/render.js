import { nextTick } from "./utils";

// const mount = Vue.prototype.$mount;

export function renderMixin(Vue) {
  Vue.prototype.$nextTick = function(fn) {
    return nextTick(fn, this);
  };
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
