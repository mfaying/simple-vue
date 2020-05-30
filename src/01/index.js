import Observer from "./Observer";
import Watcher from "./Watcher";

window.data = {
  a: {
    b: {
      c: 1
    }
  }
};
new Observer(window.data);
new Watcher(window.data, "a.b", () => {
  console.log("watcher");
});
// 执行后打印watcher
window.data.a.b = 1;
