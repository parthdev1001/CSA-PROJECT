#ifndef ASSEMBLER_H
#define ASSEMBLER_H

#include <stdio.h>

#define ASSEMBLER_MAX_LINE 256
#define ASSEMBLER_ERROR_SIZE 160
#define MAX_SYMBOLS 512
#define MAX_PROGRAM_LINES 2048

typedef struct {
    unsigned char bytes[3];
    unsigned int size;
    char error[ASSEMBLER_ERROR_SIZE];
} AssemblyResult;

typedef struct {
    char name[64];
    unsigned int address;
    int is_defined;
    int line_defined;
} Symbol;

typedef struct {
    Symbol symbols[MAX_SYMBOLS];
    unsigned int count;
} SymbolTable;

typedef struct {
    unsigned int line_number;
    unsigned int address;
    unsigned char bytes[16];
    unsigned int byte_count;
    unsigned int t_states;
    char label[64];
    char mnemonic[16];
    char operands[128];
    char raw_line[ASSEMBLER_MAX_LINE];
    char error[ASSEMBLER_ERROR_SIZE];
    int is_directive;
    int has_code;
} ProgramLineResult;

typedef struct {
    ProgramLineResult lines[MAX_PROGRAM_LINES];
    unsigned int line_count;
    unsigned int total_bytes;
    unsigned int total_errors;
    unsigned int origin_address;
    unsigned int entry_point;
    SymbolTable symbol_table;
} AssemblyProgram;

/* Single instruction assembly (backwards compatible) */
int assemble_instruction(const char *line, AssemblyResult *result);
void print_supported_instructions(FILE *stream);

/* Multi-line two-pass assembly */
int assemble_program(const char *source_text, AssemblyProgram *program);
int assemble_file(const char *file_path, AssemblyProgram *program);
void print_program_listing(FILE *stream, const AssemblyProgram *program);
void print_symbol_table(FILE *stream, const SymbolTable *table);
int export_intel_hex(FILE *stream, const AssemblyProgram *program);
int export_binary(FILE *stream, const AssemblyProgram *program);
int export_json(FILE *stream, const AssemblyProgram *program);
unsigned int get_instruction_t_states(const char *mnemonic, const char *operands);

#endif
