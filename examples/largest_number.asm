; ==============================================================================
; College Experiment: Find Largest Number in an Array
; Problem Statement: An array of N numbers is stored starting at 2050H.
;                    The length of array is stored in 204FH.
;                    Find the maximum value and store it in 2060H.
; ==============================================================================

        ORG 2000H

START:  LDA 204FH        ; Load count of numbers
        MOV C, A         ; Store count in C
        DCR C            ; Number of comparisons = Count - 1
        LXI H, 2050H     ; Point HL to the first element
        MOV A, M         ; Initialize maximum with the first element

LOOP:   INX H            ; Point to next element
        CMP M            ; Compare current maximum (A) with next element (M)
        JNC NEXT         ; If A >= M, current max is still greater
        MOV A, M         ; Otherwise, update maximum (A = M)
NEXT:   DCR C            ; Decrement count
        JNZ LOOP         ; Repeat until all elements checked

        STA 2060H        ; Store maximum number at 2060H
        HLT
        END
