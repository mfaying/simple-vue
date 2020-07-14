export function initInjections(vm) {
  const result = resolveInject(vm.$options.inject, vm);
  if (result) {
    // 原理之前介绍过
    observableState.shouldConvert = false;
    Object.keys(result).forEach(key => {
      defineReactive(vm, key, result[key]);
    });
    observerState.shouldConvert = true;
  }
}

function resolveInject(inject, vm) {
  if (inject) {
    const result = Object.create(null);
    const keys = hasSymbol
      ? Reflect.ownKeys(inject).filter(key => {
          return Object.getOwnPropertyDescriptor(inject, key).enumerable;
        })
      : Object.keys(inject);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const provideKey = inject[key].from;
      let source = vm;
      while (source) {
        if (source._provided && provideKey in source._provided) {
          result[key] = source._provided[provideKey];
          break;
        }
        source = source.$parent;
      }
      if (!source) {
        if ("default" in inject[key]) {
          const provideDefault = inject[key].default;
          result[key] =
            typeof provideDefault === "function"
              ? provideDefault.call(vm)
              : provideDefault;
        } else if (process.env.NODE_ENV !== "production") {
          // warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result;
  }
}
