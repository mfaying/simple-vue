# Array 的变化侦测

## 通知依赖

Array 的变化侦测和 Object 有所不同，Object 的变化可以通过 Object.defineProperty 侦测到。但是数组有其他改变数据的方法，如 push、pop 等等，这是无法侦测到的，所以需要采用拦截原型的方式来侦测。

```js
const arrayProto = Array.prototype;
export const arrayMethods = Object.create(arrayProto);

["push", "pop", "shift", "unshift", "splice", "sort", "reverse"].forEach(
  function(method) {
    const original = arrayProto[method];
    Object.defineProperty(arrayMethods, method, {
      value: function mutator(...args) {
        const result = original.apply(this, args);
        const ob = this.__ob__;
        ob.dep.notify();
        return result;
      },
      enumerable: false,
      writable: true,
      configurable: true
    });
  }
);
```

"push", "pop", "shift", "unshift", "splice", "sort", "reverse"这 7 个方法会改变数组数据，所以拦截它。在拦截的方法里我们就可以触发依赖了（ob.dep.notify()），同时通过 original.apply(this, args)也调用了数组原型上的方法。

## 收集依赖

数组也是在"get"中收集依赖的，比如要拿到 ob 中的数组

```js
const ob = { a: [] };
```

必须要使用 ob.a 才能拿到，这会触发 get,依赖可以在这个时候收集。
那么依赖应该存放在哪呢，和 Object 不同，数组依赖存放在 Observer 中。这是因为既需要在"get"中收集依赖(childOb.dep.depend())，又需要在 Observer 转换响应式数据时能够获取到依赖，从而在拦截数组原型方法时能够通知依赖(ob.dep.notify())，将依赖存放在 Observer 中比较合适。
当然依赖不是直接获取的，通过

```js
// def为defineProperty的封装，函数签名为def(obj, key, val, enumerable)
def(value, "__ob__", this);
```

将 Observer 的实例设置在私有属性`__ob__`上，所以无论依赖收集还是通知，都是通过 Observer 实例`__ob__`上的 dep 属性来操作的。同时`__ob__`也成了判断数据是否是响应式的依据，有该属性数据就是响应式的。

## 数组中的对象

如果数组中有对象，如何保证这个对象也是相应式的呢？由于 push、unshift、splice 三个数组方法会新增数组元素，我们只要将新增的元素 inserted 转换为响应式数据即可。

```js
import { def } from "./util";

const arrayProto = Array.prototype;
export const arrayMethods = Object.create(arrayProto);

["push", "pop", "shift", "unshift", "splice", "sort", "reverse"].forEach(
  function(method) {
    const original = arrayProto[method];
    def(arrayMethods, method, function mutator(...args) {
      const result = original.apply(this, args);
      const ob = this.__ob__;
      let inserted;
      switch (method) {
        case "push":
        case "unshift":
          inserted = args;
          break;
        case "splice":
          inserted = args.slice(2);
          break;
      }
      if (inserted) ob.observeArray(inserted);
      ob.dep.notify();
      return result;
    });
  }
);
```
