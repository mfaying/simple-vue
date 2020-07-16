# 过滤器
## 原理概述
```
{{ message | capitalize }}
```
过滤器在模板编译阶段会编译成下面的样子
```js
_s(_f("capitalize")(message))
```
_f是resolveFilter的别名，其作用是从this.$options.filters中找出注册的过滤器并返回。
## 串联过滤器
串联过滤器会被编译成
```
_s(_f("suffix")(_f("capitalize")(message)))
```
## 接收参数
会被编译成
```
_s(_f("suffix")(_f("capitalize")(message),'!'))
```
## resolveFilter的内部原理
```js
function resolveFilter(id) {
  return resolveAsset(this.$options, "filters", id, true) || identity;
}

const identity = _ => _;

function resolveAsset(options, type, id, warnMissing) {
  if (typeof id !== "string") {
    return;
  }
  const assets = options[type];
  // 先检查本地注册的变动
  if (hasOwn(assets, id)) return asserts[id];
  const camelizedId = camelize(id);
  if (hasOwn(assets, camelizedId)) return assets[camelizedId];
  const PascalCaseId = capitalize(camelizedId);
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId];
  // 检查原型链
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId];
  if (process.env.NODE_ENV !== "production" && warnMissing && !res) {
    warn("");
  }
  return res;
}
```
## 解析过滤器
```js
function parseFilter(exp) {
  let filters = exp.split("|");
  let expression = filters.shift().trim();
  let i;
  if (fliters) {
    for (i = 0; i < filters.length; i++) {
      expression = wrapFilter(expression, filters[i].trim());
    }
  }
  return expression;
}

function wrapFilter(exp, filter) {
  const i = filter.indexOf("(");
  if (i < 0) {
    return `_f("${filter}")(${exp})`;
  } else {
    const name = filter.slice(0, i);
    const args = filter.slice(i + 1);
    return `_f("${name}")(${exp},${args})`;
  }
}
```

