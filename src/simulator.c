#include "simulator.h"
#include <string.h>
#include <stdio.h>

static unsigned char parity(unsigned char val)
{
    unsigned char p = 0;
    while (val) {
        p ^= (val & 1);
        val >>= 1;
    }
    return p == 0 ? 1 : 0; /* 1 for even parity */
}

void cpu_init(CPU8085 *cpu)
{
    if (cpu == NULL) return;
    memset(cpu, 0, sizeof *cpu);
    cpu->sp = 0xFFFF;
}

void cpu_load_program(CPU8085 *cpu, const AssemblyProgram *program)
{
    unsigned int i, b;
    if (cpu == NULL || program == NULL) return;
    for (i = 0; i < program->line_count; ++i) {
        const ProgramLineResult *pline = &program->lines[i];
        if (pline->has_code && pline->byte_count > 0) {
            for (b = 0; b < pline->byte_count; ++b) {
                cpu->memory[(pline->address + b) & 0xFFFF] = pline->bytes[b];
            }
        }
    }
    cpu->pc = (unsigned short)(program->entry_point & 0xFFFF);
    cpu->halted = 0;
}

void cpu_load_bytes(CPU8085 *cpu, unsigned short address, const unsigned char *bytes, unsigned int length)
{
    unsigned int i;
    if (cpu == NULL || bytes == NULL) return;
    for (i = 0; i < length; ++i) {
        cpu->memory[(address + i) & 0xFFFF] = bytes[i];
    }
}

static unsigned char get_reg(const CPU8085 *cpu, unsigned char code)
{
    switch (code & 7) {
    case 0: return cpu->b;
    case 1: return cpu->c;
    case 2: return cpu->d;
    case 3: return cpu->e;
    case 4: return cpu->h;
    case 5: return cpu->l;
    case 6: {
        unsigned short hl = (unsigned short)(((unsigned short)cpu->h << 8) | cpu->l);
        return cpu->memory[hl];
    }
    case 7: return cpu->a;
    }
    return 0;
}

static void set_reg(CPU8085 *cpu, unsigned char code, unsigned char val)
{
    switch (code & 7) {
    case 0: cpu->b = val; break;
    case 1: cpu->c = val; break;
    case 2: cpu->d = val; break;
    case 3: cpu->e = val; break;
    case 4: cpu->h = val; break;
    case 5: cpu->l = val; break;
    case 6: {
        unsigned short hl = (unsigned short)(((unsigned short)cpu->h << 8) | cpu->l);
        cpu->memory[hl] = val;
        break;
    }
    case 7: cpu->a = val; break;
    }
}

static void set_flags_arith(CPU8085 *cpu, unsigned short res, unsigned char op1, unsigned char op2, int is_sub)
{
    unsigned char val = (unsigned char)(res & 0xFF);
    cpu->flag_s = (val & 0x80) ? 1 : 0;
    cpu->flag_z = (val == 0) ? 1 : 0;
    cpu->flag_p = parity(val);
    cpu->flag_cy = (res > 0xFF) ? 1 : 0;

    if (!is_sub) {
        cpu->flag_ac = (((op1 & 0x0F) + (op2 & 0x0F)) > 0x0F) ? 1 : 0;
    } else {
        cpu->flag_ac = ((op1 & 0x0F) < (op2 & 0x0F)) ? 1 : 0;
    }
}

static void set_flags_logic(CPU8085 *cpu, unsigned char val, unsigned char ac)
{
    cpu->flag_s = (val & 0x80) ? 1 : 0;
    cpu->flag_z = (val == 0) ? 1 : 0;
    cpu->flag_p = parity(val);
    cpu->flag_cy = 0;
    cpu->flag_ac = ac;
}

static void push_word(CPU8085 *cpu, unsigned short val)
{
    cpu->sp--;
    cpu->memory[cpu->sp] = (unsigned char)(val >> 8);
    cpu->sp--;
    cpu->memory[cpu->sp] = (unsigned char)(val & 0xFF);
}

static unsigned short pop_word(CPU8085 *cpu)
{
    unsigned short low = cpu->memory[cpu->sp++];
    unsigned short high = cpu->memory[cpu->sp++];
    return (unsigned short)((high << 8) | low);
}

int cpu_step(CPU8085 *cpu)
{
    unsigned char opcode;
    if (cpu == NULL || cpu->halted) return 0;

    opcode = cpu->memory[cpu->pc++];
    cpu->instructions_executed++;

    /* HLT */
    if (opcode == 0x76) {
        cpu->halted = 1;
        cpu->cycles += 5;
        return 0;
    }

    /* NOP */
    if (opcode == 0x00) {
        cpu->cycles += 4;
        return 1;
    }

    /* MOV r1, r2 (0x40 - 0x7F) */
    if ((opcode & 0xC0) == 0x40) {
        unsigned char dst = (opcode >> 3) & 7;
        unsigned char src = opcode & 7;
        unsigned char val = get_reg(cpu, src);
        set_reg(cpu, dst, val);
        cpu->cycles += (dst == 6 || src == 6) ? 7 : 4;
        return 1;
    }

    /* MVI r, data8 (0x06, 0x0E, etc.) */
    if ((opcode & 0xC7) == 0x06) {
        unsigned char r = (opcode >> 3) & 7;
        unsigned char data = cpu->memory[cpu->pc++];
        set_reg(cpu, r, data);
        cpu->cycles += (r == 6) ? 10 : 7;
        return 1;
    }

    /* LXI rp, data16 */
    if ((opcode & 0xCF) == 0x01) {
        unsigned char rp = (opcode >> 4) & 3;
        unsigned short low = cpu->memory[cpu->pc++];
        unsigned short high = cpu->memory[cpu->pc++];
        unsigned short val = (unsigned short)((high << 8) | low);
        switch (rp) {
        case 0: cpu->b = (unsigned char)high; cpu->c = (unsigned char)low; break;
        case 1: cpu->d = (unsigned char)high; cpu->e = (unsigned char)low; break;
        case 2: cpu->h = (unsigned char)high; cpu->l = (unsigned char)low; break;
        case 3: cpu->sp = val; break;
        }
        cpu->cycles += 10;
        return 1;
    }

    /* LDA addr16 */
    if (opcode == 0x3A) {
        unsigned short low = cpu->memory[cpu->pc++];
        unsigned short high = cpu->memory[cpu->pc++];
        unsigned short addr = (unsigned short)((high << 8) | low);
        cpu->a = cpu->memory[addr];
        cpu->cycles += 13;
        return 1;
    }

    /* STA addr16 */
    if (opcode == 0x32) {
        unsigned short low = cpu->memory[cpu->pc++];
        unsigned short high = cpu->memory[cpu->pc++];
        unsigned short addr = (unsigned short)((high << 8) | low);
        cpu->memory[addr] = cpu->a;
        cpu->cycles += 13;
        return 1;
    }

    /* LHLD addr16 */
    if (opcode == 0x2A) {
        unsigned short low = cpu->memory[cpu->pc++];
        unsigned short high = cpu->memory[cpu->pc++];
        unsigned short addr = (unsigned short)((high << 8) | low);
        cpu->l = cpu->memory[addr];
        cpu->h = cpu->memory[(addr + 1) & 0xFFFF];
        cpu->cycles += 16;
        return 1;
    }

    /* SHLD addr16 */
    if (opcode == 0x22) {
        unsigned short low = cpu->memory[cpu->pc++];
        unsigned short high = cpu->memory[cpu->pc++];
        unsigned short addr = (unsigned short)((high << 8) | low);
        cpu->memory[addr] = cpu->l;
        cpu->memory[(addr + 1) & 0xFFFF] = cpu->h;
        cpu->cycles += 16;
        return 1;
    }

    /* LDAX B / D */
    if (opcode == 0x0A) {
        unsigned short bc = (unsigned short)(((unsigned short)cpu->b << 8) | cpu->c);
        cpu->a = cpu->memory[bc];
        cpu->cycles += 7;
        return 1;
    }
    if (opcode == 0x1A) {
        unsigned short de = (unsigned short)(((unsigned short)cpu->d << 8) | cpu->e);
        cpu->a = cpu->memory[de];
        cpu->cycles += 7;
        return 1;
    }

    /* STAX B / D */
    if (opcode == 0x02) {
        unsigned short bc = (unsigned short)(((unsigned short)cpu->b << 8) | cpu->c);
        cpu->memory[bc] = cpu->a;
        cpu->cycles += 7;
        return 1;
    }
    if (opcode == 0x12) {
        unsigned short de = (unsigned short)(((unsigned short)cpu->d << 8) | cpu->e);
        cpu->memory[de] = cpu->a;
        cpu->cycles += 7;
        return 1;
    }

    /* XCHG */
    if (opcode == 0xEB) {
        unsigned char tb = cpu->h; cpu->h = cpu->d; cpu->d = tb;
        tb = cpu->l; cpu->l = cpu->e; cpu->e = tb;
        cpu->cycles += 4;
        return 1;
    }

    /* Arithmetic on registers (0x80 - 0xBF) */
    if ((opcode & 0xC0) == 0x80) {
        unsigned char op = (opcode >> 3) & 7;
        unsigned char r = opcode & 7;
        unsigned char val = get_reg(cpu, r);
        unsigned short res = 0;

        switch (op) {
        case 0: /* ADD */
            res = (unsigned short)cpu->a + val;
            set_flags_arith(cpu, res, cpu->a, val, 0);
            cpu->a = (unsigned char)res;
            break;
        case 1: /* ADC */
            res = (unsigned short)cpu->a + val + cpu->flag_cy;
            set_flags_arith(cpu, res, cpu->a, val, 0);
            cpu->a = (unsigned char)res;
            break;
        case 2: /* SUB */
            res = (unsigned short)cpu->a - val;
            set_flags_arith(cpu, res, cpu->a, val, 1);
            cpu->a = (unsigned char)res;
            break;
        case 3: /* SBB */
            res = (unsigned short)cpu->a - val - cpu->flag_cy;
            set_flags_arith(cpu, res, cpu->a, val, 1);
            cpu->a = (unsigned char)res;
            break;
        case 4: /* ANA */
            cpu->a &= val;
            set_flags_logic(cpu, cpu->a, 1);
            break;
        case 5: /* XRA */
            cpu->a ^= val;
            set_flags_logic(cpu, cpu->a, 0);
            break;
        case 6: /* ORA */
            cpu->a |= val;
            set_flags_logic(cpu, cpu->a, 0);
            break;
        case 7: /* CMP */
            res = (unsigned short)cpu->a - val;
            set_flags_arith(cpu, res, cpu->a, val, 1);
            break;
        }
        cpu->cycles += (r == 6) ? 7 : 4;
        return 1;
    }

    /* Immediate Arithmetic / Logic */
    if (opcode == 0xC6) { /* ADI */
        unsigned char val = cpu->memory[cpu->pc++];
        unsigned short res = (unsigned short)cpu->a + val;
        set_flags_arith(cpu, res, cpu->a, val, 0);
        cpu->a = (unsigned char)res;
        cpu->cycles += 7;
        return 1;
    }
    if (opcode == 0xCE) { /* ACI */
        unsigned char val = cpu->memory[cpu->pc++];
        unsigned short res = (unsigned short)cpu->a + val + cpu->flag_cy;
        set_flags_arith(cpu, res, cpu->a, val, 0);
        cpu->a = (unsigned char)res;
        cpu->cycles += 7;
        return 1;
    }
    if (opcode == 0xD6) { /* SUI */
        unsigned char val = cpu->memory[cpu->pc++];
        unsigned short res = (unsigned short)cpu->a - val;
        set_flags_arith(cpu, res, cpu->a, val, 1);
        cpu->a = (unsigned char)res;
        cpu->cycles += 7;
        return 1;
    }
    if (opcode == 0xDE) { /* SBI */
        unsigned char val = cpu->memory[cpu->pc++];
        unsigned short res = (unsigned short)cpu->a - val - cpu->flag_cy;
        set_flags_arith(cpu, res, cpu->a, val, 1);
        cpu->a = (unsigned char)res;
        cpu->cycles += 7;
        return 1;
    }
    if (opcode == 0xE6) { /* ANI */
        unsigned char val = cpu->memory[cpu->pc++];
        cpu->a &= val;
        set_flags_logic(cpu, cpu->a, 1);
        cpu->cycles += 7;
        return 1;
    }
    if (opcode == 0xEE) { /* XRI */
        unsigned char val = cpu->memory[cpu->pc++];
        cpu->a ^= val;
        set_flags_logic(cpu, cpu->a, 0);
        cpu->cycles += 7;
        return 1;
    }
    if (opcode == 0xF6) { /* ORI */
        unsigned char val = cpu->memory[cpu->pc++];
        cpu->a |= val;
        set_flags_logic(cpu, cpu->a, 0);
        cpu->cycles += 7;
        return 1;
    }
    if (opcode == 0xFE) { /* CPI */
        unsigned char val = cpu->memory[cpu->pc++];
        unsigned short res = (unsigned short)cpu->a - val;
        set_flags_arith(cpu, res, cpu->a, val, 1);
        cpu->cycles += 7;
        return 1;
    }

    /* INR r (0x04, 0x0C, etc.) */
    if ((opcode & 0xC7) == 0x04) {
        unsigned char r = (opcode >> 3) & 7;
        unsigned char val = get_reg(cpu, r);
        unsigned char res = val + 1;
        cpu->flag_s = (res & 0x80) ? 1 : 0;
        cpu->flag_z = (res == 0) ? 1 : 0;
        cpu->flag_p = parity(res);
        cpu->flag_ac = ((val & 0x0F) == 0x0F) ? 1 : 0;
        set_reg(cpu, r, res);
        cpu->cycles += (r == 6) ? 10 : 4;
        return 1;
    }

    /* DCR r (0x05, 0x0D, etc.) */
    if ((opcode & 0xC7) == 0x05) {
        unsigned char r = (opcode >> 3) & 7;
        unsigned char val = get_reg(cpu, r);
        unsigned char res = val - 1;
        cpu->flag_s = (res & 0x80) ? 1 : 0;
        cpu->flag_z = (res == 0) ? 1 : 0;
        cpu->flag_p = parity(res);
        cpu->flag_ac = ((val & 0x0F) == 0x00) ? 1 : 0;
        set_reg(cpu, r, res);
        cpu->cycles += (r == 6) ? 10 : 4;
        return 1;
    }

    /* INX rp */
    if ((opcode & 0xCF) == 0x03) {
        unsigned char rp = (opcode >> 4) & 3;
        switch (rp) {
        case 0: { unsigned short bc = (unsigned short)(((unsigned short)cpu->b << 8) | cpu->c); bc++; cpu->b = (unsigned char)(bc >> 8); cpu->c = (unsigned char)(bc & 0xFF); break; }
        case 1: { unsigned short de = (unsigned short)(((unsigned short)cpu->d << 8) | cpu->e); de++; cpu->d = (unsigned char)(de >> 8); cpu->e = (unsigned char)(de & 0xFF); break; }
        case 2: { unsigned short hl = (unsigned short)(((unsigned short)cpu->h << 8) | cpu->l); hl++; cpu->h = (unsigned char)(hl >> 8); cpu->l = (unsigned char)(hl & 0xFF); break; }
        case 3: cpu->sp++; break;
        }
        cpu->cycles += 6;
        return 1;
    }

    /* DCX rp */
    if ((opcode & 0xCF) == 0x0B) {
        unsigned char rp = (opcode >> 4) & 3;
        switch (rp) {
        case 0: { unsigned short bc = (unsigned short)(((unsigned short)cpu->b << 8) | cpu->c); bc--; cpu->b = (unsigned char)(bc >> 8); cpu->c = (unsigned char)(bc & 0xFF); break; }
        case 1: { unsigned short de = (unsigned short)(((unsigned short)cpu->d << 8) | cpu->e); de--; cpu->d = (unsigned char)(de >> 8); cpu->e = (unsigned char)(de & 0xFF); break; }
        case 2: { unsigned short hl = (unsigned short)(((unsigned short)cpu->h << 8) | cpu->l); hl--; cpu->h = (unsigned char)(hl >> 8); cpu->l = (unsigned char)(hl & 0xFF); break; }
        case 3: cpu->sp--; break;
        }
        cpu->cycles += 6;
        return 1;
    }

    /* DAD rp */
    if ((opcode & 0xCF) == 0x09) {
        unsigned char rp = (opcode >> 4) & 3;
        unsigned long hl = (unsigned long)(((unsigned long)cpu->h << 8) | cpu->l);
        unsigned long val = 0;
        switch (rp) {
        case 0: val = ((unsigned long)cpu->b << 8) | cpu->c; break;
        case 1: val = ((unsigned long)cpu->d << 8) | cpu->e; break;
        case 2: val = hl; break;
        case 3: val = cpu->sp; break;
        }
        hl += val;
        cpu->flag_cy = (hl > 0xFFFF) ? 1 : 0;
        cpu->h = (unsigned char)((hl >> 8) & 0xFF);
        cpu->l = (unsigned char)(hl & 0xFF);
        cpu->cycles += 10;
        return 1;
    }

    /* Jumps */
    if (opcode == 0xC3) { /* JMP */
        unsigned short low = cpu->memory[cpu->pc++];
        unsigned short high = cpu->memory[cpu->pc++];
        cpu->pc = (unsigned short)((high << 8) | low);
        cpu->cycles += 10;
        return 1;
    }
    if ((opcode & 0xC7) == 0xC2) { /* Conditional Jumps */
        unsigned char cond = (opcode >> 3) & 7;
        unsigned short low = cpu->memory[cpu->pc++];
        unsigned short high = cpu->memory[cpu->pc++];
        unsigned short target = (unsigned short)((high << 8) | low);
        int take = 0;
        switch (cond) {
        case 0: take = !cpu->flag_z; break;  /* JNZ */
        case 1: take = cpu->flag_z; break;   /* JZ */
        case 2: take = !cpu->flag_cy; break; /* JNC */
        case 3: take = cpu->flag_cy; break;  /* JC */
        case 4: take = !cpu->flag_p; break;  /* JPO */
        case 5: take = cpu->flag_p; break;   /* JPE */
        case 6: take = !cpu->flag_s; break;  /* JP */
        case 7: take = cpu->flag_s; break;   /* JM */
        }
        if (take) cpu->pc = target;
        cpu->cycles += 10;
        return 1;
    }

    /* CALL & RET */
    if (opcode == 0xCD) { /* CALL */
        unsigned short low = cpu->memory[cpu->pc++];
        unsigned short high = cpu->memory[cpu->pc++];
        unsigned short target = (unsigned short)((high << 8) | low);
        push_word(cpu, cpu->pc);
        cpu->pc = target;
        cpu->cycles += 18;
        return 1;
    }
    if (opcode == 0xC9) { /* RET */
        cpu->pc = pop_word(cpu);
        cpu->cycles += 10;
        return 1;
    }

    /* Stack PUSH / POP */
    if ((opcode & 0xCF) == 0xC5) { /* PUSH */
        unsigned char rp = (opcode >> 4) & 3;
        switch (rp) {
        case 0: push_word(cpu, (unsigned short)(((unsigned short)cpu->b << 8) | cpu->c)); break;
        case 1: push_word(cpu, (unsigned short)(((unsigned short)cpu->d << 8) | cpu->e)); break;
        case 2: push_word(cpu, (unsigned short)(((unsigned short)cpu->h << 8) | cpu->l)); break;
        case 3: {
            unsigned char f = (unsigned char)((cpu->flag_s << 7) | (cpu->flag_z << 6) |
                             (cpu->flag_ac << 4) | (cpu->flag_p << 2) | (1 << 1) | cpu->flag_cy);
            push_word(cpu, (unsigned short)(((unsigned short)cpu->a << 8) | f));
            break;
        }
        }
        cpu->cycles += 12;
        return 1;
    }
    if ((opcode & 0xCF) == 0xC1) { /* POP */
        unsigned char rp = (opcode >> 4) & 3;
        unsigned short val = pop_word(cpu);
        switch (rp) {
        case 0: cpu->b = (unsigned char)(val >> 8); cpu->c = (unsigned char)(val & 0xFF); break;
        case 1: cpu->d = (unsigned char)(val >> 8); cpu->e = (unsigned char)(val & 0xFF); break;
        case 2: cpu->h = (unsigned char)(val >> 8); cpu->l = (unsigned char)(val & 0xFF); break;
        case 3: {
            unsigned char f = (unsigned char)(val & 0xFF);
            cpu->a = (unsigned char)(val >> 8);
            cpu->flag_s = (f >> 7) & 1;
            cpu->flag_z = (f >> 6) & 1;
            cpu->flag_ac = (f >> 4) & 1;
            cpu->flag_p = (f >> 2) & 1;
            cpu->flag_cy = f & 1;
            break;
        }
        }
        cpu->cycles += 10;
        return 1;
    }

    /* Rotates and specials */
    if (opcode == 0x2F) { /* CMA */
        cpu->a = ~cpu->a;
        cpu->cycles += 4;
        return 1;
    }
    if (opcode == 0x37) { /* STC */
        cpu->flag_cy = 1;
        cpu->cycles += 4;
        return 1;
    }
    if (opcode == 0x3F) { /* CMC */
        cpu->flag_cy = !cpu->flag_cy;
        cpu->cycles += 4;
        return 1;
    }
    if (opcode == 0x07) { /* RLC */
        unsigned char high = (cpu->a >> 7) & 1;
        cpu->a = (unsigned char)((cpu->a << 1) | high);
        cpu->flag_cy = high;
        cpu->cycles += 4;
        return 1;
    }
    if (opcode == 0x0F) { /* RRC */
        unsigned char low = cpu->a & 1;
        cpu->a = (unsigned char)((cpu->a >> 1) | (low << 7));
        cpu->flag_cy = low;
        cpu->cycles += 4;
        return 1;
    }
    if (opcode == 0x17) { /* RAL */
        unsigned char high = (cpu->a >> 7) & 1;
        cpu->a = (unsigned char)((cpu->a << 1) | cpu->flag_cy);
        cpu->flag_cy = high;
        cpu->cycles += 4;
        return 1;
    }
    if (opcode == 0x1F) { /* RAR */
        unsigned char low = cpu->a & 1;
        cpu->a = (unsigned char)((cpu->a >> 1) | (cpu->flag_cy << 7));
        cpu->flag_cy = low;
        cpu->cycles += 4;
        return 1;
    }

    cpu->cycles += 4;
    return 1;
}

int cpu_run(CPU8085 *cpu, unsigned long max_steps)
{
    unsigned long steps = 0;
    if (cpu == NULL) return 0;
    while (!cpu->halted && (max_steps == 0 || steps < max_steps)) {
        if (!cpu_step(cpu)) break;
        steps++;
    }
    return cpu->halted;
}

void cpu_print_state(FILE *stream, const CPU8085 *cpu)
{
    unsigned short hl = (unsigned short)(((unsigned short)cpu->h << 8) | cpu->l);
    if (stream == NULL || cpu == NULL) return;

    fprintf(stream, "--------------------------------------------------------\n");
    fprintf(stream, "8085 CPU REGISTERS & STATUS\n");
    fprintf(stream, "--------------------------------------------------------\n");
    fprintf(stream, "A : %02XH (%3u)   B : %02XH (%3u)   C : %02XH (%3u)\n",
            cpu->a, cpu->a, cpu->b, cpu->b, cpu->c, cpu->c);
    fprintf(stream, "D : %02XH (%3u)   E : %02XH (%3u)   H : %02XH (%3u)\n",
            cpu->d, cpu->d, cpu->e, cpu->e, cpu->h, cpu->h);
    fprintf(stream, "L : %02XH (%3u)   M : %02XH (%3u at HL=%04XH)\n",
            cpu->l, cpu->l, cpu->memory[hl], cpu->memory[hl], hl);
    fprintf(stream, "PC: %04XH        SP: %04XH\n", cpu->pc, cpu->sp);
    fprintf(stream, "FLAGS: [S=%u Z=%u AC=%u P=%u CY=%u] | Cycles: %lu | Status: %s\n",
            cpu->flag_s, cpu->flag_z, cpu->flag_ac, cpu->flag_p, cpu->flag_cy,
            cpu->cycles, cpu->halted ? "HALTED" : "RUNNING");
    fprintf(stream, "--------------------------------------------------------\n");
}

void cpu_print_memory(FILE *stream, const CPU8085 *cpu, unsigned short start, unsigned short count)
{
    unsigned short i;
    if (stream == NULL || cpu == NULL) return;

    fprintf(stream, "Memory Dump from %04XH:\n", start);
    for (i = 0; i < count; ++i) {
        if (i % 16 == 0) {
            if (i > 0) fprintf(stream, "\n");
            fprintf(stream, "%04XH: ", (unsigned short)(start + i));
        }
        fprintf(stream, "%02X ", cpu->memory[(start + i) & 0xFFFF]);
    }
    fprintf(stream, "\n");
}
