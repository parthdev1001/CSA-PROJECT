#include "assembler.h"
#include "simulator.h"

#include <stdio.h>
#include <string.h>

static unsigned int tests = 0;
static unsigned int failures = 0;

static void expect(const char *line, unsigned int size, unsigned int first,
                   unsigned int second, unsigned int third)
{
    AssemblyResult result;
    ++tests;
    if (!assemble_instruction(line, &result) || result.size != size ||
        result.bytes[0] != first || (size >= 2 && result.bytes[1] != second) ||
        (size == 3 && result.bytes[2] != third) || result.error[0] != '\0') {
        fprintf(stderr, "FAIL: %s (size=%u, bytes=%02X %02X %02X, error=%s)\n",
                line, result.size, (unsigned int)result.bytes[0],
                (unsigned int)result.bytes[1], (unsigned int)result.bytes[2], result.error);
        ++failures;
    }
}

static void reject(const char *line, const char *message)
{
    AssemblyResult result;
    memset(&result, 0xAA, sizeof result);
    ++tests;
    if (assemble_instruction(line, &result) || result.size != 0 ||
        result.bytes[0] != 0 || result.bytes[1] != 0 || result.bytes[2] != 0 ||
        strstr(result.error, message) == NULL) {
        fprintf(stderr, "FAIL: invalid input '%s' was not rejected as expected (%s)\n", line, result.error);
        ++failures;
    }
}

static void test_two_pass(void)
{
    const char *src =
        "ORG 2000H\n"
        "START: LXI H, 2050H\n"
        "       MVI C, 05H\n"
        "LOOP:  MOV A, M\n"
        "       INX H\n"
        "       DCR C\n"
        "       JNZ LOOP\n"
        "       HLT\n";
    AssemblyProgram prog;
    unsigned int addr;
    ++tests;
    if (!assemble_program(src, &prog) || prog.total_errors != 0) {
        fprintf(stderr, "FAIL: assemble_program failed with %u errors\n", prog.total_errors);
        ++failures;
        return;
    }

    ++tests;
    if (prog.symbol_table.count != 2) {
        fprintf(stderr, "FAIL: expected 2 symbols, got %u\n", prog.symbol_table.count);
        ++failures;
    }

    ++tests;
    addr = 0;
    for (unsigned int s = 0; s < prog.symbol_table.count; ++s) {
        if (strcmp(prog.symbol_table.symbols[s].name, "LOOP") == 0) {
            addr = prog.symbol_table.symbols[s].address;
            break;
        }
    }
    if (addr != 0x2005) {
        fprintf(stderr, "FAIL: expected LOOP at 0x2005, got 0x%04X\n", addr);
        ++failures;
    }
}

static void test_forward_reference(void)
{
    const char *src =
        "ORG 1000H\n"
        "JMP TARGET\n"
        "NOP\n"
        "TARGET: HLT\n";
    AssemblyProgram prog;
    ++tests;
    if (!assemble_program(src, &prog) || prog.total_errors != 0) {
        fprintf(stderr, "FAIL: forward reference assembly failed\n");
        ++failures;
        return;
    }
    ++tests;
    /* JMP is line 2 (index 1), should be C3 04 10 */
    if (prog.lines[1].bytes[0] != 0xC3 || prog.lines[1].bytes[1] != 0x04 || prog.lines[1].bytes[2] != 0x10) {
        fprintf(stderr, "FAIL: JMP TARGET resolved incorrectly: %02X %02X %02X\n",
                prog.lines[1].bytes[0], prog.lines[1].bytes[1], prog.lines[1].bytes[2]);
        ++failures;
    }
}

static void test_directives(void)
{
    const char *src =
        "ORG 3000H\n"
        "VAL EQU 25H\n"
        "DATA: DB 10H, VAL, 'A'\n"
        "WORDS: DW 1234H, 5678H\n";
    AssemblyProgram prog;
    ++tests;
    if (!assemble_program(src, &prog) || prog.total_errors != 0) {
        fprintf(stderr, "FAIL: directives assembly failed\n");
        ++failures;
        return;
    }

    ++tests;
    /* DATA DB line is index 2, 3 bytes: 10H, 25H, 41H ('A') */
    if (prog.lines[2].byte_count != 3 ||
        prog.lines[2].bytes[0] != 0x10 ||
        prog.lines[2].bytes[1] != 0x25 ||
        prog.lines[2].bytes[2] != 'A') {
        fprintf(stderr, "FAIL: DB directive output mismatch\n");
        ++failures;
    }

    ++tests;
    /* WORDS DW line is index 3, 4 bytes: 34H, 12H, 78H, 56H */
    if (prog.lines[3].byte_count != 4 ||
        prog.lines[3].bytes[0] != 0x34 ||
        prog.lines[3].bytes[1] != 0x12 ||
        prog.lines[3].bytes[2] != 0x78 ||
        prog.lines[3].bytes[3] != 0x56) {
        fprintf(stderr, "FAIL: DW directive output mismatch\n");
        ++failures;
    }
}

static void test_cpu_simulator(void)
{
    const char *src =
        "ORG 0000H\n"
        "MVI A, 05H\n"
        "MVI B, 03H\n"
        "ADD B\n"
        "HLT\n";
    AssemblyProgram prog;
    CPU8085 cpu;

    ++tests;
    if (!assemble_program(src, &prog) || prog.total_errors != 0) {
        fprintf(stderr, "FAIL: simulator program assembly failed\n");
        ++failures;
        return;
    }

    cpu_init(&cpu);
    cpu_load_program(&cpu, &prog);
    cpu_run(&cpu, 100);

    ++tests;
    if (cpu.a != 0x08 || !cpu.halted || cpu.flag_z != 0 || cpu.flag_cy != 0) {
        fprintf(stderr, "FAIL: CPU add result mismatch (A=%02X, halted=%d, Z=%d, CY=%d)\n",
                cpu.a, cpu.halted, cpu.flag_z, cpu.flag_cy);
        ++failures;
    }

    /* Subtraction leading to zero flag */
    const char *src2 =
        "ORG 0000H\n"
        "MVI A, 07H\n"
        "SUB A\n"
        "HLT\n";
    assemble_program(src2, &prog);
    cpu_init(&cpu);
    cpu_load_program(&cpu, &prog);
    cpu_run(&cpu, 100);

    ++tests;
    if (cpu.a != 0x00 || !cpu.halted || cpu.flag_z != 1 || cpu.flag_cy != 0) {
        fprintf(stderr, "FAIL: CPU sub zero flag mismatch (A=%02X, Z=%d)\n", cpu.a, cpu.flag_z);
        ++failures;
    }
}

int main(void)
{
    static const struct {
        const char *name;
        unsigned int opcode;
    } simple[] = {
        {"NOP",0x00},{"HLT",0x76},{"DI",0xF3},{"EI",0xFB},{"RIM",0x20},{"SIM",0x30},
        {"RLC",0x07},{"RRC",0x0F},{"RAL",0x17},{"RAR",0x1F},{"DAA",0x27},{"CMA",0x2F},
        {"STC",0x37},{"CMC",0x3F},{"XCHG",0xEB},{"XTHL",0xE3},{"SPHL",0xF9},{"PCHL",0xE9},
        {"RET",0xC9},{"RNZ",0xC0},{"RZ",0xC8},{"RNC",0xD0},{"RC",0xD8},
        {"RPO",0xE0},{"RPE",0xE8},{"RP",0xF0},{"RM",0xF8}
    };
    static const struct {
        const char *name;
        unsigned int base;
    } arithmetic[] = {
        {"ADD",0x80},{"ADC",0x88},{"SUB",0x90},{"SBB",0x98},
        {"ANA",0xA0},{"XRA",0xA8},{"ORA",0xB0},{"CMP",0xB8}
    };
    static const struct {
        const char *name;
        unsigned int opcode;
    } immediate[] = {
        {"ADI",0xC6},{"ACI",0xCE},{"SUI",0xD6},{"SBI",0xDE},{"ANI",0xE6},
        {"XRI",0xEE},{"ORI",0xF6},{"CPI",0xFE},{"IN",0xDB},{"OUT",0xD3}
    };
    static const struct {
        const char *name;
        unsigned int opcode;
    } addressed[] = {
        {"LDA",0x3A},{"STA",0x32},{"LHLD",0x2A},{"SHLD",0x22},
        {"JMP",0xC3},{"JNZ",0xC2},{"JZ",0xCA},{"JNC",0xD2},{"JC",0xDA},
        {"JPO",0xE2},{"JPE",0xEA},{"JP",0xF2},{"JM",0xFA},
        {"CALL",0xCD},{"CNZ",0xC4},{"CZ",0xCC},{"CNC",0xD4},{"CC",0xDC},
        {"CPO",0xE4},{"CPE",0xEC},{"CP",0xF4},{"CM",0xFC}
    };
    static const char registers[] = "BCDEHLMA";
    static const char *const pairs[] = {"B", "D", "H", "SP"};
    static const char *const stack_pairs[] = {"B", "D", "H", "PSW"};
    char line[ASSEMBLER_MAX_LINE + 20];
    size_t i;
    unsigned int r;
    unsigned int source;

    for (i = 0; i < sizeof simple / sizeof simple[0]; ++i) {
        expect(simple[i].name, 1, simple[i].opcode, 0, 0);
    }
    for (r = 0; r < 8; ++r) {
        for (source = 0; source < 8; ++source) {
            snprintf(line, sizeof line, "MOV %c,%c", registers[r], registers[source]);
            if (r == 6 && source == 6) {
                reject(line, "MOV M,M");
            } else {
                expect(line, 1, 0x40 + r * 8 + source, 0, 0);
            }
        }
        snprintf(line, sizeof line, "MVI %c,FFH", registers[r]);
        expect(line, 2, 0x06 + r * 8, 0xFF, 0);
        snprintf(line, sizeof line, "INR %c", registers[r]);
        expect(line, 1, 0x04 + r * 8, 0, 0);
        snprintf(line, sizeof line, "DCR %c", registers[r]);
        expect(line, 1, 0x05 + r * 8, 0, 0);
        for (i = 0; i < sizeof arithmetic / sizeof arithmetic[0]; ++i) {
            snprintf(line, sizeof line, "%s %c", arithmetic[i].name, registers[r]);
            expect(line, 1, arithmetic[i].base + r, 0, 0);
        }
    }
    for (r = 0; r < 4; ++r) {
        snprintf(line, sizeof line, "LXI %s,2050H", pairs[r]);
        expect(line, 3, 0x01 + r * 16, 0x50, 0x20);
        snprintf(line, sizeof line, "INX %s", pairs[r]);
        expect(line, 1, 0x03 + r * 16, 0, 0);
        snprintf(line, sizeof line, "DCX %s", pairs[r]);
        expect(line, 1, 0x0B + r * 16, 0, 0);
        snprintf(line, sizeof line, "DAD %s", pairs[r]);
        expect(line, 1, 0x09 + r * 16, 0, 0);
        snprintf(line, sizeof line, "PUSH %s", stack_pairs[r]);
        expect(line, 1, 0xC5 + r * 16, 0, 0);
        snprintf(line, sizeof line, "POP %s", stack_pairs[r]);
        expect(line, 1, 0xC1 + r * 16, 0, 0);
    }
    expect("STAX B", 1, 0x02, 0, 0);
    expect("STAX D", 1, 0x12, 0, 0);
    expect("LDAX B", 1, 0x0A, 0, 0);
    expect("LDAX D", 1, 0x1A, 0, 0);
    for (i = 0; i < sizeof immediate / sizeof immediate[0]; ++i) {
        snprintf(line, sizeof line, "%s A5H", immediate[i].name);
        expect(line, 2, immediate[i].opcode, 0xA5, 0);
    }
    for (i = 0; i < sizeof addressed / sizeof addressed[0]; ++i) {
        snprintf(line, sizeof line, "%s 1234H", addressed[i].name);
        expect(line, 3, addressed[i].opcode, 0x34, 0x12);
    }
    for (r = 0; r < 8; ++r) {
        snprintf(line, sizeof line, "RST %u", r);
        expect(line, 1, 0xC7 + r * 8, 0, 0);
    }
    expect("MVI A,05H", 2, 0x3E, 0x05, 0);
    expect("MOV B,A", 1, 0x47, 0, 0);
    expect("  mvi \t a , 0x05 ; comment", 2, 0x3E, 0x05, 0);
    expect("MVI A,255", 2, 0x3E, 0xFF, 0);
    expect("MVI A,0", 2, 0x3E, 0x00, 0);
    expect("MVI A,10", 2, 0x3E, 0x0A, 0);
    expect("MVI A,10H", 2, 0x3E, 0x10, 0);
    expect("LXI SP,65535", 3, 0x31, 0xFF, 0xFF);
    expect("JMP 0x0000", 3, 0xC3, 0, 0);
    expect("HLT; done", 1, 0x76, 0, 0);
    expect("LDA 2050H\r\n", 3, 0x3A, 0x50, 0x20);
    reject("", "Empty");
    reject(" \t ; comment", "Empty");
    reject("XYZ A,B", "Unknown");
    reject("START: NOP", "Unknown");
    reject("NOP A", "expects 0");
    reject("MOV A", "expects 2");
    reject("MOV A,B,C", "Too many");
    reject("MOV A,", "Missing");
    reject("MOV ,A", "Missing");
    reject("MOV A B", "single tokens");
    reject("MOV F,A", "requires registers");
    reject("MOV SP,A", "requires registers");
    reject("MVI A", "expects 2");
    reject("MVI PSW,01H", "Invalid register");
    reject("ADD A,B", "expects 1");
    reject("LXI A,2050H", "Invalid register pair");
    reject("LXI PSW,2050H", "Invalid register pair");
    reject("PUSH SP", "Invalid register pair");
    reject("POP A", "Invalid register pair");
    reject("LDAX H", "Invalid register pair");
    reject("STAX SP", "Invalid register pair");
    reject("LDA", "expects 1");
    reject("MVI A,256", "out of range");
    reject("MVI A,100H", "out of range");
    reject("MVI A,-1", "Invalid numeric");
    reject("MVI A,+1", "Invalid numeric");
    reject("MVI A,GGH", "Invalid numeric");
    reject("MVI A,0x", "Invalid numeric");
    reject("MVI A,H", "Invalid numeric");
    reject("MVI A,0x10H", "Invalid numeric");
    reject("MVI A,1.5", "Invalid numeric");
    reject("MVI A,FF", "Invalid numeric");
    reject("MVI A,999999999999999999999999999999999999", "out of range");
    reject("JMP 65536", "out of range");
    reject("JMP 10000H", "out of range");
    reject("RST 8", "out of range");
    reject("RST -1", "Invalid numeric");
    memset(line, ' ', ASSEMBLER_MAX_LINE - 1);
    memcpy(line, "NOP", 3);
    line[ASSEMBLER_MAX_LINE - 1] = '\0';
    expect(line, 1, 0x00, 0, 0);
    line[ASSEMBLER_MAX_LINE - 1] = ' ';
    line[ASSEMBLER_MAX_LINE] = '\0';
    reject(line, "exceeds");

    /* New two-pass, directive, and simulator tests */
    test_two_pass();
    test_forward_reference();
    test_directives();
    test_cpu_simulator();

    printf("%u tests, %u failures\n", tests, failures);
    return failures == 0 ? 0 : 1;
}
