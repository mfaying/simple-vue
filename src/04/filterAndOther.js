// Vue.filter、Vue.component、Vue.directive原理
const ASSET_TYPES = ["component", "directive", "filter"];

function isPlainObject() {}

exports.filterAndOther = function(Vue) {
  Vue.options = Object.create(null);
  ASSET_TYPES.forEach(type => {
    Vue.options[type + "s"] = Object.create(null);
  });

  ASSET_TYPES.forEach(type => {
    Vue.directive = function(id, definition) {
      ASSET_TYPES.forEach(type => {
        Vue.options[type + "s"] = Object.create(null);
      });
      ASSET_TYPES.forEach(type => {
        Vue[type] = function(id, definition) {
          if (!definition) {
            return this.options[type + "s"][id];
          } else {
            if (type === "component" && isPlainObject(definition)) {
              definition.name = definition.name || id;
              definition = Vue.extend(definition);
            }
            if (type === "directive" && typeof definition === "function") {
              definition = { bind: definition, update: definition };
            }
            this.options[type + "s"][id] = definition;
            return definition;
          }
        };
      });
    };
  });
};
