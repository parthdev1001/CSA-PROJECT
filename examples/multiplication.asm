; ==============================================================================
; College Experiment: 8-Bit Multiplication by Repeated Addition
; Problem Statement: Multiply two 8-bit numbers stored in 2050H and 2051H.
;                    Store the 16-bit product in 2052H (low) and 2053H (high).
; ==============================================================================

        ORG 2000H

START:  MVI D, 00H       ; D will hold the high byte of product
        LDA 2050H        ; Load multiplicand
        MOV B, A         ; Store multiplicand in B
        LDA 2051H        ; Load multiplier
        MOV C, A         ; Store multiplier as loop counter in C
        CPI 00H          ; Check if multiplier is zero
        JZ DONE          ; If multiplier is 0, product is 0
        MVI A, 00H       ; Clear Accumulator for repeated addition (product low)

MULT:   ADD B            ; Add multiplicand to Accumulator
        JNC SKIP_CARRY   ; If no carry, skip high byte increment
        INR D            ; Increment high byte
SKIP_CARRY:
        DCR C            ; Decrement loop counter
        JNZ MULT         ; Repeat until counter C reaches 0

DONE:   STA 2052H        ; Store lower 8 bits of product
        MOV A, D
        STA 2053H        ; Store higher 8 bits of product
        HLT
        END
