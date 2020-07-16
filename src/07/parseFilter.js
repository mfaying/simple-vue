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
