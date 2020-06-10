import optimize from "./optimize";
import codeGen from "./codeGen";

const ncname = "[a-zA-Z_][\\w\\-\\.]*";
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);
const startTagClose = /^\s*(\/?)>/;
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const comment = /^<!--/;
const conditionalComment = /^<!\[/;
const doctype = /^<!DOCTYPE [^>]+>/i;

const stack = [];
const ast = [];
const reCache = [];

function createASTElement(tag, attrs, parent) {
  return {
    type: 1,
    tag,
    attrsList: attrs,
    parent,
    children: []
  };
}

function isPlainTextElement(tag) {
  const plainTextReg = /script|style|textarea/g;
  return plainTextReg.test(tag);
}

function getCurrentParent() {
  const currentParent = stack[stack.length - 1]
    ? stack[stack.length - 1]
    : null;
  return currentParent;
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

function parseHTML(html, options) {
  while (html) {
    const currentParent = getCurrentParent();
    const lastTag = currentParent ? currentParent.tag : null;
    if (!lastTag || !isPlainTextElement(lastTag)) {
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

        // 匹配条件注释
        if (conditionalComment.test(html)) {
          const conditionalEnd = html.indexOf("]>");
          if (conditionalEnd >= 0) {
            html = html.substring(conditionalEnd + 2);
            continue;
          }
        }

        // 匹配doctype
        const doctypeMatch = html.match(doctype);
        if (doctypeMatch) {
          html = html.substring(doctypeMatch[0].length);
          continue;
        }

        // 匹配结束标签
        const endTagMatch = html.match(endTag);
        if (endTagMatch) {
          html = html.substring(endTagMatch[0].length);
          options.end(endTagMatch[1]);
          continue;
        }

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

      // 匹配文本
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
    } else {
      // 匹配纯文本
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

// 优化器
optimize(ast);
console.log("ast", ast);

for (let i = 0, l = ast.length; i < l; i++) {
  const code = codeGen(ast[i]);
  console.log("code", code);
}
