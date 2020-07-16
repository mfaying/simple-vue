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
