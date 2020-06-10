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
