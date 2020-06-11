import Observer from "./Observer";
import Watcher from "./Watcher";

window.data = {
  a: []
};
new Observer(window.data);
new Watcher(window.data.a, "0", () => {
  console.log("Watcher exec");
});
