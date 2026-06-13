/* stage-events.js */

import { StageCore } from "./stage-core.js";
import { executeAction } from "./stage-actions.js";

export function handleKeyPress(key) {
  if (!StageCore.isRunning) {
    showFeedback('info', 'Press Run first!');
    return;
  }

  const btn = document.querySelector(`.key-btn[data-key="${key}"]`);
  if (btn) {
    btn.classList.add('active');
    setTimeout(() => btn.classList.remove('active'), 200);
  }

  const actions = StageCore.eventMap[key];

  if (!actions || !actions.length) {
    showFeedback('info', `No rule for ${key}`);
    return;
  }

  actions.forEach(a =>
    executeAction(a, key)
  );

  if (typeof seOnKeyFired === 'function') seOnKeyFired(key);
}
