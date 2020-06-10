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

function isStatic(node) {
  if (node.type === 2) {
    // 带变量的动态文本节点
    return false;
  }
  if (node.type === 3) {
    // 不带变量的纯文本节点
    return true;
  }
  // return !!(
  //   node.pre ||
  //   (!node.hasBindings &&
  //     !node.if &&
  //     !node.for &&
  //     !isBuiltInTag(node.tag) &&
  //     isPlatformReservedTag(node.Tag) &&
  //     !isDirectChildOfTemplateFor(node) &&
  //     Object.keys(node).every(isStaticKey))
  // );
}

export default function optimize(root) {
  if (!root) {
    return;
  }
  if (Array.isArray(root)) {
    for (let i = 0, l = root.length; i < l; i++) {
      markStatic(root[i]);
      markStaticRoots(root[i]);
    }
  } else {
    markStatic(root);
    markStaticRoots(root);
  }
}
