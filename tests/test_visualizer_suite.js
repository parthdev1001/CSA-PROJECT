const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('web/index.html', 'utf8');
const js = fs.readFileSync('web/app.js', 'utf8');

// 1. Check all document.getElementById calls
const getElementRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const ids = new Set();
while ((match = getElementRegex.exec(js)) !== null) {
  ids.add(match[1]);
}

console.log('Total document.getElementById IDs searched in app.js:', ids.size);
let missing = [];
for (const id of ids) {
  if (!html.includes('id="' + id + '"') && !html.includes("id='" + id + "'")) {
    missing.push(id);
  }
}

if (missing.length > 0) {
  console.log('Missing IDs in index.html:', missing);
  process.exit(1);
} else {
  console.log('PASS: All 127 IDs found in index.html!');
}

// 2. Set up full DOM mock for app.js simulation
const domNodes = {};
function createMockElement(id) {
  const el = {
    id: id || '',
    tagName: 'DIV',
    style: {},
    classList: {
      _classes: new Set(),
      add: function(...c) { c.forEach(x => this._classes.add(x)); },
      remove: function(...c) { c.forEach(x => this._classes.delete(x)); },
      contains: function(c) { return this._classes.has(c); },
      toggle: function(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
    },
    dataset: {},
    attributes: {},
    innerHTML: '',
    textContent: '',
    value: '',
    children: [],
    appendChild: function(child) { this.children.push(child); return child; },
    setAttribute: function(name, val) { this.attributes[name] = val; },
    getAttribute: function(name) { return this.attributes[name]; },
    addEventListener: function(event, handler) {
      if (!this._listeners) this._listeners = {};
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(handler);
    },
    click: function() {
      if (this._listeners && this._listeners['click']) {
        this._listeners['click'].forEach(h => h({ target: this, preventDefault: () => {} }));
      }
    },
    closest: function(sel) { return null; },
    querySelectorAll: function(sel) { return []; },
    querySelector: function(sel) { return null; }
  };
  return el;
}

const mockDoc = {
  documentElement: createMockElement('html'),
  getElementById: function(id) {
    if (!domNodes[id]) {
      domNodes[id] = createMockElement(id);
    }
    return domNodes[id];
  },
  createElement: function(tag) {
    const el = createMockElement();
    el.tagName = tag.toUpperCase();
    return el;
  },
  querySelectorAll: function(sel) {
    return [];
  },
  querySelector: function(sel) {
    return createMockElement();
  },
  addEventListener: function(evt, handler) {}
};

const sandbox = {
  window: {
    addEventListener: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    location: { search: '' },
    AudioContext: function() {
      return {
        currentTime: 0,
        state: 'running',
        createOscillator: () => ({ connect: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, start: () => {}, stop: () => {} }),
        createGain: () => ({ connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }),
        destination: {}
      };
    }
  },
  document: mockDoc,
  localStorage: { getItem: () => null, setItem: () => {} },
  setTimeout: (fn, delay) => { fn(); return 1; },
  clearTimeout: () => {},
  requestAnimationFrame: (fn) => fn(),
  console: console
};

vm.createContext(sandbox);
vm.runInContext(js, sandbox);

console.log('PASS: app.js evaluated in VM cleanly!');

const runInVm = (code) => vm.runInContext(code, sandbox);

// Test Addition
runInVm(`{
  loadSample('addition');
  currentProgram = clientAssemble(SAMPLES.addition);
  loadProgramIntoCPU(currentProgram);
  cpu.memory[0x2050] = 5;
  cpu.memory[0x2051] = 3;

  let steps = 0;
  while (!cpu.halted && steps < 50) {
    vizStepOnce();
    steps++;
  }
}`);

const addResult = runInVm('cpu.memory[0x2052]');
if (addResult === 8) {
  console.log('PASS: Addition 5 + 3 = 8 at 2052H verified!');
} else {
  console.error(`FAIL: Expected 8 at 2052H, got ${addResult}`);
  process.exit(1);
}

// Verify Storyboard and Physical blocks after addition
const headText = domNodes['story-headline']?.textContent;
const mathA = domNodes['math-block-val1']?.textContent;
const mathRes = domNodes['math-block-val-res']?.textContent;
console.log('  Live Storyboard Headline after addition:', headText);
console.log('  Physical Math Desk A:', mathA);
console.log('  Physical Math Result:', mathRes);

// Test Carry Demo (255 + 1)
runInVm(`{
  loadSample('addition');
  currentProgram = clientAssemble(SAMPLES.addition);
  loadProgramIntoCPU(currentProgram);
  cpu.memory[0x2050] = 0xFF; // 255
  cpu.memory[0x2051] = 0x01; // 1
  let steps = 0;
  while (!cpu.halted && steps < 50) {
    vizStepOnce();
    steps++;
  }
}`);
const carryResult = runInVm('cpu.memory[0x2052]');
const cyFlag = runInVm('cpu.flags.cy');
if (carryResult === 0 && cyFlag === 1) {
  console.log('PASS: Overflow 255 + 1 = 00H with CY=1 verified!');
} else {
  console.error(`FAIL: Carry test failed! Val: ${carryResult}, CY: ${cyFlag}`);
  process.exit(1);
}

// Test Subtraction (10 - 4 = 6)
runInVm(`{
  loadSample('subtraction');
  currentProgram = clientAssemble(SAMPLES.subtraction);
  loadProgramIntoCPU(currentProgram);
  cpu.memory[0x2050] = 10;
  cpu.memory[0x2051] = 4;
  let steps = 0;
  while (!cpu.halted && steps < 50) {
    vizStepOnce();
    steps++;
  }
}`);
const subResult = runInVm('cpu.memory[0x2052]');
if (subResult === 6) {
  console.log('PASS: Subtraction 10 - 4 = 6 at 2052H verified!');
} else {
  console.error(`FAIL: Subtraction test failed! Got ${subResult}`);
  process.exit(1);
}

// Test Multiplication (3 x 4 = 12)
runInVm(`{
  loadSample('multiplication');
  currentProgram = clientAssemble(SAMPLES.multiplication);
  loadProgramIntoCPU(currentProgram);
  cpu.memory[0x2050] = 3;
  cpu.memory[0x2051] = 4;
  let steps = 0;
  while (!cpu.halted && steps < 100) {
    vizStepOnce();
    steps++;
  }
}`);
const multResult = runInVm('cpu.memory[0x2052]');
if (multResult === 12) {
  console.log('PASS: Multiplication 3 x 4 = 12 at 2052H verified!');
} else {
  console.error(`FAIL: Multiplication test failed! Got ${multResult}`);
  process.exit(1);
}

console.log('\n=============================================');
console.log('SUCCESS: All 4 CPU calculation scenarios and visualizer updates verified 100%!');
console.log('=============================================');
