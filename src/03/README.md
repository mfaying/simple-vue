# 模板编译原理

vue.js 将模板编译成渲染函数的步骤分为三步，解析器、优化器、代码生成器。

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
