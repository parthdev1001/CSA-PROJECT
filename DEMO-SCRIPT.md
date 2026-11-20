# Demo Video — Script (Phase 4, visual-only, updated 2026-11-20)

The visualizer IS the video. Do not generate an AI video of a fake CPU.
Screen-record the visualizer itself while it plays. There is NO voice any more —
the user removed it in UI v2. Text narration only, shown in the Now Executing panel.

## Timing — read this first, it changed when voice was removed

- ▶ Demo plays the 10-step Addition program in about **9 seconds at 1x**
  (900 ms per step), about **18 seconds at 0.5x**, about **4.5 seconds at 2x**.
- It is NOT 60 seconds any more. The old "60 sec" timing came from the voice
  narration, which paced each step while it spoke. Without voice the steps fly by.
- So do NOT record ▶ Demo as one continuous take and expect a 60–95 second
  video. Record **one short clip per instruction** (Claude's recommendation):
  press Step, hold the frame 2–3 seconds so the caption can be read, then Step
  again. Or press Play and Pause between steps. Edit the clips together in
  CapCut — that is how you reach 60–95 seconds for Video 1.

## How to record (OBS, free — default; Game Bar is only a backup)

1. Run the project: `python3 server.py` → open http://localhost:8085
   (or double-click `web/index.html` — standalone mode also works)
2. Go to **CPU Simulator & Memory**.
3. Set Speed to **0.5x** (slow) for recording — you get 1.8 seconds per step
   instead of 0.9, and you can still pause between steps.
4. OBS: Window Capture, 1920×1080, 30fps, MP4. Do a 10-second test recording
   first (Job Zero) and watch it back before the real takes.
5. Click **Set Demo Data 05H / 03H** first, so 2050H=05H and 2051H=03H.
   Without this the Addition program adds 00H + 00H and the sum is 00H.
6. Rehearse the whole sequence twice WITHOUT recording. Do not record until
   three dry runs in a row give sum 08H, carry 00H.
7. Record per step (see the table). Stop when the CPU shows HALTED.

## Script — what the viewer sees (Addition, 10 steps, visual only)

The narration column is the text in the **Now Executing** panel on each step.
Use that exact text as the on-screen caption for that clip (at least 36pt,
never covering the registers). Nothing is spoken.

| Step | On screen | Caption (Now Executing text) |
|---|---|---|
| 0:00–0:05 | Learn card + empty CPU, all registers 00H | "Welcome to the 8085 Visualizer. This program adds two numbers stored in memory. Press Play, and watch the CPU do it step by step." |
| Step 1: MVI C, 00H — C flashes | C now holds 00H. C will store the carry. | "The value 00H moves into register C. C now holds 00H. C will store the carry." |
| Step 2: LDA 2050H — A becomes 05H | A loads the number stored at memory 2050H. That number is 05H, 5. | "A loads the number stored at memory 2050H. That number is 05H, 5." |
| Step 3: MOV B, A — B becomes 05H | Register B copies the value from A. B now holds 05H. | "Register B copies the value from A. B now holds 05H." |
| Step 4: LDA 2051H — A becomes 03H | A loads the number stored at memory 2051H. That number is 03H, 3. | "A loads the number stored at memory 2051H. That number is 03H, 3." |
| Step 5: ADD B — ALU box shows 03H + 05H = 08H, A flashes | The ALU adds A and B. Three plus five is eight. The answer goes back into A. | "The ALU adds A and B. Three plus five is eight. The answer goes back into A." |
| Step 6: JNC NOCARRY — PC jumps to 200EH | JNC means jump if Carry is 0. Carry flag is 0, so the jump is taken. The CPU jumps to 200EH. | "JNC means jump if Carry is 0. Carry flag is 0, so the jump is taken. The CPU jumps to 200EH." |
| Steps 7–9: STA 2052H, MOV A,C, STA 2053H — memory cells flash 08H, 00H | A is stored into memory 2052H. The sum is now saved. … The carry is now saved at 2053H. | "A is stored into memory 2052H. The sum is now saved. … The carry is now saved at 2053H." |
| Step 10: HLT — status HALTED, summary | Halt. The program stops. Sum 08H, carry 00H. | "Halt. The program stops. Sum 08H, carry 00H." |

Note on the ADD step: the real program loads the first number into B and the
second into A, so the ALU shows 03H + 05H = 08H, not 05H + 03H. The sum is the
same (08H). Do not "correct" the caption to five-plus-three — the trace is right.

## Try-it-yourself ending (optional, +20 sec)

After HALTED, click a memory cell, change 2051H to 09H, press **↻ Replay**.
The ALU now shows 03H + 09H = 0CH. Caption: "Change the number, press Replay,
and you get a different answer — because this is really calculating, not a
fixed video."

## Captions

The narration text is shown in the **Now Executing** panel on every step. Use
that text as the captions/subtitles. It is text on screen, not a voiceover.

## What NOT to do

- Do not look for a voice toggle — there is not one any more. Do not add a
  voiceover over the viva version unless the group decides to.
- Do not add background music over the captions in the viva version.
- Do not claim the video is AI-generated. It is a screen recording of your own tool.
- Do not record the Multiplication example for the report until the bug in
  VISUALIZER-NOTES.md is fixed — it gives 10H for 3×4.
- Video 1 is Addition only. The carry case (FFH + 01H) is Video 2, recorded
  separately after Video 1 is done — and it is "carry", not "overflow":
  the 8085 has no overflow flag.
