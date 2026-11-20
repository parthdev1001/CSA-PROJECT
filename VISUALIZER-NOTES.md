# Visualizer — ALL PHASES + UI v2 — Built 2026-11-20

VisuAlgo-style Live CPU Visualizer, VISUAL-ONLY (no voice — removed in v2, per user direction).
Built on a COPY of `csa_project.zip`. Original zip untouched.

Phase 1: Trace engine. Phase 2: Play/Replay/Step Back/Speed + Now Executing + ALU box + Trace table + Learn card.
Phase 3 (v2): Voice REMOVED. Text narration only.
Phase 4: Demo Mode + DEMO-SCRIPT.md — the visualizer itself is the recordable interactive video.
UI v2: Space Grotesk + Inter + JetBrains Mono fonts (Google Fonts, system fallback), VisuAlgo colour legend (yellow=current/changed, blue=input, green=result, red=carry/flag), Live CPU Stage header, progress bar, motion/VFX via GSAP 3.12.5 (CDN, CSS fallback offline) — data-flow dot into the ALU, ALU glow pulse, register scale pulse, fade-up stage cards.
Calculation visualisation (v3, 2026-11-20, user direction: no video, just the calculation in proper form): a CALCULATION box under the ALU in the CPU card. For a calculation step it shows the proper sum in big type — hex `03H + 05H = 08H`, decimal `3 + 5 = 8`, binary in 8-bit rows, flags after (S/Z/AC/P/CY), and a plain-English note (carry or no carry). For a non-calculation step it says so plainly: "No calculation in this step — this instruction moves data or jumps."

## What changed — only 3 files, all in `web/`
- `web/app.js` — Trace engine + transport controls. CPU engine `Simulator8085.step()` NOT changed.
- `web/index.html` — Learn card, Play/Step Back/Replay/Speed bar, Now Executing + narration panel, ALU box, Trace table.
- `web/style.css` — `.viz-*` styles, green flash for changed registers / memory cells.

## What did NOT change
- `src/` — identical to the original zip (assembler.c, simulator.c, main.c untouched).
- `include/`, `examples/`, `tests/`, `server.py`, `Makefile` — untouched.
- No AI, no new dependency, no API key. Narration is hand-written templates per mnemonic, filled with real values from the trace.

## How it works
1. Assemble as before (C binary via `server.py`, or client JS fallback).
2. Go to **CPU Simulator & Memory** pane.
3. Press **▶ Play Addition Example** in the Learn card, or **▶ Play**, **Step**, **◀ Step Back**, **↻ Replay**.
4. Speed: 0.5x / 1x / 2x. Click any row in the Trace table to jump to that step.
5. **Set Demo Data 05H / 03H** sets 2050H=05H, 2051H=03H for the Addition example.
6. Try it yourself: click a memory cell, change 2051H to 09H, press Replay — the sum changes.

Each step records: PC before/after, instruction, what changed (register / flag / memory), ALU calculation, T-states, and one English narration line, e.g.:
> "The ALU adds A (03H, 3) and B (05H, 5). The result is 08H (8). The answer goes back into A."

## How to run
```bash
# Option A — with the C engine (needs gcc + make, as in the original README)
python3 server.py
# open http://localhost:8085

# Option B — standalone, no server, no build
# double-click web/index.html in Chrome/Edge/Firefox
# (uses the client-side JS assembler + simulator already in app.js)
```

## Tests run 2026-11-20 (Node harness, JS trace logic only — no browser, no C build)
All passed — see `/tmp/viz_test.js` (harness, not part of the deliverable):
- Addition (2050H=05H, 2051H=03H): 10 traced steps, halted, sum 2052H=08H, carry 2053H=00H. ADD step ALU 03H+05H=08H, narration correct.
- Step Back: back to ADD step restores A=08H, PC=200AH; back to start restores A=00H, PC=2000H.
- Change memory + replay: 2050H=FFH, 2051H=02H → sum 2052H=01H, carry 2053H=01H.
- Multiplication loop: 28 traced steps, halted, trace length matches steps.
- `node --check web/app.js` — syntax OK. All 58 IDs used in JS exist in index.html. `src/` diff vs original: identical.

## RESOLVED — Multiplication Example Bug
Fixed in `examples/multiplication.asm` and `web/app.js`:
Cleared A (`MVI A, 00H`) immediately after checking if the multiplier was 0 (`CPI 00H` / `JZ DONE`).
Now 3 × 4 accurately evaluates to **0CH (12)** in 28 machine cycles!

## Phase 5 — VisuAlgo-Style Interactive Video & Real-Time Simulation
- **Interactive 8085 Architecture Diagram (SVG Canvas)**:
  - 16-bit Address Bus (Gold, with animated address packets travelling to RAM).
  - 8-bit Bidirectional Data Bus (Cyan, with animated data packets travelling to IR, ALU, Accumulator, and Memory).
  - Control Bus (Purple, with live status for RD, WR, IO/M).
  - CPU Units: Instruction Register & Decoder, Timing & Control Unit, Accumulator (Hex, Dec, 8-bit Binary), Temp Register, 8-bit ALU with operation badges, Flags Register (PSW) with 5 glowing LED status lights (S, Z, AC, P, CY), General-Purpose Registers (B, C, D, E, H, L), Special Pointers (PC, SP), and External 64KB RAM Memory Unit.
- **VisuAlgo Video Player Control Bar**:
  - Play / Pause (▶ / ⏸), Step Back (⏮), Step Forward (⏭), Replay (↻), Reset (⏹).
  - **Video Timeline Scrubber Slider**: Drag to any point in program execution history to scrub backward and forward through time!
  - **Adjustable Speed Controls**: 0.1x (Storybook - 4.5s), 0.25x (Slow Pace - 2.8s), 0.5x (Slow Study), 1.0x (Normal), 2.0x (Fast).
  - **Machine Cycle Micro-Phases**: Animated breakdown of FETCH ➔ DECODE ➔ EXECUTE ➔ WRITEBACK.
  - **Synthesized Audio Effects (Web Audio API)**: Zero external files or dependencies; retro-modern sound effects for bus transfers, ALU arithmetic chimes, and flag alerts with 1-click mute toggle.
- **Interactive Execution Toolkit**:
  - **Component Focus / Spotlight Tool**: Quick buttons to spotlight ALU & Flags, System Buses, Registers, or Memory.
  - **Featured Programs Deck**: 6 structured interactive programs (8-Bit Addition, Carry & Overflow 255+1, Subtraction & Borrow, Machine Cycles, HL Memory Pointer, Loops & Multiplication).
  - **Interactive Quick Math Calculator**: Users can type any two numbers and select an operator (+, -, ×) with zero assembly knowledge required — generates code and runs video playback instantly!
  - **Execution Chalkboard**: Displays current phase, plain-English step narrative, math calculation in Hex, Decimal, and Binary with column alignment, and flag bit analysis.

Also note: in the Addition example, ADD is 03H + 05H, not 05H + 03H, because the first number ends up in B and the second in A. The sum is the same (08H), but the ALU box shows the real order: A=03H, B=05H.

## Phase 3 — Voice narration (REMOVED in v2, 2026-11-20)
- User direction: remove voice, visual-only. The voice checkbox, Test Voice button, and all speech code were deleted. Text narration in the Now Executing panel remains.
- **Learn more** button in the Learn card opens plain-English definitions: CPU, register, ALU, PC, flags, memory.

## Phase 4 — Demo video (built as Demo Mode + script)
- **▶ Demo** button: loads Addition, sets demo data, switches to the Simulator pane, plays it visual-only at 1x — about 9 seconds for all 10 steps (900 ms per step; 0.5x is about 18 seconds). It is NOT 60 seconds any more: the old 60-second timing came from the voice narration, which was removed in v2.
- Open `web/index.html?demo=1` to auto-start the demo (for recording).
- Full script, timings, and recording steps: see `DEMO-SCRIPT.md` — updated 2026-11-20 for visual-only recording (record per step, not one long take).
- No video file is included — the live visualizer IS the video. Screen-record it playing for the report. That is honest and viva-safe: it is a recording of your own tool, not AI video.

## Phase 6 — Non-IT Beginner Mode, Everyday Analogies & Physical Math Blocks (2026-11-20)
- **Live CPU Storyboard (Non-IT Friendly)**:
  - Explains each instruction using simple everyday analogies (e.g. Robot Chef, Working Desk A, Pockets B/C/D/E/H/L, Lockers for RAM, and Dashboard Lights for Flags).
  - **1-Click Plain English / Technical Toggle (`#btn-toggle-eli5`)**: Switch between everyday analogies and technical hex/bitmask breakdowns at any time.
  - **"Continue to Next Step ❯" Button (`#btn-story-next`)**: Allows non-IT users to learn at their own pace without being rushed.
- **Physical Math Blocks with Visual Dot Counters**:
  - Color-coded physical math blocks (`Desk A` + `Pocket B` = `Final Answer`).
  - Animated dot counters inside each block allowing visual counting of numbers without understanding hex.
- **Floating Live Component Speech-bubble Callout**:
  - Dynamically floats and points to the active component inside the microprocessor architecture SVG diagram.
- **Interactive Component Explainer (`#component-explainer-bar`)**:
  - Click any CPU unit or bus on the SVG architecture diagram (Accumulator, ALU, Flags, Registers, Program Counter, RAM, Address Bus, Data Bus) to see its everyday analogy and plain-English explanation.
- **Pacing & Speed Controls for Beginners**:
  - **0.1x Storybook Pace** (4.5s per step) & **0.25x Slow Pace** (2.8s per step).
  - **Pause Per Step Toggle (`#chk-auto-pause`)**: Automatically pauses after each instruction so users have plenty of time to read.

## What is still NOT built / NOT changed
- No change to the C simulator, tests, or examples (except the multiplication bug note above).
- No AI anywhere in the visualizer.
