#include "assembler.h"
#include "simulator.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void help(const char *program)
{
    printf("8085 Mini Assembler & Simulator\n");
    printf("Usage: %s [options] [\"instruction\" | file.asm]\n", program);
    printf("       %s --list\n", program);
    printf("       %s --help\n\n", program);
    printf("Modes:\n");
    printf("  Single instruction: %s \"MVI A,05H\"\n", program);
    printf("  Program file      : %s program.asm [options]\n", program);
    printf("  Interactive       : %s (enter instructions; QUIT or EOF ends session)\n\n", program);
    printf("Options:\n");
    printf("  -o, --output <file> Save listing output to <file>\n");
    printf("  -x, --hex <file>    Export Intel HEX machine-code to <file>\n");
    printf("  -b, --bin <file>    Export raw binary machine-code to <file>\n");
    printf("  -s, --sym           Display the Symbol Table\n");
    printf("  -r, --run, --sim    Simulate and execute the program in 8085 CPU\n");
    printf("  -j, --json          Output program and symbol table in JSON format\n");
    printf("  -l, --list          List all supported 8085 instructions\n");
    printf("  -h, --help          Show this help text\n\n");
    printf("Examples: MVI A,05H    MOV B,A    LDA 2050H    LXI H,0x2050\n");
    printf("Directives: ORG, EQU, DB, DW, DS, END. Labels end with a colon (:).\n");
}

static int write_result(FILE *stream, const char *line, const AssemblyResult *result)
{
    unsigned int i;
    if (fprintf(stream, "Instruction  : %s\nOpcode       : %02X\nMachine Code :",
                line, (unsigned int)result->bytes[0]) < 0) {
        return 0;
    }
    for (i = 0; i < result->size; ++i) {
        if (fprintf(stream, " %02X", (unsigned int)result->bytes[i]) < 0) {
            return 0;
        }
    }
    return fprintf(stream, "\nSize         : %u Byte%s\n\n",
                   result->size, result->size == 1 ? "" : "s") >= 0;
}

static int process_line(const char *line, FILE *listing, unsigned long *instructions,
                        unsigned long *bytes, unsigned long *errors)
{
    AssemblyResult result;
    if (!assemble_instruction(line, &result)) {
        fprintf(stderr, "Error: %s\n", result.error);
        ++*errors;
        return 1;
    }
    if (!write_result(stdout, line, &result) ||
        (listing != NULL && !write_result(listing, line, &result))) {
        fprintf(stderr, "Error: could not write machine-code output.\n");
        return 0;
    }
    ++*instructions;
    *bytes += result.size;
    return 1;
}

static int is_quit(const char *text)
{
    const char *word = "QUIT";
    unsigned int i;
    for (i = 0; word[i] != '\0'; ++i) {
        if (toupper((unsigned char)text[i]) != word[i]) {
            return 0;
        }
    }
    text += i;
    while (isspace((unsigned char)*text)) {
        ++text;
    }
    return *text == '\0' || *text == ';';
}

static int is_file_target(const char *target)
{
    FILE *fp;
    if (target == NULL || target[0] == '\0') return 0;
    if (strstr(target, ".asm") != NULL || strstr(target, ".s") != NULL ||
        strstr(target, ".8085") != NULL) {
        return 1;
    }
    if (strchr(target, '/') != NULL || strchr(target, '\\') != NULL) {
        fp = fopen(target, "r");
        if (fp != NULL) {
            fclose(fp);
            return 1;
        }
    }
    return 0;
}

int main(int argc, char **argv)
{
    const char *target_arg = NULL;
    const char *output_path = NULL;
    const char *hex_path = NULL;
    const char *bin_path = NULL;
    int show_sym = 0;
    int run_sim = 0;
    int json_mode = 0;
    FILE *listing = NULL;
    char line[ASSEMBLER_MAX_LINE + 2];
    unsigned long instructions = 0;
    unsigned long bytes = 0;
    unsigned long errors = 0;
    int fatal = 0;
    int i;

    if (argc == 2 && (strcmp(argv[1], "--help") == 0 || strcmp(argv[1], "-h") == 0)) {
        help(argv[0]);
        if (fflush(stdout) == EOF || ferror(stdout)) {
            fprintf(stderr, "Error: could not write help output.\n");
            return 1;
        }
        return 0;
    }
    if (argc == 2 && (strcmp(argv[1], "--list") == 0 || strcmp(argv[1], "-l") == 0)) {
        print_supported_instructions(stdout);
        if (fflush(stdout) == EOF || ferror(stdout)) {
            fprintf(stderr, "Error: could not write instruction list.\n");
            return 1;
        }
        return 0;
    }

    for (i = 1; i < argc; ++i) {
        if (strcmp(argv[i], "--output") == 0 || strcmp(argv[i], "-o") == 0) {
            if (++i >= argc || output_path != NULL || argv[i][0] == '\0') {
                fprintf(stderr, "Error: --output requires one filename and may occur only once.\n");
                return 2;
            }
            output_path = argv[i];
        } else if (strcmp(argv[i], "--hex") == 0 || strcmp(argv[i], "-x") == 0) {
            if (++i >= argc || hex_path != NULL || argv[i][0] == '\0') {
                fprintf(stderr, "Error: --hex requires one filename.\n");
                return 2;
            }
            hex_path = argv[i];
        } else if (strcmp(argv[i], "--bin") == 0 || strcmp(argv[i], "-b") == 0) {
            if (++i >= argc || bin_path != NULL || argv[i][0] == '\0') {
                fprintf(stderr, "Error: --bin requires one filename.\n");
                return 2;
            }
            bin_path = argv[i];
        } else if (strcmp(argv[i], "--sym") == 0 || strcmp(argv[i], "-s") == 0) {
            show_sym = 1;
        } else if (strcmp(argv[i], "--run") == 0 || strcmp(argv[i], "--sim") == 0 || strcmp(argv[i], "-r") == 0) {
            run_sim = 1;
        } else if (strcmp(argv[i], "--json") == 0 || strcmp(argv[i], "-j") == 0) {
            json_mode = 1;
        } else if (argv[i][0] == '-') {
            fprintf(stderr, "Error: unknown option '%s'. Use --help.\n", argv[i]);
            return 2;
        } else if (target_arg == NULL) {
            target_arg = argv[i];
        } else {
            fprintf(stderr, "Error: quote the instruction as one argument. Use --help.\n");
            return 2;
        }
    }

    if (output_path != NULL) {
        listing = fopen(output_path, "w");
        if (listing == NULL) {
            perror("Error opening output file");
            return 1;
        }
    }

    /* Multi-line assembly program file mode */
    if (target_arg != NULL && is_file_target(target_arg)) {
        AssemblyProgram program;
        if (!assemble_file(target_arg, &program)) {
            if (program.line_count == 0) {
                perror("Error opening input file");
                if (listing != NULL) fclose(listing);
                return 1;
            }
        }

        if (json_mode) {
            export_json(stdout, &program);
        } else {
            print_program_listing(stdout, &program);
            if (show_sym && program.symbol_table.count > 0) {
                print_symbol_table(stdout, &program.symbol_table);
            }
        }

        if (listing != NULL) {
            print_program_listing(listing, &program);
            if (show_sym && program.symbol_table.count > 0) {
                print_symbol_table(listing, &program.symbol_table);
            }
        }

        if (hex_path != NULL) {
            FILE *hfp = fopen(hex_path, "w");
            if (hfp == NULL) {
                perror("Error opening hex output file");
                fatal = 1;
            } else {
                export_intel_hex(hfp, &program);
                fclose(hfp);
                printf("Exported Intel HEX to %s\n", hex_path);
            }
        }

        if (bin_path != NULL) {
            FILE *bfp = fopen(bin_path, "wb");
            if (bfp == NULL) {
                perror("Error opening binary output file");
                fatal = 1;
            } else {
                export_binary(bfp, &program);
                fclose(bfp);
                printf("Exported Binary to %s\n", bin_path);
            }
        }

        if (run_sim && program.total_errors == 0) {
            CPU8085 cpu;
            cpu_init(&cpu);
            cpu_load_program(&cpu, &program);
            printf("\n--- Executing 8085 Simulator ---\n");
            cpu_run(&cpu, 100000);
            cpu_print_state(stdout, &cpu);
        }

        if (listing != NULL) fclose(listing);
        return (program.total_errors > 0 || fatal) ? 1 : 0;
    }

    /* Single instruction mode */
    if (target_arg != NULL) {
        fatal = !process_line(target_arg, listing, &instructions, &bytes, &errors);
    } else {
        /* Interactive mode */
        printf("8085 Mini Assembler\nEnter an instruction, or QUIT to finish.\n\n");
        for (;;) {
            char *start;
            size_t length;
            printf("8085> ");
            if (fflush(stdout) == EOF || ferror(stdout)) {
                fprintf(stderr, "Error: could not flush the output stream.\n");
                fatal = 1;
                break;
            }
            if (fgets(line, sizeof line, stdin) == NULL) {
                if (ferror(stdin)) {
                    fprintf(stderr, "Error: could not read input.\n");
                    fatal = 1;
                }
                break;
            }
            length = strlen(line);
            if (length > 0 && line[length - 1] == '\n') {
                line[--length] = '\0';
                if (length > 0 && line[length - 1] == '\r') {
                    line[--length] = '\0';
                }
            }
            if (length >= ASSEMBLER_MAX_LINE) {
                int ch;
                if (strchr(line, '\n') == NULL && length == sizeof line - 1) {
                    while ((ch = getchar()) != '\n' && ch != EOF) {
                    }
                }
                fprintf(stderr, "Error: instruction exceeds %d characters.\n", ASSEMBLER_MAX_LINE - 1);
                ++errors;
                continue;
            }
            start = line;
            while (isspace((unsigned char)*start)) {
                ++start;
            }
            if (*start == '\0' || *start == ';') {
                continue;
            }
            if (is_quit(start)) {
                break;
            }
            if (!process_line(start, listing, &instructions, &bytes, &errors)) {
                fatal = 1;
                break;
            }
        }
        printf("\nInstructions : %lu\nTotal Bytes  : %lu\nErrors       : %lu\n", instructions, bytes, errors);
        if (listing != NULL && fprintf(listing, "Instructions : %lu\nTotal Bytes  : %lu\nErrors       : %lu\n",
                                       instructions, bytes, errors) < 0) {
            fprintf(stderr, "Error: could not write the listing summary.\n");
            fatal = 1;
        }
    }

    if (fflush(stdout) == EOF) {
        fprintf(stderr, "Error: could not flush the output stream.\n");
        fatal = 1;
    }
    if (listing != NULL && fclose(listing) == EOF) {
        perror("Error closing output file");
        fatal = 1;
    }
    return fatal || errors > 0 ? 1 : 0;
}
