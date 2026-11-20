; ==============================================================================
; College Experiment: Fibonacci Series Generation
; Problem Statement: Generate the first N Fibonacci numbers starting at 2050H.
;                    N is stored in 204FH (e.g., 08H).
;                    Series: 0, 1, 1, 2, 3, 5, 8, 13, ...
; ==============================================================================

        ORG 2000H

START:  LDA 204FH        ; Load count N
        MOV C, A         ; Store count in C
        LXI H, 2050H     ; Destination pointer

        MVI A, 00H       ; First term F0 = 0
        MOV M, A         ; Store F0 at 2050H
        INX H
        DCR C            ; Decrement count
        JZ DONE

        MVI B, 01H       ; Second term F1 = 1
        MOV M, B         ; Store F1 at 2051H
        INX H
        DCR C            ; Decrement count
        JZ DONE

FIB_LOOP:
        MOV A, B         ; A = previous term
        ADD D            ; (D holds older term, starts at 0)
        ; Swap to generate next term:
        ; Let D = old B, B = new sum
        MOV D, B         ; D = F(n-1)
        MOV B, A         ; B = F(n)
        MOV M, A         ; Store new term
        INX H
        DCR C
        JNZ FIB_LOOP

DONE:   HLT
        END
