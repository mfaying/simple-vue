let cid = 1;
const ASSET_TYPES = ["component", "directive", "filter"];

exports.extend = function(Vue) {
  Vue.extend = function(extendOptions) {
    extendOptions = extendOptions || {};
    const Super = this;
    const SuperId = Super.cid;
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId];
    }

    // const name = extendOptions.name || Super.options.name;
    const name = extendOptions.name;
    if (process.env.NODE_ENV !== "production") {
      if (!/^[a-zA-Z][\w-]*$/.test(name)) {
        console.warn("");
      }
    }
    const Sub = function VueComponent(options) {
      this._init(options);
    };

    Sub.prototype = Object.create(Super.prototype);
    Super.prototype.constructor = Sub;
    Sub.cid = cid++;

    Sub.options = { ...Super.options, ...extendOptions };

    Sub["super"] = Super;

    if (Sub.options.props) {
      initProps(Sub);
    }

    if (Sub.options.computed) {
      initComputed(Sub);
    }

    Sub.extend = Super.extend;
    Sub.mixin = Super.mixin;
    Sub.use = Super.use;

    ASSET_TYPES.forEach(type => {
      Sub[type] = Super[type];
    });

    if (name) {
      Sub.options.components[name] = Sub;
    }

    Sub.superOptions = Super.options;
    Sub.extendOptions = extendOptions;
    Sub.sealedOptions = Object.assign({}, Sub.options);

    cachedCtors[SuperId] = Sub;
    return Sub;
  };
};

function initProps(Comp) {
  const props = Comp.options.props;
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key);
  }
}

function proxy(target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter() {
    return this[sourceKey][key];
  };
  sharedPropertyDefinition.set = function proxySetter(val) {
    this[sourceKey][key] = val;
  };
  Object.defineProperties(target, key, sharedPropertyDefinition);
}

function initComputed(Comp) {
  const computed = Comp.options.computed;
  for (const key in computed) {
    definedComputed(Comp.prototype, key, computed[key]);
  }
}
