; ==============================================================================
; College Experiment: Block Transfer of Data
; Problem Statement: Transfer a block of N bytes from source starting at 2050H
;                    to destination starting at 2070H.
;                    Block length N is stored in register C (e.g. 05H).
; ==============================================================================

        ORG 2000H

START:  LXI H, 2050H     ; Source memory pointer
        LXI D, 2070H     ; Destination memory pointer
        MVI C, 05H       ; Count of bytes to transfer

XFER:   MOV A, M         ; Read byte from source
        STAX D           ; Write byte to destination [DE]
        INX H            ; Increment source pointer
        INX D            ; Increment destination pointer
        DCR C            ; Decrement count
        JNZ XFER         ; If count != 0, continue loop

        HLT
        END
