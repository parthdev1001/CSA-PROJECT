const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log("=================================================================");
console.log("  RUNNING COMPLETE 8085 VOICE AGENT NARRATOR SIMULATION TEST");
console.log("=================================================================");

const appJs = fs.readFileSync('web/app.js', 'utf8');

// Recorded speech utterances
const spokenUtterances = [];
let speechCancelledCount = 0;

class MockUtterance {
  constructor(text) {
    this.text = text;
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.voice = null;
    this.onend = null;
    this.onerror = null;
  }
}

const mockVoices = [
  { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US', default: true },
  { name: 'Microsoft Jenny Online (Natural) - English (United States)', lang: 'en-US' },
  { name: 'Microsoft Guy Online (Natural) - English (United States)', lang: 'en-US' },
  { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US' }
];

const mockElements = {};
function getOrCreateMockElement(id) {
  if (!mockElements[id]) {
    mockElements[id] = {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
      style: { display: 'block' },
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); },
        toggle(c, force) {
          if (force !== undefined) {
            if (force) this.classes.add(c);
            else this.classes.delete(c);
          } else {
            if (this.classes.has(c)) this.classes.delete(c);
            else this.classes.add(c);
          }
        }
      },
      listeners: {},
      addEventListener(event, fn) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(fn);
      },
      dispatchEvent(event, data) {
        (this.listeners[event] || []).forEach(fn => fn(data || { target: this }));
      },
      querySelectorAll: () => [],
      querySelector: () => null,
      closest: () => null,
      appendChild(child) {
        if (!this.children) this.children = [];
        this.children.push(child);
      }
    };
  }
  return mockElements[id];
}

const sandbox = {
  window: {
    speechSynthesis: {
      getVoices: () => mockVoices,
      speak: (utt) => {
        spokenUtterances.push(utt);
        // Automatically trigger onend asynchronously to simulate realistic speech completion
        setTimeout(() => {
          if (utt.onend) utt.onend();
        }, 10);
      },
      cancel: () => {
        speechCancelledCount++;
      }
    },
    location: { search: '' }
  },
  SpeechSynthesisUtterance: MockUtterance,
  document: {
    body: { appendChild: () => {}, removeChild: () => {} },
    getElementById: (id) => getOrCreateMockElement(id),
    querySelector: () => null,
    querySelectorAll: () => [],
    documentElement: { setAttribute: () => {} },
    createElement: (tag) => ({
      tag,
      style: {},
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      addEventListener: () => {},
      remove: () => {}
    }),
    addEventListener: () => {}
  },
  localStorage: {
    data: {},
    getItem(k) { return this.data[k] ?? null; },
    setItem(k, v) { this.data[k] = String(v); }
  },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  parseInt: parseInt,
  parseFloat: parseFloat,
  Math: Math,
  Set: Set,
  Array: Array,
  Object: Object,
  String: String
};

vm.createContext(sandbox);

// Execute app.js in sandbox
try {
  vm.runInContext(appJs, sandbox);
  console.log("✓ Successfully loaded and executed web/app.js in sandbox.");
} catch (e) {
  console.error("Error executing app.js:", e);
  process.exit(1);
}

// Helper to evaluate in VM context
const evaluate = (expr) => vm.runInContext(expr, sandbox);

// 1. Initialize UI and Voice Synthesis
console.log("\n[TEST 1] Initializing Voice Synthesis...");
evaluate('setupVideoControls()');
evaluate('initVoiceSynthesis()');

const voiceBtn = getOrCreateMockElement('btn-voice-toggle');
const voiceLabel = getOrCreateMockElement('voice-toggle-label');
const voiceSelect = getOrCreateMockElement('voice-select');
const speedVal = getOrCreateMockElement('voice-speed-val');

assert.strictEqual(evaluate('voiceEnabled'), true, "Voice must be enabled (ON) by default on first visit");
assert(voiceBtn.classList.contains('active'), "Voice button must have active class");
assert.strictEqual(voiceLabel.textContent, "Voice: ON", "Voice button label must be Voice: ON");
assert(evaluate('selectedVoice') && evaluate('selectedVoice.name').includes('Aria'), "Best natural voice (Aria) should be auto-selected");
assert.strictEqual(evaluate('currentVoiceRate'), 0.95, "Default teacher speed must be 0.95");
assert.strictEqual(speedVal.textContent, "Normal (0.95x)", "Speed label must show Normal (0.95x)");
console.log("✓ Default settings verified: Voice ON, Microsoft Aria (Natural), Speed Normal (0.95x)");

// 2. Setup Addition program
console.log("\n[TEST 2] Setting up Addition program...");
evaluate(`
  loadSample('addition');
  currentProgram = clientAssemble(SAMPLES.addition);
  loadProgramIntoCPU(currentProgram);
  vizPresetDemoData();
`);

assert.strictEqual(evaluate('cpu.memory[0x2050]'), 0x05, "Operand 1 must be 5 at 2050H");
assert.strictEqual(evaluate('cpu.memory[0x2051]'), 0x03, "Operand 2 must be 3 at 2051H");
console.log("✓ Addition program assembled and memory seeded: 2050H=05H, 2051H=03H");

// 3. Step through all 10 steps and test voice output & synchronization
console.log("\n[TEST 3] Stepping through 10 instructions of Addition...");

const expected10Sentences = [
  "We start with an empty carry box. C holds zero.",
  "Take 5 from box 2050H on the shelf and put it on the main desk, A.",
  "Copy 5 to the helper desk, B, so we don't lose it.",
  "Take 3 from box 2051H and put it on the main desk, A.",
  "The calculator adds them: 3 plus 5 equals 8.",
  "Carry is zero, so we jump to NOCARRY. Nothing spilled over.",
  "Put the answer, 8, into box 2052H, so it is saved.",
  "A now holds the carry, which is zero. The answer is safe in box 2052H.",
  "Put the carry, zero, into box 2053H.",
  "Stop. The story is finished. The answer is 8."
];

(async () => {
  for (let i = 0; i < 10; i++) {
    spokenUtterances.length = 0; // Clear previous
    const step = evaluate('vizStepOnce()');
    assert(step, `Step ${i+1} must execute successfully`);
    
    // Check on-screen storyboard headline
    const headline = getOrCreateMockElement('story-headline').textContent;
    assert.strictEqual(headline, expected10Sentences[i], `Step ${i+1} screen storyboard mismatch!`);

    // Give time for async speakText to dispatch
    await new Promise(r => setTimeout(r, 20));

    assert(spokenUtterances.length >= 1, `Step ${i+1} must trigger speech`);
    const utt = spokenUtterances[0];
    console.log(`  Step ${i+1} [${step.mnemonic} ${step.operands}]:`);
    console.log(`    Screen: "${headline}"`);
    console.log(`    Spoken: "${utt.text}"`);

    // Check specific pronunciation requirements
    if (i === 1) { // Step 2: "Take 5..."
      assert(utt.text.includes("Take five from box 2050 H"), "Step 2 must speak 'five' and 'box 2050 H'");
    } else if (i === 4) { // Step 5: "3 plus 5 equals 8"
      assert(utt.text.includes("three plus five equals... eight"), "Step 5 must speak 'three plus five equals... eight'");
    } else if (i === 6) { // Step 7: "Put the answer, 8..."
      assert(utt.text.includes("Put the answer, eight, into box 2052 H"), "Step 7 must speak 'eight' and 'box 2052 H'");
    } else if (i === 9) { // Step 10: "The answer is 8."
      assert(utt.text.includes("answer is... eight"), "Step 10 must say 'answer is... eight'");
    }
  }

  // 4. Verify Halt Card
  console.log("\n[TEST 4] Verifying Halt Card...");
  assert(evaluate('cpu.halted'), "CPU must be halted after 10 steps");
  const haltHead = getOrCreateMockElement('halt-headline').textContent;
  const expectedHalt = "Done! The answer is 8. It is in box 2052H. The carry is zero, so nothing spilled over.";
  assert.strictEqual(haltHead, expectedHalt, "Halt headline must match word-for-word");
  console.log(`  Halt card screen: "${haltHead}"`);

  // Wait for finish card speech
  await new Promise(r => setTimeout(r, 40));
  const lastSpoken = spokenUtterances[spokenUtterances.length - 1];
  console.log(`  Halt card spoken: "${lastSpoken.text}"`);
  assert(lastSpoken.text.includes("Done! The answer is... eight. It is in box 2052 H. The carry is zero, so nothing spilled over."),
    "Halt finish card must be spoken with pause and 'eight'");
  console.log("✓ All 10 steps and finish card speak in order, in sync with screen, with final answer spoken as 'eight'!");

  // 5. Test Repeat button
  console.log("\n[TEST 5] Testing Repeat button...");
  spokenUtterances.length = 0;
  evaluate('repeatCurrentStep()');
  await new Promise(r => setTimeout(r, 20));
  assert(spokenUtterances.length >= 1, "Repeat must re-trigger speech");
  console.log(`  Repeated utterance: "${spokenUtterances[0].text}"`);
  console.log("✓ Repeat button re-speaks current step successfully!");

  // 6. Test Mute button
  console.log("\n[TEST 6] Testing Mute button...");
  const initialCancelCount = speechCancelledCount;
  evaluate('cancelSpeech()');
  assert(speechCancelledCount > initialCancelCount, "cancelSpeech must invoke speechSynthesis.cancel()");
  assert.strictEqual(evaluate('isSpeakingStep'), false, "isSpeakingStep must be false after cancel");
  console.log("✓ Mute button instantly cancels speech via speechSynthesis.cancel()!");

  // 7. Test Voice toggle OFF
  console.log("\n[TEST 7] Testing Voice Toggle OFF (Silent Mode)...");
  evaluate('voiceEnabled = false; updateVoiceUI();');
  assert(voiceBtn.classList.contains('off'), "Voice button must have off class");
  assert.strictEqual(voiceLabel.textContent, "Voice: OFF", "Voice button label must be Voice: OFF");

  spokenUtterances.length = 0;
  // Step in silent mode
  evaluate('vizShowStep(2)'); // Jump to step 3
  await new Promise(r => setTimeout(r, 20));
  assert.strictEqual(spokenUtterances.length, 0, "No speech must be emitted when voice is OFF");
  console.log("✓ Voice OFF switches cleanly to silent mode, no errors, no utterances!");

  // 8. Test Speed Slider
  console.log("\n[TEST 8] Testing Voice Speed Slider...");
  const slider = getOrCreateMockElement('voice-speed-slider');
  
  // Test Slow (0.8x)
  slider.value = 0;
  slider.dispatchEvent('input', { target: { value: 0 } });
  assert.strictEqual(evaluate('currentVoiceRate'), 0.8, "Rate must be 0.8 for Slow");
  assert.strictEqual(speedVal.textContent, "Slow (0.8x)", "Label must show Slow (0.8x)");

  // Test Fast (1.15x)
  slider.value = 2;
  slider.dispatchEvent('input', { target: { value: 2 } });
  assert.strictEqual(evaluate('currentVoiceRate'), 1.15, "Rate must be 1.15 for Fast");
  assert.strictEqual(speedVal.textContent, "Fast (1.15x)", "Label must show Fast (1.15x)");

  // Test Normal (0.95x)
  slider.value = 1;
  slider.dispatchEvent('input', { target: { value: 1 } });
  assert.strictEqual(evaluate('currentVoiceRate'), 0.95, "Rate must be 0.95 for Normal");
  assert.strictEqual(speedVal.textContent, "Normal (0.95x)", "Label must show Normal (0.95x)");
  console.log("✓ Speed slider successfully switches between Slow (0.8x), Normal (0.95x), and Fast (1.15x)!");

  // 9. Test Voice Selection Change
  console.log("\n[TEST 9] Testing Voice Picker...");
  voiceSelect.value = 'Microsoft Jenny Online (Natural) - English (United States)';
  voiceSelect.dispatchEvent('change');
  assert.strictEqual(evaluate('selectedVoice.name'), 'Microsoft Jenny Online (Natural) - English (United States)', "Selected voice must update");
  console.log("✓ Voice picker successfully changed active voice to Jenny (Natural)!");

  console.log("\n=================================================================");
  console.log("  ALL TESTS PASSED WITH 100% SUCCESS!");
  console.log("=================================================================\n");
})();
