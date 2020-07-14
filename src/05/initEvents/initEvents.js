import { updateComponentListeners } from "./updateComponentListeners";

export function initEvents(vm) {
  vm._events = Object.create(null);
  // 初始化父组件附加的事件
  const listeners = vm.$options._parentListeners;
  if (listeners) {
    updateComponentListeners(vm, listeners);
  }
}
