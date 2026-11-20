// 8085 Assembler & Microprocessor Studio Client Logic

const SAMPLES = {
  addition: `; 8-Bit Addition with Carry
ORG 2000H
START:  MVI C, 00H       ; Clear C register for carry
        LDA 2050H        ; Load first operand
        MOV B, A         ; Store in B
        LDA 2051H        ; Load second operand
        ADD B            ; A = A + B
        JNC NOCARRY      ; Jump if no carry
        INR C            ; Increment carry
NOCARRY:STA 2052H        ; Store sum
        MOV A, C
        STA 2053H        ; Store carry
        HLT
        END`,

  subtraction: `; 8-Bit Subtraction with Borrow
ORG 2000H
START:  MVI C, 00H       ; Clear C for borrow
        LDA 2050H        ; Minuend
        MOV B, A
        LDA 2051H        ; Subtrahend
        MOV D, A
        MOV A, B
        SUB D            ; A = A - D
        JNC NOBORROW
        INR C            ; Borrow occurred
NOBORROW:STA 2052H       ; Store difference
        MOV A, C
        STA 2053H        ; Store borrow
        HLT
        END`,

  multiplication: `; 8-Bit Multiplication by Repeated Addition
ORG 2000H
START:  MVI D, 00H       ; High byte of product
        LDA 2050H        ; Multiplicand
        MOV B, A
        LDA 2051H        ; Multiplier
        MOV C, A
        CPI 00H          ; Check if multiplier is 0
        JZ DONE          ; If multiplier is 0, exit
        MVI A, 00H       ; Clear Accumulator for repeated addition (product low)
MULT:   ADD B            ; Add multiplicand
        JNC SKIP
        INR D            ; Increment high byte
SKIP:   DCR C            ; Decrement counter
        JNZ MULT
DONE:   STA 2052H        ; Product low
        MOV A, D
        STA 2053H        ; Product high
        HLT
        END`,

  largest: `; Find Largest Number in an Array
ORG 2000H
START:  LDA 204FH        ; Count of numbers
        MOV C, A
        DCR C            ; Count - 1
        LXI H, 2050H     ; Point to array start
        MOV A, M         ; Initialize max
LOOP:   INX H
        CMP M            ; Compare A with [HL]
        JNC NEXT         ; If A >= M, continue
        MOV A, M         ; New maximum
NEXT:   DCR C
        JNZ LOOP
        STA 2060H        ; Store maximum
        HLT
        END`,

  bubble_sort: `; Bubble Sort (Ascending Order)
ORG 2000H
START:  LDA 204FH        ; Count N
        DCR A
        MOV B, A         ; Outer counter
OUTER:  LDA 204FH
        DCR A
        MOV C, A         ; Inner counter
        LXI H, 2050H     ; Pointer to array
INNER:  MOV A, M
        INX H
        CMP M
        JC NO_SWAP       ; [HL] < [HL+1]
        JZ NO_SWAP
        ; Swap
        MOV D, M
        MOV M, A
        DCX H
        MOV M, D
        INX H
NO_SWAP:DCR C
        JNZ INNER
        DCR B
        JNZ OUTER
        HLT
        END`,

  fibonacci: `; Fibonacci Series Generator
ORG 2000H
START:  LDA 204FH        ; Number of terms
        MOV C, A
        LXI H, 2050H
        MVI A, 00H       ; F0 = 0
        MOV M, A
        INX H
        DCR C
        JZ DONE
        MVI B, 01H       ; F1 = 1
        MOV M, B
        INX H
        DCR C
        JZ DONE
FIB:    MOV A, B
        ADD D
        MOV D, B
        MOV B, A
        MOV M, A
        INX H
        DCR C
        JNZ FIB
DONE:   HLT
        END`,

  block_transfer: `; Block Transfer of Data
ORG 2000H
START:  LXI H, 2050H     ; Source address
        LXI D, 2070H     ; Destination address
        MVI C, 05H       ; Count
XFER:   MOV A, M
        STAX D
        INX H
        INX D
        DCR C
        JNZ XFER
        HLT
        END`,

  factorial: `; Factorial Calculation (N!)
; Computes N! for value at 2050H and stores answer at 2051H
ORG 2000H
START:  LDA 2050H        ; Load N
        CPI 00H          ; Check if N == 0
        JNZ CALC
        MVI A, 01H       ; 0! = 1
        STA 2051H
        HLT
CALC:   MOV C, A         ; Counter C = N
        MVI A, 01H       ; Initialize product = 1
FACT:   MOV B, A         ; B = previous product (multiplicand)
        MVI A, 00H       ; Clear Accumulator for repeated addition
        MOV D, C         ; Multiplier count D = C
MULT:   ADD B            ; Add multiplicand
        DCR D
        JNZ MULT
        DCR C            ; Decrement counter
        JNZ FACT
        STA 2051H        ; Store final N! at 2051H
        HLT
        END`,

  sixteen_bit_add: `; 16-Bit Addition Using DAD (1234H + 4321H = 5555H)
; Self-contained: loads numbers into memory and computes 16-bit sum in HL
ORG 2000H
START:  LXI H, 1234H     ; First 16-bit number
        SHLD 2050H       ; Store at 2050H-2051H
        LXI H, 4321H     ; Second 16-bit number
        SHLD 2052H       ; Store at 2052H-2053H
        LHLD 2050H       ; HL = 1234H
        XCHG             ; DE = 1234H
        LHLD 2052H       ; HL = 4321H
        DAD D            ; HL = 4321H + 1234H = 5555H
        SHLD 2054H       ; Store 16-bit sum at 2054H-2055H
        HLT
        END`,

  stack_demo: `; Subroutine & Stack Operations (CALL, RET, PUSH, POP)
; Demonstrates Stack Pointer (SP) preserving registers across a subroutine
ORG 2000H
START:  LXI SP, 20FFH    ; Initialize Stack Pointer to top of stack
        MVI B, 07H       ; Number to double (07H)
        CALL DOUBLE      ; Call subroutine (pushes return address)
        STA 2050H        ; Store result (0EH) at 2050H
        HLT

; Subroutine: DOUBLE (Computes A = B + B, preserving B via Stack)
DOUBLE: PUSH B           ; Push register pair BC onto stack
        MOV A, B
        ADD B            ; Double the number
        POP B            ; Restore register pair BC from stack
        RET              ; Return from subroutine (pops return address)
        END`
};

let currentSampleKey = 'addition';

const SAMPLE_STORIES = {
  addition: {
    title: "We are going to add 5 and 3",
    desc: "Watch the CPU take 5 from box 2050H into Main Desk A, copy it to Helper Desk B, take 3 from box 2051H into Desk A, add them in the Calculator (ALU), and store the answer 8 into box 2052H. If sum > 255, the Carry light turns on!",
    steps: 10
  },
  subtraction: {
    title: "We are going to subtract 4 from 10",
    desc: "Watch the CPU take 10 from box 2050H, take 4 from box 2051H, subtract them in the Calculator, and store the difference 6 in box 2052H. If we subtract a larger number, the Borrow/Carry light turns on!",
    steps: 12
  },
  multiplication: {
    title: "We are going to multiply 3 × 4 by repeated addition",
    desc: "The 8085 has no single MULT instruction! Watch the CPU repeatedly add 3 to itself 4 times using a loop, counting down in Helper Desk C until the product 12 (0CH) is ready in box 2052H.",
    steps: 25
  },
  largest: {
    title: "We are going to find the largest number in a list",
    desc: "Watch the CPU scan through an array of numbers using pointer pair HL, comparing each element against Main Desk A using CMP, and keeping whichever number is largest.",
    steps: 28
  },
  bubble_sort: {
    title: "We are going to sort numbers in ascending order",
    desc: "Watch the classic Bubble Sort algorithm run inside the 8085 CPU: nested loops comparing adjacent memory boxes and swapping them if out of order.",
    steps: 45
  },
  fibonacci: {
    title: "We are going to generate Fibonacci numbers",
    desc: "Watch the CPU compute the sequence 0, 1, 1, 2, 3, 5, 8... storing each term consecutively into storage boxes starting at 2050H.",
    steps: 30
  },
  block_transfer: {
    title: "We are going to transfer a block of data",
    desc: "Watch the CPU copy 5 bytes from source shelf boxes (2050H-2054H) to destination shelf boxes (2070H-2074H) using pointers HL and DE.",
    steps: 22
  },
  factorial: {
    title: "We are going to compute 4! = 24 (18H)",
    desc: "Watch the CPU compute factorial 4! = 4 × 3 × 2 × 1 = 24 (18H) using repeated addition loops, storing the final product at box 2051H.",
    steps: 35
  },
  sixteen_bit_add: {
    title: "We are going to add two 16-bit numbers: 1234H + 4321H",
    desc: "Watch the CPU load 1234H and 4321H, use the DAD D instruction to add them in a single cycle in register pair HL, producing 5555H, and save the result at 2054H.",
    steps: 9
  },
  stack_demo: {
    title: "Subroutine & Stack Operations (CALL, RET, PUSH, POP)",
    desc: "Watch the CPU push numbers onto the Notepad Stack at SP, jump to a subroutine with CALL, double 07H to 0EH, restore registers with POP, and return safely with RET.",
    steps: 10
  }
};

function showIntroCard(sampleKey) {
  const card = document.getElementById('prog-intro-card');
  const title = document.getElementById('intro-title');
  const desc = document.getElementById('intro-desc');
  const steps = document.getElementById('intro-steps');
  if (!card) return;

  const story = SAMPLE_STORIES[sampleKey] || {
    title: "Interactive 8085 Program Story",
    desc: "Watch the CPU fetch bytes from memory, decode machine instructions, and calculate in the ALU step-by-step.",
    steps: (typeof vizTotalSteps !== 'undefined' && vizTotalSteps) ? vizTotalSteps : 10
  };

  if (title) title.textContent = story.title;
  if (desc) desc.textContent = story.desc;
  if (steps) steps.textContent = `${(typeof vizTotalSteps !== 'undefined' && vizTotalSteps) ? vizTotalSteps : story.steps} scenes in this story`;
  card.style.display = 'block';
}

function hideIntroCard() {
  const card = document.getElementById('prog-intro-card');
  if (card) card.style.display = 'none';
}

function updateStepSceneFocus(step) {
  const blocks = ['node-ir', 'node-ctrl', 'node-acc', 'node-temp', 'node-alu', 'node-flags', 'node-regs', 'node-ptrs', 'node-mem'];
  if (!step) {
    blocks.forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('svg-dim', 'svg-focus'); }
    });
    return;
  }
  const m = (step.mnemonic || '').toUpperCase();
  const ops = step.operands || '';
  let active = [];
  if (step.alu || ['ADD', 'ADI', 'ADC', 'SUB', 'SUI', 'SBB', 'INR', 'DCR', 'CMP', 'CPI', 'ANA', 'ORA', 'XRA', 'DAD'].includes(m)) {
    active = ['node-acc', 'node-alu', 'node-flags'];
    if (ops.includes('B') || ops.includes('C') || ops.includes('D') || ops.includes('E') || ops.includes('H') || ops.includes('L')) {
      active.push('node-regs');
    }
    if (m === 'DAD') active.push('node-regs');
  } else if (m === 'LDA' || m === 'STA' || m === 'LHLD' || m === 'SHLD' || ops.includes('M')) {
    active = ['node-acc', 'node-mem', 'node-ptrs'];
  } else if (m === 'LXI') {
    active = ['node-regs', 'node-ptrs'];
  } else if (m === 'MOV' || m === 'MVI') {
    active = ['node-acc', 'node-regs'];
    if (ops.includes('M')) active.push('node-mem');
  } else if (m === 'PUSH' || m === 'POP' || m === 'CALL' || m === 'RET') {
    active = ['node-ptrs', 'node-mem', 'node-regs'];
  } else if (m.startsWith('J')) {
    active = ['node-ptrs', 'node-flags'];
  } else if (m === 'HLT') {
    active = ['node-ctrl'];
  } else {
    active = ['node-ir', 'node-ctrl'];
  }

  blocks.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (active.includes(id)) {
      el.classList.remove('svg-dim');
      el.classList.add('svg-focus');
    } else {
      el.classList.add('svg-dim');
      el.classList.remove('svg-focus');
    }
  });
}

// 8085 CPU Simulation State
class Simulator8085 {
  constructor() {
    this.memory = new Uint8Array(65536);
    this.reset();
  }

  reset() {
    this.a = 0;
    this.b = 0;
    this.c = 0;
    this.d = 0;
    this.e = 0;
    this.h = 0;
    this.l = 0;
    this.sp = 0xFFFF;
    this.pc = 0x2000;
    this.flags = { s: 0, z: 0, ac: 0, p: 0, cy: 0 };
    this.halted = false;
    this.cycles = 0;
    this.instructions = 0;
  }

  parity(n) {
    let p = 0;
    let v = n & 0xFF;
    while (v) {
      p ^= (v & 1);
      v >>= 1;
    }
    return p === 0 ? 1 : 0;
  }

  getHL() {
    return (this.h << 8) | this.l;
  }

  setHL(val) {
    this.h = (val >> 8) & 0xFF;
    this.l = val & 0xFF;
  }

  getBC() {
    return (this.b << 8) | this.c;
  }

  setBC(val) {
    this.b = (val >> 8) & 0xFF;
    this.c = val & 0xFF;
  }

  getDE() {
    return (this.d << 8) | this.e;
  }

  setDE(val) {
    this.d = (val >> 8) & 0xFF;
    this.e = val & 0xFF;
  }

  getReg(code) {
    switch (code & 7) {
      case 0: return this.b;
      case 1: return this.c;
      case 2: return this.d;
      case 3: return this.e;
      case 4: return this.h;
      case 5: return this.l;
      case 6: return this.memory[this.getHL()];
      case 7: return this.a;
    }
    return 0;
  }

  setReg(code, val) {
    val &= 0xFF;
    switch (code & 7) {
      case 0: this.b = val; break;
      case 1: this.c = val; break;
      case 2: this.d = val; break;
      case 3: this.e = val; break;
      case 4: this.h = val; break;
      case 5: this.l = val; break;
      case 6: this.memory[this.getHL()] = val; break;
      case 7: this.a = val; break;
    }
  }

  setArithFlags(res, op1, op2, isSub) {
    const val = res & 0xFF;
    this.flags.s = (val & 0x80) ? 1 : 0;
    this.flags.z = (val === 0) ? 1 : 0;
    this.flags.p = this.parity(val);
    this.flags.cy = (res > 0xFF || res < 0) ? 1 : 0;
    if (!isSub) {
      this.flags.ac = (((op1 & 0x0F) + (op2 & 0x0F)) > 0x0F) ? 1 : 0;
    } else {
      this.flags.ac = ((op1 & 0x0F) < (op2 & 0x0F)) ? 1 : 0;
    }
  }

  setLogicFlags(val, ac = 0) {
    val &= 0xFF;
    this.flags.s = (val & 0x80) ? 1 : 0;
    this.flags.z = (val === 0) ? 1 : 0;
    this.flags.p = this.parity(val);
    this.flags.cy = 0;
    this.flags.ac = ac;
  }

  pushWord(val) {
    this.sp = (this.sp - 1) & 0xFFFF;
    this.memory[this.sp] = (val >> 8) & 0xFF;
    this.sp = (this.sp - 1) & 0xFFFF;
    this.memory[this.sp] = val & 0xFF;
  }

  popWord() {
    const low = this.memory[this.sp];
    this.sp = (this.sp + 1) & 0xFFFF;
    const high = this.memory[this.sp];
    this.sp = (this.sp + 1) & 0xFFFF;
    return (high << 8) | low;
  }

  step() {
    if (this.halted) return false;

    const op = this.memory[this.pc];
    this.pc = (this.pc + 1) & 0xFFFF;
    this.instructions++;

    // HLT
    if (op === 0x76) {
      this.halted = true;
      this.cycles += 5;
      return false;
    }

    // NOP
    if (op === 0x00) {
      this.cycles += 4;
      return true;
    }

    // MOV r1, r2
    if ((op & 0xC0) === 0x40) {
      const dst = (op >> 3) & 7;
      const src = op & 7;
      this.setReg(dst, this.getReg(src));
      this.cycles += (dst === 6 || src === 6) ? 7 : 4;
      return true;
    }

    // MVI r, d8
    if ((op & 0xC7) === 0x06) {
      const r = (op >> 3) & 7;
      const d8 = this.memory[this.pc];
      this.pc = (this.pc + 1) & 0xFFFF;
      this.setReg(r, d8);
      this.cycles += (r === 6) ? 10 : 7;
      return true;
    }

    // LXI rp, d16
    if ((op & 0xCF) === 0x01) {
      const rp = (op >> 4) & 3;
      const low = this.memory[this.pc];
      this.pc = (this.pc + 1) & 0xFFFF;
      const high = this.memory[this.pc];
      this.pc = (this.pc + 1) & 0xFFFF;
      const d16 = (high << 8) | low;
      if (rp === 0) this.setBC(d16);
      else if (rp === 1) this.setDE(d16);
      else if (rp === 2) this.setHL(d16);
      else if (rp === 3) this.sp = d16;
      this.cycles += 10;
      return true;
    }

    // LDA addr
    if (op === 0x3A) {
      const addr = this.memory[this.pc] | (this.memory[(this.pc + 1) & 0xFFFF] << 8);
      this.pc = (this.pc + 2) & 0xFFFF;
      this.a = this.memory[addr];
      this.cycles += 13;
      return true;
    }

    // STA addr
    if (op === 0x32) {
      const addr = this.memory[this.pc] | (this.memory[(this.pc + 1) & 0xFFFF] << 8);
      this.pc = (this.pc + 2) & 0xFFFF;
      this.memory[addr] = this.a;
      this.cycles += 13;
      return true;
    }

    // LHLD addr
    if (op === 0x2A) {
      const addr = this.memory[this.pc] | (this.memory[(this.pc + 1) & 0xFFFF] << 8);
      this.pc = (this.pc + 2) & 0xFFFF;
      this.l = this.memory[addr];
      this.h = this.memory[(addr + 1) & 0xFFFF];
      this.cycles += 16;
      return true;
    }

    // SHLD addr
    if (op === 0x22) {
      const addr = this.memory[this.pc] | (this.memory[(this.pc + 1) & 0xFFFF] << 8);
      this.pc = (this.pc + 2) & 0xFFFF;
      this.memory[addr] = this.l;
      this.memory[(addr + 1) & 0xFFFF] = this.h;
      this.cycles += 16;
      return true;
    }

    // LDAX B / D
    if (op === 0x0A) {
      this.a = this.memory[this.getBC()];
      this.cycles += 7;
      return true;
    }
    if (op === 0x1A) {
      this.a = this.memory[this.getDE()];
      this.cycles += 7;
      return true;
    }

    // STAX B / D
    if (op === 0x02) {
      this.memory[this.getBC()] = this.a;
      this.cycles += 7;
      return true;
    }
    if (op === 0x12) {
      this.memory[this.getDE()] = this.a;
      this.cycles += 7;
      return true;
    }

    // XCHG
    if (op === 0xEB) {
      let t = this.h; this.h = this.d; this.d = t;
      t = this.l; this.l = this.e; this.e = t;
      this.cycles += 4;
      return true;
    }

    // Arithmetic on registers
    if ((op & 0xC0) === 0x80) {
      const kind = (op >> 3) & 7;
      const val = this.getReg(op & 7);
      let res = 0;
      switch (kind) {
        case 0: // ADD
          res = this.a + val;
          this.setArithFlags(res, this.a, val, false);
          this.a = res & 0xFF;
          break;
        case 1: // ADC
          res = this.a + val + this.flags.cy;
          this.setArithFlags(res, this.a, val, false);
          this.a = res & 0xFF;
          break;
        case 2: // SUB
          res = this.a - val;
          this.setArithFlags(res, this.a, val, true);
          this.a = res & 0xFF;
          break;
        case 3: // SBB
          res = this.a - val - this.flags.cy;
          this.setArithFlags(res, this.a, val, true);
          this.a = res & 0xFF;
          break;
        case 4: // ANA
          this.a &= val;
          this.setLogicFlags(this.a, 1);
          break;
        case 5: // XRA
          this.a ^= val;
          this.setLogicFlags(this.a, 0);
          break;
        case 6: // ORA
          this.a |= val;
          this.setLogicFlags(this.a, 0);
          break;
        case 7: // CMP
          res = this.a - val;
          this.setArithFlags(res, this.a, val, true);
          break;
      }
      this.cycles += ((op & 7) === 6) ? 7 : 4;
      return true;
    }

    // Immediate arithmetic
    if (op === 0xC6) { // ADI
      const val = this.memory[this.pc];
      this.pc = (this.pc + 1) & 0xFFFF;
      const res = this.a + val;
      this.setArithFlags(res, this.a, val, false);
      this.a = res & 0xFF;
      this.cycles += 7;
      return true;
    }
    if (op === 0xD6) { // SUI
      const val = this.memory[this.pc];
      this.pc = (this.pc + 1) & 0xFFFF;
      const res = this.a - val;
      this.setArithFlags(res, this.a, val, true);
      this.a = res & 0xFF;
      this.cycles += 7;
      return true;
    }
    if (op === 0xFE) { // CPI
      const val = this.memory[this.pc];
      this.pc = (this.pc + 1) & 0xFFFF;
      const res = this.a - val;
      this.setArithFlags(res, this.a, val, true);
      this.cycles += 7;
      return true;
    }
    if (op === 0xE6) { // ANI
      const val = this.memory[this.pc];
      this.pc = (this.pc + 1) & 0xFFFF;
      this.a &= val;
      this.setLogicFlags(this.a, 1);
      this.cycles += 7;
      return true;
    }
    if (op === 0xF6) { // ORI
      const val = this.memory[this.pc];
      this.pc = (this.pc + 1) & 0xFFFF;
      this.a |= val;
      this.setLogicFlags(this.a, 0);
      this.cycles += 7;
      return true;
    }
    if (op === 0xEE) { // XRI
      const val = this.memory[this.pc];
      this.pc = (this.pc + 1) & 0xFFFF;
      this.a ^= val;
      this.setLogicFlags(this.a, 0);
      this.cycles += 7;
      return true;
    }

    // INR r
    if ((op & 0xC7) === 0x04) {
      const r = (op >> 3) & 7;
      const val = this.getReg(r);
      const res = (val + 1) & 0xFF;
      this.flags.s = (res & 0x80) ? 1 : 0;
      this.flags.z = (res === 0) ? 1 : 0;
      this.flags.p = this.parity(res);
      this.flags.ac = ((val & 0x0F) === 0x0F) ? 1 : 0;
      this.setReg(r, res);
      this.cycles += (r === 6) ? 10 : 4;
      return true;
    }

    // DCR r
    if ((op & 0xC7) === 0x05) {
      const r = (op >> 3) & 7;
      const val = this.getReg(r);
      const res = (val - 1) & 0xFF;
      this.flags.s = (res & 0x80) ? 1 : 0;
      this.flags.z = (res === 0) ? 1 : 0;
      this.flags.p = this.parity(res);
      this.flags.ac = ((val & 0x0F) === 0x00) ? 1 : 0;
      this.setReg(r, res);
      this.cycles += (r === 6) ? 10 : 4;
      return true;
    }

    // INX rp
    if ((op & 0xCF) === 0x03) {
      const rp = (op >> 4) & 3;
      if (rp === 0) this.setBC((this.getBC() + 1) & 0xFFFF);
      else if (rp === 1) this.setDE((this.getDE() + 1) & 0xFFFF);
      else if (rp === 2) this.setHL((this.getHL() + 1) & 0xFFFF);
      else if (rp === 3) this.sp = (this.sp + 1) & 0xFFFF;
      this.cycles += 6;
      return true;
    }

    // DCX rp
    if ((op & 0xCF) === 0x0B) {
      const rp = (op >> 4) & 3;
      if (rp === 0) this.setBC((this.getBC() - 1) & 0xFFFF);
      else if (rp === 1) this.setDE((this.getDE() - 1) & 0xFFFF);
      else if (rp === 2) this.setHL((this.getHL() - 1) & 0xFFFF);
      else if (rp === 3) this.sp = (this.sp - 1) & 0xFFFF;
      this.cycles += 6;
      return true;
    }

    // JMP
    if (op === 0xC3) {
      const target = this.memory[this.pc] | (this.memory[(this.pc + 1) & 0xFFFF] << 8);
      this.pc = target;
      this.cycles += 10;
      return true;
    }

    // Conditional Jumps
    if ((op & 0xC7) === 0xC2) {
      const cond = (op >> 3) & 7;
      const target = this.memory[this.pc] | (this.memory[(this.pc + 1) & 0xFFFF] << 8);
      this.pc = (this.pc + 2) & 0xFFFF;
      let take = false;
      switch (cond) {
        case 0: take = !this.flags.z; break;  // JNZ
        case 1: take = !!this.flags.z; break; // JZ
        case 2: take = !this.flags.cy; break; // JNC
        case 3: take = !!this.flags.cy; break;// JC
        case 4: take = !this.flags.p; break;  // JPO
        case 5: take = !!this.flags.p; break; // JPE
        case 6: take = !this.flags.s; break;  // JP
        case 7: take = !!this.flags.s; break; // JM
      }
      if (take) this.pc = target;
      this.cycles += 10;
      return true;
    }

    // Stack PUSH / POP
    if ((op & 0xCF) === 0xC5) {
      const rp = (op >> 4) & 3;
      if (rp === 0) this.pushWord(this.getBC());
      else if (rp === 1) this.pushWord(this.getDE());
      else if (rp === 2) this.pushWord(this.getHL());
      else if (rp === 3) {
        const f = (this.flags.s << 7) | (this.flags.z << 6) | (this.flags.ac << 4) | (this.flags.p << 2) | (1 << 1) | this.flags.cy;
        this.pushWord((this.a << 8) | f);
      }
      this.cycles += 12;
      return true;
    }
    if ((op & 0xCF) === 0xC1) {
      const rp = (op >> 4) & 3;
      const w = this.popWord();
      if (rp === 0) this.setBC(w);
      else if (rp === 1) this.setDE(w);
      else if (rp === 2) this.setHL(w);
      else if (rp === 3) {
        this.a = (w >> 8) & 0xFF;
        const f = w & 0xFF;
        this.flags.s = (f >> 7) & 1;
        this.flags.z = (f >> 6) & 1;
        this.flags.ac = (f >> 4) & 1;
        this.flags.p = (f >> 2) & 1;
        this.flags.cy = f & 1;
      }
      this.cycles += 10;
      return true;
    }

    // DAD rp (16-bit addition into HL)
    if ((op & 0xCF) === 0x09) {
      const rp = (op >> 4) & 3;
      let val = 0;
      if (rp === 0) val = this.getBC();
      else if (rp === 1) val = this.getDE();
      else if (rp === 2) val = this.getHL();
      else if (rp === 3) val = this.sp;
      const hl = this.getHL();
      const sum = hl + val;
      this.flags.cy = sum > 0xFFFF ? 1 : 0;
      this.setHL(sum & 0xFFFF);
      this.cycles += 10;
      return true;
    }

    // CALL addr (subroutine call)
    if (op === 0xCD) {
      const target = this.memory[this.pc] | (this.memory[(this.pc + 1) & 0xFFFF] << 8);
      this.pc = (this.pc + 2) & 0xFFFF;
      this.pushWord(this.pc);
      this.pc = target;
      this.cycles += 18;
      return true;
    }

    // RET (return from subroutine)
    if (op === 0xC9) {
      this.pc = this.popWord();
      this.cycles += 10;
      return true;
    }

    this.cycles += 4;
    return true;
  }
}

// Client Application Controller
const cpu = new Simulator8085();
let currentProgram = null;
let runTimer = null;

/* ============================================================================
   VISUALIZER — VisuAlgo-style Trace + Play/Replay + English narration
   Phase 1+2 (2026-11-20). No AI. Rule-based only.
   - Does NOT change the CPU engine (Simulator8085.step) or the C code.
   - It only OBSERVES step(): snapshot before -> step() -> snapshot after,
     diffs the two snapshots, and builds one TraceStep per instruction.
   - Play / Replay / Step Back work from that trace list, never from a video.
   ============================================================================ */
let vizTrace = [];        // TraceStep[], in execution order
let vizIndex = -1;        // index of the step currently shown (-1 = before step 1)
let vizPlaying = false;
let vizSpeed = 0.25;       // Default to 0.25 (Slow pace for easy step-by-step reading!)
let eli5Mode = true;       // Default to true (Plain English & everyday analogies for beginners!)
let autoPauseEachStep = false;
let vizTimer = null;
let vizInitialSnapshot = null; // CPU state before step 1, for Replay / Step Back to start

/* ============================================================================
   AI TEACHER VOICE NARRATOR (Browser speechSynthesis ONLY)
   ============================================================================ */
let voiceEnabled = true; // Default ON on first visit
let voiceSpeedIndex = 1; // 0: 0.8x (Slow), 1: 0.95x (Normal), 2: 1.15x (Fast)
const VOICE_RATES = [0.8, 0.95, 1.15];
const VOICE_LABELS = ['Slow (0.8x)', 'Normal (0.95x)', 'Fast (1.15x)'];
let currentVoiceRate = 0.95;
let availableVoices = [];
let selectedVoice = null;
let isSpeakingStep = false;
let lastSpokenText = '';

const ADDITION_STORY_SENTENCES = [
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
const ADDITION_HALT_SENTENCE = "Done! The answer is 8. It is in box 2052H. The carry is zero, so nothing spilled over.";

function numberToWord(n) {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
                 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  if (n >= 0 && n < words.length) return words[n];
  return String(n);
}

function formatSpeechText(text) {
  if (!text) return '';
  let s = String(text);

  // Substitute register names with plain teacher terms:
  s = s.replace(/\bRegister\s+A\b/gi, 'the main desk, A');
  s = s.replace(/\bregister\s+A\b/gi, 'the main desk, A');
  s = s.replace(/\bRegister\s+B\b/gi, 'helper desk, B');
  s = s.replace(/\bregister\s+B\b/gi, 'helper desk, B');
  s = s.replace(/\bRegister\s+C\b/gi, 'carry box, C');
  s = s.replace(/\bregister\s+C\b/gi, 'carry box, C');

  // Human pauses and stress for addition/subtraction:
  // "3 plus 5 equals 8." -> "three plus five equals... eight."
  s = s.replace(/(\d+)\s+plus\s+(\d+)\s+equals\s+(\d+)/gi, (match, n1, n2, res) => {
    return `${numberToWord(parseInt(n1, 10))} plus ${numberToWord(parseInt(n2, 10))} equals... ${numberToWord(parseInt(res, 10))}`;
  });
  s = s.replace(/(\d+)\s+minus\s+(\d+)\s+equals\s+(\d+)/gi, (match, n1, n2, res) => {
    return `${numberToWord(parseInt(n1, 10))} minus ${numberToWord(parseInt(n2, 10))} equals... ${numberToWord(parseInt(res, 10))}`;
  });

  // Stress and pause before answer:
  s = s.replace(/answer,\s*(\d+),/gi, (match, num) => {
    return `answer, ${numberToWord(parseInt(num, 10))},`;
  });
  s = s.replace(/answer\s+is\s+(\d+)/gi, (match, num) => {
    return `answer is... ${numberToWord(parseInt(num, 10))}`;
  });

  // Natural address pronunciation: "box 2050H" -> "box 2050 H"
  s = s.replace(/box\s*([0-9A-Fa-f]{4})H/gi, 'box $1 H');

  // Convert standalone small numbers (0 to 20) to spoken English words
  s = s.replace(/\b([0-9]|1[0-9]|20)\b/g, (match) => {
    return numberToWord(parseInt(match, 10));
  });

  return s;
}

function getStepTeacherSentence(step) {
  if (!step) return '';
  if (currentSampleKey === 'addition' && step.step >= 1 && step.step <= 10) {
    return ADDITION_STORY_SENTENCES[step.step - 1];
  }
  const m = (step.mnemonic || '').toUpperCase();
  const ops = step.operands || '';
  const opParts = ops.split(',').map(s => s.trim());

  if (m === 'MVI') {
    const reg = opParts[0];
    const val = vizParseHexToken(opParts[1]) ?? opParts[1];
    if (reg === 'A') return `Take ${val} and put it on the main desk, A.`;
    if (reg === 'C') return `We start with an empty carry box. C holds ${val}.`;
    return `Put ${val} into helper desk, ${reg}.`;
  }
  if (m === 'LDA') {
    const addr = opParts[0];
    const val = step.after ? step.after.a : 0;
    return `Take ${val} from box ${addr} on the shelf and put it on the main desk, A.`;
  }
  if (m === 'STA') {
    const addr = opParts[0];
    const val = step.before ? step.before.a : 0;
    return `Put the answer, ${val}, into box ${addr}, so it is saved.`;
  }
  if (m === 'MOV') {
    const dst = opParts[0];
    const src = opParts[1];
    const srcVal = (step.before && step.before[src.toLowerCase()] !== undefined) ? step.before[src.toLowerCase()] : 0;
    const srcName = src === 'A' ? 'the main desk, A' : `helper desk, ${src}`;
    const dstName = dst === 'A' ? 'the main desk, A' : `helper desk, ${dst}`;
    return `Copy ${srcVal} to ${dstName}, so we don't lose it.`;
  }
  if (m === 'ADD' || m === 'ADI' || m === 'ADC') {
    const a = step.alu;
    const op1 = a ? a.op1 : (step.before ? step.before.a : 0);
    const op2 = a ? a.op2 : 0;
    const res = a ? a.result : (step.after ? step.after.a : 0);
    return `The calculator adds them: ${op1} plus ${op2} equals ${res}.`;
  }
  if (m === 'SUB' || m === 'SUI' || m === 'SBB') {
    const a = step.alu;
    const op1 = a ? a.op1 : (step.before ? step.before.a : 0);
    const op2 = a ? a.op2 : 0;
    const res = a ? a.result : (step.after ? step.after.a : 0);
    return `The calculator subtracts: ${op1} minus ${op2} equals ${res}.`;
  }
  if (m === 'JNC' || m === 'JC') {
    const target = opParts[0];
    const isJnc = m === 'JNC';
    const cy = step.after ? step.after.flags.cy : 0;
    if (isJnc) {
      return cy === 0
        ? `Carry is zero, so we jump to ${target}. Nothing spilled over.`
        : `Carry is one, so we continue without jumping.`;
    } else {
      return cy === 1
        ? `Carry is one, so we jump to ${target}.`
        : `Carry is zero, so we continue without jumping.`;
    }
  }
  if (m === 'JNZ' || m === 'JZ') {
    const target = opParts[0];
    const z = step.after ? step.after.flags.z : 0;
    const isJnz = m === 'JNZ';
    if (isJnz) {
      return z === 0
        ? `Counter is not zero, so we loop back to ${target}.`
        : `Counter reached zero, so we finished the loop.`;
    } else {
      return z === 1
        ? `Result is zero, so we jump to ${target}.`
        : `Result is not zero, so we continue forward.`;
    }
  }
  if (m === 'INR') {
    const reg = opParts[0];
    const val = step.after ? step.after[reg.toLowerCase()] : 0;
    return `Add one to helper desk ${reg}, making it ${val}.`;
  }
  if (m === 'DCR') {
    const reg = opParts[0];
    const val = step.after ? step.after[reg.toLowerCase()] : 0;
    return `Count down helper desk ${reg} by one, now ${val}.`;
  }
  if (m === 'HLT') {
    const ans = (step.after && step.after.a !== undefined) ? step.after.a : 0;
    return `Stop. The story is finished. The answer is ${ans}.`;
  }
  return step.narration || `${m} instruction executed.`;
}

async function getVoiceTeacherSentence(step) {
  const fallback = getStepTeacherSentence(step);
  // Mercury API hook (brain-only: uses ONLY real simulator values; fallbacks if off or no key)
  const mercuryKey = (typeof window !== 'undefined' && window.MERCURY_API_KEY) || (typeof localStorage !== 'undefined' && localStorage.getItem('8085_mercury_api_key'));
  const mercuryEndpoint = (typeof window !== 'undefined' && window.MERCURY_API_ENDPOINT) || (typeof localStorage !== 'undefined' && localStorage.getItem('8085_mercury_endpoint'));

  if (!mercuryKey || !mercuryEndpoint) {
    return fallback;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(mercuryEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mercuryKey}`
      },
      body: JSON.stringify({
        step: step.step,
        mnemonic: step.mnemonic,
        a: step.after ? step.after.a : step.before?.a,
        b: step.after ? step.after.b : step.before?.b,
        c: step.after ? step.after.c : step.before?.c,
        flags: step.after ? step.after.flags : {},
        alu: step.alu,
        fallbackSentence: fallback
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.sentence) return data.sentence;
    }
  } catch (e) {
    // Mercury is offline or unreachable - fallback immediately to fixed sentence
  }
  return fallback;
}

function cancelSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
  isSpeakingStep = false;
  updateVoiceStatus(false);
}

function speakText(rawText, onDone) {
  if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onDone) onDone();
    return;
  }

  cancelSpeech();

  const speechText = formatSpeechText(rawText);
  if (!speechText) {
    if (onDone) onDone();
    return;
  }

  lastSpokenText = rawText;

  try {
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = currentVoiceRate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    isSpeakingStep = true;
    updateVoiceStatus(true);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      isSpeakingStep = false;
      updateVoiceStatus(false);
      if (onDone) onDone();
    };

    utterance.onend = finish;
    utterance.onerror = (e) => {
      finish();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    isSpeakingStep = false;
    updateVoiceStatus(false);
    if (onDone) onDone();
  }
}

async function speakCurrentStep(onDone) {
  if (!voiceEnabled) {
    if (onDone) onDone();
    return;
  }
  if (cpu.halted && vizIndex === vizTrace.length - 1) {
    const step = vizTrace[vizIndex];
    const sentence = await getVoiceTeacherSentence(step);
    speakText(sentence, () => {
      speakHaltSummary(onDone);
    });
    return;
  }
  if (vizIndex >= 0 && vizIndex < vizTrace.length) {
    const step = vizTrace[vizIndex];
    const sentence = await getVoiceTeacherSentence(step);
    speakText(sentence, onDone);
  } else {
    if (onDone) onDone();
  }
}

function speakHaltSummary(onDone) {
  if (!voiceEnabled) {
    if (onDone) onDone();
    return;
  }
  let haltSentence = ADDITION_HALT_SENTENCE;
  if (currentSampleKey !== 'addition') {
    const ans = cpu.memory[0x2052] || cpu.a || 0;
    haltSentence = `Done! The answer is ${ans}. The story is finished.`;
  }
  speakText(haltSentence, onDone);
}

function repeatCurrentStep() {
  if (!voiceEnabled) {
    showToast('Voice is currently OFF. Turn Voice ON to hear narration.');
    return;
  }
  const haltCard = document.getElementById('halt-summary-card');
  if (haltCard && haltCard.style.display !== 'none' && cpu.halted) {
    speakHaltSummary();
    return;
  }
  if (vizIndex >= 0 && vizIndex < vizTrace.length) {
    speakCurrentStep();
  } else if (lastSpokenText) {
    speakText(lastSpokenText);
  } else {
    speakText("Ready: Click Start Simulation or Next to watch the CPU execute.");
  }
}

function updateVoiceStatus(isSpeaking) {
  const pill = document.getElementById('voice-status-indicator');
  const storySpeaking = document.getElementById('story-voice-speaking-pill');
  if (pill) {
    if (isSpeaking) {
      pill.textContent = '🗣️ Speaking...';
      pill.classList.add('speaking');
    } else {
      pill.textContent = voiceEnabled ? '🗣️ Ready' : '🔇 Muted';
      pill.classList.remove('speaking');
    }
  }
  if (storySpeaking) {
    storySpeaking.style.display = (isSpeaking && voiceEnabled) ? 'inline-block' : 'none';
  }
}

function updateVoiceUI() {
  const toggleBtn = document.getElementById('btn-voice-toggle');
  const toggleIcon = document.getElementById('voice-toggle-icon');
  const toggleLabel = document.getElementById('voice-toggle-label');
  if (toggleBtn) {
    if (voiceEnabled) {
      toggleBtn.classList.remove('off');
      toggleBtn.classList.add('active');
      if (toggleIcon) toggleIcon.textContent = '🔊';
      if (toggleLabel) toggleLabel.textContent = 'Voice: ON';
    } else {
      toggleBtn.classList.remove('active');
      toggleBtn.classList.add('off');
      if (toggleIcon) toggleIcon.textContent = '🔇';
      if (toggleLabel) toggleLabel.textContent = 'Voice: OFF';
    }
  }
  updateVoiceStatus(isSpeakingStep);
}

function initVoiceSynthesis() {
  try {
    const savedVoice = localStorage.getItem('8085_voice_enabled');
    if (savedVoice !== null) {
      voiceEnabled = (savedVoice === 'true');
    } else {
      voiceEnabled = true; // Default ON on first visit
    }
    const savedSpeed = localStorage.getItem('8085_voice_speed_index');
    if (savedSpeed !== null) {
      const idx = parseInt(savedSpeed, 10);
      if (idx >= 0 && idx <= 2) {
        voiceSpeedIndex = idx;
        currentVoiceRate = VOICE_RATES[idx];
      }
    }
  } catch (e) {}

  updateVoiceUI();

  const speedSlider = document.getElementById('voice-speed-slider');
  const speedVal = document.getElementById('voice-speed-val');
  if (speedSlider) {
    speedSlider.value = voiceSpeedIndex;
  }
  if (speedVal) {
    speedVal.textContent = VOICE_LABELS[voiceSpeedIndex];
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    const unavail = document.getElementById('voice-unavailable-msg');
    if (unavail) unavail.style.display = 'inline-block';
    const pill = document.getElementById('voice-status-indicator');
    if (pill) pill.style.display = 'none';
    return;
  }

  const populateVoiceList = () => {
    try {
      const voices = window.speechSynthesis.getVoices() || [];
      if (!voices || voices.length === 0) return;
      availableVoices = voices;

      const voiceSelect = document.getElementById('voice-select');
      if (!voiceSelect) return;

      const savedVoiceName = localStorage.getItem('8085_selected_voice_name');
      voiceSelect.innerHTML = '';

      let bestVoice = null;
      if (savedVoiceName) {
        bestVoice = voices.find(v => v.name === savedVoiceName);
      }
      if (!bestVoice) {
        bestVoice = voices.find(v => v.lang.startsWith('en') && (
          v.name.includes('Natural') || v.name.includes('Online (Natural)') ||
          v.name.includes('Aria') || v.name.includes('Jenny') || v.name.includes('Guy')
        ));
      }
      if (!bestVoice) {
        bestVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en_US' || v.lang.startsWith('en-US'));
      }
      if (!bestVoice) {
        bestVoice = voices.find(v => v.lang.startsWith('en-IN') || v.lang.startsWith('en'));
      }
      if (!bestVoice) {
        bestVoice = voices.find(v => v.default) || voices[0];
      }

      selectedVoice = bestVoice;

      const enVoices = voices.filter(v => v.lang && v.lang.startsWith('en'));
      const otherVoices = voices.filter(v => !v.lang || !v.lang.startsWith('en'));
      const sortedVoices = [...enVoices, ...otherVoices];

      sortedVoices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = `${v.name} (${v.lang})${v === bestVoice ? ' ★' : ''}`;
        if (bestVoice && v.name === bestVoice.name) {
          opt.selected = true;
        }
        voiceSelect.appendChild(opt);
      });

      const unavail = document.getElementById('voice-unavailable-msg');
      if (unavail) unavail.style.display = 'none';
    } catch (err) {
      console.warn('Voice enumeration error:', err);
    }
  };

  populateVoiceList();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoiceList;
  }
}

const VIZ_REG_NAMES = { 0: 'B', 1: 'C', 2: 'D', 3: 'E', 4: 'H', 5: 'L', 6: 'M', 7: 'A' };
const VIZ_REG_IDS = { A: 'reg-a', B: 'reg-b', C: 'reg-c', D: 'reg-d', E: 'reg-e', H: 'reg-h', L: 'reg-l', M: 'reg-m', PC: 'reg-pc', SP: 'reg-sp' };

function vizHex2(v) { return (v & 0xFF).toString(16).toUpperCase().padStart(2, '0') + 'H'; }
function vizHex4(v) { return (v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0') + 'H'; }
function vizRegValue(snap, name) {
  if (!name) return 0;
  const n = String(name).trim().toUpperCase();
  if (n === 'M') return snap.memHL || 0;
  if (n === 'A') return snap.a; if (n === 'B') return snap.b; if (n === 'C') return snap.c;
  if (n === 'D') return snap.d; if (n === 'E') return snap.e; if (n === 'H') return snap.h;
  if (n === 'L') return snap.l;
  return 0;
}
function vizParseHexToken(tok) {
  if (!tok) return null;
  const t = String(tok).trim().toUpperCase();
  if (/^[0-9A-F]{1,4}H$/.test(t)) return parseInt(t.slice(0, -1), 16);
  if (/^0X[0-9A-F]+$/.test(t)) return parseInt(t.slice(2), 16);
  return null;
}
function vizResolveOperand(operand) {
  // operand may be a label (NOCARRY) or a hex address (2050H). Returns {address, label} or null.
  if (!operand) return null;
  const tok = String(operand).trim().toUpperCase();
  const asHex = vizParseHexToken(tok);
  if (asHex !== null) return { address: asHex, label: null };
  if (currentProgram && currentProgram.symbols) {
    const sym = currentProgram.symbols.find(s => String(s.name).toUpperCase() === tok);
    if (sym) return { address: sym.address, label: sym.name };
  }
  return null;
}
function vizFindLineByAddress(addr) {
  if (!currentProgram || !currentProgram.lines) return null;
  for (const l of currentProgram.lines) {
    if (!l || !l.has_code) continue;
    const a = (typeof l.address === 'number') ? l.address : parseInt(l.address_hex || '', 16);
    if (a === addr) return l;
  }
  return null;
}
function vizWatchedAddresses(line, snap) {
  // Small set of memory addresses this step could read/write, so Step Back
  // can restore them without copying all 64 KB per step.
  const set = new Set();
  if (currentProgram && currentProgram.lines) {
    for (const l of currentProgram.lines) {
      if (l && l.has_code) {
        const a = (typeof l.address === 'number') ? l.address : parseInt(l.address_hex || '', 16);
        if (!isNaN(a)) for (let i = 0; i < (l.byte_count || (l.bytes || []).length || 1); i++) set.add((a + i) & 0xFFFF);
      }
    }
  }
  // Data area commonly used by the lab examples (2050H-2070H) + operand targets.
  for (let a = 0x2040; a <= 0x2080; a++) set.add(a);
  if (line && line.operands) {
    for (const tok of String(line.operands).split(/[,\s]+/)) {
      const r = vizResolveOperand(tok);
      if (r) set.add(r.address & 0xFFFF);
      const h = vizParseHexToken(tok);
      if (h !== null) set.add(h & 0xFFFF);
    }
  }
  if (snap) {
    const hl = ((snap.h << 8) | snap.l) & 0xFFFF;
    const bc = ((snap.b << 8) | snap.c) & 0xFFFF;
    const de = ((snap.d << 8) | snap.e) & 0xFFFF;
    set.add(hl); set.add(bc); set.add(de);
    set.add(snap.sp & 0xFFFF); set.add((snap.sp - 1) & 0xFFFF); set.add((snap.sp - 2) & 0xFFFF);
  }
  return Array.from(set);
}
function vizSnapshot(line) {
  const snap = {
    a: cpu.a, b: cpu.b, c: cpu.c, d: cpu.d, e: cpu.e, h: cpu.h, l: cpu.l,
    pc: cpu.pc, sp: cpu.sp, cycles: cpu.cycles, instructions: cpu.instructions,
    halted: cpu.halted, flags: { ...cpu.flags },
    memHL: cpu.memory[cpu.getHL()],
    mem: {}
  };
  for (const addr of vizWatchedAddresses(line, snap)) snap.mem[addr] = cpu.memory[addr];
  return snap;
}
function vizRestore(snap) {
  if (!snap) return;
  cpu.a = snap.a; cpu.b = snap.b; cpu.c = snap.c; cpu.d = snap.d; cpu.e = snap.e;
  cpu.h = snap.h; cpu.l = snap.l; cpu.pc = snap.pc; cpu.sp = snap.sp;
  cpu.cycles = snap.cycles; cpu.instructions = snap.instructions; cpu.halted = snap.halted;
  cpu.flags = { ...snap.flags };
  for (const k of Object.keys(snap.mem || {})) cpu.memory[Number(k) & 0xFFFF] = snap.mem[k];
}
function vizDiff(before, after) {
  const changed = [];
  const regs = [['A', 'a'], ['B', 'b'], ['C', 'c'], ['D', 'd'], ['E', 'e'], ['H', 'h'], ['L', 'l']];
  for (const [name, key] of regs) {
    if (before[key] !== after[key]) changed.push({ kind: 'reg', name, from: before[key], to: after[key] });
  }
  if (before.memHL !== after.memHL) changed.push({ kind: 'reg', name: 'M', from: before.memHL, to: after.memHL });
  if (before.pc !== after.pc) changed.push({ kind: 'pc', name: 'PC', from: before.pc, to: after.pc });
  if (before.sp !== after.sp) changed.push({ kind: 'sp', name: 'SP', from: before.sp, to: after.sp });
  for (const k of ['s', 'z', 'ac', 'p', 'cy']) {
    if (before.flags[k] !== after.flags[k]) changed.push({ kind: 'flag', name: k.toUpperCase(), from: before.flags[k], to: after.flags[k] });
  }
  const addrs = new Set([...Object.keys(before.mem || {}), ...Object.keys(after.mem || {})].map(Number));
  for (const addr of addrs) {
    const b = before.mem[addr]; const a = after.mem[addr];
    if (b !== undefined && a !== undefined && b !== a) changed.push({ kind: 'mem', name: vizHex4(addr), address: addr, from: b, to: a });
  }
  // Also catch a memory write to an address we did not watch (e.g. a new STA
  // target): scan the watched window only — full 64K scan is not needed here
  // because STA/STAX/MOV M/PUSH targets are all in vizWatchedAddresses.
  return changed;
}
function vizAluInfo(mnemonic, operands, before, after) {
  const ops = String(operands || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const arith = { ADD: '+', ADC: '+', SUB: '-', SBB: '-', ANA: 'AND', XRA: 'XOR', ORA: 'OR', CMP: '-' };
  if (arith[mnemonic]) {
    const src = ops[0] || '';
    const op2 = vizRegValue(before, src);
    const op1 = before.a;
    let result = after.a;
    if (mnemonic === 'CMP') result = (op1 - op2) & 0xFF;
    return { op1, op: arith[mnemonic], op2, result, src, verb: mnemonic === 'CMP' ? 'compares' : (mnemonic === 'SUB' || mnemonic === 'SBB' ? 'subtracts' : (mnemonic === 'ANA' ? 'ANDs' : (mnemonic === 'XRA' ? 'XORs' : (mnemonic === 'ORA' ? 'ORs' : 'adds')))) };
  }
  if (['ADI', 'ACI', 'SUI', 'SBI', 'ANI', 'XRI', 'ORI', 'CPI'].includes(mnemonic)) {
    const op2 = vizParseHexToken(ops[0]) ?? 0;
    const op1 = before.a;
    let result = after.a;
    if (mnemonic === 'CPI') result = (op1 - op2) & 0xFF;
    const sym = { ADI: '+', ACI: '+', SUI: '-', SBI: '-', ANI: 'AND', XRI: 'XOR', ORI: 'OR', CPI: '-' }[mnemonic];
    return { op1, op: sym, op2, result, src: ops[0] || '', verb: mnemonic === 'CPI' ? 'compares' : 'combines' };
  }
  if (mnemonic === 'INR' || mnemonic === 'DCR') {
    const r = ops[0] || '';
    return { op1: vizRegValue(before, r), op: mnemonic === 'INR' ? '+1' : '-1', op2: 1, result: vizRegValue(after, r), src: r, verb: mnemonic === 'INR' ? 'increments' : 'decrements' };
  }
  return null;
}
function vizFlagNameForJump(mnemonic) {
  if (['JZ', 'JNZ'].includes(mnemonic)) return { flag: 'Z', name: 'Zero flag' };
  if (['JC', 'JNC'].includes(mnemonic)) return { flag: 'CY', name: 'Carry flag' };
  if (['JPO', 'JPE'].includes(mnemonic)) return { flag: 'P', name: 'Parity flag' };
  if (['JP', 'JM'].includes(mnemonic)) return { flag: 'S', name: 'Sign flag' };
  return null;
}
function vizBuildNarration(line, before, after, changed, alu, memChange) {
  const mnemonic = (line.mnemonic || '').toUpperCase();
  const operands = (line.operands || '').trim();
  const ops = operands.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const flagText = () => {
    const on = [];
    if (after.flags.z) on.push('Zero is 1');
    if (after.flags.cy) on.push('Carry is 1');
    if (after.flags.s) on.push('Sign is 1');
    return on.length ? ' Flags now: ' + on.join(', ') + '.' : '';
  };
  switch (mnemonic) {
    case 'MVI': {
      const r = ops[0] || ''; const val = ops[1] || '';
      const to = vizRegValue(after, r);
      if (r === 'M') return `The value ${val} moves into memory at HL. Memory now holds ${vizHex2(to)} (${to}).`;
      return `The value ${val} moves into register ${r}. ${r} now holds ${vizHex2(to)} (${to}).`;
    }
    case 'MOV': {
      const dst = ops[0] || ''; const src = ops[1] || '';
      if (dst === 'M') return `A is stored into memory at HL. Memory now holds ${vizHex2(after.memHL)} (${after.memHL}).`;
      if (src === 'M') return `Register ${dst} copies the value from memory at HL. ${dst} now holds ${vizHex2(vizRegValue(after, dst))}.`;
      return `Register ${dst} copies the value from ${src}. ${dst} now holds ${vizHex2(vizRegValue(after, dst))} (${vizRegValue(after, dst)}).`;
    }
    case 'LDA': {
      const r = vizResolveOperand(operands);
      return `A loads the number stored at memory ${r ? vizHex4(r.address) : operands}. That number is ${vizHex2(after.a)} (${after.a}).`;
    }
    case 'STA': {
      const r = vizResolveOperand(operands);
      const addr = r ? r.address : 0;
      return `A is stored into memory ${vizHex4(addr)}. Memory ${vizHex4(addr)} now holds ${vizHex2(after.a)} (${after.a}).`;
    }
    case 'LHLD': {
      const r = vizResolveOperand(operands);
      return `HL loads the 16-bit number stored at memory ${r ? vizHex4(r.address) : operands}. HL now holds ${vizHex4(cpu.getHL())}.`;
    }
    case 'SHLD': {
      const r = vizResolveOperand(operands);
      return `HL is stored into memory ${r ? vizHex4(r.address) : operands}.`;
    }
    case 'LXI': {
      const rp = ops[0] || ''; const val = ops[1] || '';
      return `The pair ${rp} is loaded with ${val}.`;
    }
    case 'LDAX': return `A loads the number stored at memory ${operands}. That number is ${vizHex2(after.a)} (${after.a}).`;
    case 'STAX': return `A is stored into memory ${operands}.`;
    case 'ADD': case 'ADC': case 'SUB': case 'SBB': case 'ANA': case 'XRA': case 'ORA': {
      if (!alu) return `${mnemonic} ${operands} executes.`;
      const word = { ADD: 'adds', ADC: 'adds with carry', SUB: 'subtracts', SBB: 'subtracts with borrow', ANA: 'ANDs', XRA: 'XORs', ORA: 'ORs' }[mnemonic];
      return `The ALU ${word} A (${vizHex2(alu.op1)}, ${alu.op1}) and ${alu.src} (${vizHex2(alu.op2)}, ${alu.op2}). The result is ${vizHex2(alu.result)} (${alu.result}). The answer goes back into A.${flagText()}`;
    }
    case 'CMP': {
      if (!alu) return `CMP ${operands} compares A with ${operands}.`;
      const cmp = alu.op1 === alu.op2 ? 'equal to' : (alu.op1 > alu.op2 ? 'greater than' : 'less than');
      return `The ALU compares A (${vizHex2(alu.op1)}, ${alu.op1}) with ${alu.src} (${vizHex2(alu.op2)}, ${alu.op2}). A is ${cmp} ${alu.src}. A does not change.${flagText()}`;
    }
    case 'ADI': case 'ACI': case 'SUI': case 'SBI': case 'ANI': case 'XRI': case 'ORI': {
      if (!alu) return `${mnemonic} ${operands} executes.`;
      return `The ALU combines A (${vizHex2(alu.op1)}, ${alu.op1}) with ${vizHex2(alu.op2)} (${alu.op2}). The result is ${vizHex2(alu.result)} (${alu.result}). The answer goes back into A.${flagText()}`;
    }
    case 'CPI': {
      if (!alu) return `CPI ${operands} compares A with ${operands}.`;
      return `The ALU compares A (${vizHex2(alu.op1)}, ${alu.op1}) with ${vizHex2(alu.op2)} (${alu.op2}). A does not change.${flagText()}`;
    }
    case 'INR': {
      const r = ops[0] || '';
      return `Register ${r} goes up by one, from ${vizHex2(vizRegValue(before, r))} to ${vizHex2(vizRegValue(after, r))}.${flagText()}`;
    }
    case 'DCR': {
      const r = ops[0] || '';
      return `Register ${r} goes down by one, from ${vizHex2(vizRegValue(before, r))} to ${vizHex2(vizRegValue(after, r))}.${flagText()}`;
    }
    case 'INX': return `The pair ${ops[0] || ''} goes up by one.`;
    case 'DCX': return `The pair ${ops[0] || ''} goes down by one.`;
    case 'DAD': {
      const cyMsg = after.flags.cy ? ' Carry flag CY=1 (16-bit overflow!).' : '';
      return `HL is added to ${ops[0] || ''}. HL now holds ${vizHex4(cpu.getHL())}.${cyMsg}`;
    }
    case 'JMP': {
      const r = vizResolveOperand(operands);
      return `The CPU jumps to ${r ? vizHex4(r.address) : operands}.`;
    }
    case 'JZ': case 'JNZ': case 'JC': case 'JNC': case 'JPO': case 'JPE': case 'JP': case 'JM': {
      const info = vizFlagNameForJump(mnemonic);
      const r = vizResolveOperand(operands);
      const target = r ? r.address : null;
      const taken = target !== null && after.pc === target;
      const flagVal = info ? (info.flag === 'Z' ? before.flags.z : info.flag === 'CY' ? before.flags.cy : info.flag === 'P' ? before.flags.p : before.flags.s) : 0;
      const condition = { JZ: 'Zero is 1', JNZ: 'Zero is 0', JC: 'Carry is 1', JNC: 'Carry is 0', JPO: 'Parity is 0', JPE: 'Parity is 1', JP: 'Sign is 0', JM: 'Sign is 1' }[mnemonic];
      if (taken) return `${mnemonic} means jump if ${condition}. ${info ? info.name : 'Flag'} is ${flagVal}, so the jump is taken. The CPU jumps to ${vizHex4(target)}.`;
      return `${mnemonic} means jump if ${condition}. ${info ? info.name : 'Flag'} is ${flagVal}, so the jump is not taken. The CPU continues to the next instruction.`;
    }
    case 'CALL': {
      const retAddr = (before.pc + 3) & 0xFFFF;
      return `The CPU calls the subroutine at ${operands}. Return address (${vizHex4(retAddr)}) is pushed onto the stack, and SP decrements to ${vizHex4(after.sp)}.`;
    }
    case 'RET': return `The CPU returns from the subroutine. Return address is popped from the stack into PC (${vizHex4(after.pc)}). SP increments to ${vizHex4(after.sp)}.`;
    case 'PUSH': return `The pair ${operands} is pushed onto the stack. The Stack Pointer decrements by 2 to ${vizHex4(after.sp)}.`;
    case 'POP': return `The pair ${operands} is popped from the stack. The Stack Pointer increments by 2 to ${vizHex4(after.sp)}.`;
    case 'XCHG': return `HL and DE swap their values.`;
    case 'HLT': return `Halt. The program stops.`;
    case 'NOP': return `No operation. The CPU does nothing and moves to the next instruction.`;
    case 'CMA': return `A is complemented. Every bit flips.`;
    case 'STC': return `The Carry flag is set to 1.`;
    case 'CMC': return `The Carry flag flips.`;
    case 'RLC': case 'RRC': case 'RAL': case 'RAR': return `${mnemonic} rotates A. The Carry flag may change.`;
    default: return `${mnemonic} ${operands} executes.`;
  }
}
function vizClearTrace() {
  vizStopPlay();
  vizTrace = []; vizIndex = -1; vizInitialSnapshot = null;
  vizUpdatePanel(null);
  vizRenderTrace();
}
function vizStopPlay() {
  vizPlaying = false;
  if (vizTimer) { clearTimeout(vizTimer); vizTimer = null; }
  const vb = document.getElementById('btn-vplay');
  if (vb) vb.textContent = '▶ Start Simulation';
  updateVideoScrubber(null);
  cancelSpeech();
}
function vizSpeedDelay() {
  if (vizSpeed === 0.1) return 4500;
  if (vizSpeed === 0.25) return 2800;
  if (vizSpeed === 0.5) return 1800;
  if (vizSpeed === 2) return 400;
  return 1000;
}
/* One traced step. Assumes a program is assembled and the CPU is not halted.
   Returns the TraceStep, or null if there was nothing to step. */
function vizDoOneStep() {
  if (!currentProgram || cpu.halted) return null;
  const pcBefore = cpu.pc;
  const line = vizFindLineByAddress(pcBefore);
  if (!line) { cpu.step(); updateCpuDisplay(); return null; }
  if (vizTrace.length === 0) vizInitialSnapshot = vizSnapshot(line);
  const before = vizSnapshot(line);
  const opcodeBytes = (line.bytes || []).join(' ');
  cpu.step();
  const after = vizSnapshot(line);
  const changed = vizDiff(before, after);
  const alu = vizAluInfo((line.mnemonic || '').toUpperCase(), line.operands || '', before, after);
  const memChange = changed.find(c => c.kind === 'mem') || null;
  const step = {
    step: vizTrace.length + 1,
    pcBefore, pcAfter: after.pc,
    address: pcBefore, addressHex: vizHex4(pcBefore),
    mnemonic: (line.mnemonic || '').toUpperCase(),
    operands: line.operands || '',
    label: line.label || '',
    bytes: opcodeBytes,
    tStates: line.t_states || 0,
    tStatesTotal: after.cycles,
    changed, alu, memChange,
    before, after,
    narration: vizBuildNarration(line, before, after, changed, alu, memChange)
  };
  vizTrace.push(step);
  vizIndex = vizTrace.length - 1;
  return step;
}
let vizTotalSteps = 0;
function vizEstimateTotalSteps() {
  if (!currentProgram || currentProgram.total_errors > 0) {
    vizTotalSteps = 0;
    return;
  }
  const sim = new Simulator8085();
  sim.memory.set(cpu.memory);
  sim.a = cpu.a; sim.b = cpu.b; sim.c = cpu.c; sim.d = cpu.d; sim.e = cpu.e;
  sim.h = cpu.h; sim.l = cpu.l; sim.sp = cpu.sp; sim.pc = cpu.pc;
  sim.flags = { ...cpu.flags };

  let count = 0;
  while (!sim.halted && count < 1000) {
    const pc = sim.pc;
    const line = vizFindLineByAddress(pc);
    if (!line) { sim.step(); count++; continue; }
    sim.step();
    count++;
  }
  vizTotalSteps = count || 1;
}

function vizShowStep(index) {
  if (index < -1) return;
  while (index >= vizTrace.length && !cpu.halted) {
    const s = vizDoOneStep();
    if (!s) break;
  }
  if (index >= vizTrace.length) index = vizTrace.length - 1;
  vizIndex = index;
  if (index === -1) {
    if (vizInitialSnapshot) vizRestore(vizInitialSnapshot);
    hideHaltSummary();
    const irVal = document.getElementById('svg-ir-val');
    const irText = document.getElementById('svg-ir-text');
    if (irVal) irVal.textContent = '00H';
    if (irText) irText.textContent = 'OPCODE DECODER';
    const ctrlPhase = document.getElementById('svg-ctrl-phase');
    if (ctrlPhase) ctrlPhase.textContent = 'READY';
  } else {
    vizRestore(vizTrace[index].after);
    if (index === vizTrace.length - 1 && (cpu.halted || vizTrace[index].mnemonic === 'HLT')) {
      showHaltSummary(vizTrace[index]);
    } else {
      hideHaltSummary();
    }
  }
  if (index === -1) {
    showIntroCard(currentSampleKey);
  } else {
    hideIntroCard();
  }
  updateCpuDisplay();
  renderMemoryGrid(cpu.pc);
  vizUpdatePanel(index === -1 ? null : vizTrace[index]);
  vizRenderTrace();
  updateVideoScrubber(index === -1 ? null : vizTrace[index]);
}

function vizStepOnce(isFromVoicePlay = false) {
  hideIntroCard();
  if (vizIndex + 1 < vizTrace.length) {
    vizIndex++;
    vizShowStep(vizIndex);
    animateMachineCycle(vizTrace[vizIndex]);
    if (!isFromVoicePlay && voiceEnabled) {
      speakCurrentStep();
    }
    return vizTrace[vizIndex];
  }
  if (cpu.halted) {
    showToast('CPU is HALTED. Program completed.');
    if (vizTrace.length > 0) showHaltSummary(vizTrace[vizTrace.length - 1]);
    if (!isFromVoicePlay && voiceEnabled) {
      speakHaltSummary();
    }
    return null;
  }
  const step = vizDoOneStep();
  if (!step) return null;
  updateCpuDisplay();
  renderMemoryGrid(cpu.pc);
  vizUpdatePanel(step);
  vizRenderTrace();
  vizFlashChanged(step);
  animateMachineCycle(step);
  updateVideoScrubber(step);
  if (cpu.halted) {
    showHaltSummary(step);
  }
  if (!isFromVoicePlay && voiceEnabled) {
    speakCurrentStep();
  }
  return step;
}

function vizPlay() {
  if (vizPlaying) { vizStopPlay(); return; }
  if (cpu.halted || (vizTrace.length > 0 && vizIndex === vizTrace.length - 1)) {
    vizShowStep(-1);
  }
  vizPlaying = true;
  const vb = document.getElementById('btn-vplay');
  if (vb) vb.textContent = '⏸ Pause Simulation';
  updateVideoScrubber(null);

  if (!voiceEnabled) {
    const scheduleNext = () => { if (vizPlaying) vizTimer = setTimeout(tick, vizSpeedDelay()); };
    const tick = () => {
      if (!vizPlaying) return;
      if (cpu.halted) {
        vizStopPlay();
        const tMsg = (vizTrace.length > 0 && vizTrace[vizTrace.length - 1].tStatesTotal) ? ` (${vizTrace[vizTrace.length - 1].tStatesTotal} T-states)` : '';
        showToast(`Program finished. CPU Halted.${tMsg}`);
        showHaltSummary(vizTrace[vizTrace.length - 1]);
        return;
      }
      const step = vizStepOnce(true);
      if (!step || cpu.halted) {
        vizStopPlay();
        const tMsg = (vizTrace.length > 0 && vizTrace[vizTrace.length - 1].tStatesTotal) ? ` (${vizTrace[vizTrace.length - 1].tStatesTotal} T-states)` : '';
        showToast(`Program finished. CPU Halted.${tMsg}`);
        if (vizTrace.length > 0) showHaltSummary(vizTrace[vizTrace.length - 1]);
        return;
      }
      if (autoPauseEachStep) {
        vizStopPlay();
        showToast('Step complete. Click "Continue to Next Step ❯" when ready.');
        return;
      }
      scheduleNext();
    };
    vizTimer = setTimeout(tick, vizSpeedDelay());
    return;
  }

  // Voice Narrator Playback: waits for voice onend before scheduling next step
  const tickVoice = () => {
    if (!vizPlaying) return;
    if (cpu.halted) {
      vizStopPlay();
      if (vizTrace.length > 0) showHaltSummary(vizTrace[vizTrace.length - 1]);
      speakHaltSummary();
      return;
    }

    const step = vizStepOnce(true);
    if (!step) {
      vizStopPlay();
      return;
    }

    speakCurrentStep(() => {
      if (!vizPlaying) return;
      if (cpu.halted) {
        vizStopPlay();
        if (vizTrace.length > 0) showHaltSummary(vizTrace[vizTrace.length - 1]);
        speakHaltSummary();
        return;
      }
      if (autoPauseEachStep) {
        vizStopPlay();
        showToast('Step complete. Click "Continue to Next Step ❯" when ready.');
        return;
      }
      // Natural 500ms teacher breath pause between steps
      vizTimer = setTimeout(() => {
        if (vizPlaying) tickVoice();
      }, 500);
    });
  };

  tickVoice();
}

function showHaltSummary(step) {
  const card = document.getElementById('halt-summary-card');
  const head = document.getElementById('halt-headline');
  const note = document.getElementById('halt-note');
  const feedback = document.getElementById('quiz-feedback');
  const btn1 = document.getElementById('btn-quiz-1');
  const btn2 = document.getElementById('btn-quiz-2');
  const btn3 = document.getElementById('btn-quiz-3');
  if (!card || !head || !note) return;

  const sampleSel = document.getElementById('sample-select');
  const curKey = sampleSel ? sampleSel.value : '';

  if (feedback) {
    feedback.style.display = 'none';
    feedback.innerHTML = '';
  }
  [btn1, btn2, btn3].forEach(b => {
    if (b) {
      b.classList.remove('correct', 'wrong');
      b.onclick = null;
    }
  });

  if (curKey === 'addition' || (!curKey && cpu.memory[0x2052] === 0x08)) {
    const sum = cpu.memory[0x2052];
    const carry = cpu.memory[0x2053];
    head.textContent = `Done! The answer is 8. It is in box 2052H. The carry is zero, so nothing spilled over.`;
    note.textContent = `Note: Accumulator A shows ${vizHex2(cpu.a)} because A holds the carry (${vizHex2(cpu.a)}), not the sum (the sum was stored into memory at 2052H).`;
    if (btn1) {
      btn1.textContent = 'In Register A';
      btn1.onclick = () => {
        btn1.classList.add('wrong');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-red); font-weight:700;">❌ Not in Register A:</span> A only holds 00H (the carry). The answer 08H was stored at 2052H.';
        }
      };
    }
    if (btn2) {
      btn2.textContent = 'In Memory at 2052H';
      btn2.onclick = () => {
        btn2.classList.add('correct');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-green); font-weight:700;">✅ Correct!</span> The sum (08H) is safely stored in RAM locker 2052H. Register A was later overwritten with the carry.';
        }
      };
    }
    if (btn3) {
      btn3.textContent = 'In the ALU';
      btn3.onclick = () => {
        btn3.classList.add('wrong');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-red); font-weight:700;">❌ Not in ALU:</span> The ALU calculates and passes the value to A; the final sum is stored at Memory 2052H.';
        }
      };
    }
  } else if (curKey === 'factorial') {
    const ans = cpu.memory[0x2051];
    head.textContent = `Done — the answer is ${ans} (${vizHex2(ans)}). It is stored at 2051H.`;
    note.textContent = `4! = 4 × 3 × 2 × 1 = 24 decimal (18 in hex). The loop completed all multiplication passes.`;
    if (btn1) {
      btn1.textContent = 'In Memory at 2051H';
      btn1.onclick = () => {
        btn1.classList.add('correct');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-green); font-weight:700;">✅ Correct!</span> 4! = 24 (18H) is saved at memory location 2051H.';
        }
      };
    }
    if (btn2) {
      btn2.textContent = 'In Register B';
      btn2.onclick = () => {
        btn2.classList.add('wrong');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-red); font-weight:700;">❌ Register B:</span> Register B was used as the inner multiplicand during computation.';
        }
      };
    }
    if (btn3) {
      btn3.textContent = 'In Register C';
      btn3.onclick = () => {
        btn3.classList.add('wrong');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-red); font-weight:700;">❌ Register C:</span> Register C was the loop counter that decremented down to 0.';
        }
      };
    }
  } else if (curKey === 'sixteen_bit_add') {
    const hlVal = cpu.getHL();
    const hlHex = vizHex4(hlVal);
    head.textContent = `Done — the answer is ${hlHex}. It is stored in HL pair and at 2054H.`;
    note.textContent = `1234H + 4321H = 5555H. Double addition completed cleanly using DAD D with Carry=0.`;
    if (btn1) {
      btn1.textContent = 'In HL & Memory 2054H';
      btn1.onclick = () => {
        btn1.classList.add('correct');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-green); font-weight:700;">✅ Correct!</span> 5555H is held in the HL register pair and stored in RAM at 2054H-2055H.';
        }
      };
    }
    if (btn2) {
      btn2.textContent = 'In Accumulator A';
      btn2.onclick = () => {
        btn2.classList.add('wrong');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-red); font-weight:700;">❌ Not in A:</span> DAD D performs 16-bit math directly in the HL pair without using Accumulator A.';
        }
      };
    }
    if (btn3) {
      btn3.textContent = 'In Stack Pointer SP';
      btn3.onclick = () => {
        btn3.classList.add('wrong');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-red); font-weight:700;">❌ Not in SP:</span> SP is the stack pointer for subroutine calls and pushes, not 16-bit arithmetic.';
        }
      };
    }
  } else if (curKey === 'stack_demo') {
    const ans = cpu.memory[0x2050];
    head.textContent = `Done — the answer is ${ans} (${vizHex2(ans)}). It is stored at 2050H.`;
    note.textContent = `7 doubled is 14 (0EH). Subroutine DOUBLE preserved BC via PUSH/POP and returned cleanly to 2008H.`;
    if (btn1) {
      btn1.textContent = 'In Memory at 2050H';
      btn1.onclick = () => {
        btn1.classList.add('correct');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-green); font-weight:700;">✅ Correct!</span> 0EH is saved at memory location 2050H by the STA instruction.';
        }
      };
    }
    if (btn2) {
      btn2.textContent = 'In Register B';
      btn2.onclick = () => {
        btn2.classList.add('wrong');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-red); font-weight:700;">❌ Register B:</span> Register B was preserved across the call and still holds original value 07H.';
        }
      };
    }
    if (btn3) {
      btn3.textContent = 'On the Stack';
      btn3.onclick = () => {
        btn3.classList.add('wrong');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-red); font-weight:700;">❌ On the Stack:</span> All pushed items (BC and return address) were popped off; stack is restored!';
        }
      };
    }
  } else {
    head.textContent = `Done — execution finished and CPU is HALTED.`;
    note.textContent = `All instructions executed. Inspect final register and memory states above.`;
    if (btn1) {
      btn1.textContent = 'In Memory Grid';
      btn1.onclick = () => {
        btn1.classList.add('correct');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-green); font-weight:700;">✅ Correct!</span> Results are stored in the memory grid.';
        }
      };
    }
    if (btn2) {
      btn2.textContent = 'In CPU Registers';
      btn2.onclick = () => {
        btn2.classList.add('correct');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-green); font-weight:700;">✅ Correct!</span> CPU registers hold the final computed values.';
        }
      };
    }
    if (btn3) {
      btn3.textContent = 'Program Completed';
      btn3.onclick = () => {
        btn3.classList.add('correct');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span style="color:var(--accent-green); font-weight:700;">✅ Correct!</span> Program executed to completion.';
        }
      };
    }
  }
  card.style.display = 'block';
}

function hideHaltSummary() {
  const card = document.getElementById('halt-summary-card');
  if (card) card.style.display = 'none';
}

/* Phase 4 — Demo Mode: one click loads the Addition example, sets demo data,
   switches to the Simulator pane, and plays it (visual only — text narration
   in the Now Executing panel, no voice). This is the recordable interactive
   video: screen-record this while it plays.
   Open with ?demo=1 in the URL to auto-start it (for recording). */
async function vizDemoMode() {
  loadSample('addition');
  await assembleCurrentCode();
  if (!currentProgram || currentProgram.total_errors > 0) return;
  vizPresetDemoData();
  const visualTab = document.querySelector('[data-target="pane-visual"]');
  if (visualTab) visualTab.click();
  vizSpeed = 0.25;
  const speedSel = document.getElementById('v-speed-sel');
  if (speedSel) speedSel.value = '0.25';
  vizReplay();
}
function vizReplay() {
  vizStopPlay();
  if (!currentProgram) return;
  loadProgramIntoCPU(currentProgram);
  vizShowStep(-1);
  hideHaltSummary();
}
function vizPresetDemoData() {
  // Addition example only: 2050H=05H, 2051H=03H. Explicit user action only.
  cpu.memory[0x2050] = 0x05; cpu.memory[0x2051] = 0x03;
  cpu.memory[0x2052] = 0x00; cpu.memory[0x2053] = 0x00;
  updateCpuDisplay(); renderMemoryGrid(0x2050);
  showToast('Demo data set: 2050H=05H, 2051H=03H. Press Play.');
}
/* Motion / VFX — visual only, no voice. Uses GSAP if it loaded, otherwise
   plain CSS classes. Every call is guarded so a missing library, a missing
   element, or a headless test harness can never break the CPU trace. */
function vizGsap(el, vars) {
  try {
    if (typeof gsap !== 'undefined' && gsap && el) { gsap.fromTo(el, { scale: 1 }, vars); return true; }
  } catch (e) { /* fall through to CSS */ }
  return false;
}
function vizFlashChanged(step) {
  if (!step) return;
  for (const c of step.changed) {
    if (c.kind === 'reg' || c.kind === 'pc' || c.kind === 'sp') {
      const id = VIZ_REG_IDS[c.name];
      if (!id) continue;
      const el = document.getElementById(id);
      if (!el) continue;
      const box = el.closest('.reg-box');
      if (box) {
        box.classList.remove('viz-changed'); void box.offsetWidth; box.classList.add('viz-changed');
        vizGsap(box, { scale: 1.06, duration: 0.3, yoyo: true, repeat: 1 });
        setTimeout(() => box.classList.remove('viz-changed'), 900);
      }
    }
  }
  if (step.memChange) {
    const cell = document.querySelector(`.mem-cell[data-addr="${step.memChange.address}"]`);
    if (cell) { cell.classList.add('viz-changed-cell'); setTimeout(() => cell.classList.remove('viz-changed-cell'), 900); }
  }
}

function vizBin8(v) { return (v & 0xFF).toString(2).padStart(8, '0'); }

function vizUpdatePanel(step) {
  updateStepSceneFocus(step);
  updateSvgArchitecture(step);
  updateChalkboard(step);
  updateVideoScrubber(step);
  updateChalkTrace();
  updateStoryboard(step);
  updatePhysicalMathBlocks(step);
  updateFloatingCallout(step);
}
function vizRenderTrace() {
  const tbody = document.getElementById('viz-trace-body');
  if (tbody) {
    tbody.innerHTML = '';
    if (vizTrace.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 16px;">No steps yet. Press Step or Play.</td></tr>`;
    } else {
      vizTrace.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.className = (i === vizIndex) ? 'viz-trace-active' : '';
        const changedShort = s.changed.filter(c => c.kind === 'reg' || c.kind === 'mem' || c.kind === 'sp').map(c => {
          if (c.kind === 'mem') return `${c.name}=${vizHex2(c.to)}`;
          if (c.kind === 'sp') return `SP=${vizHex4(c.to)}`;
          return `${c.name}=${vizHex2(c.to)}`;
        }).join(', ') || '—';
        tr.innerHTML = `<td>${s.step}</td><td class="hex-val">${s.addressHex}</td><td><strong>${s.mnemonic}</strong> ${s.operands}</td><td>${changedShort}</td><td>${s.tStates} T</td>`;
        tr.style.cursor = 'pointer';
        tr.title = s.narration;
        tr.addEventListener('click', () => { vizStopPlay(); vizShowStep(i); });
        tbody.appendChild(tr);
      });
    }
  }
  updateChalkTrace();
}

/* ==========================================================================
   WEB AUDIO API SOUND SYNTHESIZER (NO EXTERNAL ASSETS)
   ========================================================================== */
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { /* ignore */ }
  }
}

function playAudio(type) {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'bus') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.04);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'alu') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.05);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === 'flag') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'halt') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.22);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch (e) { /* audio fallback */ }
}

/* ==========================================================================
   SVG ARCHITECTURE DIAGRAM SYNCHRONIZATION
   ========================================================================== */
function updateSvgArchitecture(step) {
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  };

  // General Purpose Registers
  setTxt('svg-val-b', vizHex2(cpu.b));
  setTxt('svg-val-c', vizHex2(cpu.c));
  setTxt('svg-val-d', vizHex2(cpu.d));
  setTxt('svg-val-e', vizHex2(cpu.e));
  setTxt('svg-val-h', vizHex2(cpu.h));
  setTxt('svg-val-l', vizHex2(cpu.l));
  setTxt('svg-val-sp', vizHex4(cpu.sp));
  setTxt('svg-val-pc', vizHex4(cpu.pc));

  // Accumulator
  setTxt('svg-acc-val', `${vizHex2(cpu.a)} (${cpu.a})`);
  const binStr = vizBin8(cpu.a);
  setTxt('svg-acc-bin', binStr.slice(0, 4) + ' ' + binStr.slice(4));

  // Temp Register
  let tempVal = 0;
  if (step && step.alu) {
    tempVal = step.alu.op2;
  } else if (step && step.changed) {
    const r = step.changed.find(c => c.kind === 'reg' && c.name !== 'A');
    if (r) tempVal = r.to;
  }
  setTxt('svg-temp-val', `${vizHex2(tempVal)} (${tempVal})`);

  // Flags LEDs
  const setLed = (id, on) => {
    const el = document.getElementById(id);
    if (el) {
      if (on) el.classList.add('on');
      else el.classList.remove('on');
    }
  };
  setLed('svg-led-s', cpu.flags.s);
  setLed('svg-led-z', cpu.flags.z);
  setLed('svg-led-ac', cpu.flags.ac);
  setLed('svg-led-p', cpu.flags.p);
  setLed('svg-led-cy', cpu.flags.cy);

  // Instruction Register & Decoder
  if (step) {
    const rawByte = (step.bytes || '').split(' ')[0] || '00';
    setTxt('svg-ir-val', rawByte.endsWith('H') ? rawByte : rawByte + 'H');
    setTxt('svg-ir-text', `${step.mnemonic} ${step.operands}`.trim());
    setTxt('svg-ctrl-phase', cpu.halted ? 'HALTED' : 'EXECUTE');
    setTxt('svg-ctrl-tstates', `T-STATES: ${step.tStates}`);
  } else {
    setTxt('svg-ir-val', '00H');
    setTxt('svg-ir-text', 'OPCODE DECODER');
    setTxt('svg-ctrl-phase', 'READY');
    setTxt('svg-ctrl-tstates', 'T-STATE: T1');
  }

  // ALU
  const aluOp = document.getElementById('svg-alu-op');
  const aluCalc = document.getElementById('svg-alu-calc');
  if (step && step.alu) {
    if (aluOp) aluOp.textContent = step.alu.op;
    if (aluCalc) aluCalc.textContent = `${vizHex2(step.alu.op1)} ${step.alu.op} ${vizHex2(step.alu.op2)} = ${vizHex2(step.alu.result)}`;
  } else {
    if (aluOp) aluOp.textContent = '+';
    if (aluCalc) aluCalc.textContent = step ? 'ALU Idle' : '00H + 00H = 00H';
  }

  // Memory Box
  let memAddr = cpu.pc;
  if (step && step.mnemonic && ['PUSH', 'CALL'].includes(step.mnemonic)) {
    memAddr = cpu.sp;
  } else if (step && step.mnemonic && ['POP', 'RET'].includes(step.mnemonic)) {
    memAddr = step.before ? step.before.sp : cpu.sp;
  } else if (step && step.memChange) {
    memAddr = step.memChange.address;
  } else if (step && step.operands && /20[0-9A-Fa-f]{2}/.test(step.operands)) {
    const match = step.operands.match(/20[0-9A-Fa-f]{2}/);
    if (match) memAddr = parseInt(match[0], 16);
  }
  const memByte = cpu.memory[memAddr & 0xFFFF] || 0;
  setTxt('svg-mem-addr', vizHex4(memAddr));
  setTxt('svg-mem-val', vizHex2(memByte));
  setTxt('svg-mem-dec', `(${memByte})`);

  const dirText = document.getElementById('svg-mem-dir-text');
  if (dirText) {
    if (step && step.mnemonic && ['STA', 'STAX', 'SHLD'].includes(step.mnemonic)) dirText.textContent = 'WRITE';
    else if (step && step.mnemonic && ['PUSH', 'CALL'].includes(step.mnemonic)) dirText.textContent = 'WRITE (STACK)';
    else if (step && step.mnemonic && ['POP', 'RET'].includes(step.mnemonic)) dirText.textContent = 'READ (STACK)';
    else if (step && step.mnemonic && (['LDA', 'LDAX', 'LHLD'].includes(step.mnemonic) || step.operands.includes('M'))) dirText.textContent = 'READ';
    else dirText.textContent = 'IDLE';
  }
}

/* ==========================================================================
   MACHINE CYCLE PHASE ANIMATION & GLIDING BUS DATA PACKETS
   ========================================================================== */
function animateMachineCycle(step) {
  if (!step) return;
  const chk = document.getElementById('chk-micro-cycles');
  const allowAnim = chk ? chk.checked : true;

  // Immediately update Instruction Register & Decoder so it never shows previous instruction
  const rawByte = (step.bytes || '').split(' ')[0] || '00';
  const irValEl = document.getElementById('svg-ir-val');
  if (irValEl) irValEl.textContent = rawByte.endsWith('H') ? rawByte : rawByte + 'H';
  const irTxtEl = document.getElementById('svg-ir-text');
  if (irTxtEl) irTxtEl.textContent = `${step.mnemonic} ${step.operands}`.trim();
  const ctrlPhaseEl = document.getElementById('svg-ctrl-phase');
  if (ctrlPhaseEl) ctrlPhaseEl.textContent = 'FETCH';
  const ctrlTstatesEl = document.getElementById('svg-ctrl-tstates');
  if (ctrlTstatesEl) ctrlTstatesEl.textContent = `T-STATES: ${step.tStates}`;

  // Sound effects
  if (step.alu) {
    playAudio('alu');
    if (step.after.flags.cy || step.after.flags.z) {
      setTimeout(() => playAudio('flag'), 160);
    }
  } else {
    playAudio('bus');
  }
  if (cpu.halted) {
    setTimeout(() => playAudio('halt'), 280);
  }

  if (!allowAnim) {
    updateSvgArchitecture(step);
    updateChalkboard(step);
    return;
  }

  const phaseTime = Math.min(Math.max(Math.floor(vizSpeedDelay() / 4.2), 180), 700);
  const animDur = (phaseTime / 1000) * 0.9;

  // Phase 1: Fetch
  setChalkPhase('fetch');
  const addrPkt = document.getElementById('svg-packet-addr');
  const addrTxt = document.getElementById('svg-packet-addr-text');
  if (addrPkt && addrTxt) {
    addrTxt.textContent = vizHex4(step.pcBefore).slice(0, 4);
    addrPkt.setAttribute('opacity', '1');
    addrPkt.setAttribute('transform', 'translate(685, 90)');
    if (typeof gsap !== 'undefined' && gsap) {
      gsap.to(addrPkt, {
        duration: animDur,
        ease: 'power1.inOut',
        x: 820,
        y: 420,
        onComplete: () => {
          gsap.to(addrPkt, { opacity: 0, duration: 0.15 });
        }
      });
    } else {
      setTimeout(() => { if (addrPkt) addrPkt.setAttribute('opacity', '0'); }, phaseTime);
    }
  }

  // Phase 2: Decode
  setTimeout(() => {
    setChalkPhase('decode');
    setTimeout(() => {
      // Phase 3: Execute
      setChalkPhase('execute');
      if (step.alu) {
        const aluPoly = document.querySelector('.svg-alu-poly');
        if (aluPoly) {
          aluPoly.style.stroke = '#34d399';
          aluPoly.style.filter = 'drop-shadow(0 0 24px #10b981)';
          setTimeout(() => {
            aluPoly.style.stroke = '#10b981';
            aluPoly.style.filter = 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.3))';
          }, Math.max(phaseTime, 300));
        }
      }

      // Glide Data Packet along internal Data Bus (D7-D0)
      const dataPkt = document.getElementById('svg-packet-data');
      const dataTxt = document.getElementById('svg-packet-data-text');
      if (dataPkt && dataTxt) {
        const m = (step.mnemonic || '').toUpperCase();
        const ops = step.operands || '';
        let startX = 815, endX = 260;
        let dataVal = step.alu ? step.alu.result : (step.after.a || 0);

        if (m === 'LDA' || m === 'LHLD' || ops.includes('M')) {
          startX = 815; endX = 260;
          dataVal = step.after.a;
        } else if (m === 'STA' || m === 'SHLD') {
          startX = 260; endX = 815;
          dataVal = step.before.a;
        } else if (m === 'MOV') {
          const parts = ops.split(',').map(s => s.trim());
          const dst = parts[0];
          const src = parts[1];
          dataVal = step.before[src.toLowerCase()] !== undefined ? step.before[src.toLowerCase()] : (step.after[dst.toLowerCase()] || 0);
          if (src === 'M') { startX = 815; endX = (dst === 'A' ? 260 : 535); }
          else if (dst === 'M') { startX = (src === 'A' ? 260 : 535); endX = 815; }
          else if (src === 'A') { startX = 260; endX = 535; }
          else if (dst === 'A') { startX = 535; endX = 260; }
          else { startX = 535; endX = 535; }
        } else if (m === 'MVI') {
          const parts = ops.split(',').map(s => s.trim());
          startX = 120; endX = (parts[0] === 'A' ? 260 : 535);
          dataVal = step.after[parts[0].toLowerCase()] || 0;
        } else if (step.alu || ['ADD', 'ADC', 'SUB', 'SBB', 'CMP'].includes(m)) {
          startX = 535; endX = 260;
          dataVal = step.alu ? step.alu.result : step.after.a;
        } else if (m === 'PUSH') {
          startX = 535; endX = 815;
        } else if (m === 'POP') {
          startX = 815; endX = 535;
        }

        dataTxt.textContent = vizHex2(dataVal).slice(0, 3);
        dataPkt.setAttribute('opacity', '1');
        dataPkt.setAttribute('transform', `translate(${startX}, 175)`);
        if (typeof gsap !== 'undefined' && gsap) {
          gsap.to(dataPkt, {
            duration: animDur,
            ease: 'power1.inOut',
            x: endX,
            y: 175,
            onComplete: () => {
              gsap.to(dataPkt, { opacity: 0, duration: 0.15 });
            }
          });
        } else {
          setTimeout(() => { if (dataPkt) dataPkt.setAttribute('opacity', '0'); }, phaseTime);
        }
      }

      // Phase 4: Writeback
      setTimeout(() => {
        setChalkPhase('writeback');
        updateSvgArchitecture(step);
        updateChalkboard(step);
      }, phaseTime);
    }, phaseTime);
  }, phaseTime);
}

function setChalkPhase(phase) {
  const p1 = document.getElementById('phase-fetch');
  const p2 = document.getElementById('phase-decode');
  const p3 = document.getElementById('phase-execute');
  const p4 = document.getElementById('phase-writeback');
  [p1, p2, p3, p4].forEach(p => p && p.classList.remove('active'));

  if (phase === 'fetch' && p1) p1.classList.add('active');
  else if (phase === 'decode' && p2) p2.classList.add('active');
  else if (phase === 'execute' && p3) p3.classList.add('active');
  else if (phase === 'writeback' && p4) p4.classList.add('active');
}

/* ==========================================================================
   EXECUTION CHALKBOARD & STEP BREAKDOWN
   ========================================================================== */
function updateChalkboard(step) {
  const title = document.getElementById('v-chalk-title');
  const narr = document.getElementById('v-chalk-narration');
  const eq = document.getElementById('v-math-equation');
  const dec = document.getElementById('v-math-decimal');
  const bin = document.getElementById('v-math-binary');
  const flagsEx = document.getElementById('v-math-flags-explain');

  // Update 5-flag status pills
  const f = step && step.after ? step.after.flags : cpu.flags;
  const flagMap = [
    { id: 'cflag-s', label: 'S', val: f.s },
    { id: 'cflag-z', label: 'Z', val: f.z },
    { id: 'cflag-ac', label: 'AC', val: f.ac },
    { id: 'cflag-p', label: 'P', val: f.p },
    { id: 'cflag-cy', label: 'CY', val: f.cy }
  ];
  flagMap.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      el.textContent = `${item.label}: ${item.val ? 1 : 0}`;
      el.classList.toggle('active', !!item.val);
    }
  });

  if (!step) {
    if (title) title.textContent = 'Step 0: Ready — Select a Program or Press Start Simulation';
    if (narr) narr.textContent = 'Welcome to 8085 Visualizer! Click Start Simulation to watch the CPU execute instructions and calculate in the ALU step-by-step in real time.';
    if (eq) eq.textContent = 'No calculation in this step.';
    if (dec) dec.textContent = '';
    if (bin) bin.textContent = '';
    if (flagsEx) flagsEx.textContent = 'When an arithmetic or logic instruction runs, this chalkboard shows the full hex, decimal, and binary bit calculation with flags.';
    setChalkPhase('fetch');
    return;
  }

  if (title) title.textContent = `Step ${step.step}: ${step.mnemonic} ${step.operands}`;
  if (narr) narr.textContent = step.narration;

  if (step.alu) {
    const a = step.alu;
    const opSym = a.op;
    if (eq) eq.textContent = `${vizHex2(a.op1)} ${opSym} ${vizHex2(a.op2)} = ${vizHex2(a.result)}`;
    if (dec) dec.textContent = `Decimal: ${a.op1} ${opSym} ${a.op2} = ${a.result}`;
    if (bin) {
      bin.innerHTML = `
        <div>Reg A: &nbsp;&nbsp;&nbsp;&nbsp;${vizBin8(a.op1).split('').join(' ')} &nbsp;(${a.op1})</div>
        <div>Operand: &nbsp;${opSym} ${vizBin8(a.op2).split('').join(' ')} &nbsp;(${a.op2})</div>
        <div style="border-top: 1px dashed #475569; margin: 4px 0;"></div>
        <div style="color: var(--accent-green); font-weight:700;">Result: &nbsp;&nbsp;&nbsp;${vizBin8(a.result).split('').join(' ')} &nbsp;(${a.result})</div>
      `;
    }
    if (flagsEx) {
      const cyMsg = f.cy ? '⚠️ Carry Flag is 1 (overflow beyond 8 bits!)' : '✅ Carry Flag is 0 (result fits in 8 bits)';
      const zMsg = f.z ? ' • Zero Flag is 1 (result is 0)' : ' • Zero Flag is 0';
      const sMsg = f.s ? ' • Sign Flag is 1 (negative/MSB=1)' : ' • Sign Flag is 0';
      flagsEx.textContent = `${cyMsg}${zMsg}${sMsg}`;
    }
  } else if (step.mnemonic === 'CALL') {
    const retAddr = (step.pcBefore + 3) & 0xFFFF;
    const hi = (retAddr >> 8) & 0xFF;
    const lo = retAddr & 0xFF;
    if (eq) eq.textContent = `Pushed Return Address: ${vizHex4(retAddr)} onto Stack`;
    if (dec) dec.textContent = `Stack Pointer decremented: SP=${vizHex4(step.before.sp)} → SP=${vizHex4(step.after.sp)}`;
    if (bin) {
      bin.innerHTML = `
        <div>High Byte pushed at [${vizHex4((step.after.sp + 1) & 0xFFFF)}]: <strong>${vizHex2(hi)}</strong></div>
        <div>Low Byte pushed at [${vizHex4(step.after.sp)}]: <strong>${vizHex2(lo)}</strong></div>
        <div style="color: var(--accent-cyan); margin-top: 4px;">Next instruction after subroutine will resume at ${vizHex4(retAddr)}.</div>
      `;
    }
    if (flagsEx) flagsEx.textContent = `CALL saves return address ${vizHex4(retAddr)} onto stack. Flags are unaffected.`;
  } else if (step.mnemonic === 'RET') {
    if (eq) eq.textContent = `Popped Return Address: ${vizHex4(step.pcAfter)} from Stack`;
    if (dec) dec.textContent = `Stack Pointer incremented: SP=${vizHex4(step.before.sp)} → SP=${vizHex4(step.after.sp)}`;
    if (bin) bin.textContent = `Program Counter restored to ${vizHex4(step.pcAfter)}. Execution resumes immediately after the CALL instruction.`;
    if (flagsEx) flagsEx.textContent = `RET restores PC from stack. Flags are unaffected.`;
  } else if (step.mnemonic === 'PUSH') {
    const pair = (step.operands || '').trim();
    if (eq) eq.textContent = `Pushed Register Pair ${pair} onto Stack`;
    if (dec) dec.textContent = `Stack Pointer decremented: SP=${vizHex4(step.before.sp)} → SP=${vizHex4(step.after.sp)}`;
    if (bin) bin.textContent = `Pair ${pair} values stored at [${vizHex4((step.after.sp + 1) & 0xFFFF)}] and [${vizHex4(step.after.sp)}].`;
    if (flagsEx) flagsEx.textContent = `PUSH preserves registers onto stack. Flags are unaffected.`;
  } else if (step.mnemonic === 'POP') {
    const pair = (step.operands || '').trim();
    if (eq) eq.textContent = `Popped Register Pair ${pair} from Stack`;
    if (dec) dec.textContent = `Stack Pointer incremented: SP=${vizHex4(step.before.sp)} → SP=${vizHex4(step.after.sp)}`;
    if (bin) bin.textContent = `Restored register pair ${pair} from stack at [${vizHex4(step.before.sp)}] and [${vizHex4((step.before.sp + 1) & 0xFFFF)}].`;
    if (flagsEx) flagsEx.textContent = `POP restores registers from stack.`;
  } else {
    if (eq) eq.textContent = `No ALU calculation in this step.`;
    if (dec) dec.textContent = `Instruction type: ${step.mnemonic} (Data transfer / Branching)`;
    if (bin) bin.textContent = `Data movement occurred via the internal bus. ALU remained idle.`;
    if (flagsEx) flagsEx.textContent = `Flags were not modified by this instruction.`;
  }
}

function updateChalkTrace() {
  const tbody = document.getElementById('v-trace-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (vizTrace.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 14px;">No steps yet. Press Start Simulation or Next.</td></tr>`;
    return;
  }
  vizTrace.forEach((s, i) => {
    const tr = document.createElement('tr');
    tr.className = (i === vizIndex) ? 'viz-trace-active' : '';
    const changedShort = s.changed.filter(c => c.kind === 'reg' || c.kind === 'mem' || c.kind === 'sp').map(c => {
      if (c.kind === 'mem') return `${c.name}=${vizHex2(c.to)}`;
      if (c.kind === 'sp') return `SP=${vizHex4(c.to)}`;
      return `${c.name}=${vizHex2(c.to)}`;
    }).join(', ') || '—';
    tr.innerHTML = `<td>${s.step}</td><td class="hex-val">${s.addressHex}</td><td><strong>${s.mnemonic}</strong> ${s.operands}</td><td>${changedShort}</td><td>${s.tStates} T</td>`;
    tr.style.cursor = 'pointer';
    tr.title = s.narration;
    tr.addEventListener('click', () => { vizStopPlay(); vizShowStep(i); });
    tbody.appendChild(tr);
  });
}

function updateVideoScrubber(step) {
  const scrubber = document.getElementById('v-scrubber');
  const info = document.getElementById('v-step-info');
  const badge = document.getElementById('v-status-badge');
  const total = Math.max(vizTotalSteps, vizTrace.length);
  const current = vizIndex + 1; // 0 when vizIndex === -1

  if (scrubber) {
    scrubber.min = 0;
    scrubber.max = total;
    scrubber.value = Math.max(current, 0);
  }
  if (info) {
    info.textContent = `Step ${Math.max(current, 0)} / ${total}`;
  }
  if (badge) {
    if (cpu.halted || (total > 0 && current === total)) {
      badge.textContent = 'HALTED';
      badge.className = 'v-badge status-halted';
    } else if (vizPlaying) {
      badge.textContent = 'RUNNING';
      badge.className = 'v-badge status-running';
    } else if (current > 0) {
      badge.textContent = 'PAUSED';
      badge.className = 'v-badge status-paused';
    } else {
      badge.textContent = 'READY';
      badge.className = 'v-badge status-ready';
    }
  }
}

/* ==========================================================================
   VIDEO PLAYER TRANSPORT CONTROLS
   ========================================================================== */
function setupVideoControls() {
  const playBtn = document.getElementById('btn-vplay');
  if (playBtn) playBtn.addEventListener('click', async () => {
    if (!currentProgram) {
      await assembleCurrentCode();
      if (!currentProgram || currentProgram.total_errors > 0) return;
    }
    vizPlay();
    const isPlaying = vizPlaying;
    playBtn.textContent = isPlaying ? '⏸ Pause Simulation' : '▶ Start Simulation';
  });

  const btnIntro = document.getElementById('btn-intro-start');
  if (btnIntro) btnIntro.addEventListener('click', async () => {
    hideIntroCard();
    if (!currentProgram) {
      await assembleCurrentCode();
      if (!currentProgram || currentProgram.total_errors > 0) return;
    }
    vizPlay();
    if (playBtn) playBtn.textContent = '⏸ Pause Simulation';
  });

  const backBtn = document.getElementById('btn-vback');
  if (backBtn) backBtn.addEventListener('click', () => {
    vizStopPlay();
    vizShowStep(vizIndex - 1);
    if (voiceEnabled) speakCurrentStep();
  });

  const stepBtn = document.getElementById('btn-vstep');
  if (stepBtn) stepBtn.addEventListener('click', async () => {
    if (!currentProgram) {
      await assembleCurrentCode();
      if (!currentProgram || currentProgram.total_errors > 0) return;
    }
    vizStopPlay();
    vizStepOnce();
  });

  const replayBtn = document.getElementById('btn-vreplay');
  if (replayBtn) replayBtn.addEventListener('click', async () => {
    if (!currentProgram) {
      await assembleCurrentCode();
      if (!currentProgram || currentProgram.total_errors > 0) return;
    }
    vizReplay();
  });

  const resetBtn = document.getElementById('btn-vreset');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    vizStopPlay();
    resetCPU();
    hideHaltSummary();
    showToast('CPU & Visualizer Reset');
  });

  // Voice Narrator Controls (SpeechSynthesis)
  const voiceToggleBtn = document.getElementById('btn-voice-toggle');
  if (voiceToggleBtn) {
    voiceToggleBtn.addEventListener('click', () => {
      voiceEnabled = !voiceEnabled;
      try {
        localStorage.setItem('8085_voice_enabled', String(voiceEnabled));
      } catch (e) {}
      updateVoiceUI();
      if (!voiceEnabled) {
        cancelSpeech();
        showToast('Voice: OFF (Visual mode only)');
      } else {
        showToast('Voice: ON (AI Teacher Narrator active)');
        repeatCurrentStep();
      }
    });
  }

  const voiceRepeatBtn = document.getElementById('btn-voice-repeat');
  if (voiceRepeatBtn) {
    voiceRepeatBtn.addEventListener('click', () => {
      repeatCurrentStep();
    });
  }

  const voiceMuteBtn = document.getElementById('btn-voice-mute');
  if (voiceMuteBtn) {
    voiceMuteBtn.addEventListener('click', () => {
      cancelSpeech();
      showToast('Voice muted');
    });
  }

  const voiceSelect = document.getElementById('voice-select');
  if (voiceSelect) {
    voiceSelect.addEventListener('change', () => {
      const v = availableVoices.find(item => item.name === voiceSelect.value);
      if (v) {
        selectedVoice = v;
        try {
          localStorage.setItem('8085_selected_voice_name', v.name);
        } catch (e) {}
        showToast(`Voice changed to: ${v.name}`);
        if (voiceEnabled) repeatCurrentStep();
      }
    });
  }

  const voiceSpeedSlider = document.getElementById('voice-speed-slider');
  const voiceSpeedVal = document.getElementById('voice-speed-val');
  if (voiceSpeedSlider) {
    voiceSpeedSlider.addEventListener('input', (e) => {
      const idx = parseInt(e.target.value, 10);
      voiceSpeedIndex = idx;
      currentVoiceRate = VOICE_RATES[idx];
      if (voiceSpeedVal) voiceSpeedVal.textContent = VOICE_LABELS[idx];
      try {
        localStorage.setItem('8085_voice_speed_index', String(idx));
      } catch (e) {}
      showToast(`Voice speed: ${VOICE_LABELS[idx]}`);
      if (voiceEnabled) repeatCurrentStep();
    });
  }

  const speedSel = document.getElementById('v-speed-sel');
  if (speedSel) {
    speedSel.addEventListener('change', (e) => {
      vizSpeed = parseFloat(e.target.value) || 0.25;
    });
  }

  const scrubber = document.getElementById('v-scrubber');
  if (scrubber) {
    const onScrub = (e) => {
      vizStopPlay();
      const val = parseInt(e.target.value, 10);
      vizShowStep(val - 1);
    };
    scrubber.addEventListener('input', onScrub);
    scrubber.addEventListener('change', onScrub);
  }

  const soundBtn = document.getElementById('btn-sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundBtn.textContent = soundEnabled ? '🔊 Audio: ON' : '🔇 Audio: OFF';
      soundBtn.style.color = soundEnabled ? 'var(--accent-cyan)' : 'var(--text-muted)';
      showToast(soundEnabled ? 'CPU Sound Effects: Enabled' : 'CPU Sound Effects: Muted');
      if (soundEnabled) playAudio('bus');
    });
  }

  const expandBtn = document.getElementById('btn-expand-viz');
  if (expandBtn) {
    expandBtn.addEventListener('click', () => {
      const layout = document.querySelector('.viz-studio-layout');
      if (!layout) return;
      const isExp = layout.classList.toggle('viz-expanded');
      expandBtn.textContent = isExp ? '❐ Side-by-Side View' : '⛶ Expand View';
      expandBtn.classList.toggle('active', isExp);
      showToast(isExp ? 'Architecture Visualizer Expanded to Full Width' : 'Switched to Side-by-Side View');
    });
  }
}

/* ==========================================================================
   ARCHITECTURE FOCUS / SPOTLIGHT TOOL
   ========================================================================== */
function setupSpotlight() {
  const bar = document.querySelector('.component-spotlight-bar');
  if (!bar) return;
  const svg = document.getElementById('svg-cpu');
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-spotlight');
    if (!btn || !svg) return;
    bar.querySelectorAll('.btn-spotlight').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    svg.classList.remove('spotlight-alu', 'spotlight-bus', 'spotlight-regs', 'spotlight-mem');
    const target = btn.dataset.spotlight;
    if (target && target !== 'clear') {
      svg.classList.add(`spotlight-${target}`);
      showToast(`Focus: ${btn.textContent.trim()}`);
    } else {
      showToast('Focus cleared: Full Architecture View');
    }
  });
}

/* ==========================================================================
   INTERACTIVE QUICK MATH CALCULATOR (ZERO ASSEMBLY REQUIRED)
   ========================================================================== */
function setupCustomCalculator() {
  const btn = document.getElementById('btn-custom-calc');
  const num1El = document.getElementById('custom-num1');
  const num2El = document.getElementById('custom-num2');
  const opEl = document.getElementById('custom-op');

  const updateCalcPrediction = () => {
    const p = document.getElementById('calc-prediction');
    if (!p || !num1El || !num2El || !opEl) return;
    const parseVal = (str) => {
      let s = str.toUpperCase().replace(/H$/, '');
      let v = parseInt(s, 16);
      if (isNaN(v)) v = parseInt(str, 10);
      return isNaN(v) ? 0 : (v & 0xFF);
    };
    const n1 = parseVal(num1El.value.trim());
    const n2 = parseVal(num2El.value.trim());
    const op = opEl.value;
    let res = 0;
    if (op === 'ADD') {
      res = (n1 + n2) & 0xFF;
      const cy = (n1 + n2 > 255) ? ' (⚠️ Carry light will turn ON!)' : '';
      p.innerHTML = `💡 <strong>Predicted Story:</strong> ${n1} + ${n2} = ${res} (${vizHex2(res)})${cy}. Press button to watch CPU do it!`;
    } else if (op === 'SUB') {
      res = (n1 - n2) & 0xFF;
      const cy = (n1 < n2) ? ' (⚠️ Borrow light will turn ON!)' : '';
      p.innerHTML = `💡 <strong>Predicted Story:</strong> ${n1} - ${n2} = ${res} (${vizHex2(res)})${cy}. Press button to watch CPU do it!`;
    } else if (op === 'MULT') {
      res = (n1 * n2) & 0xFFFF;
      p.innerHTML = `💡 <strong>Predicted Story:</strong> ${n1} × ${n2} = ${res} (${vizHex4(res)}). Press button to watch CPU do it!`;
    } else if (op === 'CMP') {
      const cmp = n1 === n2 ? 'EQUAL (Z=1)' : (n1 > n2 ? 'GREATER (CY=0, Z=0)' : 'LESS (CY=1)');
      p.innerHTML = `💡 <strong>Predicted Story:</strong> Compare ${n1} with ${n2} → Result: ${cmp}. Press button to watch CPU do it!`;
    }
  };

  if (num1El) num1El.addEventListener('input', updateCalcPrediction);
  if (num2El) num2El.addEventListener('input', updateCalcPrediction);
  if (opEl) opEl.addEventListener('change', updateCalcPrediction);
  updateCalcPrediction();

  if (!btn) return;
  btn.addEventListener('click', async () => {
    const n1Raw = document.getElementById('custom-num1').value.trim();
    const n2Raw = document.getElementById('custom-num2').value.trim();
    const op = document.getElementById('custom-op').value;

    const parseVal = (str) => {
      let s = str.toUpperCase().replace(/H$/, '');
      let v = parseInt(s, 16);
      if (isNaN(v)) v = parseInt(str, 10);
      return isNaN(v) ? 0 : (v & 0xFF);
    };

    const n1 = parseVal(n1Raw);
    const n2 = parseVal(n2Raw);
    const n1Hex = (n1 & 0xFF).toString(16).toUpperCase().padStart(2, '0') + 'H';
    const n2Hex = (n2 & 0xFF).toString(16).toUpperCase().padStart(2, '0') + 'H';

    let asm = '';
    if (op === 'ADD') {
      asm = `; Custom Addition: ${n1Hex} + ${n2Hex}
ORG 2000H
START:  MVI A, ${n1Hex}   ; Load first number into Accumulator
        MVI B, ${n2Hex}   ; Load second number into Register B
        ADD B            ; Add B to A
        STA 2052H        ; Store sum to memory 2052H
        HLT              ; Stop CPU
        END`;
    } else if (op === 'SUB') {
      asm = `; Custom Subtraction: ${n1Hex} - ${n2Hex}
ORG 2000H
START:  MVI A, ${n1Hex}   ; Load minuend into Accumulator
        MVI B, ${n2Hex}   ; Load subtrahend into Register B
        SUB B            ; Subtract B from A
        STA 2052H        ; Store difference to memory 2052H
        HLT              ; Stop CPU
        END`;
    } else if (op === 'MULT') {
      asm = `; Custom Multiplication: ${n1Hex} x ${n2Hex}
ORG 2000H
START:  MVI D, 00H       ; High byte
        LDA 2050H        ; Multiplicand
        MOV B, A
        LDA 2051H        ; Multiplier
        MOV C, A
        CPI 00H
        JZ DONE
        MVI A, 00H       ; Product accumulator
MULT:   ADD B
        JNC SKIP
        INR D
SKIP:   DCR C
        JNZ MULT
DONE:   STA 2052H
        MOV A, D
        STA 2053H
        HLT
        END`;
    } else if (op === 'CMP') {
      asm = `; Custom Comparison: Compare ${n1Hex} with ${n2Hex}
ORG 2000H
START:  MVI A, ${n1Hex}   ; Load A
        MVI B, ${n2Hex}   ; Load B
        CMP B            ; Compare A with B
        HLT
        END`;
    }

    const editor = document.getElementById('code-editor');
    if (editor) {
      editor.value = asm;
      const highlightEl = document.getElementById('code-highlight');
      if (highlightEl) highlightEl.innerHTML = highlight8085(asm);
      const lines = asm.split('\n').length;
      let nums = '';
      for (let i = 1; i <= Math.max(lines, 1); i++) nums += i + '\n';
      const lineNumbers = document.getElementById('line-numbers');
      if (lineNumbers) lineNumbers.textContent = nums;
    }
    await assembleCurrentCode();
    if (op === 'MULT') {
      cpu.memory[0x2050] = n1;
      cpu.memory[0x2051] = n2;
      updateCpuDisplay();
      renderMemoryGrid(0x2050);
    }
    const visualTab = document.querySelector('[data-target="pane-visual"]');
    if (visualTab) visualTab.click();
    vizStopPlay();
    vizEstimateTotalSteps();
    vizShowStep(-1);
    showToast(`Loaded calculation: ${n1Hex} ${op} ${n2Hex}.`);
  });
}

/* ==========================================================================
   FEATURED PROGRAMS DECK
   ========================================================================== */
const FEATURED_PROGRAMS = {
  1: {
    name: '8-Bit Addition & The Accumulator',
    sample: 'addition',
    data: () => { cpu.memory[0x2050] = 0x05; cpu.memory[0x2051] = 0x03; },
    spotlight: 'alu'
  },
  2: {
    name: 'Carry Flag & 8-Bit Overflow (255+1)',
    sample: 'addition',
    data: () => { cpu.memory[0x2050] = 0xFF; cpu.memory[0x2051] = 0x01; },
    spotlight: 'alu'
  },
  3: {
    name: 'Subtraction & Borrow Flag (CY)',
    sample: 'subtraction',
    data: () => { cpu.memory[0x2050] = 0x0A; cpu.memory[0x2051] = 0x04; },
    spotlight: 'alu'
  },
  4: {
    name: 'The 3-Step Fetch-Decode-Execute Cycle',
    sample: 'addition',
    data: () => { cpu.memory[0x2050] = 0x02; cpu.memory[0x2051] = 0x02; },
    spotlight: 'bus'
  },
  5: {
    name: 'Memory Pointer & The HL Register Pair',
    sample: 'largest',
    data: () => {
      cpu.memory[0x204F] = 0x04;
      cpu.memory[0x2050] = 0x12; cpu.memory[0x2051] = 0x45;
      cpu.memory[0x2052] = 0x08; cpu.memory[0x2053] = 0x33;
    },
    spotlight: 'regs'
  },
  6: {
    name: 'Loops & Multiplication Algorithm',
    sample: 'multiplication',
    data: () => { cpu.memory[0x2050] = 0x03; cpu.memory[0x2051] = 0x04; },
    spotlight: 'alu'
  }
};
const CURRICULUM_LESSONS = FEATURED_PROGRAMS;

function setupCurriculumLessons() {
  document.querySelectorAll('.lesson-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.lesson-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const num = parseInt(btn.dataset.lesson, 10);
      const lesson = FEATURED_PROGRAMS[num];
      if (!lesson) return;
      const select = document.getElementById('sample-select');
      if (select) select.value = lesson.sample;
      loadSample(lesson.sample);
      await assembleCurrentCode();
      if (lesson.data) lesson.data();
      updateCpuDisplay();
      renderMemoryGrid(0x2050);
      const spotBtn = document.querySelector(`.btn-spotlight[data-spotlight="${lesson.spotlight}"]`);
      if (spotBtn) spotBtn.click();
      document.querySelector('[data-target="pane-visual"]')?.click();
      vizStopPlay();
      vizEstimateTotalSteps();
      vizShowStep(-1);
      showToast(`Loaded ${lesson.name}`);
    });
  });
}

/* ==========================================================================
   1-CLICK PRESET BUTTONS
   ========================================================================== */
function setupPresetButtons() {
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      if (p === 'add-easy') document.querySelector('.lesson-btn[data-lesson="1"]')?.click();
      else if (p === 'add-carry') document.querySelector('.lesson-btn[data-lesson="2"]')?.click();
      else if (p === 'sub-borrow') document.querySelector('.lesson-btn[data-lesson="3"]')?.click();
      else if (p === 'mult-loop') document.querySelector('.lesson-btn[data-lesson="6"]')?.click();
      else if (p === 'find-max') document.querySelector('.lesson-btn[data-lesson="5"]')?.click();
    });
  });
}

/* ==========================================================================
   LIVE CPU STORYBOARD (PLAIN ENGLISH & EVERYDAY ANALOGIES FOR NON-IT LEARNERS)
   ========================================================================== */
function updateStoryboard(step) {
  const iconEl = document.getElementById('story-icon');
  const headEl = document.getElementById('story-headline');
  const detailEl = document.getElementById('story-detail');
  const analogyEl = document.getElementById('story-analogy');
  const pillEl = document.getElementById('story-mode-pill');
  if (!headEl || !detailEl) return;

  if (pillEl) {
    pillEl.textContent = eli5Mode ? '👶 Plain English Mode: ON' : '🔬 Technical Mode: ON';
    pillEl.className = eli5Mode ? 'story-mode-pill' : 'story-mode-pill technical';
  }

  if (!step) {
    if (iconEl) iconEl.textContent = '🤖';
    if (headEl) headEl.textContent = 'Ready: Click "▶ Start Simulation" or "Next" to watch the CPU execute';
    if (detailEl) detailEl.textContent = 'The CPU is like a smart robot chef with a Working Desk, Pockets for numbers, and a Pocket Calculator. It follows a recipe one step at a time.';
    if (analogyEl) {
      analogyEl.innerHTML = '💡 <strong>Everyday Analogy:</strong> Lockers (RAM) store raw ingredients. Working Desk (Accumulator) holds what the CPU is holding. The Calculator (ALU) does the math!';
    }
    const lines3 = document.getElementById('story-3lines');
    if (lines3) lines3.style.display = 'none';
    updateBranchDecision(null);
    return;
  }

  const m = (step.mnemonic || '').toUpperCase();
  const ops = step.operands || '';
  const opParts = ops.split(',').map(s => s.trim());

  if (!eli5Mode) {
    // Technical Hex / Assembly view
    if (iconEl) iconEl.textContent = '🔬';
    headEl.textContent = `[${vizHex4(step.pcBefore)}] ${m} ${ops} (Opcode: ${step.bytes || '—'})`;
    detailEl.innerHTML = `<strong>T-States:</strong> ${step.tStates} | <strong>Total Cycles:</strong> ${step.tStatesTotal} | <strong>PC:</strong> ${vizHex4(step.pcBefore)} → ${vizHex4(step.pcAfter)}<br>${step.narration}`;
    if (analogyEl) {
      const f = step.after.flags;
      analogyEl.innerHTML = `<strong>Flag Register (PSW):</strong> S=${f.s ? 1 : 0}, Z=${f.z ? 1 : 0}, AC=${f.ac ? 1 : 0}, P=${f.p ? 1 : 0}, CY=${f.cy ? 1 : 0} | <strong>A:</strong> ${vizHex2(step.after.a)} (${step.after.a}) | <strong>B:</strong> ${vizHex2(step.after.b)} | <strong>C:</strong> ${vizHex2(step.after.c)}`;
    }
    const lines3 = document.getElementById('story-3lines');
    if (lines3) lines3.style.display = 'none';
    updateBranchDecision(step, m, ops);
    return;
  }

  // Plain English / Everyday ELI5 Mode
  let icon = '⚙️';
  let headline = `${m} ${ops}`;
  let detail = step.narration;
  let analogy = 'The CPU moves bytes across its internal circuits.';

  if (currentSampleKey === 'addition' && step.step >= 1 && step.step <= 10) {
    headline = ADDITION_STORY_SENTENCES[step.step - 1];
    detail = ADDITION_STORY_SENTENCES[step.step - 1];
    const icons = ['📦', '📥', '📋', '📥', '➕', '🚦', '💾', '📋', '💾', '🛑'];
    icon = icons[step.step - 1] || '⚙️';
    analogy = `💡 <strong>Everyday Teacher Story:</strong> ${headline}`;
  } else if (m === 'MVI') {
    const reg = opParts[0];
    const val = opParts[1];
    const decVal = vizParseHexToken(val) ?? val;
    icon = '📥';
    if (reg === 'A') {
      headline = `Put number ${decVal} onto the Working Desk (Accumulator A)`;
      detail = `The CPU reads the number ${val} (${decVal} in decimal) directly from the instruction recipe and places it onto Working Desk A. Desk A now holds ${decVal}.`;
      analogy = `💡 <strong>Everyday Analogy:</strong> Like grabbing a notebook labeled "${decVal}" from your drawer and laying it open on your desk.`;
    } else {
      headline = `Put number ${decVal} into Pocket ${reg}`;
      detail = `The CPU takes the number ${val} (${decVal} in decimal) and tucks it into Pocket ${reg} for safekeeping so it can be used later.`;
      analogy = `💡 <strong>Everyday Analogy:</strong> Like putting $${decVal} into your left pocket until you need to pay for something.`;
    }
  } else if (m === 'MOV') {
    const dst = opParts[0];
    const src = opParts[1];
    icon = '📋';
    if (src === 'M') {
      const addr = ((step.before.h << 8) | step.before.l) & 0xFFFF;
      headline = `Read number from Memory Locker ${vizHex4(addr)} into ${dst === 'A' ? 'Working Desk A' : 'Pocket ' + dst}`;
      detail = `The HL registers point to Locker ${vizHex4(addr)}. The CPU reads the byte (${step.after[dst.toLowerCase()] || 0}) stored inside and copies it into ${dst}.`;
      analogy = `💡 <strong>Everyday Analogy:</strong> Like looking into locker #${vizHex4(addr)} and copying whatever is on that shelf onto your desk.`;
    } else if (dst === 'M') {
      const addr = ((step.before.h << 8) | step.before.l) & 0xFFFF;
      headline = `Copy from ${src === 'A' ? 'Working Desk A' : 'Pocket ' + src} into Memory Locker ${vizHex4(addr)}`;
      detail = `The CPU takes the value from ${src} (${step.before[src.toLowerCase()] || 0}) and saves it into Locker ${vizHex4(addr)}.`;
      analogy = `💡 <strong>Everyday Analogy:</strong> Like writing your current answer onto a sticky note and putting it inside locker #${vizHex4(addr)}.`;
    } else {
      const srcVal = step.before[src.toLowerCase()] || 0;
      headline = `Copy from Pocket ${src} to Pocket ${dst}`;
      detail = `The CPU copies the number (${srcVal}) from ${src} into ${dst}. Both pockets now hold ${srcVal}.`;
      analogy = `💡 <strong>Everyday Analogy:</strong> Like writing down the same number on two index cards so both pockets have a copy.`;
    }
  } else if (m === 'LDA') {
    const addr = opParts[0];
    const byteVal = step.after.a;
    icon = '🛒';
    headline = `Go to Storage Locker ${addr} and bring its number to Working Desk A`;
    detail = `The CPU sends Address ${addr} onto the 16-bit Address Bus. The Memory Unit sends back the byte (${byteVal} in decimal). The CPU places it on Working Desk A.`;
    analogy = `💡 <strong>Everyday Analogy:</strong> Like walking to grocery shelf #${addr}, picking up ${byteVal} apples, and bringing them to your cooking counter.`;
  } else if (m === 'STA') {
    const addr = opParts[0];
    const byteVal = step.before.a;
    icon = '💾';
    headline = `Save the answer (${byteVal}) from Working Desk A into Storage Locker ${addr}`;
    detail = `The CPU takes the final result (${byteVal}) from Desk A and writes it permanently into Memory Locker ${addr} over the 8-bit Data Bus.`;
    analogy = `💡 <strong>Everyday Analogy:</strong> Like boxing your finished cake and locking it away in locker #${addr} for grading!`;
  } else if (m === 'ADD' || m === 'ADI' || m === 'ADC') {
    icon = '➕';
    const a = step.alu;
    const op1 = a ? a.op1 : step.before.a;
    const op2 = a ? a.op2 : 0;
    const res = a ? a.result : step.after.a;
    headline = `Calculator ADD: ${op1} + ${op2} = ${res}`;
    detail = `The Pocket Calculator (ALU) turns on! It takes the number on Working Desk A (${op1}) and adds ${op2}. The total (${res}) is placed back onto Desk A.`;
    const cy = step.after.flags.cy;
    analogy = cy 
      ? `⚠️ <strong>8-Bit Overflow Alert:</strong> The result exceeded 255! The 8085 turned on the <strong>Carry Flag (CY=1)</strong> like an alarm bell to say "I need an extra digit!".`
      : `💡 <strong>Everyday Analogy:</strong> You had ${op1} coins on your desk, added ${op2} more, and now you have ${res} coins on your desk!`;
  } else if (m === 'SUB' || m === 'SUI' || m === 'SBB') {
    icon = '➖';
    const a = step.alu;
    const op1 = a ? a.op1 : step.before.a;
    const op2 = a ? a.op2 : 0;
    const res = a ? a.result : step.after.a;
    headline = `Calculator SUBTRACT: ${op1} − ${op2} = ${res}`;
    detail = `The Calculator (ALU) takes the number on Desk A (${op1}) and subtracts ${op2}. Desk A now has the difference (${res}).`;
    const cy = step.after.flags.cy;
    analogy = cy
      ? `⚠️ <strong>Borrow Flag Alert:</strong> You tried to subtract a bigger number from a smaller number, so the Carry/Borrow flag (CY=1) turned on!`
      : `💡 <strong>Everyday Analogy:</strong> You had ${op1} cookies on your desk and ate ${op2}. You have ${res} left!`;
  } else if (m === 'INR') {
    const reg = opParts[0];
    const prev = (step.before[reg.toLowerCase()] !== undefined) ? step.before[reg.toLowerCase()] : 0;
    const curr = (step.after[reg.toLowerCase()] !== undefined) ? step.after[reg.toLowerCase()] : prev + 1;
    icon = '📈';
    headline = `Count Up: Add 1 to ${reg === 'A' ? 'Working Desk A' : 'Pocket ' + reg}`;
    detail = `The CPU increments ${reg} by 1: from ${prev} to ${curr}.`;
    analogy = `💡 <strong>Everyday Analogy:</strong> Like clicking a handheld tally counter once to count up. Note: INR does NOT affect the Carry Flag in 8085!`;
  } else if (m === 'DCR') {
    const reg = opParts[0];
    const prev = (step.before[reg.toLowerCase()] !== undefined) ? step.before[reg.toLowerCase()] : 0;
    const curr = (step.after[reg.toLowerCase()] !== undefined) ? step.after[reg.toLowerCase()] : Math.max(0, prev - 1);
    icon = '📉';
    headline = `Countdown: Minus 1 from ${reg === 'A' ? 'Working Desk A' : 'Pocket ' + reg}`;
    detail = `The CPU counts down ${reg} by 1: from ${prev} to ${curr}. ${curr === 0 ? 'Pocket ' + reg + ' has now reached ZERO!' : ''}`;
    analogy = `💡 <strong>Everyday Analogy:</strong> Like a loop countdown timer: "How many times left to repeat? ${curr} times remaining."`;
  } else if (m === 'CPI' || m === 'CMP') {
    icon = '⚖️';
    const a = step.alu;
    const op1 = a ? a.op1 : step.before.a;
    const op2 = a ? a.op2 : 0;
    headline = `Compare: Compare Desk A (${op1}) with ${op2}`;
    detail = `The CPU does an internal subtraction (${op1} − ${op2}) without changing Desk A! It only updates the Zero Flag (Z) and Carry Flag (CY).`;
    const z = step.after.flags.z;
    const cy = step.after.flags.cy;
    if (z) analogy = `💡 <strong>Comparison Result:</strong> Both numbers are EQUAL! (Zero Flag Z=1).`;
    else if (cy) analogy = `💡 <strong>Comparison Result:</strong> Desk A (${op1}) is LESS than ${op2} (Carry Flag CY=1).`;
    else analogy = `💡 <strong>Comparison Result:</strong> Desk A (${op1}) is GREATER than ${op2} (CY=0, Z=0).`;
  } else if (m === 'JNZ') {
    icon = '🔀';
    const target = opParts[0];
    const jumped = step.pcAfter !== (step.pcBefore + (step.bytes ? step.bytes.split(' ').length : 3));
    headline = jumped ? `Decision: Loop condition NOT ZERO! Looping to ${target}` : `Decision: Zero reached! Continuing forward`;
    detail = jumped 
      ? `The Zero Flag is 0 (counter is still greater than 0). The CPU loops back to ${target} to repeat the calculation again!`
      : `The Zero Flag is 1 (counter reached 0). The loop has finished, so the CPU steps to the next line.`;
    analogy = `💡 <strong>Everyday Analogy:</strong> Like stirring soup: "Is the timer at 0? No? Stir another lap! Yes? Turn off the stove!"`;
  } else if (m === 'JZ') {
    icon = '🔀';
    const target = opParts[0];
    const jumped = step.pcAfter !== (step.pcBefore + (step.bytes ? step.bytes.split(' ').length : 3));
    headline = jumped ? `Decision: ZERO detected! Jumping to ${target}` : `Decision: Not zero. Continuing forward`;
    detail = jumped 
      ? `The Zero Flag is 1. The CPU jumps directly to ${target}.`
      : `The Zero Flag is 0. Condition not met, so the CPU continues to the next instruction in sequence.`;
    analogy = `💡 <strong>Everyday Analogy:</strong> Like a safety sensor: "If zero items remain, jump straight to the finish line!"`;
  } else if (m === 'JC' || m === 'JNC') {
    icon = '🚦';
    const target = opParts[0];
    const isJnc = m === 'JNC';
    const jumped = step.pcAfter !== (step.pcBefore + (step.bytes ? step.bytes.split(' ').length : 3));
    if (isJnc) {
      headline = jumped ? `Carry is 0, so JNC jumps to ${target}.` : `Carry is 1, so JNC continues forward.`;
      detail = jumped
        ? `Carry flag is 0 (no carry occurred). JNC condition is satisfied, so the CPU jumps to ${target}.`
        : `Carry flag is 1 (carry occurred). JNC condition not met, so the CPU continues to the next instruction in sequence.`;
      analogy = `Carry is 0, so JNC jumps to ${target}.`;
    } else {
      headline = jumped ? `Carry is 1, so JC jumps to ${target}.` : `Carry is 0, so JC continues forward.`;
      detail = jumped
        ? `Carry flag is 1 (carry occurred). JC condition is satisfied, so the CPU jumps to ${target}.`
        : `Carry flag is 0 (no carry). JC condition not met, so the CPU continues to the next instruction.`;
      analogy = `Carry is 1, so JC jumps to ${target}.`;
    }
  } else if (m === 'JMP') {
    icon = '🏃';
    const target = opParts[0];
    headline = `Jump: Go directly to address ${target}`;
    detail = `The CPU sets its Program Counter (PC) to ${target}. The next instruction fetched will be from that address.`;
    analogy = `💡 <strong>Everyday Analogy:</strong> Like turning directly to page 50 of your textbook.`;
  } else if (m === 'LXI') {
    const pair = opParts[0];
    const val = opParts[1];
    icon = '📍';
    headline = `Setup 16-Bit Pointer: Load Register Pair ${pair} with ${val}`;
    detail = `The 16-bit address ${val} is loaded into pair ${pair}. Pair H and L now act as the Memory Pointer "M" targeting RAM locker ${val}.`;
    analogy = `💡 <strong>Everyday Analogy:</strong> Like sticking a GPS bookmark at locker #${val} so you can reach in and grab things in one move!`;
  } else if (m === 'INX' || m === 'DCX') {
    const pair = opParts[0];
    icon = '🔄';
    headline = `Move Pointer: ${m === 'INX' ? 'Advance' : 'Rewind'} Register Pair ${pair}`;
    detail = `The 16-bit address in ${pair} is ${m === 'INX' ? 'incremented' : 'decremented'} by 1 to point to the next memory locker.`;
    analogy = `💡 <strong>Everyday Analogy:</strong> Like moving your finger to the very next row of a ledger book.`;
  } else if (m === 'PUSH') {
    icon = '📥';
    const pair = opParts[0];
    headline = `Stack PUSH: Save Register Pair ${pair} onto Stack`;
    detail = `The CPU pushes the 16-bit word from pair ${pair} into memory at Stack Pointer [${vizHex4(step.after.sp)}]. SP decrements by 2 (from ${vizHex4(step.before.sp)} to ${vizHex4(step.after.sp)}).`;
    analogy = `💡 <strong>Everyday Analogy:</strong> Like placing an important envelope into the top of a safe deposit stack and moving the pointer down.`;
  } else if (m === 'POP') {
    icon = '📤';
    const pair = opParts[0];
    headline = `Stack POP: Retrieve from Stack into Register Pair ${pair}`;
    detail = `The CPU reads the 16-bit word off the stack at [${vizHex4(step.before.sp)}] and restores it into pair ${pair}. SP increments by 2 (from ${vizHex4(step.before.sp)} to ${vizHex4(step.after.sp)}).`;
    analogy = `💡 <strong>Everyday Analogy:</strong> Like lifting the top tray off a spring dispenser — the last item pushed is the first item popped!`;
  } else if (m === 'CALL') {
    icon = '🔖';
    const target = opParts[0];
    const retAddr = (step.pcBefore + 3) & 0xFFFF;
    headline = `Subroutine CALL: Bookmark return address ${vizHex4(retAddr)} & jump to ${target}`;
    detail = `The CPU automatically saves return address ${vizHex4(retAddr)} onto the stack, then jumps to helper subroutine at ${target}. SP decrements to ${vizHex4(step.after.sp)}.`;
    analogy = `💡 <strong>Everyday Analogy:</strong> Like inserting a bookmark at page ${vizHex4(retAddr)} so you can flip to an appendix recipe, finish it, and find your way back!`;
  } else if (m === 'RET') {
    icon = '🔙';
    headline = `Subroutine RET: Pop bookmark & return to ${vizHex4(step.pcAfter)}`;
    detail = `The helper subroutine is done! The CPU pops the return address (${vizHex4(step.pcAfter)}) off the stack and sets PC back to it. SP is restored to ${vizHex4(step.after.sp)}.`;
    analogy = `💡 <strong>Everyday Analogy:</strong> Like flipping your book right back to your bookmark and resuming your work!`;
  } else if (m === 'DAD') {
    icon = '➕';
    const pair = opParts[0];
    const cy = step.after.flags.cy;
    headline = `16-Bit Double Addition: HL = HL + ${pair} (HL = ${vizHex4(cpu.getHL())})`;
    detail = `The CPU adds the 16-bit number in pair ${pair} directly into the HL register pair. Result: HL = ${vizHex4(cpu.getHL())}.`;
    analogy = cy
      ? `⚠️ <strong>16-Bit Carry Alert:</strong> The 16-bit addition exceeded FFFFH (65,535)! The Carry Flag (CY=1) was set.`
      : `💡 <strong>Everyday Analogy:</strong> Like doing big arithmetic with two 4-digit numbers all in one operation!`;
  } else if (m === 'HLT') {
    icon = '🛑';
    headline = 'STOP (Halt): The recipe is finished!';
    detail = 'The CPU has reached the end of the program and safely powers down. All calculations are complete!';
    analogy = '💡 <strong>Everyday Analogy:</strong> The cooking is done! The cake is ready on the table and the oven turns off.';
  }

  if (iconEl) iconEl.textContent = icon;
  headEl.textContent = headline;
  detailEl.innerHTML = detail;
  if (analogyEl) analogyEl.innerHTML = analogy;

  const lines3 = document.getElementById('story-3lines');
  const lineHap = document.getElementById('story-happened');
  const lineAns = document.getElementById('story-answer');
  const lineChg = document.getElementById('story-changed');

  if (lines3) {
    if (eli5Mode) {
      lines3.style.display = 'flex';
      let happened = headline;
      let whereAnswer = 'Result is in CPU registers / memory.';
      let whatChanged = (step.changed || []).map(c => `${c.label}: ${c.before} → ${c.after}`).join(', ') || 'No register changes.';

      if (currentSampleKey === 'addition' && step.step >= 1 && step.step <= 10) {
        happened = ADDITION_STORY_SENTENCES[step.step - 1];
        if (step.step === 1) {
          whereAnswer = "Carry box C is cleared to zero.";
          whatChanged = "Pocket C set to 00H.";
        } else if (step.step === 2) {
          whereAnswer = "Number 5 is resting on Main Desk A.";
          whatChanged = "Desk A loaded with 05H.";
        } else if (step.step === 3) {
          whereAnswer = "Number 5 is backed up in Helper Desk B.";
          whatChanged = "Desk B loaded with 05H.";
        } else if (step.step === 4) {
          whereAnswer = "Number 3 is now on Main Desk A.";
          whatChanged = "Desk A loaded with 03H.";
        } else if (step.step === 5) {
          whereAnswer = "The answer 8 (08H) is on Main Desk A.";
          whatChanged = "Desk A = 8. Carry light is OFF.";
        } else if (step.step === 6) {
          whereAnswer = "Jump condition met (no carry occurred).";
          whatChanged = "Program advances directly to NOCARRY.";
        } else if (step.step === 7) {
          whereAnswer = "The answer, 8, is safely saved in Box 2052H.";
          whatChanged = "RAM box 2052H holds 08H.";
        } else if (step.step === 8) {
          whereAnswer = "Desk A now holds the carry (0).";
          whatChanged = "Desk A holds 00H.";
        } else if (step.step === 9) {
          whereAnswer = "Carry 0 is stored into Memory Box 2053H.";
          whatChanged = "RAM box 2053H holds 00H.";
        } else if (step.step === 10) {
          whereAnswer = "Story completed. Answer 8 in 2052H, carry 0 in 2053H.";
          whatChanged = "CPU state is HALTED.";
        }
      } else if (step.alu || ['ADD', 'ADI', 'ADC', 'SUB', 'SUI', 'SBB'].includes(m)) {
        const a = step.alu;
        const op1 = a ? a.op1 : step.before.a;
        const op2 = a ? a.op2 : 0;
        const res = a ? a.result : step.after.a;
        const isAdd = m.startsWith('A') || (a && a.op === '+');
        happened = `Main Desk A had ${op1}. Operand was ${op2}. Calculator ${isAdd ? 'added' : 'subtracted'}: ${op1} ${isAdd ? '+' : '−'} ${op2} = ${res}.`;
        whereAnswer = `The answer ${res} (${vizHex2(res)}) is on Main Desk A.`;
        whatChanged = `Only Desk A changed (was ${op1}, now ${res}). ${step.after.flags.cy ? '⚠️ Carry light turned ON!' : 'Carry light is OFF.'}`;
      } else if (m === 'LDA') {
        happened = `CPU fetched number ${step.after.a} (${vizHex2(step.after.a)}) from Shelf Box ${ops} onto Main Desk A.`;
        whereAnswer = `Number ${step.after.a} is now on Main Desk A.`;
        whatChanged = `Main Desk A changed to ${step.after.a} (${vizHex2(step.after.a)}).`;
      } else if (m === 'STA') {
        happened = `CPU stored number ${step.before.a} (${vizHex2(step.before.a)}) from Main Desk A into Shelf Box ${ops}.`;
        whereAnswer = `The answer is safely saved in Memory Box ${ops}.`;
        whatChanged = `Memory at ${ops} saved ${vizHex2(step.before.a)}. Desk A is unchanged.`;
      } else if (m === 'MOV') {
        const parts = ops.split(',').map(s => s.trim());
        const dst = parts[0];
        const src = parts[1];
        happened = `CPU copied number from ${src === 'A' ? 'Main Desk A' : src} into ${dst === 'A' ? 'Main Desk A' : dst}.`;
        whereAnswer = `Value is now available in ${dst}.`;
        whatChanged = `Only ${dst} updated.`;
      } else if (m === 'MVI') {
        const parts = ops.split(',').map(s => s.trim());
        const reg = parts[0];
        const val = parts[1];
        happened = `CPU loaded number ${val} into ${reg === 'A' ? 'Main Desk A' : 'Helper Desk ' + reg}.`;
        whereAnswer = `Number is resting on ${reg === 'A' ? 'Main Desk A' : 'Desk ' + reg}.`;
        whatChanged = `Only Desk ${reg} updated.`;
      } else if (m === 'HLT') {
        happened = `Program finished! CPU halted execution.`;
        whereAnswer = `All final answers are preserved in their shelf memory boxes.`;
        whatChanged = `CPU state is HALTED.`;
      }

      if (lineHap) lineHap.textContent = happened;
      if (lineAns) lineAns.textContent = whereAnswer;
      if (lineChg) lineChg.textContent = whatChanged;
    } else {
      lines3.style.display = 'none';
    }
  }

  updateBranchDecision(step, m, ops);
}

function updateBranchDecision(step, m, ops) {
  const branchEl = document.getElementById('story-branch-decision');
  if (!branchEl) return;
  if (!step) {
    branchEl.style.display = 'none';
    branchEl.innerHTML = '';
    return;
  }
  const isJump = ['JMP', 'JNZ', 'JZ', 'JC', 'JNC', 'JPO', 'JPE', 'JP', 'JM'].includes(m);
  if (!isJump) {
    branchEl.style.display = 'none';
    branchEl.innerHTML = '';
    return;
  }
  const targetStr = ops.trim();
  const seqAddr = (step.pcBefore + (step.bytes ? step.bytes.split(' ').length : 3)) & 0xFFFF;
  const targetAddr = step.pcAfter;
  const taken = step.pcAfter !== seqAddr || m === 'JMP';

  let condText = 'Unconditional Jump';
  let flagStatus = 'No condition required';
  if (m === 'JNZ') { condText = 'Jump if Not Zero (Z == 0)'; flagStatus = `Zero Flag Z = ${step.before.flags.z}`; }
  else if (m === 'JZ') { condText = 'Jump if Zero (Z == 1)'; flagStatus = `Zero Flag Z = ${step.before.flags.z}`; }
  else if (m === 'JC') { condText = 'Jump if Carry (CY == 1)'; flagStatus = `Carry Flag CY = ${step.before.flags.cy}`; }
  else if (m === 'JNC') { condText = 'Jump if No Carry (CY == 0)'; flagStatus = `Carry Flag CY = ${step.before.flags.cy}`; }
  else if (m === 'JP') { condText = 'Jump if Positive (S == 0)'; flagStatus = `Sign Flag S = ${step.before.flags.s}`; }
  else if (m === 'JM') { condText = 'Jump if Minus (S == 1)'; flagStatus = `Sign Flag S = ${step.before.flags.s}`; }
  else if (m === 'JPE') { condText = 'Jump if Parity Even (P == 1)'; flagStatus = `Parity Flag P = ${step.before.flags.p}`; }
  else if (m === 'JPO') { condText = 'Jump if Parity Odd (P == 0)'; flagStatus = `Parity Flag P = ${step.before.flags.p}`; }

  branchEl.innerHTML = `
    <div class="branch-meta">
      <span>🔀 Branch Crossroads (${m})</span>
      <span class="branch-cond-badge">${condText} • ${flagStatus}</span>
    </div>
    <div class="branch-fork-container">
      <div class="branch-path ${taken ? 'active branch-taken' : ''}">
        <div class="branch-path-title">${taken ? '✅ DETOUR TAKEN' : 'DETOUR (NOT TAKEN)'}</div>
        <div class="branch-path-target">➔ Jump to ${targetStr} (${vizHex4(targetAddr)})</div>
      </div>
      <div class="branch-path ${!taken ? 'active branch-skipped' : ''}">
        <div class="branch-path-title">${!taken ? '⏩ CONTINUE FORWARD' : 'FORWARD (SKIPPED)'}</div>
        <div class="branch-path-target">➔ Step to next instruction (${vizHex4(seqAddr)})</div>
      </div>
    </div>
  `;
  branchEl.style.display = 'flex';
}

/* ==========================================================================
   PHYSICAL MATH BLOCKS (WITH VISUAL DOT COUNTERS FOR NON-IT LEARNERS)
   ========================================================================== */
function updatePhysicalMathBlocks(step) {
  const lbl1 = document.getElementById('math-block-lbl1');
  const val1 = document.getElementById('math-block-val1');
  const dots1 = document.getElementById('math-block-dots1');
  const opEl = document.getElementById('math-block-op');
  const lbl2 = document.getElementById('math-block-lbl2');
  const val2 = document.getElementById('math-block-val2');
  const dots2 = document.getElementById('math-block-dots2');
  const valRes = document.getElementById('math-block-val-res');
  const dotsRes = document.getElementById('math-block-dots-res');
  if (!val1 || !val2 || !valRes) return;

  const renderDots = (container, count) => {
    if (!container) return;
    container.innerHTML = '';
    const safeCount = Math.min(Math.max(count, 0), 24);
    for (let i = 0; i < safeCount; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot-item';
      container.appendChild(dot);
    }
    if (count > 24) {
      const more = document.createElement('span');
      more.style.fontSize = '10px';
      more.style.color = 'var(--text-muted)';
      more.style.marginLeft = '4px';
      more.textContent = `+${count - 24}`;
      container.appendChild(more);
    }
  };

  if (!step || !step.alu) {
    const curA = step ? (step.after.a || 0) : (cpu.a || 0);
    if (lbl1) lbl1.textContent = 'Desk A (Accumulator)';
    val1.textContent = `${curA} (${vizHex2(curA)})`;
    renderDots(dots1, curA);

    if (opEl) opEl.textContent = '—';
    if (lbl2) lbl2.textContent = 'Operand';
    val2.textContent = '—';
    if (dots2) dots2.innerHTML = '';

    valRes.textContent = `${curA} (${vizHex2(curA)})`;
    renderDots(dotsRes, curA);
    return;
  }

  const a = step.alu;
  const op1 = a.op1;
  const op2 = a.op2;
  const res = a.result;
  const sym = (a.op === 'SUB' || a.op === '-') ? '−' : ((a.op === 'ADD' || a.op === '+') ? '+' : a.op);

  if (lbl1) lbl1.textContent = 'Desk A';
  val1.textContent = `${op1} (${vizHex2(op1)})`;
  renderDots(dots1, op1);

  if (opEl) opEl.textContent = sym;
  if (lbl2) {
    const src = step.operands ? step.operands.split(',').pop().trim() : 'Operand';
    lbl2.textContent = `Operand (${src})`;
  }
  val2.textContent = `${op2} (${vizHex2(op2)})`;
  renderDots(dots2, op2);

  valRes.textContent = `${res} (${vizHex2(res)})`;
  renderDots(dotsRes, res);
}

/* ==========================================================================
   FLOATING LIVE COMPONENT CALLOUT OVERLAY
   ========================================================================== */
function updateFloatingCallout(step) {
  const callout = document.getElementById('floating-callout');
  const textEl = document.getElementById('callout-bubble-text');
  if (!callout || !textEl) return;

  if (!step) {
    textEl.innerHTML = '👉 <strong>Ready:</strong> Click <strong>▶ Start Simulation</strong> or <strong>Next</strong> to begin!';
    return;
  }

  const m = (step.mnemonic || '').toUpperCase();
  const ops = step.operands || '';

  if (step.alu) {
    textEl.innerHTML = `⚡ <strong>ALU Active:</strong> Calculating ${step.alu.op1} ${step.alu.op} ${step.alu.op2} = ${step.alu.result}!`;
  } else if (m === 'PUSH' || m === 'CALL') {
    textEl.innerHTML = `📥 <strong>Stack Memory:</strong> Pushing data to Top-of-Stack at SP = ${vizHex4(step.after.sp)}!`;
  } else if (m === 'POP' || m === 'RET') {
    textEl.innerHTML = `📤 <strong>Stack Memory:</strong> Popping data from Stack, SP moved to ${vizHex4(step.after.sp)}!`;
  } else if (m === 'DAD') {
    textEl.innerHTML = `⚡ <strong>16-Bit ALU:</strong> HL = HL + ${ops} (HL = ${vizHex4(cpu.getHL())})!`;
  } else if (m === 'LDA' || m === 'STA' || ops.includes('M')) {
    const isWrite = m === 'STA' || ops.startsWith('M');
    textEl.innerHTML = `📦 <strong>Memory Bus:</strong> ${isWrite ? 'Saving to' : 'Reading from'} 64KB RAM!`;
  } else if (m === 'MVI' || m === 'MOV') {
    if (ops.startsWith('A') || ops.endsWith('A')) {
      textEl.innerHTML = `💼 <strong>Accumulator Desk:</strong> Updated to ${vizHex2(step.after.a)} (${step.after.a})!`;
    } else {
      textEl.innerHTML = `📁 <strong>Register Array:</strong> Storing data in pockets B, C, D, E, H, L!`;
    }
  } else if (m.startsWith('J')) {
    textEl.innerHTML = `🏃 <strong>Program Counter (PC):</strong> Branching to ${ops}!`;
  } else if (m === 'HLT') {
    textEl.innerHTML = `🛑 <strong>Execution Halted:</strong> CPU finished all instructions!`;
  } else {
    textEl.innerHTML = `💡 <strong>Executing:</strong> ${m} ${ops}`;
  }
}

/* ==========================================================================
   COMPONENT EXPLAINER (CLICK ANY PART ON DIAGRAM TO LEARN)
   ========================================================================== */
function setupComponentExplainer() {
  const barName = document.getElementById('explainer-active-name');
  const barDesc = document.getElementById('explainer-active-desc');
  if (!barName || !barDesc) return;

  const COMPONENT_INFO = {
    'node-acc': {
      name: 'Working Desk (Accumulator A)',
      desc: '<strong>The Working Desk (Accumulator A):</strong> The primary 8-bit register of the 8085 CPU. Think of it like your personal kitchen counter: whenever you do addition, subtraction, or logic, one of the ingredients must be on this desk, and the final answer always lands right back on this desk.'
    },
    'node-alu': {
      name: 'Pocket Calculator (Arithmetic Logic Unit - ALU)',
      desc: '<strong>Arithmetic Logic Unit (ALU):</strong> The CPU\'s electronic pocket calculator. It has 8-bit adders and logic gates that can add (+), subtract (−), AND, OR, and compare two numbers in nanoseconds. It updates the Flags register based on whether there was overflow or zero.'
    },
    'node-flags': {
      name: 'Dashboard Lights (Flags Register / PSW)',
      desc: '<strong>Flags Register (PSW):</strong> Think of this like the warning lights on a car dashboard: <strong>CY (Carry)</strong> lights up when addition overflows beyond 255 or subtraction borrows. <strong>Z (Zero)</strong> lights up when an answer equals zero. <strong>S (Sign)</strong> lights up when a number is negative.'
    },
    'node-regs': {
      name: 'Pockets & Shelves (Registers B, C, D, E, H, L)',
      desc: '<strong>General Purpose Registers (B, C, D, E, H, L):</strong> 8-bit storage slots inside the CPU. If the Accumulator is your working desk, these registers are your pockets and desktop shelves where you can hold intermediate numbers without having to walk all the way to memory.'
    },
    'node-ptrs': {
      name: 'Bookmarks (Program Counter PC & Stack Pointer SP)',
      desc: '<strong>Pointer Registers (PC & SP):</strong> The <strong>Program Counter (PC)</strong> is a 16-bit register holding the address of the next instruction to fetch from memory (it increments automatically like turning textbook pages). The <strong>Stack Pointer (SP)</strong> tracks subroutines and interrupts.'
    },
    'node-mem': {
      name: 'Storage Lockers (64KB RAM Memory)',
      desc: '<strong>64KB External RAM (Memory):</strong> An array of 65,536 storage lockers numbered from 0000H to FFFFH. Each locker holds exactly one 8-bit byte. The CPU uses the 16-bit Address Bus to pick which locker to open, and the 8-bit Data Bus to read or write.'
    },
    'node-ir': {
      name: 'Recipe Reader (Instruction Register & Decoder)',
      desc: '<strong>Instruction Register & Opcode Decoder:</strong> When the CPU fetches a machine-code byte from RAM, it places it here. The decoder reads the binary patterns (like 80H for ADD B) and tells the Timing & Control Unit which electronic switches to flip.'
    },
    'node-ctrl': {
      name: 'Conductor / Brain (Timing & Control Unit)',
      desc: '<strong>Timing & Control Unit:</strong> The orchestra conductor of the microprocessor. Synchronized by a quartz crystal clock, it generates read (RD), write (WR), and memory/IO signals to coordinate the ALU, registers, and memory.'
    },
    'svg-path-addr': {
      name: '16-bit Address Highway (Address Bus A15-A0)',
      desc: '<strong>16-Bit Unidirectional Address Bus:</strong> A bundle of 16 copper wires carrying the memory address (from 0000H to FFFFH) from the CPU outward to the RAM chips. Because 2¹⁶ = 65,536, the 8085 can address up to 64 Kilobytes.'
    },
    'svg-path-data-main': {
      name: '8-bit Data Highway (Data Bus D7-D0)',
      desc: '<strong>8-Bit Bidirectional Data Bus:</strong> A two-way 8-lane data highway that transports numbers, opcodes, and calculation results between the CPU registers, the ALU, and external RAM.'
    }
  };

  Object.keys(COMPONENT_INFO).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      const info = COMPONENT_INFO[id];
      if (!info) return;
      barName.textContent = info.name;
      barDesc.innerHTML = info.desc;
      showToast(`Inspecting: ${info.name}`);

      // Temporary highlight flash on clicked element
      el.classList.add('spotlight-pulse');
      setTimeout(() => el.classList.remove('spotlight-pulse'), 1200);
    });
  });
}

/* ==========================================================================
   STORYBOARD CONTROLS (PLAIN ENGLISH TOGGLE & AUTO-PAUSE)
   ========================================================================== */
function setupStoryboardControls() {
  const toggleEli5Btn = document.getElementById('btn-toggle-eli5');
  if (toggleEli5Btn) {
    toggleEli5Btn.addEventListener('click', () => {
      eli5Mode = !eli5Mode;
      toggleEli5Btn.textContent = eli5Mode ? '🔬 Toggle Technical View' : '👶 Toggle Plain English';
      const step = (vizIndex >= 0 && vizIndex < vizTrace.length) ? vizTrace[vizIndex] : null;
      updateStoryboard(step);
      showToast(eli5Mode ? 'Story Mode: Everyday English & Analogies' : 'Technical Mode: Machine Cycles & Bitmasks');
    });
  }

  const nextBtn = document.getElementById('btn-story-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      if (!currentProgram) {
        await assembleCurrentCode();
        if (!currentProgram || currentProgram.total_errors > 0) return;
      }
      vizStopPlay();
      if (cpu.halted) {
        showToast('CPU is Halted! Press "Replay Simulation" or pick another Program to restart.');
        return;
      }
      vizStepOnce();
    });
  }

  const pauseChk = document.getElementById('chk-auto-pause');
  if (pauseChk) {
    pauseChk.checked = autoPauseEachStep;
    pauseChk.addEventListener('change', (e) => {
      autoPauseEachStep = e.target.checked;
      showToast(autoPauseEachStep 
        ? 'Pause Per Step enabled: Visualizer will pause after each step for easy reading'
        : 'Continuous Playback enabled');
    });
  }
}

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
  setupThemeSelector();
  setupNavigation();
  setupEditor();
  setupSampleSelector();
  setupControls();
  setupVideoControls();
  setupSpotlight();
  setupCustomCalculator();
  setupCurriculumLessons();
  setupPresetButtons();
  setupStoryboardControls();
  setupComponentExplainer();
  initVoiceSynthesis();
  renderMemoryGrid(0x2000);

  // Auto-assemble default sample so video visualizer is ready immediately without clicking assemble!
  loadSample('addition');
  vizPresetDemoData();
  currentProgram = clientAssemble(SAMPLES.addition);
  renderAssemblyResults(currentProgram);
  loadProgramIntoCPU(currentProgram);
  vizPresetDemoData();
  updateSvgArchitecture(null);
  updateChalkboard(null);
  updateVideoScrubber(null);
  updateStoryboard(null);
  updatePhysicalMathBlocks(null);
  updateFloatingCallout(null);

  // Phase 4 — ?demo=1 auto-starts Demo Mode (for screen-recording the video).
  try {
    if (typeof window !== 'undefined' && window.location && window.location.search && window.location.search.indexOf('demo=1') !== -1) {
      setTimeout(() => { vizDemoMode(); }, 600);
    }
  } catch (e) { /* ignore — demo auto-start is optional */ }
});

function setupThemeSelector() {
  const select = document.getElementById('theme-select');
  const saved = localStorage.getItem('theme_8085') || 'indigo';
  document.documentElement.setAttribute('data-theme', saved);
  if (select) {
    select.value = saved;
    select.addEventListener('change', (e) => {
      const chosen = e.target.value;
      document.documentElement.setAttribute('data-theme', chosen);
      localStorage.setItem('theme_8085', chosen);
    });
  }
}

function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(tab.dataset.target);
      if (targetPane) targetPane.classList.add('active');

      if (tab.dataset.target === 'pane-sim') {
        updateCpuDisplay();
        renderMemoryGrid(cpu.pc || 0x2000);
      }
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlight8085(code) {
  if (!code) return '';
  return code.split('\n').map(line => {
    const semiIdx = line.indexOf(';');
    let codePart = semiIdx !== -1 ? line.substring(0, semiIdx) : line;
    let commentPart = semiIdx !== -1 ? line.substring(semiIdx) : '';

    codePart = escapeHtml(codePart);
    commentPart = escapeHtml(commentPart);

    // Labels: e.g. START: or LOOP:
    codePart = codePart.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)(:)/g, '$1<span class="tok-label">$2</span>$3');

    // Assembler Directives
    codePart = codePart.replace(/\b(ORG|END|DB|DW|DS|EQU)\b/gi, '<span class="tok-directive">$1</span>');

    // 8085 Mnemonics
    const mnemonics = 'MOV|MVI|LDA|STA|LHLD|SHLD|LDAX|STAX|XCHG|ADD|ADC|ADI|SUB|SBB|SUI|ANA|ANI|XRA|XRI|ORA|ORI|CMP|CPI|INR|DCR|INX|DCX|DAD|DAA|JMP|JNZ|JZ|JNC|JC|JPO|JPE|JP|JM|CALL|CC|CNC|CZ|CNZ|CPE|CPO|CP|CM|RET|RC|RNC|RZ|RNZ|RPE|RPO|RP|RM|PUSH|POP|XTHL|SPHL|PCHL|NOP|HLT|DI|EI|RIM|SIM|RLC|RRC|RAL|RAR|CMA|CMC|STC';
    const mnemRegex = new RegExp(`\\b(${mnemonics})\\b`, 'gi');
    codePart = codePart.replace(mnemRegex, '<span class="tok-mnemonic">$1</span>');

    // Registers
    codePart = codePart.replace(/\b([ABCDEHLM]|SP|PSW)\b/g, '<span class="tok-reg">$1</span>');

    // Numbers (Hex like 2050H or 0X20 or Decimal)
    codePart = codePart.replace(/\b([0-9][0-9A-Fa-f]*H|0X[0-9A-Fa-f]+|\d+)\b/gi, '<span class="tok-num">$1</span>');

    return commentPart ? `${codePart}<span class="tok-comment">${commentPart}</span>` : codePart;
  }).join('\n');
}

function setupEditor() {
  const textarea = document.getElementById('code-editor');
  const lineNumbers = document.getElementById('line-numbers');
  const highlightEl = document.getElementById('code-highlight');

  function updateHighlight() {
    if (highlightEl && textarea) {
      highlightEl.innerHTML = highlight8085(textarea.value);
    }
  }

  function updateLines() {
    const lines = textarea.value.split('\n').length;
    let nums = '';
    for (let i = 1; i <= Math.max(lines, 1); i++) {
      nums += i + '\n';
    }
    lineNumbers.textContent = nums;
  }

  textarea.addEventListener('input', () => {
    updateLines();
    updateHighlight();
    if (currentProgram !== null) {
      clearListingOutput();
    }
  });

  textarea.addEventListener('scroll', () => {
    lineNumbers.scrollTop = textarea.scrollTop;
    if (highlightEl) {
      highlightEl.scrollTop = textarea.scrollTop;
      highlightEl.scrollLeft = textarea.scrollLeft;
    }
  });

  updateLines();
  updateHighlight();

  // Tab key indent in textarea
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 4;
      updateLines();
      updateHighlight();
    }
  });
}

function setupSampleSelector() {
  const select = document.getElementById('sample-select');
  select.addEventListener('change', (e) => {
    if (e.target.value && SAMPLES[e.target.value]) {
      loadSample(e.target.value);
      clearListingOutput();
    }
  });
}

function clearListingOutput() {
  currentProgram = null;
  document.getElementById('stat-bytes').textContent = '0';
  document.getElementById('stat-errors').textContent = '0';
  document.getElementById('stat-errors').className = 'stat-badge success';
  document.getElementById('stat-origin').textContent = '--';

  const tbody = document.getElementById('assembly-table-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
          <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px; color: var(--text-secondary);">No Machine Code Generated Yet</div>
          <div style="font-size: 12px; color: var(--text-muted);">Click <strong style="color: var(--accent-cyan);">Assemble (Pass 1 & 2)</strong> to generate machine code and listing.</div>
        </td>
      </tr>
    `;
  }

  const symTbody = document.getElementById('symbol-table-body');
  if (symTbody) {
    symTbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No symbols generated yet. Click Assemble.
        </td>
      </tr>
    `;
  }

  const hexPre = document.getElementById('hex-output');
  if (hexPre) {
    hexPre.textContent = '// Machine code will appear here after clicking Assemble.';
  }
}

function loadSample(key) {
  currentSampleKey = key;
  // Clear memory before loading any program so no program ever reads another program's leftover data
  cpu.memory.fill(0);
  const textarea = document.getElementById('code-editor');
  const highlightEl = document.getElementById('code-highlight');
  const sampleSelect = document.getElementById('sample-select');
  if (sampleSelect && sampleSelect.value !== key) {
    sampleSelect.value = key;
  }
  if (SAMPLES[key]) {
    textarea.value = SAMPLES[key];
    const lines = textarea.value.split('\n').length;
    let nums = '';
    for (let i = 1; i <= lines; i++) nums += i + '\n';
    document.getElementById('line-numbers').textContent = nums;
    if (highlightEl) {
      highlightEl.innerHTML = highlight8085(textarea.value);
    }
  }
  // Program-specific preset data
  if (key === 'factorial') {
    cpu.memory[0x2050] = 0x04; // 4! = 24 (18H)
  } else if (key === 'addition') {
    cpu.memory[0x2050] = 0x05;
    cpu.memory[0x2051] = 0x03;
  }
}

function setupControls() {
  document.getElementById('btn-assemble').addEventListener('click', assembleCurrentCode);
  document.getElementById('btn-reset').addEventListener('click', resetCPU);

  // Memory navigation
  const memInput = document.getElementById('mem-goto-addr');
  if (memInput) {
    memInput.addEventListener('change', () => {
      let addr = parseInt(memInput.value.replace(/H$/i, ''), 16);
      if (isNaN(addr)) addr = 0x2000;
      renderMemoryGrid(addr);
    });
  }

  // Export buttons
  const btnHex = document.getElementById('btn-download-hex');
  if (btnHex) btnHex.addEventListener('click', downloadHexFile);

  const btnLst = document.getElementById('btn-download-lst');
  if (btnLst) btnLst.addEventListener('click', downloadListingFile);

  const btnCopyHex = document.getElementById('btn-copy-hex');
  if (btnCopyHex) btnCopyHex.addEventListener('click', copyHexToClipboard);
}

// Assemble source code
async function assembleCurrentCode() {
  const code = document.getElementById('code-editor').value;

  // Try backend API first, fallback to client-side assembler
  try {
    const res = await fetch('/api/assemble', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: code })
    });
    if (res.ok) {
      currentProgram = await res.json();
      renderAssemblyResults(currentProgram);
      loadProgramIntoCPU(currentProgram);
      showToast('Assembled successfully via 8085 C Core Engine!');
      return;
    }
  } catch (err) {
    // Backend offline, fallback to client JS assembler
  }

  currentProgram = clientAssemble(code);
  renderAssemblyResults(currentProgram);
  loadProgramIntoCPU(currentProgram);
  showToast('Assembled successfully (Client Engine)');
}

// Client-side Two-Pass Assembler
function clientAssemble(source) {
  const lines = source.split(/\r?\n/);
  const prog = {
    total_bytes: 0,
    total_errors: 0,
    origin_address: 0,
    origin_hex: '0000',
    symbols: [],
    lines: []
  };

  const symbolTable = {};
  let currentLc = 0;
  let originSet = false;

  // Instruction byte sizes and opcodes map
  const OP_SIZES = {
    'NOP': 1, 'HLT': 1, 'DI': 1, 'EI': 1, 'RIM': 1, 'SIM': 1,
    'RLC': 1, 'RRC': 1, 'RAL': 1, 'RAR': 1, 'DAA': 1, 'CMA': 1,
    'STC': 1, 'CMC': 1, 'XCHG': 1, 'XTHL': 1, 'SPHL': 1, 'PCHL': 1,
    'RET': 1, 'RNZ': 1, 'RZ': 1, 'RNC': 1, 'RC': 1, 'RPO': 1, 'RPE': 1, 'RP': 1, 'RM': 1,
    'MOV': 1, 'ADD': 1, 'ADC': 1, 'SUB': 1, 'SBB': 1, 'ANA': 1, 'XRA': 1, 'ORA': 1, 'CMP': 1,
    'INR': 1, 'DCR': 1, 'INX': 1, 'DCX': 1, 'DAD': 1, 'PUSH': 1, 'POP': 1, 'STAX': 1, 'LDAX': 1,
    'MVI': 2, 'ADI': 2, 'ACI': 2, 'SUI': 2, 'SBI': 2, 'ANI': 2, 'XRI': 2, 'ORI': 2, 'CPI': 2, 'IN': 2, 'OUT': 2,
    'LXI': 3, 'LDA': 3, 'STA': 3, 'LHLD': 3, 'SHLD': 3,
    'JMP': 3, 'JNZ': 3, 'JZ': 3, 'JNC': 3, 'JC': 3, 'JPO': 3, 'JPE': 3, 'JP': 3, 'JM': 3,
    'CALL': 3, 'CNZ': 3, 'CZ': 3, 'CNC': 3, 'CC': 3, 'CPO': 3, 'CPE': 3, 'CP': 3, 'CM': 3,
    'RST': 1
  };

  // PASS 1: Symbols and LC
  lines.forEach((raw, idx) => {
    let line = raw.split(';')[0].trim();
    if (!line) return;

    let label = '';
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      label = line.substring(0, colonIdx).trim();
      line = line.substring(colonIdx + 1).trim();
      if (label) {
        symbolTable[label.toUpperCase()] = currentLc;
        prog.symbols.push({ name: label, address: currentLc, hex: currentLc.toString(16).toUpperCase().padStart(4, '0'), line: idx + 1 });
      }
    }

    if (!line) return;

    const parts = line.split(/\s+/);
    const mnem = parts[0].toUpperCase();
    const ops = parts.slice(1).join(' ');

    if (mnem === 'ORG' || mnem === '.ORG') {
      const val = parseNum(ops);
      currentLc = val;
      if (!originSet) {
        prog.origin_address = val;
        prog.origin_hex = val.toString(16).toUpperCase().padStart(4, '0');
        originSet = true;
      }
    } else if (mnem === 'EQU') {
      if (label) {
        const val = parseNum(ops);
        symbolTable[label.toUpperCase()] = val;
      }
    } else if (mnem === 'DB') {
      const items = ops.split(',');
      currentLc += items.length;
    } else if (mnem === 'DW') {
      const items = ops.split(',');
      currentLc += items.length * 2;
    } else if (mnem === 'DS') {
      currentLc += parseNum(ops);
    } else if (mnem === 'END') {
      // stop
    } else if (OP_SIZES[mnem]) {
      currentLc += OP_SIZES[mnem];
    }
  });

  // PASS 2: Code Generation
  currentLc = prog.origin_address;
  lines.forEach((raw, idx) => {
    let line = raw.split(';')[0].trim();
    let label = '';
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      label = line.substring(0, colonIdx).trim();
      line = line.substring(colonIdx + 1).trim();
    }

    const lineRes = {
      line: idx + 1,
      address: currentLc,
      address_hex: currentLc.toString(16).toUpperCase().padStart(4, '0'),
      label: label,
      mnemonic: '',
      operands: '',
      t_states: 0,
      byte_count: 0,
      bytes: [],
      has_code: false,
      error: ''
    };

    if (!line) {
      prog.lines.push(lineRes);
      return;
    }

    const parts = line.split(/\s+/);
    const mnem = parts[0].toUpperCase();
    const ops = parts.slice(1).join(' ');
    lineRes.mnemonic = mnem;
    lineRes.operands = ops;

    if (mnem === 'ORG') {
      currentLc = parseNum(ops);
      lineRes.address = currentLc;
      lineRes.address_hex = currentLc.toString(16).toUpperCase().padStart(4, '0');
    } else if (mnem === 'DB') {
      const items = ops.split(',');
      items.forEach(it => {
        it = it.trim();
        let b = 0;
        if (it.startsWith("'") || it.startsWith('"')) {
          b = it.charCodeAt(1);
        } else if (symbolTable[it.toUpperCase()] !== undefined) {
          b = symbolTable[it.toUpperCase()] & 0xFF;
        } else {
          b = parseNum(it) & 0xFF;
        }
        lineRes.bytes.push(b.toString(16).toUpperCase().padStart(2, '0'));
      });
      lineRes.has_code = true;
      lineRes.byte_count = lineRes.bytes.length;
      currentLc += lineRes.byte_count;
      prog.total_bytes += lineRes.byte_count;
    } else if (mnem === 'DW') {
      const items = ops.split(',');
      items.forEach(it => {
        it = it.trim();
        let w = symbolTable[it.toUpperCase()] !== undefined ? symbolTable[it.toUpperCase()] : parseNum(it);
        lineRes.bytes.push((w & 0xFF).toString(16).toUpperCase().padStart(2, '0'));
        lineRes.bytes.push(((w >> 8) & 0xFF).toString(16).toUpperCase().padStart(2, '0'));
      });
      lineRes.has_code = true;
      lineRes.byte_count = lineRes.bytes.length;
      currentLc += lineRes.byte_count;
      prog.total_bytes += lineRes.byte_count;
    } else if (mnem === 'END') {
      // end
    } else if (OP_SIZES[mnem]) {
      const codeBytes = encodeInstruction(mnem, ops, symbolTable);
      lineRes.bytes = codeBytes;
      lineRes.byte_count = codeBytes.length;
      lineRes.has_code = true;
      lineRes.t_states = getTStates(mnem, ops);
      currentLc += lineRes.byte_count;
      prog.total_bytes += lineRes.byte_count;
    } else {
      lineRes.error = `Unknown mnemonic ${mnem}`;
      prog.total_errors++;
    }

    prog.lines.push(lineRes);
  });

  return prog;
}

function parseNum(str) {
  if (!str) return 0;
  str = str.trim().toUpperCase();
  if (str.endsWith('H')) {
    return parseInt(str.slice(0, -1), 16) || 0;
  }
  if (str.startsWith('0X')) {
    return parseInt(str.slice(2), 16) || 0;
  }
  return parseInt(str, 10) || 0;
}

function encodeInstruction(mnem, ops, symbols) {
  const regs = { 'B': 0, 'C': 1, 'D': 2, 'E': 3, 'H': 4, 'L': 5, 'M': 6, 'A': 7 };
  const pairs = { 'B': 0, 'D': 1, 'H': 2, 'SP': 3 };
  const stackPairs = { 'B': 0, 'D': 1, 'H': 2, 'PSW': 3 };

  function hexByte(n) {
    return (n & 0xFF).toString(16).toUpperCase().padStart(2, '0');
  }

  function resolveWord(tok) {
    tok = tok.trim().toUpperCase();
    if (symbols[tok] !== undefined) return symbols[tok];
    return parseNum(tok);
  }

  if (mnem === 'NOP') return ['00'];
  if (mnem === 'HLT') return ['76'];
  if (mnem === 'XCHG') return ['EB'];
  if (mnem === 'CMA') return ['2F'];
  if (mnem === 'CMC') return ['3F'];
  if (mnem === 'STC') return ['37'];
  if (mnem === 'MOV') {
    const p = ops.split(',');
    const dst = regs[p[0].trim().toUpperCase()];
    const src = regs[p[1].trim().toUpperCase()];
    return [hexByte(0x40 | (dst << 3) | src)];
  }
  if (mnem === 'MVI') {
    const p = ops.split(',');
    const r = regs[p[0].trim().toUpperCase()];
    const d8 = resolveWord(p[1]);
    return [hexByte(0x06 | (r << 3)), hexByte(d8)];
  }
  if (mnem === 'LXI') {
    const p = ops.split(',');
    const rp = pairs[p[0].trim().toUpperCase()];
    const w = resolveWord(p[1]);
    return [hexByte(0x01 | (rp << 4)), hexByte(w & 0xFF), hexByte(w >> 8)];
  }
  if (mnem === 'LDA') {
    const w = resolveWord(ops);
    return ['3A', hexByte(w & 0xFF), hexByte(w >> 8)];
  }
  if (mnem === 'STA') {
    const w = resolveWord(ops);
    return ['32', hexByte(w & 0xFF), hexByte(w >> 8)];
  }
  if (mnem === 'LHLD') {
    const w = resolveWord(ops);
    return ['2A', hexByte(w & 0xFF), hexByte(w >> 8)];
  }
  if (mnem === 'SHLD') {
    const w = resolveWord(ops);
    return ['22', hexByte(w & 0xFF), hexByte(w >> 8)];
  }
  if (mnem === 'JMP') {
    const w = resolveWord(ops);
    return ['C3', hexByte(w & 0xFF), hexByte(w >> 8)];
  }
  const JUMPS = { 'JNZ': 'C2', 'JZ': 'CA', 'JNC': 'D2', 'JC': 'DA', 'JPO': 'E2', 'JPE': 'EA', 'JP': 'F2', 'JM': 'FA' };
  if (JUMPS[mnem]) {
    const w = resolveWord(ops);
    return [JUMPS[mnem], hexByte(w & 0xFF), hexByte(w >> 8)];
  }
  if (mnem === 'ADD') return [hexByte(0x80 | regs[ops.trim().toUpperCase()])];
  if (mnem === 'ADC') return [hexByte(0x88 | regs[ops.trim().toUpperCase()])];
  if (mnem === 'SUB') return [hexByte(0x90 | regs[ops.trim().toUpperCase()])];
  if (mnem === 'SBB') return [hexByte(0x98 | regs[ops.trim().toUpperCase()])];
  if (mnem === 'ANA') return [hexByte(0xA0 | regs[ops.trim().toUpperCase()])];
  if (mnem === 'XRA') return [hexByte(0xA8 | regs[ops.trim().toUpperCase()])];
  if (mnem === 'ORA') return [hexByte(0xB0 | regs[ops.trim().toUpperCase()])];
  if (mnem === 'CMP') return [hexByte(0xB8 | regs[ops.trim().toUpperCase()])];
  if (mnem === 'INR') return [hexByte(0x04 | (regs[ops.trim().toUpperCase()] << 3))];
  if (mnem === 'DCR') return [hexByte(0x05 | (regs[ops.trim().toUpperCase()] << 3))];
  if (mnem === 'INX') return [hexByte(0x03 | (pairs[ops.trim().toUpperCase()] << 4))];
  if (mnem === 'DCX') return [hexByte(0x0B | (pairs[ops.trim().toUpperCase()] << 4))];
  if (mnem === 'DAD') return [hexByte(0x09 | (pairs[ops.trim().toUpperCase()] << 4))];
  if (mnem === 'CPI') return ['FE', hexByte(resolveWord(ops))];
  if (mnem === 'ADI') return ['C6', hexByte(resolveWord(ops))];
  if (mnem === 'SUI') return ['D6', hexByte(resolveWord(ops))];
  if (mnem === 'ANI') return ['E6', hexByte(resolveWord(ops))];
  if (mnem === 'ORI') return ['F6', hexByte(resolveWord(ops))];
  if (mnem === 'XRI') return ['EE', hexByte(resolveWord(ops))];
  if (mnem === 'STAX') return [ops.trim().toUpperCase() === 'B' ? '02' : '12'];
  if (mnem === 'LDAX') return [ops.trim().toUpperCase() === 'B' ? '0A' : '1A'];
  if (mnem === 'PUSH') return [hexByte(0xC5 | (stackPairs[ops.trim().toUpperCase()] << 4))];
  if (mnem === 'POP') return [hexByte(0xC1 | (stackPairs[ops.trim().toUpperCase()] << 4))];
  if (mnem === 'RET') return ['C9'];
  if (mnem === 'CALL') {
    const w = resolveWord(ops);
    return ['CD', hexByte(w & 0xFF), hexByte(w >> 8)];
  }

  return ['00'];
}

function getTStates(mnem, ops) {
  if (mnem === 'NOP') return 4;
  if (mnem === 'HLT') return 5;
  if (mnem === 'CALL') return 18;
  if (mnem === 'RET') return 10;
  if (mnem === 'MOV') return ops.includes('M') ? 7 : 4;
  if (mnem === 'MVI') return ops.startsWith('M') ? 10 : 7;
  if (mnem === 'LXI') return 10;
  if (mnem === 'LDA' || mnem === 'STA') return 13;
  if (mnem === 'LHLD' || mnem === 'SHLD') return 16;
  if (mnem.startsWith('J')) return 10;
  if (mnem === 'ADD' || mnem === 'SUB' || mnem === 'CMP') return ops.includes('M') ? 7 : 4;
  if (mnem === 'INR' || mnem === 'DCR') return ops.includes('M') ? 10 : 4;
  if (mnem === 'INX' || mnem === 'DCX') return 6;
  if (mnem === 'DAD') return 10;
  if (mnem === 'PUSH') return 12;
  if (mnem === 'POP') return 10;
  return 4;
}

// Render assembly results to DOM
function renderAssemblyResults(prog) {
  document.getElementById('stat-bytes').textContent = prog.total_bytes;
  document.getElementById('stat-errors').textContent = prog.total_errors;
  document.getElementById('stat-origin').textContent = prog.origin_hex + 'H';

  const tbody = document.getElementById('assembly-table-body');
  tbody.innerHTML = '';

  prog.lines.forEach(l => {
    if (!l.has_code && !l.label && !l.mnemonic && !l.error) return;

    const tr = document.createElement('tr');
    tr.dataset.addr = l.address;
    if (l.error) tr.className = 'error-row';

    tr.innerHTML = `
      <td>${l.line}</td>
      <td class="hex-val">${l.address_hex}</td>
      <td class="code-bytes">${(l.bytes || []).join(' ')}</td>
      <td class="label-val">${l.label ? l.label + ':' : ''}</td>
      <td><strong>${l.mnemonic}</strong> ${l.operands}</td>
      <td class="t-states-val">${l.t_states ? l.t_states + ' T' : '--'}</td>
      <td>${l.byte_count ? l.byte_count + ' B' : '--'}</td>
    `;
    tbody.appendChild(tr);
  });

  // Render Symbols Table
  const symTbody = document.getElementById('symbol-table-body');
  if (symTbody) {
    symTbody.innerHTML = '';
    (prog.symbols || []).forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="label-val">${s.name}</td>
        <td class="hex-val">${s.hex}H</td>
        <td>${s.address}</td>
        <td>Line ${s.line}</td>
      `;
      symTbody.appendChild(tr);
    });
  }

  // Generate Intel HEX
  const hexText = generateIntelHex(prog);
  const hexPre = document.getElementById('hex-output');
  if (hexPre) hexPre.textContent = hexText;
}

function generateIntelHex(prog) {
  let output = '';
  let record = [];
  let recordAddr = 0;

  (prog.lines || []).forEach(l => {
    if (!l.has_code || !l.bytes || l.bytes.length === 0) return;
    l.bytes.forEach((bStr, idx) => {
      const b = parseInt(bStr, 16);
      const currAddr = l.address + idx;
      if (record.length === 0) {
        recordAddr = currAddr;
      } else if (currAddr !== recordAddr + record.length || record.length === 16) {
        output += formatHexRecord(recordAddr, record) + '\n';
        record = [];
        recordAddr = currAddr;
      }
      record.push(b);
    });
  });

  if (record.length > 0) {
    output += formatHexRecord(recordAddr, record) + '\n';
  }
  output += ':00000001FF\n';
  return output;
}

function formatHexRecord(addr, bytes) {
  let len = bytes.length;
  let chk = len + (addr >> 8) + (addr & 0xFF) + 0x00;
  let dataStr = '';
  bytes.forEach(b => {
    chk += b;
    dataStr += b.toString(16).toUpperCase().padStart(2, '0');
  });
  chk = (-(chk & 0xFF)) & 0xFF;
  return `:${len.toString(16).toUpperCase().padStart(2, '0')}${addr.toString(16).toUpperCase().padStart(4, '0')}00${dataStr}${chk.toString(16).toUpperCase().padStart(2, '0')}`;
}

// Load assembled code into Simulator
function loadProgramIntoCPU(prog) {
  vizStopPlay();
  vizTrace = [];
  vizIndex = -1;
  vizInitialSnapshot = null;
  cpu.reset();
  (prog.lines || []).forEach(l => {
    if (l.has_code && l.bytes) {
      l.bytes.forEach((bStr, idx) => {
        cpu.memory[(l.address + idx) & 0xFFFF] = parseInt(bStr, 16);
      });
    }
  });
  cpu.pc = prog.origin_address;
  updateCpuDisplay();
  vizEstimateTotalSteps();
  updateVideoScrubber(null);
  vizUpdatePanel(null);
  vizRenderTrace();
  hideHaltSummary();
  showIntroCard(currentSampleKey);
}

function updateCpuDisplay() {
  document.getElementById('reg-a').textContent = cpu.a.toString(16).toUpperCase().padStart(2, '0') + 'H';
  document.getElementById('reg-a-dec').textContent = cpu.a;
  document.getElementById('reg-b').textContent = cpu.b.toString(16).toUpperCase().padStart(2, '0') + 'H';
  document.getElementById('reg-b-dec').textContent = cpu.b;
  document.getElementById('reg-c').textContent = cpu.c.toString(16).toUpperCase().padStart(2, '0') + 'H';
  document.getElementById('reg-c-dec').textContent = cpu.c;
  document.getElementById('reg-d').textContent = cpu.d.toString(16).toUpperCase().padStart(2, '0') + 'H';
  document.getElementById('reg-d-dec').textContent = cpu.d;
  document.getElementById('reg-e').textContent = cpu.e.toString(16).toUpperCase().padStart(2, '0') + 'H';
  document.getElementById('reg-e-dec').textContent = cpu.e;
  document.getElementById('reg-h').textContent = cpu.h.toString(16).toUpperCase().padStart(2, '0') + 'H';
  document.getElementById('reg-h-dec').textContent = cpu.h;
  document.getElementById('reg-l').textContent = cpu.l.toString(16).toUpperCase().padStart(2, '0') + 'H';
  document.getElementById('reg-l-dec').textContent = cpu.l;

  const hlVal = cpu.getHL();
  document.getElementById('reg-m').textContent = cpu.memory[hlVal].toString(16).toUpperCase().padStart(2, '0') + 'H';
  document.getElementById('reg-m-dec').textContent = cpu.memory[hlVal];

  document.getElementById('reg-pc').textContent = cpu.pc.toString(16).toUpperCase().padStart(4, '0') + 'H';
  document.getElementById('reg-sp').textContent = cpu.sp.toString(16).toUpperCase().padStart(4, '0') + 'H';

  // Flags
  document.getElementById('flag-s').classList.toggle('on', !!cpu.flags.s);
  document.getElementById('flag-z').classList.toggle('on', !!cpu.flags.z);
  document.getElementById('flag-ac').classList.toggle('on', !!cpu.flags.ac);
  document.getElementById('flag-p').classList.toggle('on', !!cpu.flags.p);
  document.getElementById('flag-cy').classList.toggle('on', !!cpu.flags.cy);

  // Stats
  document.getElementById('sim-cycles').textContent = cpu.cycles;
  document.getElementById('sim-status').textContent = cpu.halted ? 'HALTED' : 'READY';
  document.getElementById('sim-status').style.color = cpu.halted ? 'var(--accent-red)' : 'var(--accent-green)';

  highlightActivePCOnTable();
}

function highlightActivePCOnTable() {
  document.querySelectorAll('#assembly-table-body tr').forEach(tr => {
    tr.classList.toggle('active-pc', parseInt(tr.dataset.addr) === cpu.pc);
  });
}

async function stepProgram() {
  if (!currentProgram) {
    await assembleCurrentCode();
    if (!currentProgram || currentProgram.total_errors > 0) {
      showToast('Cannot step: assembly errors detected.');
      return;
    }
  }
  if (cpu.halted) {
    showToast('CPU is HALTED. Click Reset to re-run.');
    return;
  }
  // Visualizer: record this step in the trace (same CPU engine, only observed).
  vizStepOnce();
}

async function runProgram() {
  if (!currentProgram) {
    await assembleCurrentCode();
  }
  if (!currentProgram || currentProgram.total_errors > 0) {
    showToast('Cannot run: assembly errors detected.');
    return;
  }
  if (cpu.halted) {
    resetCPU();
  }
  // Visualizer: instant Run, but still recorded in the trace so the user can
  // Step Back / click any trace row afterwards. (Play is the animated version.)
  vizStopPlay();
  let steps = 0;
  while (!cpu.halted && steps < 10000) {
    const s = vizDoOneStep();
    if (!s) break;
    steps++;
  }
  updateCpuDisplay();
  renderMemoryGrid(0x2050);
  vizUpdatePanel(vizTrace[vizTrace.length - 1] || null);
  vizRenderTrace();
  if (vizTrace.length) vizFlashChanged(vizTrace[vizTrace.length - 1]);
  showToast(`Executed ${steps} instructions. CPU Halted.`);
}

function resetCPU() {
  vizStopPlay();
  vizTrace = []; vizIndex = -1; vizInitialSnapshot = null;
  vizUpdatePanel(null); vizRenderTrace();
  if (currentProgram) {
    loadProgramIntoCPU(currentProgram);
    showToast('CPU Reset to Origin');
  } else {
    cpu.reset();
    updateCpuDisplay();
  }
}

// Memory Table Renderer
function renderMemoryGrid(startAddr) {
  const container = document.getElementById('memory-grid-body');
  if (!container) return;
  container.innerHTML = '';

  const alignedStart = startAddr & 0xFFF0;
  for (let row = 0; row < 16; row++) {
    const rowAddr = (alignedStart + row * 16) & 0xFFFF;
    const tr = document.createElement('tr');
    let cells = `<td class="mem-addr">${rowAddr.toString(16).toUpperCase().padStart(4, '0')}</td>`;

    for (let col = 0; col < 16; col++) {
      const cellAddr = (rowAddr + col) & 0xFFFF;
      const val = cpu.memory[cellAddr];
      const valHex = val.toString(16).toUpperCase().padStart(2, '0');
      const isPc = cellAddr === cpu.pc;
      const isNonzero = val !== 0;

      cells += `<td>
        <span class="mem-cell ${isPc ? 'active-addr' : ''} ${isNonzero ? 'nonzero' : ''}"
              data-addr="${cellAddr}"
              title="Address: ${cellAddr.toString(16).toUpperCase()}H">
          ${valHex}
        </span>
      </td>`;
    }

    tr.innerHTML = cells;
    container.appendChild(tr);
  }

  // Cell editing on click
  container.querySelectorAll('.mem-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      const addr = parseInt(cell.dataset.addr);
      const curr = cpu.memory[addr].toString(16).toUpperCase().padStart(2, '0');
      const input = prompt(`Enter Hex byte for address ${addr.toString(16).toUpperCase()}H (Current: ${curr}H):`, curr);
      if (input !== null) {
        const parsed = parseInt(input.replace(/H$/i, ''), 16);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 0xFF) {
          cpu.memory[addr] = parsed;
          renderMemoryGrid(startAddr);
          updateCpuDisplay();
        }
      }
    });
  });
}

// Download handlers
function downloadHexFile() {
  const hex = document.getElementById('hex-output').textContent;
  downloadBlob(hex, 'program.hex', 'text/plain');
}

function downloadListingFile() {
  let lst = "8085 Mini Assembler Program Listing\n";
  lst += "================================================================================\n";
  lst += "LINE  ADDR  MACHINE CODE      T-STATES  LABEL     INSTRUCTION\n";
  lst += "================================================================================\n";

  if (currentProgram && currentProgram.lines) {
    currentProgram.lines.forEach(l => {
      const bytesStr = (l.bytes || []).join(' ').padEnd(16, ' ');
      const lblStr = (l.label ? l.label + ':' : '').padEnd(10, ' ');
      lst += `${l.line.toString().padStart(4, '0')}  ${l.address_hex}  ${bytesStr}  ${(l.t_states + ' T').padEnd(8, ' ')}  ${lblStr}  ${l.mnemonic} ${l.operands}\n`;
    });
  }
  downloadBlob(lst, 'listing.lst', 'text/plain');
}

function copyHexToClipboard() {
  const hex = document.getElementById('hex-output').textContent;
  navigator.clipboard.writeText(hex).then(() => {
    showToast('Intel HEX copied to clipboard!');
  });
}

function downloadBlob(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
