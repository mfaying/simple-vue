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
