const fs = require('fs');
const assert = require('assert');

console.log("=== Testing 8085 AI Voice Agent Narrator ===");

const appJs = fs.readFileSync('web/app.js', 'utf8');
const indexHtml = fs.readFileSync('web/index.html', 'utf8');
const styleCss = fs.readFileSync('web/style.css', 'utf8');

// 1. Verify HTML controls exist
console.log("Check 1: HTML Controls...");
assert(indexHtml.includes('id="btn-voice-toggle"'), 'Missing btn-voice-toggle');
assert(indexHtml.includes('id="btn-voice-repeat"'), 'Missing btn-voice-repeat');
assert(indexHtml.includes('id="btn-voice-mute"'), 'Missing btn-voice-mute');
assert(indexHtml.includes('id="voice-select"'), 'Missing voice-select');
assert(indexHtml.includes('id="voice-speed-slider"'), 'Missing voice-speed-slider');
assert(indexHtml.includes('id="voice-unavailable-msg"'), 'Missing voice-unavailable-msg');
assert(indexHtml.includes('Voice unavailable on this PC — visual mode only'), 'Missing unavailable text');
assert(indexHtml.includes('id="story-voice-speaking-pill"'), 'Missing story-voice-speaking-pill');
assert(indexHtml.includes('Done! The answer is 8. It is in box 2052H. The carry is zero, so nothing spilled over.'), 'Missing halt headline');
console.log("  ✓ All HTML controls verified.");

// 2. Verify CSS styles exist
console.log("Check 2: CSS Styles...");
assert(styleCss.includes('.btn-voice'), 'Missing .btn-voice');
assert(styleCss.includes('.btn-voice.off'), 'Missing .btn-voice.off');
assert(styleCss.includes('.voice-toolbar-row'), 'Missing .voice-toolbar-row');
assert(styleCss.includes('.voice-status-pill'), 'Missing .voice-status-pill');
assert(styleCss.includes('.story-voice-pill'), 'Missing .story-voice-pill');
console.log("  ✓ All CSS styles verified.");

// 3. Test exact Addition sentences and formatSpeechText
console.log("Check 3: Fixed Story Sentences & Speech Formatter...");

// Mock browser globals for app.js isolation testing
const mockWindow = {
  speechSynthesis: {
    getVoices: () => [
      { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US', default: true },
      { name: 'Microsoft Guy Online (Natural) - English (United States)', lang: 'en-US' },
      { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US' }
    ],
    speak: () => {},
    cancel: () => {}
  }
};

const vm = require('vm');
const sandbox = {
  window: mockWindow,
  localStorage: {
    data: {},
    getItem(k) { return this.data[k] ?? null; },
    setItem(k, v) { this.data[k] = String(v); }
  },
  document: {
    getElementById: () => ({ style: {}, addEventListener: () => {}, appendChild: () => {} }),
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
vm.createContext(sandbox);

// Extract the voice narrator functions from app.js to run in sandbox
vm.runInContext(`
  let currentSampleKey = 'addition';
  let cpu = { halted: false, memory: { 0x2052: 8, 0x2053: 0 }, a: 0 };
`, sandbox);

// Extract functions
const startIdx = appJs.indexOf('let voiceEnabled = true;');
const endIdx = appJs.indexOf('const VIZ_REG_NAMES =');
const fnDefs = appJs.slice(startIdx, endIdx);
vm.runInContext(fnDefs, sandbox);

const expectedSentences = [
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

const sentencesInCode = vm.runInContext('ADDITION_STORY_SENTENCES', sandbox);
assert.strictEqual(sentencesInCode.length, 10, 'Must have exactly 10 sentences for addition');
for (let i = 0; i < 10; i++) {
  assert.strictEqual(sentencesInCode[i], expectedSentences[i], `Sentence ${i+1} mismatch! Expected "${expectedSentences[i]}", got "${sentencesInCode[i]}"`);
}
console.log("  ✓ All 10 Addition storyboard sentences match word-for-word!");

const expectedHalt = "Done! The answer is 8. It is in box 2052H. The carry is zero, so nothing spilled over.";
const haltInCode = vm.runInContext('ADDITION_HALT_SENTENCE', sandbox);
assert.strictEqual(haltInCode, expectedHalt, 'Halt sentence mismatch!');
console.log("  ✓ Addition halt sentence matches word-for-word!");

// 4. Test formatSpeechText output
console.log("Check 4: formatSpeechText validation...");

const formatSpeechText = vm.runInContext('formatSpeechText', sandbox);
const getVoiceTeacherSentence = vm.runInContext('getVoiceTeacherSentence', sandbox);
const VOICE_RATES = vm.runInContext('VOICE_RATES', sandbox);
const currentVoiceRate = vm.runInContext('currentVoiceRate', sandbox);

// Step 5: "The calculator adds them: 3 plus 5 equals 8."
const spokenStep5 = formatSpeechText(sentencesInCode[4]);
console.log("  Step 5 formatted for voice:", spokenStep5);
assert(spokenStep5.includes('three plus five equals... eight'), 'Step 5 must speak numbers as words and pause before 8');

// Step 2: "Take 5 from box 2050H on the shelf and put it on the main desk, A."
const spokenStep2 = formatSpeechText(sentencesInCode[1]);
console.log("  Step 2 formatted for voice:", spokenStep2);
assert(spokenStep2.includes('Take five from box 2050 H on the shelf and put it on the main desk, A.'), 'Step 2 must say five and box 2050 H');

// Step 3: "Copy 5 to the helper desk, B, so we don't lose it."
const spokenStep3 = formatSpeechText(sentencesInCode[2]);
console.log("  Step 3 formatted for voice:", spokenStep3);
assert(spokenStep3.includes('Copy five to the helper desk, B, so we don\'t lose it.'), 'Step 3 must say five');

// Step 4: "Take 3 from box 2051H and put it on the main desk, A."
const spokenStep4 = formatSpeechText(sentencesInCode[3]);
console.log("  Step 4 formatted for voice:", spokenStep4);
assert(spokenStep4.includes('Take three from box 2051 H and put it on the main desk, A.'), 'Step 4 must say three and box 2051 H');

// Step 7: "Put the answer, 8, into box 2052H, so it is saved."
const spokenStep7 = formatSpeechText(sentencesInCode[6]);
console.log("  Step 7 formatted for voice:", spokenStep7);
assert(spokenStep7.includes('Put the answer, eight, into box 2052 H, so it is saved.'), 'Step 7 must say eight and box 2052 H');

// Step 10: "Stop. The story is finished. The answer is 8."
const spokenStep10 = formatSpeechText(sentencesInCode[9]);
console.log("  Step 10 formatted for voice:", spokenStep10);
assert(spokenStep10.includes('answer is... eight'), 'Step 10 must say answer is... eight with pause');

// Halt sentence
const spokenHalt = formatSpeechText(haltInCode);
console.log("  Halt formatted for voice:", spokenHalt);
assert(spokenHalt.includes('answer is... eight'), 'Halt must say answer is... eight');
assert(spokenHalt.includes('box 2052 H'), 'Halt must pronounce box 2052 H');

// Test register A replacement in dynamic text:
const sampleRegA = "Move byte into Register A.";
const spokenRegA = formatSpeechText(sampleRegA);
assert(!spokenRegA.includes('Register A') && spokenRegA.includes('the main desk, A'), 'Must never say Register A in voice');
console.log("  ✓ Register A correctly converted to 'the main desk'");

// 5. Check voice speed rates
console.log("Check 5: Voice speeds...");
assert.deepStrictEqual([...VOICE_RATES], [0.8, 0.95, 1.15], 'Voice rates must be 0.8, 0.95, 1.15');
assert.strictEqual(currentVoiceRate, 0.95, 'Default rate must be 0.95 (teacher pace)');
console.log("  ✓ Voice speeds verified: Slow (0.8x), Normal (0.95x), Fast (1.15x)");

// 6. Test Mercury offline fallback
console.log("Check 6: Mercury offline / unconfigured fallback...");
(async () => {
  const step = { step: 5, mnemonic: 'ADD', operands: 'B', after: { a: 8, flags: { cy: 0, z: 0 } }, alu: { op1: 3, op2: 5, result: 8 } };
  const res = await getVoiceTeacherSentence(step);
  assert.strictEqual(res, "The calculator adds them: 3 plus 5 equals 8.", 'With Mercury off, must return fixed sentence exactly');
  console.log("  ✓ Mercury offline fallback returns exact fixed sentence:", res);
  console.log("\nALL UNIT & SPECIFICATION TESTS PASSED SUCCESSFULLY!");
})();
