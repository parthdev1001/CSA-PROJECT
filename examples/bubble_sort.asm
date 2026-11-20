; ==============================================================================
; College Experiment: Bubble Sort (Ascending Order)
; Problem Statement: Sort an array of N bytes starting from 2050H in ascending order.
;                    Count N is stored in 204FH.
; ==============================================================================

        ORG 2000H

START:  LDA 204FH        ; Load count of array
        DCR A            ; Outer loop counter = N - 1
        MOV B, A         ; B is outer loop counter

OUTER:  LDA 204FH
        DCR A
        MOV C, A         ; C is inner loop counter
        LXI H, 2050H     ; Point HL to beginning of array

INNER:  MOV A, M         ; Read element at [HL]
        INX H            ; Point to next element [HL + 1]
        CMP M            ; Compare [HL] with [HL + 1]
        JC NO_SWAP       ; If [HL] < [HL + 1], already in order
        JZ NO_SWAP       ; If equal, no swap needed

        ; Swap [HL-1] and [HL]
        MOV D, M         ; D = [HL + 1]
        MOV M, A         ; [HL + 1] = A (original [HL])
        DCX H
        MOV M, D         ; [HL] = D
        INX H            ; Restore pointer to [HL + 1]

NO_SWAP:DCR C            ; Decrement inner counter
        JNZ INNER        ; Repeat inner loop
        DCR B            ; Decrement outer counter
        JNZ OUTER        ; Repeat outer loop

        HLT
        END
