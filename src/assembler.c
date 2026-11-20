#include "assembler.h"

#include <assert.h>
#include <ctype.h>
#include <errno.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef enum {
    NONE, REGISTER, MOV_REGISTERS, REGISTER_IMMEDIATE,
    REGISTER_PAIR, PAIR_IMMEDIATE, STACK_PAIR, INDIRECT_PAIR,
    IMMEDIATE_BYTE, ADDRESS_WORD, RESTART
} OperandKind;

typedef struct {
    const char *mnemonic;
    unsigned char opcode;
    OperandKind kind;
    unsigned int shift;
} Instruction;

static const Instruction instruction_table[] = {
    {"NOP",  0x00, NONE, 0}, {"HLT",  0x76, NONE, 0},
    {"DI",   0xF3, NONE, 0}, {"EI",   0xFB, NONE, 0},
    {"RIM",  0x20, NONE, 0}, {"SIM",  0x30, NONE, 0},
    {"RLC",  0x07, NONE, 0}, {"RRC",  0x0F, NONE, 0},
    {"RAL",  0x17, NONE, 0}, {"RAR",  0x1F, NONE, 0},
    {"DAA",  0x27, NONE, 0}, {"CMA",  0x2F, NONE, 0},
    {"STC",  0x37, NONE, 0}, {"CMC",  0x3F, NONE, 0},
    {"XCHG", 0xEB, NONE, 0}, {"XTHL", 0xE3, NONE, 0},
    {"SPHL", 0xF9, NONE, 0}, {"PCHL", 0xE9, NONE, 0},
    {"RET",  0xC9, NONE, 0}, {"RNZ",  0xC0, NONE, 0},
    {"RZ",   0xC8, NONE, 0}, {"RNC",  0xD0, NONE, 0},
    {"RC",   0xD8, NONE, 0}, {"RPO",  0xE0, NONE, 0},
    {"RPE",  0xE8, NONE, 0}, {"RP",   0xF0, NONE, 0},
    {"RM",   0xF8, NONE, 0},
    {"MOV",  0x40, MOV_REGISTERS, 0},
    {"MVI",  0x06, REGISTER_IMMEDIATE, 3},
    {"ADD",  0x80, REGISTER, 0}, {"ADC", 0x88, REGISTER, 0},
    {"SUB",  0x90, REGISTER, 0}, {"SBB", 0x98, REGISTER, 0},
    {"ANA",  0xA0, REGISTER, 0}, {"XRA", 0xA8, REGISTER, 0},
    {"ORA",  0xB0, REGISTER, 0}, {"CMP", 0xB8, REGISTER, 0},
    {"INR",  0x04, REGISTER, 3}, {"DCR", 0x05, REGISTER, 3},
    {"LXI",  0x01, PAIR_IMMEDIATE, 4},
    {"INX",  0x03, REGISTER_PAIR, 4},
    {"DCX",  0x0B, REGISTER_PAIR, 4},
    {"DAD",  0x09, REGISTER_PAIR, 4},
    {"PUSH", 0xC5, STACK_PAIR, 4}, {"POP", 0xC1, STACK_PAIR, 4},
    {"STAX", 0x02, INDIRECT_PAIR, 4}, {"LDAX", 0x0A, INDIRECT_PAIR, 4},
    {"ADI",  0xC6, IMMEDIATE_BYTE, 0}, {"ACI", 0xCE, IMMEDIATE_BYTE, 0},
    {"SUI",  0xD6, IMMEDIATE_BYTE, 0}, {"SBI", 0xDE, IMMEDIATE_BYTE, 0},
    {"ANI",  0xE6, IMMEDIATE_BYTE, 0}, {"XRI", 0xEE, IMMEDIATE_BYTE, 0},
    {"ORI",  0xF6, IMMEDIATE_BYTE, 0}, {"CPI", 0xFE, IMMEDIATE_BYTE, 0},
    {"IN",   0xDB, IMMEDIATE_BYTE, 0}, {"OUT", 0xD3, IMMEDIATE_BYTE, 0},
    {"LDA",  0x3A, ADDRESS_WORD, 0}, {"STA", 0x32, ADDRESS_WORD, 0},
    {"LHLD", 0x2A, ADDRESS_WORD, 0}, {"SHLD", 0x22, ADDRESS_WORD, 0},
    {"JMP",  0xC3, ADDRESS_WORD, 0}, {"JNZ", 0xC2, ADDRESS_WORD, 0},
    {"JZ",   0xCA, ADDRESS_WORD, 0}, {"JNC", 0xD2, ADDRESS_WORD, 0},
    {"JC",   0xDA, ADDRESS_WORD, 0}, {"JPO", 0xE2, ADDRESS_WORD, 0},
    {"JPE",  0xEA, ADDRESS_WORD, 0}, {"JP", 0xF2, ADDRESS_WORD, 0},
    {"JM",   0xFA, ADDRESS_WORD, 0},
    {"CALL", 0xCD, ADDRESS_WORD, 0}, {"CNZ", 0xC4, ADDRESS_WORD, 0},
    {"CZ",   0xCC, ADDRESS_WORD, 0}, {"CNC", 0xD4, ADDRESS_WORD, 0},
    {"CC",   0xDC, ADDRESS_WORD, 0}, {"CPO", 0xE4, ADDRESS_WORD, 0},
    {"CPE",  0xEC, ADDRESS_WORD, 0}, {"CP", 0xF4, ADDRESS_WORD, 0},
    {"CM",   0xFC, ADDRESS_WORD, 0},
    {"RST",  0xC7, RESTART, 3}
};

static int fail(AssemblyResult *result, const char *format, ...)
{
    va_list arguments;
    result->size = 0;
    memset(result->bytes, 0, sizeof result->bytes);
    va_start(arguments, format);
    vsnprintf(result->error, sizeof result->error, format, arguments);
    va_end(arguments);
    return 0;
}

static char *trim(char *text)
{
    char *end;
    while (isspace((unsigned char)*text)) {
        ++text;
    }
    end = text + strlen(text);
    while (end > text && isspace((unsigned char)end[-1])) {
        --end;
    }
    *end = '\0';
    return text;
}

static int register_code(const char *operand)
{
    static const char registers[] = "BCDEHLMA";
    const char *position;
    if (strlen(operand) != 1) {
        return -1;
    }
    position = strchr(registers, operand[0]);
    return position == NULL ? -1 : (int)(position - registers);
}

static int pair_code(const char *operand, OperandKind kind)
{
    if (strcmp(operand, "B") == 0) {
        return 0;
    }
    if (strcmp(operand, "D") == 0) {
        return 1;
    }
    if (kind == INDIRECT_PAIR) {
        return -1;
    }
    if (strcmp(operand, "H") == 0) {
        return 2;
    }
    if (strcmp(operand, kind == STACK_PAIR ? "PSW" : "SP") == 0) {
        return 3;
    }
    return -1;
}

static int parse_number(const char *text, unsigned long maximum,
                        unsigned long *value, AssemblyResult *result)
{
    char digits[ASSEMBLER_MAX_LINE];
    char *end;
    size_t length = strlen(text);
    size_t start = 0;
    int base = 10;
    size_t i;

    if (length >= sizeof digits) {
        return fail(result, "Numeric operand is too long.");
    }
    if (length > 0 && text[length - 1] == 'H') {
        base = 16;
        --length;
    } else if (length >= 2 && text[0] == '0' && text[1] == 'X') {
        base = 16;
        start = 2;
    }
    if (length <= start) {
        return fail(result, "Invalid numeric operand '%s'.", text);
    }
    for (i = start; i < length; ++i) {
        if ((base == 10 && !isdigit((unsigned char)text[i])) ||
            (base == 16 && !isxdigit((unsigned char)text[i]))) {
            return fail(result, "Invalid numeric operand '%s'.", text);
        }
    }
    memcpy(digits, text + start, length - start);
    digits[length - start] = '\0';
    errno = 0;
    *value = strtoul(digits, &end, base);
    if (errno == ERANGE || *value > maximum) {
        return fail(result, "Operand '%s' is out of range (0..%lu).", text, maximum);
    }
    if (*end != '\0') {
        return fail(result, "Invalid numeric operand '%s'.", text);
    }
    return 1;
}

static unsigned int expected_operands(OperandKind kind)
{
    if (kind == NONE) {
        return 0;
    }
    if (kind == MOV_REGISTERS || kind == REGISTER_IMMEDIATE || kind == PAIR_IMMEDIATE) {
        return 2;
    }
    return 1;
}

int assemble_instruction(const char *line, AssemblyResult *result)
{
    char buffer[ASSEMBLER_MAX_LINE];
    char *mnemonic;
    char *operand_text;
    char *operands[2] = {NULL, NULL};
    char *comma;
    char *cursor;
    const Instruction *instruction = NULL;
    unsigned int operand_count = 0;
    unsigned int expected;
    unsigned long number = 0;
    int first;
    int second;
    size_t i;

    assert(line != NULL && result != NULL);
    memset(result, 0, sizeof *result);
    if (strlen(line) >= sizeof buffer) {
        return fail(result, "Instruction exceeds %d characters.", ASSEMBLER_MAX_LINE - 1);
    }
    strcpy(buffer, line);
    cursor = strchr(buffer, ';');
    if (cursor != NULL) {
        *cursor = '\0';
    }
    for (cursor = buffer; *cursor != '\0'; ++cursor) {
        *cursor = (char)toupper((unsigned char)*cursor);
    }
    mnemonic = trim(buffer);
    if (*mnemonic == '\0') {
        return fail(result, "Empty instruction.");
    }
    cursor = mnemonic;
    while (*cursor != '\0' && !isspace((unsigned char)*cursor)) {
        ++cursor;
    }
    if (*cursor != '\0') {
        *cursor++ = '\0';
    }
    operand_text = trim(cursor);
    for (i = 0; i < sizeof instruction_table / sizeof instruction_table[0]; ++i) {
        if (strcmp(mnemonic, instruction_table[i].mnemonic) == 0) {
            instruction = &instruction_table[i];
            break;
        }
    }
    if (instruction == NULL) {
        return fail(result, "Unknown or unsupported mnemonic '%s'.", mnemonic);
    }
    if (*operand_text != '\0') {
        operands[0] = operand_text;
        operand_count = 1;
        comma = strchr(operand_text, ',');
        if (comma != NULL) {
            *comma = '\0';
            operands[1] = trim(comma + 1);
            operands[0] = trim(operands[0]);
            operand_count = 2;
            if (strchr(operands[1], ',') != NULL) {
                return fail(result, "Too many operands for %s.", mnemonic);
            }
        }
        for (i = 0; i < operand_count; ++i) {
            if (*operands[i] == '\0') {
                return fail(result, "Missing operand near comma.");
            }
            for (cursor = operands[i]; *cursor != '\0'; ++cursor) {
                if (isspace((unsigned char)*cursor)) {
                    return fail(result, "Operands must be single tokens separated by a comma.");
                }
            }
        }
    }
    expected = expected_operands(instruction->kind);
    if (operand_count != expected) {
        return fail(result, "%s expects %u operand%s; received %u.",
                    mnemonic, expected, expected == 1 ? "" : "s", operand_count);
    }
    result->bytes[0] = instruction->opcode;
    result->size = 1;
    switch (instruction->kind) {
    case NONE:
        break;
    case MOV_REGISTERS:
        first = register_code(operands[0]);
        second = register_code(operands[1]);
        if (first < 0 || second < 0) {
            return fail(result, "MOV requires registers B,C,D,E,H,L,M or A.");
        }
        if (first == 6 && second == 6) {
            return fail(result, "MOV M,M is not valid; opcode 76H is HLT.");
        }
        result->bytes[0] = (unsigned char)(0x40 | (first << 3) | second);
        break;
    case REGISTER:
    case REGISTER_IMMEDIATE:
        first = register_code(operands[0]);
        if (first < 0) {
            return fail(result, "Invalid register '%s'; use B,C,D,E,H,L,M or A.", operands[0]);
        }
        result->bytes[0] |= (unsigned char)((unsigned int)first << instruction->shift);
        if (instruction->kind == REGISTER_IMMEDIATE) {
            if (!parse_number(operands[1], 255, &number, result)) {
                return 0;
            }
            result->bytes[1] = (unsigned char)number;
            result->size = 2;
        }
        break;
    case REGISTER_PAIR:
    case PAIR_IMMEDIATE:
    case STACK_PAIR:
    case INDIRECT_PAIR:
        first = pair_code(operands[0], instruction->kind);
        if (first < 0) {
            return fail(result, "Invalid register pair '%s' for %s.", operands[0], mnemonic);
        }
        result->bytes[0] |= (unsigned char)((unsigned int)first << instruction->shift);
        if (instruction->kind == PAIR_IMMEDIATE) {
            if (!parse_number(operands[1], 65535, &number, result)) {
                return 0;
            }
            result->bytes[1] = (unsigned char)(number & 0xFF);
            result->bytes[2] = (unsigned char)(number >> 8);
            result->size = 3;
        }
        break;
    case IMMEDIATE_BYTE:
    case ADDRESS_WORD:
    case RESTART:
        if (!parse_number(operands[0], instruction->kind == ADDRESS_WORD ? 65535UL :
                          instruction->kind == RESTART ? 7UL : 255UL, &number, result)) {
            return 0;
        }
        if (instruction->kind == RESTART) {
            result->bytes[0] |= (unsigned char)(number << 3);
        } else {
            result->bytes[1] = (unsigned char)(number & 0xFF);
            result->size = 2;
            if (instruction->kind == ADDRESS_WORD) {
                result->bytes[2] = (unsigned char)(number >> 8);
                result->size = 3;
            }
        }
        break;
    }
    return 1;
}

void print_supported_instructions(FILE *stream)
{
    size_t i;
    static const char *const formats[] = {
        "", " r", " destination,source", " r,data8", " rp",
        " rp,data16", " B|D|H|PSW", " B|D", " data8", " address16", " 0..7"
    };
    for (i = 0; i < sizeof instruction_table / sizeof instruction_table[0]; ++i) {
        fprintf(stream, "%-5s%s\n", instruction_table[i].mnemonic, formats[instruction_table[i].kind]);
    }
    fprintf(stream, "\nr: B,C,D,E,H,L,M,A; rp: B,D,H,SP\n");
    fprintf(stream, "Numbers: decimal, hexadecimal suffix H, or hexadecimal prefix 0x.\n");
}

/* ========================================================================= */
/* Two-Pass Assembler Enhancements (Labels, Directives, Symbol Table, etc.) */
/* ========================================================================= */

unsigned int get_instruction_t_states(const char *mnemonic, const char *operands)
{
    if (mnemonic == NULL) return 0;
    if (strcmp(mnemonic, "NOP") == 0) return 4;
    if (strcmp(mnemonic, "HLT") == 0) return 5;
    if (strcmp(mnemonic, "DI") == 0 || strcmp(mnemonic, "EI") == 0) return 4;
    if (strcmp(mnemonic, "RIM") == 0 || strcmp(mnemonic, "SIM") == 0) return 4;
    if (strcmp(mnemonic, "RLC") == 0 || strcmp(mnemonic, "RRC") == 0 ||
        strcmp(mnemonic, "RAL") == 0 || strcmp(mnemonic, "RAR") == 0) return 4;
    if (strcmp(mnemonic, "DAA") == 0 || strcmp(mnemonic, "CMA") == 0 ||
        strcmp(mnemonic, "STC") == 0 || strcmp(mnemonic, "CMC") == 0) return 4;
    if (strcmp(mnemonic, "XCHG") == 0) return 4;
    if (strcmp(mnemonic, "XTHL") == 0) return 16;
    if (strcmp(mnemonic, "SPHL") == 0 || strcmp(mnemonic, "PCHL") == 0) return 6;
    if (strcmp(mnemonic, "RET") == 0) return 10;
    if (strcmp(mnemonic, "RNZ") == 0 || strcmp(mnemonic, "RZ") == 0 ||
        strcmp(mnemonic, "RNC") == 0 || strcmp(mnemonic, "RC") == 0 ||
        strcmp(mnemonic, "RPO") == 0 || strcmp(mnemonic, "RPE") == 0 ||
        strcmp(mnemonic, "RP") == 0 || strcmp(mnemonic, "RM") == 0) return 10;
    if (strcmp(mnemonic, "MOV") == 0) {
        if (operands != NULL && (strchr(operands, 'M') != NULL || strchr(operands, 'm') != NULL))
            return 7;
        return 4;
    }
    if (strcmp(mnemonic, "MVI") == 0) {
        if (operands != NULL && (operands[0] == 'M' || operands[0] == 'm'))
            return 10;
        return 7;
    }
    if (strcmp(mnemonic, "ADD") == 0 || strcmp(mnemonic, "ADC") == 0 ||
        strcmp(mnemonic, "SUB") == 0 || strcmp(mnemonic, "SBB") == 0 ||
        strcmp(mnemonic, "ANA") == 0 || strcmp(mnemonic, "XRA") == 0 ||
        strcmp(mnemonic, "ORA") == 0 || strcmp(mnemonic, "CMP") == 0) {
        if (operands != NULL && (strchr(operands, 'M') != NULL || strchr(operands, 'm') != NULL))
            return 7;
        return 4;
    }
    if (strcmp(mnemonic, "INR") == 0 || strcmp(mnemonic, "DCR") == 0) {
        if (operands != NULL && (strchr(operands, 'M') != NULL || strchr(operands, 'm') != NULL))
            return 10;
        return 4;
    }
    if (strcmp(mnemonic, "LXI") == 0) return 10;
    if (strcmp(mnemonic, "INX") == 0 || strcmp(mnemonic, "DCX") == 0) return 6;
    if (strcmp(mnemonic, "DAD") == 0) return 10;
    if (strcmp(mnemonic, "PUSH") == 0) return 12;
    if (strcmp(mnemonic, "POP") == 0) return 10;
    if (strcmp(mnemonic, "STAX") == 0 || strcmp(mnemonic, "LDAX") == 0) return 7;
    if (strcmp(mnemonic, "ADI") == 0 || strcmp(mnemonic, "ACI") == 0 ||
        strcmp(mnemonic, "SUI") == 0 || strcmp(mnemonic, "SBI") == 0 ||
        strcmp(mnemonic, "ANI") == 0 || strcmp(mnemonic, "XRI") == 0 ||
        strcmp(mnemonic, "ORI") == 0 || strcmp(mnemonic, "CPI") == 0) return 7;
    if (strcmp(mnemonic, "IN") == 0 || strcmp(mnemonic, "OUT") == 0) return 10;
    if (strcmp(mnemonic, "LDA") == 0 || strcmp(mnemonic, "STA") == 0) return 13;
    if (strcmp(mnemonic, "LHLD") == 0 || strcmp(mnemonic, "SHLD") == 0) return 16;
    if (strcmp(mnemonic, "JMP") == 0) return 10;
    if (strcmp(mnemonic, "JNZ") == 0 || strcmp(mnemonic, "JZ") == 0 ||
        strcmp(mnemonic, "JNC") == 0 || strcmp(mnemonic, "JC") == 0 ||
        strcmp(mnemonic, "JPO") == 0 || strcmp(mnemonic, "JPE") == 0 ||
        strcmp(mnemonic, "JP") == 0 || strcmp(mnemonic, "JM") == 0) return 10;
    if (strcmp(mnemonic, "CALL") == 0) return 18;
    if (strcmp(mnemonic, "CNZ") == 0 || strcmp(mnemonic, "CZ") == 0 ||
        strcmp(mnemonic, "CNC") == 0 || strcmp(mnemonic, "CC") == 0 ||
        strcmp(mnemonic, "CPO") == 0 || strcmp(mnemonic, "CPE") == 0 ||
        strcmp(mnemonic, "CP") == 0 || strcmp(mnemonic, "CM") == 0) return 18;
    if (strcmp(mnemonic, "RST") == 0) return 12;
    return 4;
}

static int is_valid_identifier(const char *name)
{
    size_t i;
    if (name == NULL || name[0] == '\0') return 0;
    if (!isalpha((unsigned char)name[0]) && name[0] != '_') return 0;
    for (i = 1; name[i] != '\0'; ++i) {
        if (!isalnum((unsigned char)name[i]) && name[i] != '_') return 0;
    }
    return 1;
}

static int symbol_table_find(const SymbolTable *table, const char *name, unsigned int *address)
{
    unsigned int i;
    for (i = 0; i < table->count; ++i) {
        if (strcasecmp(table->symbols[i].name, name) == 0) {
            if (address != NULL) {
                *address = table->symbols[i].address;
            }
            return 1;
        }
    }
    return 0;
}

static int symbol_table_add(SymbolTable *table, const char *name, unsigned int address, int line_defined)
{
    unsigned int addr;
    if (symbol_table_find(table, name, &addr)) {
        return 0; /* Duplicate */
    }
    if (table->count >= MAX_SYMBOLS) {
        return -1; /* Full */
    }
    strncpy(table->symbols[table->count].name, name, sizeof(table->symbols[0].name) - 1);
    table->symbols[table->count].name[sizeof(table->symbols[0].name) - 1] = '\0';
    table->symbols[table->count].address = address;
    table->symbols[table->count].is_defined = 1;
    table->symbols[table->count].line_defined = line_defined;
    table->count++;
    return 1;
}

static const Instruction *find_instruction(const char *mnemonic)
{
    size_t i;
    for (i = 0; i < sizeof instruction_table / sizeof instruction_table[0]; ++i) {
        if (strcasecmp(mnemonic, instruction_table[i].mnemonic) == 0) {
            return &instruction_table[i];
        }
    }
    return NULL;
}

static unsigned int get_instruction_size(const Instruction *inst)
{
    if (inst == NULL) return 0;
    switch (inst->kind) {
    case NONE:
    case REGISTER:
    case MOV_REGISTERS:
    case REGISTER_PAIR:
    case STACK_PAIR:
    case INDIRECT_PAIR:
    case RESTART:
        return 1;
    case REGISTER_IMMEDIATE:
    case IMMEDIATE_BYTE:
        return 2;
    case PAIR_IMMEDIATE:
    case ADDRESS_WORD:
        return 3;
    }
    return 1;
}

static int parse_val_literal(const char *token, unsigned long *val)
{
    AssemblyResult dummy;
    return parse_number(token, 0xFFFF, val, &dummy);
}

int assemble_program(const char *source_text, AssemblyProgram *program)
{
    char line_buffer[ASSEMBLER_MAX_LINE];
    const char *src;
    unsigned int line_num = 0;
    unsigned int current_lc = 0;
    unsigned int origin = 0;
    int origin_set = 0;
    unsigned int i;

    if (source_text == NULL || program == NULL) return 0;
    memset(program, 0, sizeof *program);

    /* ------------------------------------------------------------- */
    /* PASS 1: Identify Labels, EQU, Directives, and Compute LC      */
    /* ------------------------------------------------------------- */
    src = source_text;
    while (*src != '\0') {
        size_t len = 0;
        char *line;
        char *comment;
        char *colon;
        char *ptr;
        char label[64] = {0};
        char mnemonic[64] = {0};
        char operands[ASSEMBLER_MAX_LINE] = {0};

        while (*src != '\0' && *src != '\n' && *src != '\r' && len < sizeof(line_buffer) - 1) {
            line_buffer[len++] = *src++;
        }
        line_buffer[len] = '\0';
        if (*src == '\r') src++;
        if (*src == '\n') src++;

        line_num++;
        if (line_num > MAX_PROGRAM_LINES) {
            program->total_errors++;
            break;
        }

        /* Keep raw copy */
        strncpy(program->lines[line_num - 1].raw_line, line_buffer, sizeof(program->lines[0].raw_line) - 1);
        program->lines[line_num - 1].line_number = line_num;
        program->lines[line_num - 1].address = current_lc;

        /* Strip comments */
        line = line_buffer;
        comment = strchr(line, ';');
        if (comment != NULL) {
            *comment = '\0';
        }
        line = trim(line);
        if (*line == '\0') {
            continue; /* Empty line */
        }

        /* Check for label definition with ':' */
        colon = strchr(line, ':');
        if (colon != NULL) {
            *colon = '\0';
            ptr = trim(line);
            strncpy(label, ptr, sizeof(label) - 1);
            line = trim(colon + 1);

            if (!is_valid_identifier(label)) {
                snprintf(program->lines[line_num - 1].error, sizeof(program->lines[0].error),
                         "Invalid label name '%s'.", label);
                program->total_errors++;
            } else {
                int res = symbol_table_add(&program->symbol_table, label, current_lc, line_num);
                if (res == 0) {
                    snprintf(program->lines[line_num - 1].error, sizeof(program->lines[0].error),
                             "Duplicate symbol '%s'.", label);
                    program->total_errors++;
                } else if (res < 0) {
                    snprintf(program->lines[line_num - 1].error, sizeof(program->lines[0].error),
                             "Symbol table overflow.");
                    program->total_errors++;
                }
                strncpy(program->lines[line_num - 1].label, label, sizeof(program->lines[0].label) - 1);
            }
        }

        if (*line == '\0') {
            continue; /* Line was only a label */
        }

        /* Read mnemonic / first token */
        ptr = line;
        while (*ptr != '\0' && !isspace((unsigned char)*ptr)) {
            ptr++;
        }
        if (*ptr != '\0') {
            *ptr = '\0';
            ptr = trim(ptr + 1);
            strncpy(operands, ptr, sizeof(operands) - 1);
        }
        strncpy(mnemonic, line, sizeof(mnemonic) - 1);

        /* Check for EQU: e.g. "VAR EQU 10H" (if no colon was used) */
        if (strcasecmp(operands, "EQU") == 0 || strncasecmp(operands, "EQU ", 4) == 0 ||
            strncasecmp(operands, "EQU\t", 4) == 0) {
            char *val_str = trim(operands + 3);
            unsigned long val = 0;
            if (is_valid_identifier(mnemonic)) {
                if (parse_val_literal(val_str, &val)) {
                    symbol_table_add(&program->symbol_table, mnemonic, (unsigned int)val, line_num);
                } else {
                    snprintf(program->lines[line_num - 1].error, sizeof(program->lines[0].error),
                             "Invalid numeric value in EQU.");
                    program->total_errors++;
                }
            }
            continue;
        }

        /* Check for directives */
        if (strcasecmp(mnemonic, "ORG") == 0 || strcasecmp(mnemonic, ".ORG") == 0) {
            unsigned long org_val = 0;
            program->lines[line_num - 1].is_directive = 1;
            if (parse_val_literal(operands, &org_val)) {
                current_lc = (unsigned int)(org_val & 0xFFFF);
                if (!origin_set) {
                    origin = current_lc;
                    origin_set = 1;
                }
                program->lines[line_num - 1].address = current_lc;
            } else {
                snprintf(program->lines[line_num - 1].error, sizeof(program->lines[0].error),
                         "Invalid address '%s' for ORG.", operands);
                program->total_errors++;
            }
            continue;
        } else if (strcasecmp(mnemonic, "EQU") == 0) {
            /* Handled if label was present */
            program->lines[line_num - 1].is_directive = 1;
            if (label[0] != '\0') {
                unsigned long eq_val = 0;
                if (parse_val_literal(operands, &eq_val)) {
                    /* Update label's address to the EQU value */
                    unsigned int sidx;
                    for (sidx = 0; sidx < program->symbol_table.count; ++sidx) {
                        if (strcasecmp(program->symbol_table.symbols[sidx].name, label) == 0) {
                            program->symbol_table.symbols[sidx].address = (unsigned int)eq_val;
                            break;
                        }
                    }
                }
            }
            continue;
        } else if (strcasecmp(mnemonic, "DB") == 0 || strcasecmp(mnemonic, ".DB") == 0) {
            char op_copy[ASSEMBLER_MAX_LINE];
            char *tok;
            unsigned int bytes_count = 0;
            program->lines[line_num - 1].is_directive = 1;
            strncpy(op_copy, operands, sizeof(op_copy) - 1);
            op_copy[sizeof(op_copy) - 1] = '\0';
            tok = strtok(op_copy, ",");
            while (tok != NULL) {
                char *item = trim(tok);
                if (*item == '\'' || *item == '"') {
                    char quote = *item++;
                    while (*item != '\0' && *item != quote) {
                        bytes_count++;
                        item++;
                    }
                } else if (*item != '\0') {
                    bytes_count++;
                }
                tok = strtok(NULL, ",");
            }
            if (bytes_count == 0) bytes_count = 1;
            current_lc += bytes_count;
            continue;
        } else if (strcasecmp(mnemonic, "DW") == 0 || strcasecmp(mnemonic, ".DW") == 0) {
            char op_copy[ASSEMBLER_MAX_LINE];
            char *tok;
            unsigned int words_count = 0;
            program->lines[line_num - 1].is_directive = 1;
            strncpy(op_copy, operands, sizeof(op_copy) - 1);
            op_copy[sizeof(op_copy) - 1] = '\0';
            tok = strtok(op_copy, ",");
            while (tok != NULL) {
                words_count++;
                tok = strtok(NULL, ",");
            }
            if (words_count == 0) words_count = 1;
            current_lc += words_count * 2;
            continue;
        } else if (strcasecmp(mnemonic, "DS") == 0 || strcasecmp(mnemonic, ".DS") == 0) {
            unsigned long ds_count = 0;
            program->lines[line_num - 1].is_directive = 1;
            if (parse_val_literal(operands, &ds_count)) {
                current_lc += (unsigned int)ds_count;
            } else {
                current_lc += 1;
            }
            continue;
        } else if (strcasecmp(mnemonic, "END") == 0 || strcasecmp(mnemonic, ".END") == 0) {
            program->lines[line_num - 1].is_directive = 1;
            break; /* Stop Pass 1 at END */
        }

        /* Normal instruction */
        {
            const Instruction *inst = find_instruction(mnemonic);
            if (inst == NULL) {
                snprintf(program->lines[line_num - 1].error, sizeof(program->lines[0].error),
                         "Unknown mnemonic '%s'.", mnemonic);
                program->total_errors++;
            } else {
                current_lc += get_instruction_size(inst);
            }
        }
    }

    program->line_count = line_num;
    program->origin_address = origin;
    program->entry_point = origin;

    /* ------------------------------------------------------------- */
    /* PASS 2: Code Generation and Label Resolution                  */
    /* ------------------------------------------------------------- */
    current_lc = origin;
    for (i = 0; i < program->line_count; ++i) {
        ProgramLineResult *pline = &program->lines[i];
        char line_copy[ASSEMBLER_MAX_LINE];
        char *line;
        char *comment;
        char *colon;
        char *ptr;
        char mnemonic[64] = {0};
        char operands[ASSEMBLER_MAX_LINE] = {0};

        strncpy(line_copy, pline->raw_line, sizeof(line_copy) - 1);
        line_copy[sizeof(line_copy) - 1] = '\0';

        comment = strchr(line_copy, ';');
        if (comment != NULL) *comment = '\0';
        line = trim(line_copy);
        if (*line == '\0') continue;

        colon = strchr(line, ':');
        if (colon != NULL) {
            line = trim(colon + 1);
        }
        if (*line == '\0') {
            pline->address = current_lc;
            continue;
        }

        ptr = line;
        while (*ptr != '\0' && !isspace((unsigned char)*ptr)) ptr++;
        if (*ptr != '\0') {
            *ptr = '\0';
            ptr = trim(ptr + 1);
            strncpy(operands, ptr, sizeof(operands) - 1);
        }
        strncpy(mnemonic, line, sizeof(mnemonic) - 1);
        strncpy(pline->mnemonic, mnemonic, sizeof(pline->mnemonic) - 1);
        strncpy(pline->operands, operands, sizeof(pline->operands) - 1);

        /* Handle Directives */
        if (strcasecmp(mnemonic, "ORG") == 0 || strcasecmp(mnemonic, ".ORG") == 0) {
            unsigned long org_val = 0;
            parse_val_literal(operands, &org_val);
            current_lc = (unsigned int)(org_val & 0xFFFF);
            pline->address = current_lc;
            continue;
        } else if (strcasecmp(mnemonic, "EQU") == 0) {
            pline->address = current_lc;
            continue;
        } else if (strcasecmp(mnemonic, "DB") == 0 || strcasecmp(mnemonic, ".DB") == 0) {
            char op_copy[ASSEMBLER_MAX_LINE];
            char *tok;
            pline->address = current_lc;
            pline->byte_count = 0;
            strncpy(op_copy, operands, sizeof(op_copy) - 1);
            op_copy[sizeof(op_copy) - 1] = '\0';
            tok = strtok(op_copy, ",");
            while (tok != NULL && pline->byte_count < sizeof(pline->bytes)) {
                char *item = trim(tok);
                if (*item == '\'' || *item == '"') {
                    char quote = *item++;
                    while (*item != '\0' && *item != quote && pline->byte_count < sizeof(pline->bytes)) {
                        pline->bytes[pline->byte_count++] = (unsigned char)*item++;
                    }
                } else {
                    unsigned long bval = 0;
                    unsigned int saddr = 0;
                    if (parse_val_literal(item, &bval)) {
                        pline->bytes[pline->byte_count++] = (unsigned char)(bval & 0xFF);
                    } else if (symbol_table_find(&program->symbol_table, item, &saddr)) {
                        pline->bytes[pline->byte_count++] = (unsigned char)(saddr & 0xFF);
                    } else {
                        snprintf(pline->error, sizeof(pline->error), "Undefined symbol or invalid value '%s'.", item);
                        program->total_errors++;
                    }
                }
                tok = strtok(NULL, ",");
            }
            pline->has_code = 1;
            current_lc += pline->byte_count;
            program->total_bytes += pline->byte_count;
            continue;
        } else if (strcasecmp(mnemonic, "DW") == 0 || strcasecmp(mnemonic, ".DW") == 0) {
            char op_copy[ASSEMBLER_MAX_LINE];
            char *tok;
            pline->address = current_lc;
            pline->byte_count = 0;
            strncpy(op_copy, operands, sizeof(op_copy) - 1);
            op_copy[sizeof(op_copy) - 1] = '\0';
            tok = strtok(op_copy, ",");
            while (tok != NULL && pline->byte_count + 1 < sizeof(pline->bytes)) {
                char *item = trim(tok);
                unsigned long wval = 0;
                unsigned int saddr = 0;
                if (parse_val_literal(item, &wval)) {
                    pline->bytes[pline->byte_count++] = (unsigned char)(wval & 0xFF);
                    pline->bytes[pline->byte_count++] = (unsigned char)((wval >> 8) & 0xFF);
                } else if (symbol_table_find(&program->symbol_table, item, &saddr)) {
                    pline->bytes[pline->byte_count++] = (unsigned char)(saddr & 0xFF);
                    pline->bytes[pline->byte_count++] = (unsigned char)((saddr >> 8) & 0xFF);
                } else {
                    snprintf(pline->error, sizeof(pline->error), "Undefined symbol '%s'.", item);
                    program->total_errors++;
                }
                tok = strtok(NULL, ",");
            }
            pline->has_code = 1;
            current_lc += pline->byte_count;
            program->total_bytes += pline->byte_count;
            continue;
        } else if (strcasecmp(mnemonic, "DS") == 0 || strcasecmp(mnemonic, ".DS") == 0) {
            unsigned long ds_count = 0;
            pline->address = current_lc;
            if (parse_val_literal(operands, &ds_count)) {
                current_lc += (unsigned int)ds_count;
            }
            continue;
        } else if (strcasecmp(mnemonic, "END") == 0 || strcasecmp(mnemonic, ".END") == 0) {
            pline->address = current_lc;
            break;
        }

        /* Standard Instruction Assembly with Symbol Substitution */
        {
            char assembled_line[ASSEMBLER_MAX_LINE];
            char resolved_operands[ASSEMBLER_MAX_LINE] = {0};
            AssemblyResult ares;
            const Instruction *inst = find_instruction(mnemonic);

            pline->address = current_lc;
            if (inst == NULL) {
                continue;
            }

            if (operands[0] != '\0') {
                char op1[ASSEMBLER_MAX_LINE] = {0};
                char op2[ASSEMBLER_MAX_LINE] = {0};
                char *comma = strchr(operands, ',');
                if (comma != NULL) {
                    *comma = '\0';
                    strncpy(op1, trim(operands), sizeof(op1) - 1);
                    strncpy(op2, trim(comma + 1), sizeof(op2) - 1);
                    /* Check if op2 is a label symbol */
                    unsigned int saddr = 0;
                    if (symbol_table_find(&program->symbol_table, op2, &saddr)) {
                        snprintf(resolved_operands, sizeof(resolved_operands), "%s,%04XH", op1, saddr);
                    } else {
                        snprintf(resolved_operands, sizeof(resolved_operands), "%s,%s", op1, op2);
                    }
                } else {
                    strncpy(op1, trim(operands), sizeof(op1) - 1);
                    unsigned int saddr = 0;
                    if (symbol_table_find(&program->symbol_table, op1, &saddr)) {
                        snprintf(resolved_operands, sizeof(resolved_operands), "%04XH", saddr);
                    } else {
                        strncpy(resolved_operands, op1, sizeof(resolved_operands) - 1);
                    }
                }
                snprintf(assembled_line, sizeof(assembled_line), "%s %s", mnemonic, resolved_operands);
            } else {
                snprintf(assembled_line, sizeof(assembled_line), "%s", mnemonic);
            }

            if (assemble_instruction(assembled_line, &ares)) {
                unsigned int b;
                pline->byte_count = ares.size;
                for (b = 0; b < ares.size; ++b) {
                    pline->bytes[b] = ares.bytes[b];
                }
                pline->t_states = get_instruction_t_states(mnemonic, resolved_operands);
                pline->has_code = 1;
                current_lc += pline->byte_count;
                program->total_bytes += pline->byte_count;
            } else {
                strncpy(pline->error, ares.error, sizeof(pline->error) - 1);
                program->total_errors++;
            }
        }
    }

    return program->total_errors == 0;
}

int assemble_file(const char *file_path, AssemblyProgram *program)
{
    FILE *fp = fopen(file_path, "rb");
    char *buffer;
    long file_size;
    size_t read_bytes;
    int success;

    if (fp == NULL) return 0;
    fseek(fp, 0, SEEK_END);
    file_size = ftell(fp);
    fseek(fp, 0, SEEK_SET);

    if (file_size < 0 || file_size > 10 * 1024 * 1024) {
        fclose(fp);
        return 0;
    }

    buffer = (char *)malloc((size_t)file_size + 1);
    if (buffer == NULL) {
        fclose(fp);
        return 0;
    }

    read_bytes = fread(buffer, 1, (size_t)file_size, fp);
    buffer[read_bytes] = '\0';
    fclose(fp);

    success = assemble_program(buffer, program);
    free(buffer);
    return success;
}

void print_program_listing(FILE *stream, const AssemblyProgram *program)
{
    unsigned int i, b;
    if (stream == NULL || program == NULL) return;

    fprintf(stream, "================================================================================\n");
    fprintf(stream, "LINE  ADDR  MACHINE CODE      T-STATES  LABEL     INSTRUCTION\n");
    fprintf(stream, "================================================================================\n");

    for (i = 0; i < program->line_count; ++i) {
        const ProgramLineResult *pline = &program->lines[i];
        char code_str[32] = {0};
        char *cptr = code_str;

        if (pline->has_code) {
            for (b = 0; b < pline->byte_count && b < 4; ++b) {
                sprintf(cptr, "%02X ", pline->bytes[b]);
                cptr += 3;
            }
        }

        if (pline->error[0] != '\0') {
            fprintf(stream, "%04u  ----  %-16s  --        %-8s  %-24s [ERROR: %s]\n",
                    pline->line_number, "ERROR", pline->label, pline->raw_line, pline->error);
        } else if (pline->has_code) {
            fprintf(stream, "%04u  %04X  %-16s  %-2u T      %-8s  %s %s\n",
                    pline->line_number, pline->address, code_str, pline->t_states,
                    pline->label, pline->mnemonic, pline->operands);
        } else if (pline->label[0] != '\0' || pline->is_directive) {
            fprintf(stream, "%04u  %04X  %-16s  --        %-8s  %s %s\n",
                    pline->line_number, pline->address, "", pline->label,
                    pline->mnemonic, pline->operands);
        } else {
            fprintf(stream, "%04u                                          %s\n",
                    pline->line_number, pline->raw_line);
        }
    }

    fprintf(stream, "================================================================================\n");
    fprintf(stream, "Total Lines: %u | Total Bytes: %u | Errors: %u | Origin: %04XH\n",
            program->line_count, program->total_bytes, program->total_errors, program->origin_address);
    fprintf(stream, "================================================================================\n");
}

void print_symbol_table(FILE *stream, const SymbolTable *table)
{
    unsigned int i;
    if (stream == NULL || table == NULL) return;

    fprintf(stream, "\nSYMBOL TABLE\n");
    fprintf(stream, "----------------------------------------\n");
    fprintf(stream, "SYMBOL NAME          HEX ADDR  DEC ADDR \n");
    fprintf(stream, "----------------------------------------\n");
    for (i = 0; i < table->count; ++i) {
        fprintf(stream, "%-20s %04XH    %5u\n",
                table->symbols[i].name, table->symbols[i].address, table->symbols[i].address);
    }
    fprintf(stream, "----------------------------------------\n");
    fprintf(stream, "Total Symbols: %u\n\n", table->count);
}

int export_intel_hex(FILE *stream, const AssemblyProgram *program)
{
    unsigned int i, b;
    unsigned char record[16];
    unsigned int record_len = 0;
    unsigned int record_addr = 0;

    if (stream == NULL || program == NULL) return 0;

    for (i = 0; i < program->line_count; ++i) {
        const ProgramLineResult *pline = &program->lines[i];
        if (!pline->has_code || pline->byte_count == 0) continue;

        for (b = 0; b < pline->byte_count; ++b) {
            unsigned int current_byte_addr = pline->address + b;

            if (record_len == 0) {
                record_addr = current_byte_addr;
            } else if (current_byte_addr != record_addr + record_len || record_len == 16) {
                /* Flush record */
                unsigned int r;
                unsigned char checksum = (unsigned char)record_len;
                checksum += (unsigned char)(record_addr >> 8);
                checksum += (unsigned char)(record_addr & 0xFF);
                checksum += 0x00; /* Record type: Data */

                fprintf(stream, ":%02X%04X00", record_len, record_addr);
                for (r = 0; r < record_len; ++r) {
                    fprintf(stream, "%02X", record[r]);
                    checksum += record[r];
                }
                checksum = (unsigned char)(-(int)checksum);
                fprintf(stream, "%02X\n", checksum);

                record_len = 0;
                record_addr = current_byte_addr;
            }
            record[record_len++] = pline->bytes[b];
        }
    }

    /* Flush any pending record */
    if (record_len > 0) {
        unsigned int r;
        unsigned char checksum = (unsigned char)record_len;
        checksum += (unsigned char)(record_addr >> 8);
        checksum += (unsigned char)(record_addr & 0xFF);
        checksum += 0x00;

        fprintf(stream, ":%02X%04X00", record_len, record_addr);
        for (r = 0; r < record_len; ++r) {
            fprintf(stream, "%02X", record[r]);
            checksum += record[r];
        }
        checksum = (unsigned char)(-(int)checksum);
        fprintf(stream, "%02X\n", checksum);
    }

    /* End-of-file record */
    fprintf(stream, ":00000001FF\n");
    return 1;
}

int export_binary(FILE *stream, const AssemblyProgram *program)
{
    unsigned int i;
    if (stream == NULL || program == NULL) return 0;
    for (i = 0; i < program->line_count; ++i) {
        const ProgramLineResult *pline = &program->lines[i];
        if (pline->has_code && pline->byte_count > 0) {
            if (fwrite(pline->bytes, 1, pline->byte_count, stream) != pline->byte_count) {
                return 0;
            }
        }
    }
    return 1;
}

int export_json(FILE *stream, const AssemblyProgram *program)
{
    unsigned int i, b;
    if (stream == NULL || program == NULL) return 0;

    fprintf(stream, "{\n");
    fprintf(stream, "  \"total_bytes\": %u,\n", program->total_bytes);
    fprintf(stream, "  \"total_errors\": %u,\n", program->total_errors);
    fprintf(stream, "  \"origin_address\": %u,\n", program->origin_address);
    fprintf(stream, "  \"origin_hex\": \"%04X\",\n", program->origin_address);

    /* Symbols */
    fprintf(stream, "  \"symbols\": [\n");
    for (i = 0; i < program->symbol_table.count; ++i) {
        fprintf(stream, "    {\"name\": \"%s\", \"address\": %u, \"hex\": \"%04X\", \"line\": %d}%s\n",
                program->symbol_table.symbols[i].name,
                program->symbol_table.symbols[i].address,
                program->symbol_table.symbols[i].address,
                program->symbol_table.symbols[i].line_defined,
                i + 1 < program->symbol_table.count ? "," : "");
    }
    fprintf(stream, "  ],\n");

    /* Lines */
    fprintf(stream, "  \"lines\": [\n");
    for (i = 0; i < program->line_count; ++i) {
        const ProgramLineResult *pline = &program->lines[i];
        fprintf(stream, "    {\n");
        fprintf(stream, "      \"line\": %u,\n", pline->line_number);
        fprintf(stream, "      \"address\": %u,\n", pline->address);
        fprintf(stream, "      \"address_hex\": \"%04X\",\n", pline->address);
        fprintf(stream, "      \"label\": \"%s\",\n", pline->label);
        fprintf(stream, "      \"mnemonic\": \"%s\",\n", pline->mnemonic);
        fprintf(stream, "      \"operands\": \"%s\",\n", pline->operands);
        fprintf(stream, "      \"t_states\": %u,\n", pline->t_states);
        fprintf(stream, "      \"byte_count\": %u,\n", pline->byte_count);
        fprintf(stream, "      \"has_code\": %s,\n", pline->has_code ? "true" : "false");
        fprintf(stream, "      \"error\": \"%s\",\n", pline->error);
        fprintf(stream, "      \"bytes\": [");
        for (b = 0; b < pline->byte_count; ++b) {
            fprintf(stream, "\"%02X\"%s", pline->bytes[b], b + 1 < pline->byte_count ? ", " : "");
        }
        fprintf(stream, "]\n");
        fprintf(stream, "    }%s\n", i + 1 < program->line_count ? "," : "");
    }
    fprintf(stream, "  ]\n");
    fprintf(stream, "}\n");
    return 1;
}
