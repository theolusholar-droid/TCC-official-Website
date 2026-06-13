import { StageActions } from "./stage-actions.js";

export const StageEvents = {
  init() {
    document.addEventListener("keydown", (e) => {
      this.handleKey(e.key);
    });
  },

  handleKey(key) {
    switch (key) {
      case "ArrowUp":
        StageActions.move("player", 0, -10);
        break;
      case "ArrowDown":
        StageActions.move("player", 0, 10);
        break;
      case "ArrowLeft":
        StageActions.move("player", -10, 0);
        break;
      case "ArrowRight":
        StageActions.move("player", 10, 0);
        break;
    }
  }
};
