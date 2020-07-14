let target;

function add(event, fn, once) {
  if (once) {
    target.$once(event, fn);
  } else {
    target.$on(event, fn);
  }
}

function remove(event, fn) {
  target.$off(event, fn);
}

export function updateComponentListeners(vm, listeners, oldListeners) {
  target = vm;
  updateListeners(listeners, oldListeners || {}, add, remove, vm);
}

function isUndef(i) {
  return i === null || i === undefined;
}

function normalizeEvent(name) {
  const passive = name.charAt(0) === "&";
  name = passive ? name.slice(1) : name;
  const once = name.charAt(0) === "~";
  name = once ? name.slice(1) : name;
  const capture = name.charAt(0) === "!";
  name = capture ? name.slice(1) : name;
  return {
    name,
    once,
    capture,
    passive
  };
}

function updateListeners(on, oldOn, add, remove, vm) {
  let name, cur, old, event;
  for (name in on) {
    cur = on[name];
    old = oldOn[name];
    event = normalizeEvent(name);
    if (isUndef(cur)) {
      console.warn("");
    } else if (isUndef(old)) {
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur);
      }
      add(event.name, cur, event.once, event.capture, event, passive);
    } else if (cur !== old) {
      old.fns = cur;
      on[name] = old;
    }
  }
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name);
      remove(event.name, oldOn[name], event.capture);
    }
  }
}
