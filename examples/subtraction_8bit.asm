; ==============================================================================
; College Experiment: 8-Bit Subtraction with Borrow
; Problem Statement: Subtract the number in 2051H from the number in 2050H.
;                    Store the result in 2052H and borrow in 2053H.
; ==============================================================================

        ORG 2000H

START:  MVI C, 00H       ; Clear C register to store borrow
        LDA 2050H        ; Load minuend from 2050H into A
        MOV B, A         ; Save minuend in B
        LDA 2051H        ; Load subtrahend from 2051H into A
        MOV D, A         ; Save subtrahend in D
        MOV A, B         ; Bring minuend back into A
        SUB D            ; Subtract D from A (A = A - D)
        JNC NOBORROW     ; If no borrow (CY=0), jump
        INR C            ; Borrow occurred, increment C
NOBORROW:STA 2052H       ; Store difference in 2052H
        MOV A, C         ; Move borrow to A
        STA 2053H        ; Store borrow in 2053H
        HLT
        END
