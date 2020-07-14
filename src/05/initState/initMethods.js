function initMethods(vm, methods) {
  const props = vm.$options.props;
  for (const key in methods) {
    if (process.env.NODE_ENV !== "production") {
      if (methods[key] == null) {
        console.warn("");
      }
      if (props && hasOwn(props, key)) {
        console.warn("");
      }
      // isReserved判断字符串是否以$或_开头
      if (key in vm && isReserved(key)) {
        console.warn("");
      }
    }
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm);
  }
}
