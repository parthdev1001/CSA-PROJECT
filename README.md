# 8085 Microprocessor Studio: Two-Pass Assembler & Interactive Simulator

> **College Engineering Project**  
> **Course / Topic:** Microprocessor & Assembly Language Programming (Intel 8085)  
> **Core Language:** Portable ISO C11 (strict `-Wall -Wextra -Wpedantic -Werror`)  
> **Frontend:** Interactive Web Studio (HTML5 / CSS3 / Modern JavaScript) & Python 3 Server  

---

## 1. Project Overview & Abstract

This project is a comprehensive **Two-Pass Assembler and Microprocessor Simulator** for the **Intel 8085** microprocessor architecture. It bridges academic assembly language education with real-world systems software design.

The system translates human-readable 8085 assembly language instructions, symbolic labels, and assembler directives (pseudo-opcodes) into hexadecimal machine-code bytes, computes precise execution timing (**T-States / clock cycles**), generates standard **Intel HEX** format files, and features an integrated **8085 CPU and Memory Simulator** with an interactive Web Frontend.

---

## 2. Key Features

- **Two-Pass Assembly Architecture:**
  - **Pass 1:** Tracks the Location Counter (LC), constructs the dynamic **Symbol Table**, and evaluates directives (`ORG`, `EQU`, `DB`, `DW`, `DS`, `END`).
  - **Pass 2:** Resolves backward and forward symbolic references, generates little-endian machine-code bytes, and produces formatted program listings.
- **Full Intel 8085 Instruction Set Coverage:**
  - Data transfer: `MOV`, `MVI`, `LXI`, `LDA`, `STA`, `LHLD`, `SHLD`, `LDAX`, `STAX`, `XCHG`, `SPHL`, `PCHL`, `XTHL`
  - Arithmetic: `ADD`, `ADC`, `SUB`, `SBB`, `ADI`, `ACI`, `SUI`, `SBI`, `INR`, `DCR`, `INX`, `DCX`, `DAD`, `DAA`
  - Logical: `ANA`, `ANI`, `ORA`, `ORI`, `XRA`, `XRI`, `CMP`, `CPI`, `CMA`, `CMC`, `STC`, `RLC`, `RRC`, `RAL`, `RAR`
  - Branching: `JMP`, `JNZ`, `JZ`, `JNC`, `JC`, `JPO`, `JPE`, `JP`, `JM`, `CALL`, conditional calls, `RET`, conditional returns, `RST`
  - Stack & Machine Control: `PUSH`, `POP`, `NOP`, `HLT`, `DI`, `EI`, `RIM`, `SIM`
- **T-States Calculation:** Computes exact clock cycle counts for each instruction.
- **Export Capabilities:**
  - Formatted Listing File (`.lst`)
  - Standard Intel HEX format (`.hex`) for EEPROM / 8085 trainer kit loaders
  - Raw binary machine code (`.bin`)
  - Machine-readable JSON export (`--json`)
- **Interactive Web Studio:**
  - Source code editor with line numbers and syntax styling
  - Live assembly breakdown table (Address, Machine Code, Label, Mnemonic, Operands, T-States)
  - 8085 CPU Register visualizer (A, B, C, D, E, H, L, PC, SP)
  - Glowing LED status indicator for Flags (`S`, `Z`, `AC`, `P`, `CY`)
  - 64KB Memory Inspector with click-to-edit capability
  - Step-by-step and continuous execution controls
  - One-click loader for 7 classic 8085 benchmark programs
  - Step-by-step Interactive Architecture Visualizer

---

## 3. How the Project Works (Internal Architecture)

### A. The Forward Reference Problem & Why Two Passes?
In assembly language, instructions often refer to labels defined later in the code:
```asm
        JNZ LOOP     ; Line 14: JNZ requires address of LOOP
        ...
LOOP:   MOV A, M     ; Line 20: LOOP defined at address 2008H
```
In a single pass, when the assembler encounters `JNZ LOOP`, the address of `LOOP` is unknown. The Two-Pass Assembler solves this cleanly:

```
+-------------------------------------------------------------------------+
|                                SOURCE CODE                              |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
| PASS 1: LEXICAL ANALYSIS, LC TRACKING & SYMBOL TABLE GENERATION         |
| - Read line by line. Strip comments and whitespace.                     |
| - If label present (e.g., "START:"), record (Label, LC) in Symbol Table.|
| - If directive:                                                         |
|     * ORG: Set Location Counter (LC = address).                         |
|     * EQU: Store symbol with defined constant value.                    |
|     * DB / DW / DS: Advance LC by byte or word count.                   |
| - If instruction:                                                       |
|     * Determine instruction byte length (1, 2, or 3 bytes).             |
|     * Advance LC = LC + length.                                         |
+-------------------------------------------------------------------------+
                                     |
                                     | Produces Symbol Table
                                     v
+-------------------------------------------------------------------------+
| PASS 2: CODE GENERATION & ADDRESS RESOLUTION                            |
| - Reset LC to Origin Address.                                           |
| - Read source line by line.                                             |
| - If operand is a symbolic label:                                       |
|     * Look up label in Symbol Table.                                    |
|     * Substitute symbol with resolved 16-bit address (XXXXH).           |
| - Generate opcode and operand bytes:                                    |
|     * Little-endian ordering: Lower byte first, higher byte second.      |
| - Compute instruction T-states (clock cycles).                          |
| - Emit Formatted Listing, Symbol Table, and Intel HEX output.           |
+-------------------------------------------------------------------------+
```

### B. Core Data Structures
1. **Machine Opcode Table (MOT):** Stores canonical mnemonics, base opcode byte, operand format category (`NONE`, `REGISTER`, `MOV_REGISTERS`, `REGISTER_IMMEDIATE`, `PAIR_IMMEDIATE`, `ADDRESS_WORD`, etc.), and bit shifts.
2. **Pseudo Opcode Table (POT):** Handles assembler directives (`ORG`, `EQU`, `DB`, `DW`, `DS`, `END`).
3. **Symbol Table (ST):** Hash/Array mapping unique label strings to 16-bit memory addresses and line numbers.
4. **Location Counter (LC):** 16-bit pointer tracking memory allocation for the program origin and subsequent instructions.

### C. Intel HEX Format Specification
Intel HEX format expresses memory contents as ASCII text records:
```
:LLAAAATT[DD...]CC
```
- `:` = Record start code
- `LL` = Byte count (e.g., `10` = 16 bytes)
- `AAAA` = 16-bit memory start address
- `TT` = Record type (`00` = Data, `01` = End of File)
- `DD...` = Data bytes in hexadecimal
- `CC` = Two's complement checksum: `-(sum of bytes) & 0xFF`
- EOF Record: `:00000001FF`

---

## 4. Directory Structure

```
8085-mini-assembler/
├── Makefile                 # Linux / macOS GCC build automation
├── build.ps1                # Windows PowerShell build script
├── server.py                # Zero-dependency Python 3 Web Server
├── include/
│   ├── assembler.h          # Public API, Symbol Table, and Program structures
│   └── simulator.h          # 8085 CPU simulator engine definitions
├── src/
│   ├── assembler.c          # Two-Pass Assembler implementation & HEX generator
│   ├── simulator.c          # Intel 8085 CPU & Memory execution engine
│   └── main.c               # CLI interface with multi-mode argument parser
├── tests/
│   ├── test_assembler.c     # 308+ C11 unit tests for opcodes, boundaries & CPU
│   ├── test_cli.py          # Python integration test suite
│   └── test_cli.cjs         # Node.js CLI integration test suite
├── examples/
│   ├── addition_8bit.asm    # Experiment: 8-bit addition with carry
│   ├── subtraction_8bit.asm # Experiment: 8-bit subtraction with borrow
│   ├── multiplication.asm   # Experiment: Multiplication by repeated addition
│   ├── largest_number.asm   # Experiment: Finding maximum in array
│   ├── bubble_sort.asm      # Experiment: Sorting an array in ascending order
│   ├── fibonacci.asm        # Experiment: Generating Fibonacci series
│   ├── block_transfer.asm   # Experiment: Block transfer of data
│   └── instructions.txt     # Interactive input stream demo
└── web/
    ├── index.html           # Modern Web Studio UI
    ├── style.css            # Dark/light theme responsive styling
    └── app.js               # Client controller & standalone offline engine
```

---

## 5. Building and Running

### On macOS / Linux
```bash
# Build the C executable
make

# Run the automated test suites (308+ unit tests & CLI integration tests)
make test

# Assemble a single instruction
./build/assembler "MVI A,05H"

# Assemble a multi-line program and view the listing table & symbol table
./build/assembler examples/addition_8bit.asm --sym

# Assemble and export Intel HEX file
./build/assembler examples/addition_8bit.asm --hex output.hex

# Assemble and simulate execution on the 8085 CPU
./build/assembler examples/block_transfer.asm --run
```

### On Windows
```powershell
# Build and run C tests using PowerShell
.\build.ps1 -Test

# Run the assembler
.\build\assembler.exe examples\addition_8bit.asm --sym
```

---

## 6. Launching the Web Frontend

You can launch and present the project in the web browser in two ways:

### Option A: Local Python Server (Recommended)
```bash
python3 server.py
```
This automatically starts a local server at `http://localhost:8085` and opens your default browser. It routes assembly requests to the compiled C binary!

### Option B: Zero-Install Standalone Mode
Double-click `web/index.html` in any web browser (Chrome, Edge, Safari, Firefox). The entire Two-Pass Assembler and 8085 CPU Simulator also runs 100% client-side in JavaScript, requiring zero compilers or installations!

---

## 7. College Lab Experiments Included

| File | Experiment Name | Concepts Demonstrated |
| :--- | :--- | :--- |
| `addition_8bit.asm` | 8-Bit Addition with Carry | `LDA`, `ADD`, `JNC`, `INR`, `STA` |
| `subtraction_8bit.asm` | 8-Bit Subtraction with Borrow | `LDA`, `SUB`, `JNC`, `INR`, `STA` |
| `multiplication.asm` | Multiplication by Repeated Addition | `CPI`, `JZ`, `ADD`, `DCR`, `JNZ` |
| `largest_number.asm` | Find Largest Number in an Array | `LXI H`, `MOV A,M`, `CMP M`, `JNC` |
| `bubble_sort.asm` | Bubble Sort (Ascending Order) | Nested loops, `CMP M`, pointer swapping |
| `fibonacci.asm` | Fibonacci Series Generator | Iterative addition, multi-register indexing |
| `block_transfer.asm` | Block Data Transfer | `LXI H`, `LXI D`, `STAX D`, `INX`, `DCR` |

---

## 8. License & Academic Attribution
Developed as an open-source academic engineering project for Microprocessor & Assembly Language systems coursework.
