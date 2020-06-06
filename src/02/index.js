import Observer from "./Observer";
import Watcher from "./Watcher";

window.data = {
  a: []
};
new Observer(window.data);
new Watcher(window.data, "a", () => {
  console.log("Watcher exec");
});
// 执行后打印watcher
