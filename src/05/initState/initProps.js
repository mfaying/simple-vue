function initProps(vm, propsOptions) {
  const propsData = vm.$options.propsData || {};
  const props = (vm._props = {});
  // 缓存props的key
  const keys = (vm.$options._propKeys = []);
  const isRoot = !vm.$parent;
  // root实例的props属性应该被转换成响应式数据
  if (!isRoot) {
    toggleObserving(false);
  }
  for (const key in propsOptions) {
    keys.push(key);
    const value = validateProp(key, propsOptions, propsData, vm);
    defineReactive(props, key, value);
    if (!(key in vm)) {
      proxy(vm, `_props`, key);
    }
  }
  toggleObserving(true);
}

function normalizeProps(options, vm) {
  const props = options.props;
  if (!props) return;
  const res = {};
  let i, val, name;
  if (Array.isArray(props)) {
    i = props.length;
    while (i--) {
      val = props[i];
      if (typeof val === "string") {
        name = camelize(val);
        res[name] = { type: null };
      } else if (process.env.NODE_ENV !== "production") {
        console.warn("props must be strings when using array syntax");
      }
    }
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key];
      name = camelize(key);
      res[name] = isPlainObject(val) ? val : { type: val };
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.warn("");
  }
  options.props = res;
}

function validateProp(key, propsOptions, propsData, vm) {
  const prop = propOptions[key];
  const absent = !hasOwn(propsData, key);
  let value = propsData[key];
  // 处理布尔类型的props
  if (isType(Boolean, prop.type)) {
    if (absent && !hasOwn(prop, "default")) {
      value = false;
    } else if (
      !isType(String, prop.type) &&
      // hyphenate驼峰转换
      (value === "" || value === hyphenate(key))
    ) {
      value = true;
    }
  }
  // 检查默认值
  if (value === undefined) {
    value = getPropDefaultValue(vm, prop, key);
    // 因为默认值是新的数据，所以需要将它转换成响应式的
    const prevShouldConvert = observerState.shouldConvert;
    observerState.shouldConvert = true;
    observe(value);
    observerState.shouldConvert = prevShouldConvert;
  }
  if (process.env.NODE_ENV !== "production") {
    // 断言判断prop是否有效
    assertProp(prop, key, value, vm, absent);
  }
  return value;
}

function assertProp(prop, name, value, vm, absent) {
  if (prop.required && absent) {
    console.warn('Missing required prop: "' + name + '"', vm);
    return;
  }
  if (value === null && !prop.required) {
    return;
  }
  let type = prop.type;
  let valid = !type || type === true;
  const expectedTypes = [];
  if (type) {
    if (!Array.isArray(type)) {
      type = [type];
    }
    for (let i = 0; i < type.length && !valid; i++) {
      const assertedType = assertType(value, type[i]);
      expectedTypes.push(assertedType.expectedTypes || "");
      valid = assertedType.valid;
    }
  }
  if (!valid) {
    console.warn("");
    return;
  }
  const validator = prop.validator;
  if (validator) {
    if (!validator(value)) {
      console.warn("");
    }
  }
}
