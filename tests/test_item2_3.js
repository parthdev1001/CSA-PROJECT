const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('web/app.js', 'utf8');
const elements = {};
function createMockEl(id) {
  return {
    id: id || '',
    textContent: '',
    innerHTML: '',
    value: '',
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    addEventListener: () => {},
    querySelectorAll: () => []
  };
}

const sandbox = {
  document: {
    getElementById: (id) => {
      if (!elements[id]) elements[id] = createMockEl(id);
      return elements[id];
    },
    querySelectorAll: () => [],
    querySelector: () => createMockEl(),
    createElement: () => createMockEl(),
    addEventListener: () => {}
  },
  window: {
    addEventListener: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    location: { search: '' }
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  navigator: {},
  console: console,
  setTimeout: (fn) => fn(),
  clearTimeout: () => {}
};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const runInVm = (src) => vm.runInContext(src, sandbox);

console.log('Testing new samples assembly...');
const samples = runInVm('SAMPLES');
for (const key of ['factorial', 'sixteen_bit_add', 'stack_demo']) {
  const src = samples[key];
  if (!src) throw new Error('Missing sample: ' + key);
  const prog = runInVm(`clientAssemble(SAMPLES['${key}'])`);
  if (prog.total_errors > 0) {
    throw new Error('Sample ' + key + ' has errors: ' + JSON.stringify(prog.lines.filter(l => l.error)));
  }
  console.log('PASS: Sample ' + key + ' assembled with ' + prog.total_bytes + ' bytes, 0 errors!');
}

// Test stack demo execution
const resStack = runInVm(`
  (function() {
    const p = clientAssemble(SAMPLES.stack_demo);
    loadProgramIntoCPU(p);
    let s = 0;
    while (!cpu.halted && s < 100) { cpu.step(); s++; }
    return { steps: s, val2050: cpu.memory[0x2050], sp: cpu.sp };
  })()
`);
if (resStack.val2050 !== 0x0E) {
  throw new Error('Stack demo expected 0EH at 2050H, got ' + resStack.val2050);
}
console.log('PASS: Stack demo executed in ' + resStack.steps + ' steps, result at 2050H = 0EH (14 decimal)!');

// Test 16-bit add execution
const res16 = runInVm(`
  (function() {
    const p = clientAssemble(SAMPLES.sixteen_bit_add);
    loadProgramIntoCPU(p);
    cpu.memory[0x2050] = 0x34; cpu.memory[0x2051] = 0x12;
    cpu.memory[0x2052] = 0x21; cpu.memory[0x2053] = 0x43;
    let s = 0;
    while (!cpu.halted && s < 100) { cpu.step(); s++; }
    const sum = cpu.memory[0x2054] | (cpu.memory[0x2055] << 8);
    const cy = cpu.memory[0x2056];
    return { steps: s, sum, cy };
  })()
`);
if (res16.sum !== 0x5555 || res16.cy !== 0) {
  throw new Error('16-bit add expected 5555H, got ' + res16.sum.toString(16) + 'H');
}
console.log('PASS: 16-bit add (DAD) executed cleanly! 1234H + 4321H = ' + res16.sum.toString(16) + 'H (Carry=' + res16.cy + ')!');

// Test factorial execution
const resFact = runInVm(`
  (function() {
    const p = clientAssemble(SAMPLES.factorial);
    loadProgramIntoCPU(p);
    cpu.memory[0x2050] = 0x04; // 4! = 24
    let s = 0;
    while (!cpu.halted && s < 300) { cpu.step(); s++; }
    return { steps: s, val2051: cpu.memory[0x2051] };
  })()
`);
if (resFact.val2051 !== 24) {
  throw new Error('Factorial 4! expected 24 (18H), got ' + resFact.val2051);
}
console.log('PASS: Factorial calculation (4! = 24 / 18H) verified 100%!');

// Test syntax highlight function
const html = runInVm(`highlight8085("START: MVI A, 05H ; load 5")`);
if (!html.includes('tok-label') || !html.includes('tok-mnemonic') || !html.includes('tok-comment') || !html.includes('tok-num')) {
  throw new Error('Highlight failed: ' + html);
}
console.log('PASS: highlight8085 produces syntax tokens correctly!');
console.log('Sample highlighted HTML:', html);

// Test branch crossroads decision card
runInVm(`
  (function() {
    const fakeStepTaken = {
      mnemonic: 'JNZ',
      operands: 'LOOP',
      pcBefore: 0x2005,
      pcAfter: 0x2000,
      bytes: 'C2 00 20',
      before: { flags: { z: 0, cy: 0, s: 0, p: 0 } },
      after: { flags: { z: 0, cy: 0, s: 0, p: 0 }, a: 1, b: 2, c: 3 }
    };
    updateBranchDecision(fakeStepTaken, 'JNZ', 'LOOP');
    const branchEl = document.getElementById('story-branch-decision');
    if (!branchEl.innerHTML.includes('DETOUR TAKEN') || !branchEl.innerHTML.includes('Branch Crossroads (JNZ)')) {
      throw new Error('Branch decision fork failed: ' + branchEl.innerHTML);
    }
  })()
`);
console.log('PASS: updateBranchDecision renders visual fork decision card with taken path!');
