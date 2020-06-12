# 模板编译原理

vue.js 将模板编译成渲染函数的步骤分为三步，解析器、优化器、代码生成器。

形如 template 这样的模板

```js
const template = `
  <body>
    <!-- <div></div> -->
    <div>
      1{{a}}
      <div>
        2
      </div>
    </div>
    <script>var b = 1;</script>
  </body>
`;
```

经过解析器、优化器、代码生成器，最终会生成代码字符串：

```
_c('body',{},[_e(" <div></div> "),_c('div',{},[_v("1"+_s(a)),_c('div',{},[_v("2")])]),_c('script',{},[_v("var b = 1;")])])
```

## 解析器

解析器分为 HTML 解析器、文本解析器。

html 解析器采用是分段截取的方式。在一个 while 循环中不断做截取开始标签、截取结束标签、截取注释、截取条件注释、截取 DOCTYPE、截取文本、截取纯文本元素的判断，每次截取一种情况，生成数据，再调用相应的钩子函数生成 VNode，直到整个模板截取完毕。

```js
function parseHTML(html, options) {
  while (html) {
    if (!lastTag || !isPlainTextElement(lastTag)) {
      let textEnd = html.indexOf("<");
      if (textEnd === 0) {
        // 匹配注释
        if (comment.test(html)) {
          // options.comment()
          continue;
        }

        // 匹配条件注释
        if (conditionalComment.test(html)) {
          continue;
        }

        // 匹配doctype
        const doctypeMatch = html.match(doctype);
        if (doctypeMatch) {
          continue;
        }

        // 匹配结束标签
        const endTagMatch = html.match(endTag);
        if (endTagMatch) {
          // options.end();
          continue;
        }

        // 匹配开始标签
        const startTagMatch = html.match(startTagOpen);
        if (startTagMatch) {
          // options.start();
          continue;
        }
      }

      // 匹配文本
      let text, rest, next;
      if (textEnd >= 0) {
        //...
      }

      if (textEnd < 0) {
        //...
      }

      if (options.chars && text) {
        options.chars();
      }
    } else {
      // 匹配纯文本元素
    }
  }
}

const template = `
  <body>
    <!-- <div></div> -->
    <div>
      1{{a}}
      <div>
        2
      </div>
    </div>
    <script>var b = 1;</script>
  </body>
`;

parseHTML(template, {
  start(tag, attrs, unary) {},
  end(tag) {},
  chars(text) {},
  comment(text) {}
});
```

下面介绍一下各种情况的实现

匹配注释

```js
const comment = /^<!--/;

let textEnd = html.indexOf("<");
if (textEnd === 0) {
  // 匹配注释
  if (comment.test(html)) {
    const commentEnd = html.indexOf("-->");
    if (commentEnd >= 0) {
      if (options.shouldKeepComment) {
        options.comment(html.substring(4, commentEnd));
      }
      html = html.substring(commentEnd + 3);
      continue;
    }
  }
}
```

匹配条件注释

```js
const conditionalComment = /^<!\[/;

let textEnd = html.indexOf("<");
if (textEnd === 0) {
  // 匹配条件注释
  if (conditionalComment.test(html)) {
    const conditionalEnd = html.indexOf("]>");
    if (conditionalEnd >= 0) {
      html = html.substring(conditionalEnd + 2);
      continue;
    }
  }
}
```

匹配 doctype

```js
const doctype = /^<!DOCTYPE [^>]+>/i;

let textEnd = html.indexOf("<");
if (textEnd === 0) {
  // 匹配doctype
  const doctypeMatch = html.match(doctype);
  if (doctypeMatch) {
    html = html.substring(doctypeMatch[0].length);
    continue;
  }
}
```

匹配结束标签

```js
const ncname = "[a-zA-Z_][\\w\\-\\.]*";
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);

let textEnd = html.indexOf("<");
if (textEnd === 0) {
  // 匹配结束标签
  const endTagMatch = html.match(endTag);
  if (endTagMatch) {
    html = html.substring(endTagMatch[0].length);
    options.end(endTagMatch[1]);
    continue;
  }
}
```

匹配开始标签

```js
const ncname = "[a-zA-Z_][\\w\\-\\.]*";
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);

let textEnd = html.indexOf("<");
if (textEnd === 0) {
  // 匹配开始标签
  const startTagMatch = html.match(startTagOpen);
  if (startTagMatch) {
    const match = {
      tagName: startTagMatch[1],
      attrs: []
    };
    html = html.substring(startTagMatch[0].length);

    let end, attr;
    while (
      !(end = html.match(startTagClose)) &&
      (attr = html.match(attribute))
    ) {
      html = html.substring(attr[0].length);
      match.attrs.push(attr);
    }

    if (end) {
      match.unarySlash = end[1];
      html = html.substring(end[0].length);
    }
    options.start(match.tagName, match.attrs, match.unarySlash);
    continue;
  }
}
```

匹配文本

```js
const ncname = "[a-zA-Z_][\\w\\-\\.]*";
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const comment = /^<!--/;
const conditionalComment = /^<!\[/;

// 匹配文本
let textEnd = html.indexOf("<");
let text, rest, next;
if (textEnd >= 0) {
  rest = html.slice(textEnd);
  while (
    !endTag.test(rest) &&
    !startTagOpen.test(rest) &&
    !comment.test(rest) &&
    !conditionalComment.test(rest)
  ) {
    next = rest.indexOf("<", 1);
    if (next < 0) break;
    textEnd += next;
    rest = html.slice(textEnd);
  }
  text = html.substring(0, textEnd);
  html = html.substring(textEnd);
}

if (textEnd < 0) {
  text = html;
  html = "";
}

if (options.chars && text) {
  options.chars(text);
}
```

// 匹配纯文本

```js
const stackedTag = lastTag.toLowerCase();
const reStackedTag =
  reCache[stackedTag] ||
  (reCache[stackedTag] = new RegExp(
    "([\\s\\S]*?)(</" + stackedTag + "[^>]*>)",
    "i"
  ));
const rest = html.replace(reStackedTag, function(all, text) {
  if (options.chars) {
    options.chars(text);
  }
  return "";
});
html = rest;
options.end(stackedTag);
```

### 文本解析器

文本解析器是对 html 解析出来的文本进行二次加工，因为其中有可能是带变量的文本。

```js
let expression;
if ((expression = parseText(text))) {
  children &&
    children.push({
      type: 2,
      expression,
      text
    });
} else {
  children &&
    children.push({
      type: 3,
      text
    });
}

function parseText(text) {
  const tagRE = /\{\{((?:.|\n)+?)\}\}/g;
  if (!tagRE.test(text)) {
    return;
  }

  const tokens = [];
  let lastIndex = (tagRE.lastIndex = 0);
  let match, index;
  while ((match = tagRE.exec(text))) {
    index = match.index;
    if (index > lastIndex) {
      tokens.push(JSON.stringify(text.slice(lastIndex, index)));
    }
    tokens.push(`_s(${match[1].trim()})`);
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push(JSON.stringify(text.slice(lastIndex)));
  }
  return tokens.join("+");
}
```

`name is {{name}}`就可以被解析成`"name is "+_s(name)`了

拿到这些 html 解析器解析后的数据，在钩子函数中就可以生成 VNode 了。

```js
function createASTElement(tag, attrs, parent) {
  return {
    type: 1,
    tag,
    attrsList: attrs,
    parent,
    children: []
  };
}

parseHTML(template, {
  shouldKeepComment: true,
  start(tag, attrs, unary) {
    let element = createASTElement(tag, attrs, currentParent);
    children && children.push(element);
  },
  end(tag) {},
  chars(text) {
    text = text.trim();
    if (text) {
      let expression;
      if ((expression = parseText(text))) {
        children &&
          children.push({
            type: 2,
            expression,
            text
          });
      } else {
        children &&
          children.push({
            type: 3,
            text
          });
      }
    }
  },
  comment(text) {
    if (text) {
      children.push({ type: 3, text, isComment: true });
    }
  }
});
```

这些 VNode 是没有层级关系的，那么如果生成有层级关系的抽象语法树(AST)呢？答案是借助一个栈。由于解析 html 是从前往后的，解析到开始标签、结束标签都会触发相应的钩子函数。我们只要在开始标签钩子函数触发时执行`stack.push(element)`，在结束标签钩子函数触发时执行`stack.pop()`,这样当前元素的父节点就是栈的顶层元素。通过`currentParent.children.push(element)`就可以将元素添加到父节点上，这样就可以生成带有层级关系的 AST 了。

```js
const stack = [],
  ast = [];

function getCurrentParent() {
  const currentParent = stack[stack.length - 1]
    ? stack[stack.length - 1]
    : null;
  return currentParent;
}

parseHTML(template, {
  shouldKeepComment: true,
  start(tag, attrs, unary) {
    const currentParent = getCurrentParent();
    const children = currentParent ? currentParent.children : null;
    let element = createASTElement(tag, attrs, currentParent);
    children && children.push(element);
    if (!currentParent) {
      ast.push(element);
    }
    stack.push(element);
  },
  end(tag) {
    stack.pop();
  },
  chars(text) {
    text = text.trim();
    if (text) {
      const currentParent = getCurrentParent();
      const children = currentParent ? currentParent.children : null;
      let expression;
      if ((expression = parseText(text))) {
        children &&
          children.push({
            type: 2,
            expression,
            text
          });
      } else {
        children &&
          children.push({
            type: 3,
            text
          });
      }
    }
  },
  comment(text) {
    if (text) {
      const currentParent = getCurrentParent();
      const children = currentParent ? currentParent.children : null;
      children && children.push({ type: 3, text, isComment: true });
    }
  }
});
```

## 优化器

优化器是为了标记静态节点，因为静态节点不会变化，所以每次重新渲染不用重新创建节点，在 patching 算法中可以被跳过。

优化器分为两步： 1.找出所有静态节点并标记。2.找出所有静态根节点并标记。

```js
export default function optimize(root) {
  if (!root) {
    return;
  }
  markStatic(root);
  markStaticRoots(root);
}
```

找出所有静态节点并标记，只要一层层遍历递归就可以了。

```js
function markStatic(node) {
  node.static = isStatic(node);
  if (node.type === 1) {
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i];
      markStatic(child);

      if (!child.static) {
        node.static = false;
      }
    }
  }
}

function isStatic(node) {
  if (node.type === 2) {
    // 带变量的动态文本节点
    return false;
  }
  if (node.type === 3) {
    // 不带变量的纯文本节点
    return true;
  }
}
```

在找出所有静态节点以后，标记静态根节点也变得容易。只需要从根节点往子节点一层层遍历 AST 就可以了。

```js
function markStaticRoots(node) {
  if (node.type === 1) {
    if (
      node.static &&
      node.children.length &&
      !(node.children.length === 1 && node.children[0].type === 3)
    ) {
      node.staticRoot = true;
      return;
    } else {
      node.staticRoot = false;
    }
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i]);
      }
    }
  }
}
```

## 代码生成器

代码生成器会得到一个字符串,如：code=`_c('body',{},[_e(" <div></div> "),_c('div',{},[_v("1"+_s(a)),_c('div',{},[_v("2")])]),_c('script',{},[_v("var b = 1;")])])`。
执行代码生成器，可以调用 vue.js 封装的各种创建方法，如创建元素节点、创建文本节点，等等。
伪代码如下：
`with(this){return ${code}}`
其生成的过程也很简单，主要是遍历递归并根据节点类型 type 来拼接不同的方法名。

```js
function genData(el, state) {
  let data = "{";

  if (el.key) {
    data += `key:${el.key},`;
  }
  if (el.ref) {
    data += `ref:${el.ref},`;
  }
  if (el.pre) {
    data += `pre:true,`;
  }

  //类似的还有很多种情况
  data = data.replace(/,$/, "") + "}";
  return data;
}

function genChildren(el, state) {
  const children = el.children;
  if (children.length) {
    return `[${children.map(c => genNode(c, state)).join(",")}]`;
  }
}

function genNode(node, state) {
  if (node.type === 1) {
    return genElement(node, state);
  } else if (node.type === 3 && node.isComment) {
    return genComment(node);
  } else {
    return genText(node);
  }
}

function genText(text) {
  return `_v(${text.type === 2 ? text.expression : JSON.stringify(text.text)})`;
}

function genComment(comment) {
  return `_e(${JSON.stringify(comment.text)})`;
}

export default function genElement(el, state) {
  const data = el.plain ? undefined : genData(el, state);

  const children = genChildren(el, state);
  const code = `_c('${el.tag}'${data ? `,${data}` : ""}${
    children ? `,${children}` : ""
  })`;

  return code;
}
```
