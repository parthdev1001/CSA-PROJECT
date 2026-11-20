; ==============================================================================
; College Experiment: 8-Bit Addition with Carry
; Problem Statement: Add two 8-bit numbers stored in memory locations 2050H and
;                    2051H. Store the 8-bit sum in 2052H and carry in 2053H.
; ==============================================================================

        ORG 2000H

START:  MVI C, 00H       ; Clear C register to store carry
        LDA 2050H        ; Load first 8-bit number into Accumulator
        MOV B, A         ; Move first number into B
        LDA 2051H        ; Load second 8-bit number into Accumulator
        ADD B            ; Add B to Accumulator (A = A + B)
        JNC NOCARRY      ; If no carry generated, jump to NOCARRY
        INR C            ; If carry generated, increment C
NOCARRY:STA 2052H        ; Store sum at memory location 2052H
        MOV A, C         ; Move carry from C to Accumulator
        STA 2053H        ; Store carry at memory location 2053H
        HLT              ; Stop execution
        END
