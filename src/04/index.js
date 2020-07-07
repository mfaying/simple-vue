import { initMixin } from "./init";
import { stateMixin } from "./state";
import { renderMixin } from "./render";
import { eventsMixin } from "./events";
import { lifecycleMixin } from "./lifecycle";
import { extend } from "./extend";
import { nextTick } from "./nextTick";
import { filterAndOther } from "./filterAndOther";
import { use } from "./use";
import { mixin } from "./mixin";
import { compile } from "./compile";

function Vue(options) {
  this._init(options);
}
initMixin(Vue);
stateMixin(Vue);
eventsMixin(Vue);
lifecycleMixin(Vue);
renderMixin(Vue);

extend(Vue);
nextTick(Vue);
filterAndOther(Vue);
use(Vue);
mixin(Vue);
compile(Vue);

export default Vue;
