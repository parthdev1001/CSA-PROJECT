#ifndef SIMULATOR_H
#define SIMULATOR_H

#include "assembler.h"
#include <stdio.h>

#define CPU8085_MEM_SIZE 65536

typedef struct {
    unsigned char a;
    unsigned char b;
    unsigned char c;
    unsigned char d;
    unsigned char e;
    unsigned char h;
    unsigned char l;
    unsigned short pc;
    unsigned short sp;

    /* Status flags */
    unsigned char flag_s;   /* Sign */
    unsigned char flag_z;   /* Zero */
    unsigned char flag_ac;  /* Auxiliary Carry */
    unsigned char flag_p;   /* Parity */
    unsigned char flag_cy;  /* Carry */

    unsigned char memory[CPU8085_MEM_SIZE];
    int halted;
    unsigned long cycles;
    unsigned long instructions_executed;
} CPU8085;

void cpu_init(CPU8085 *cpu);
void cpu_load_program(CPU8085 *cpu, const AssemblyProgram *program);
void cpu_load_bytes(CPU8085 *cpu, unsigned short address, const unsigned char *bytes, unsigned int length);
int cpu_step(CPU8085 *cpu);
int cpu_run(CPU8085 *cpu, unsigned long max_steps);
void cpu_print_state(FILE *stream, const CPU8085 *cpu);
void cpu_print_memory(FILE *stream, const CPU8085 *cpu, unsigned short start, unsigned short count);

#endif
