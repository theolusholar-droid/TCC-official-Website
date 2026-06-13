// Loop Builder activity for Virtual Lego
// Exposes switchActivity('stack'|'loop'), runActivity(), clearActivity()

const LOOP_LEVELS = [
  {
    title: "Level 1 — Repeat pair",
    goal: "Reproduce a 6-brick red-blue pattern. Try using a repeat to be more efficient!",
    target: ['red','blue','red','blue','red','blue'],
    naiveBlocks: 6
  },
  {
    title: "Level 2 — Double pair repeat",
    goal: "An 8-brick green-yellow pattern repeated 4 times.",
    target: Array(4).fill(['green','yellow']).flat(),
    naiveBlocks: 8
  },
  {
    title: "Level 3 — Three-colour loop",
    goal: "A 9-brick 3-colour pattern (red-blue-yellow × 3). Use a repeat wrapping 3 bricks.",
    target: Array(3).fill(['red','blue','yellow']).flat(),
    naiveBlocks: 9
  },
  {
    title: "Level 4 — Free design",
    goal: "Pick any 2 colours and a repeat count, then describe your loop to your group.",
    target: null,
    naiveBlocks: null
  }
];

let loopWorkspace = null;
let currentLoopLevel = 0;
let loopCompleted = new Set();
let currentActivity = 'stack'; // default

function switchActivity(name) {
  currentActivity = name;
  document.getElementById('activity-stack').classList.toggle('active', name === 'stack');
  document.getElementById('activity-loop').classList.toggle('active', name === 'loop');

  // Dispose any existing workspace (either from stack activity or loop)
  try { if (window.workspace) window.workspace.dispose(); } catch(e){}
  try { if (loopWorkspace) loopWorkspace.dispose(); } catch(e){}

  if (name === 'stack') {
    // reload first stack level
    if (typeof loadLevel === 'function') loadLevel(0);
    document.querySelector('.mission').textContent = '🧱 Stack Builder — What Is Coding?';
  } else {
    // initialize loop activity UI
    document.querySelector('.mission').textContent = '🔁 Loop Builder — Make repetition visible';
    loadLoopLevel(0);
  }
}

function runActivity() {
  if (currentActivity === 'stack') {
    if (typeof runCode === 'function') runCode();
  } else {
    loopRun();
  }
}
function clearActivity() {
  if (currentActivity === 'stack') {
    if (typeof clearStack === 'function') clearStack();
  } else {
    loopClear();
  }
}

// --- Blockly block definitions for loop builder ---
function registerLoopBlocks(colors) {
  const placeBlock = {
    "type": "place_brick",
    "message0": "place %1 brick",
    "args0": [
      { "type": "field_dropdown", "name": "COLOR", "options": colors.map(c => [c, c]) }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "Place a brick of the chosen colour",
    "helpUrl": ""
  };

  const repeatBlock = {
    "type": "repeat_block",
    "message0": "repeat %1 times %2 do %3",
    "args0": [
      { "type": "field_number", "name": "TIMES", "value": 2, "min": 1, "precision": 1 },
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "DO" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 120,
    "tooltip": "Repeat the bricks inside",
    "helpUrl": ""
  };

  if (!Blockly.Blocks["place_brick"])  Blockly.defineBlocksWithJsonArray([placeBlock]);
  if (!Blockly.Blocks["repeat_block"]) Blockly.defineBlocksWithJsonArray([repeatBlock]);
}

function buildLoopToolbox(colors) {
  // simple xml toolbox
  const xmlParts = [
    '<xml id="toolbox" style="display: none">',
    '  <category name="Loops" colour="#5BA58C">',
    '    <block type="repeat_block"><field name="TIMES">3</field></block>',
    '  </category>',
    '  <category name="Bricks" colour="#D46B6A">',
    '    <block type="place_brick"></block>',
    '  </category>',
    '</xml>'
  ];
  return xmlParts.join('\n');
}

// Rendering uses shared helpers from sandbox.js: renderTargetStack, renderMyStack

// Evaluate a sequence of blocks into a flat array of colours
function evaluateSequenceFromBlock(startBlock) {
  const out = [];
  let b = startBlock;
  while (b) {
    if (b.type === 'place_brick') {
      const col = b.getFieldValue('COLOR');
      out.push(col);
    } else if (b.type === 'repeat_block') {
      const times = Number(b.getFieldValue('TIMES')) || 1;
      const inner = b.getInputTargetBlock('DO');
      // collect inner sequence
      const innerSeq = [];
      let ib = inner;
      while (ib) {
        if (ib.type === 'place_brick') innerSeq.push(ib.getFieldValue('COLOR'));
        else if (ib.type === 'repeat_block') {
          // nested repeat: recursively evaluate one cycle and then repeat
          const nested = evaluateSequenceFromBlock(ib);
          // evaluateSequenceFromBlock will return full tail including following blocks; to avoid duplication we only want inner of this nested block
          // simpler approach: call evaluateBlock to get values for this nested block only
          // but for now, support simple nested usage by recursion on ib's DO
          const nestedInner = [];
          let nib = ib.getInputTargetBlock('DO');
          while (nib) {
            if (nib.type === 'place_brick') nestedInner.push(nib.getFieldValue('COLOR'));
            nib = nib.getNextBlock();
          }
          for (let k=0;k<Number(ib.getFieldValue('TIMES')||1);k++) nestedInner.forEach(c=>innerSeq.push(c));
        }
        ib = ib.getNextBlock();
      }
      for (let t=0;t<times;t++) innerSeq.forEach(c=>out.push(c));
    }
    b = b.getNextBlock();
  }
  return out;
}

function evaluateWorkspaceSequence(ws) {
  const top = ws.getTopBlocks(true).filter(b => !b.getPreviousBlock());
  // order top blocks by y position to ensure sequence
  top.sort((a,b) => a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y);
  const result = [];
  top.forEach(tb => {
    // if tb has previous connection null, it's a sequence start
    const seq = evaluateSequenceFromBlock(tb);
    seq.forEach(c => result.push(c));
  });
  return result;
}

// --- Level loading ---
function loadLoopLevel(idx) {
  currentLoopLevel = idx;
  const lvl = LOOP_LEVELS[idx];
  document.querySelectorAll('.levels .level-btn').forEach((b,i)=> b.classList.toggle('active', i===idx));
  document.getElementById('goal-text').textContent = lvl.goal + '\n\nFacilitator prompt: "Did your loop produce the same stack as placing each brick one by one? So why would a programmer choose the loop?"';

  // show target
  renderTargetStack(lvl.target);

  // setup blocks
  const colors = ['red','blue','yellow','green','orange','purple','pink','white'];
  registerLoopBlocks(colors);

  try { if (loopWorkspace) loopWorkspace.dispose(); } catch(e){}
  // dispose global workspace if present (stack activity)
  try { if (window.workspace) window.workspace.dispose(); } catch(e){}

  loopWorkspace = Blockly.inject('blocklyDiv', {
    toolbox: buildLoopToolbox(colors),
    scrollbars: true,
    trashcan: true,
    grid: { spacing: 20, length: 3, colour: 'rgba(255,255,255,0.05)', snap: true }
  });

  let flyout = null;
  if (loopWorkspace.getFlyout) flyout = loopWorkspace.getFlyout();
  if (!flyout && loopWorkspace.getToolbox && loopWorkspace.getToolbox().getFlyout) {
    flyout = loopWorkspace.getToolbox().getFlyout();
  }
  if (flyout && typeof flyout.setAutoClose === 'function') {
    flyout.setAutoClose(false);
  }

  const updateLoopPreview = () => {
    const seq = evaluateWorkspaceSequence(loopWorkspace);
    renderMyStack(seq, LOOP_LEVELS[currentLoopLevel].target || []);
    const count = loopWorkspace.getAllBlocks(false).length;
    const el = document.getElementById('block-count');
    if (el) {
      el.textContent = String(count);
      el.classList.toggle('green', LOOP_LEVELS[currentLoopLevel].naiveBlocks && count < LOOP_LEVELS[currentLoopLevel].naiveBlocks);
    }
  };

  // update counter on change
  loopWorkspace.addChangeListener(updateLoopPreview);
  updateLoopPreview();

  // special handling for free design level: create UI controls
  if (idx === 3) {
    // create small controls inside goal-card if not present
    let ctrl = document.getElementById('free-controls');
    if (!ctrl) {
      ctrl = document.createElement('div');
      ctrl.id = 'free-controls';
      ctrl.style.marginTop = '8px';
      ctrl.style.display = 'flex';
      ctrl.style.flexDirection = 'column';
      const row = document.createElement('div');
      row.style.display = 'flex'; row.style.gap='8px'; row.style.marginTop='8px';

      const c1 = document.createElement('select'); c1.id='free-col-1';
      const c2 = document.createElement('select'); c2.id='free-col-2';
      ['red','blue','yellow','green','orange','purple','pink','white'].forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; c1.appendChild(o); const o2=o.cloneNode(true); c2.appendChild(o2); });
      const times = document.createElement('input'); times.type='number'; times.min=1; times.value=4; times.id='free-times'; times.style.width='64px';
      const apply = document.createElement('button'); apply.textContent='Set pattern'; apply.className='btn btn-run'; apply.onclick = ()=>{
        const a=c1.value, b=c2.value, t = Math.max(1, Number(times.value)||1);
        const pattern = Array(t).fill([a,b]).flat();
        LOOP_LEVELS[3].target = pattern;
        LOOP_LEVELS[3].naiveBlocks = pattern.length;
        renderTargetStack(pattern);
      };
      row.appendChild(c1); row.appendChild(c2); row.appendChild(times); row.appendChild(apply);
      ctrl.appendChild(row);
      document.getElementById('goal-card').appendChild(ctrl);
    }
  } else {
    const existing = document.getElementById('free-controls'); if (existing) existing.remove();
  }
}

function loopRun() {
  const lvl = LOOP_LEVELS[currentLoopLevel];
  if (!loopWorkspace) { showFeedback('error', 'No workspace loaded.'); return; }
  const stack = evaluateWorkspaceSequence(loopWorkspace);
  renderMyStack(stack, lvl.target);

  // update block count color
  const count = loopWorkspace.getAllBlocks(false).length;
  const el = document.getElementById('block-count');
  el.textContent = String(count);
  if (lvl.naiveBlocks && count < lvl.naiveBlocks) el.classList.add('green'); else el.classList.remove('green');

  // check correctness
  if (!lvl.target) {
    showFeedback('info', `Your design produced ${stack.length} bricks.`);
    return;
  }
  const correct = stack.length === lvl.target.length && stack.every((c,i)=>c===lvl.target[i]);
  if (correct) {
    showFeedback('success', '✅ Perfect match! Nice loop.');
    loopCompleted.add(currentLoopLevel);
    if (typeof updateProgress === 'function') updateProgress();
  } else {
    showFeedback('error', 'Not matching the target. Check your loop or bricks.');
  }
}

function loopClear() {
  if (loopWorkspace) loopWorkspace.clear();
  renderMyStack([], LOOP_LEVELS[currentLoopLevel].target || []);
  document.getElementById('block-count').textContent = '0';
  const existing = document.getElementById('free-controls'); if (existing) existing.remove();
}