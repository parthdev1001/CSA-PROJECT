CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -Wpedantic -Werror -O2
CPPFLAGS = -Iinclude
BUILD = build
CORE = src/assembler.c src/simulator.c
HEADERS = include/assembler.h include/simulator.h

.PHONY: all test clean

all: $(BUILD)/assembler

$(BUILD):
	mkdir -p $(BUILD)

$(BUILD)/assembler: $(CORE) src/main.c $(HEADERS) | $(BUILD)
	$(CC) $(CPPFLAGS) $(CFLAGS) $(CORE) src/main.c -o $@

$(BUILD)/test_assembler: $(CORE) tests/test_assembler.c $(HEADERS) | $(BUILD)
	$(CC) $(CPPFLAGS) $(CFLAGS) $(CORE) tests/test_assembler.c -o $@

test: $(BUILD)/assembler $(BUILD)/test_assembler
	./$(BUILD)/test_assembler
	./$(BUILD)/assembler "MVI A,05H"
	./$(BUILD)/assembler "MOV B,A"
	python3 tests/test_cli.py

clean:
	rm -rf $(BUILD)
