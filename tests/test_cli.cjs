const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const executable = path.resolve(process.argv[2] || path.join('build', 'assembler.exe'));
let count = 0;

function run(args, input = '') {
    const result = spawnSync(executable, args, { input, encoding: 'utf8', timeout: 10000 });
    if (result.error) throw result.error;
    assert.equal(result.signal, null, 'Assembler was terminated by a signal');
    return result;
}

function test(name, operation) {
    try {
        operation();
        ++count;
    } catch (error) {
        throw new Error(`${name}: ${error.message}`, { cause: error });
    }
}

test('Synopsis MVI example', () => {
    const result = run(['MVI A,05H']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Opcode\s*:\s*3E/);
    assert.match(result.stdout, /Machine Code\s*:\s*3E 05/);
    assert.match(result.stdout, /Size\s*:\s*2 Bytes/);
    assert.equal(result.stderr, '');
});
test('Synopsis MOV example', () => {
    const result = run(['MOV B,A']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Machine Code\s*:\s*47\s*[\r\n]/);
    assert.match(result.stdout, /Size\s*:\s*1 Byte\s*[\r\n]/);
});
test('Little-endian address', () => {
    const result = run(['LDA 2050H']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Machine Code\s*:\s*3A 50 20/);
});
test('Unknown mnemonic', () => {
    const result = run(['XYZ A,B']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown or unsupported mnemonic/);
    assert.doesNotMatch(result.stdout, /Machine Code/);
});
test('Help', () => {
    const result = run(['--help']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage:/);
});
test('Instruction list', () => {
    const result = run(['--list']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /MVI/);
    assert.match(result.stdout, /RST/);
    assert.match(result.stdout, /RIM/);
    assert.match(result.stdout, /PSW/);
});
for (const args of [['--unknown'], ['--output'], ['--output', ''],
    ['--output', 'one.txt', '--output', 'two.txt'], ['MOV', 'B,A']]) {
    test(`Invalid CLI arguments ${JSON.stringify(args)}`, () => {
        const result = run(args);
        assert.equal(result.status, 2);
        assert.match(result.stderr, /Error:/);
    });
}
test('Interactive totals, HLT and QUIT', () => {
    const result = run([], '\n; ignored\nMVI A,05H\nMOV B,A\nHLT\nquit\nLDA 2050H\n');
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Instructions\s*:\s*3/);
    assert.match(result.stdout, /Total Bytes\s*:\s*4/);
    assert.match(result.stdout, /Errors\s*:\s*0/);
    assert.doesNotMatch(result.stdout, /3A 50 20/);
});
test('HLT does not stop translation', () => {
    const result = run([], 'HLT\nNOP\n');
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Instructions\s*:\s*2/);
});
test('Error recovery and nonzero session status', () => {
    const result = run([], 'XYZ\nMOV B,A\nQUIT\n');
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Machine Code\s*:\s*47/);
    assert.match(result.stdout, /Instructions\s*:\s*1/);
    assert.match(result.stdout, /Errors\s*:\s*1/);
});
test('Short QUIT prefixes are not commands', () => {
    const result = run([], 'Q\nQU\nQUI\nQUIT\n');
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Errors\s*:\s*3/);
});
test('CRLF and comment after QUIT', () => {
    const result = run([], 'mvi a,05h\r\n  QuIt ; finish\r\nHLT\r\n');
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Instructions\s*:\s*1/);
});
test('Maximum supported line length', () => {
    const result = run([], 'NOP' + ' '.repeat(252) + '\nHLT\nQUIT\n');
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Instructions\s*:\s*2/);
});
for (const length of [256, 257, 258, 1000]) {
    test(`Recover after ${length}-character input`, () => {
        const result = run([], 'X'.repeat(length) + '\nMVI A,05H\nQUIT\n');
        assert.equal(result.status, 1);
        assert.match(result.stderr, /exceeds 255/);
        assert.match(result.stdout, /Instructions\s*:\s*1/);
        assert.match(result.stdout, /Errors\s*:\s*1/);
        assert.match(result.stdout, /Machine Code\s*:\s*3E 05/);
    });
}
test('Overlong single-instruction argument', () => {
    const result = run(['X'.repeat(256)]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /exceeds 255/);
});

const temp = fs.mkdtempSync(path.join(os.tmpdir(), '8085-assembler-test-'));
const listing = path.join(temp, 'listing with spaces.txt');
try {
    test('Single-instruction listing file', () => {
        const result = run(['--output', listing, 'LXI H,2050H']);
        assert.equal(result.status, 0);
        assert.match(fs.readFileSync(listing, 'utf8'), /Machine Code\s*:\s*21 50 20/);
    });
    test('Session listing and totals', () => {
        const result = run(['--output', listing], 'NOP\nMVI A,05H\nQUIT\n');
        assert.equal(result.status, 0);
        const text = fs.readFileSync(listing, 'utf8');
        assert.match(text, /Instructions\s*:\s*2/);
        assert.match(text, /Total Bytes\s*:\s*3/);
    });
    test('Invalid input does not generate machine code', () => {
        const result = run(['--output', listing], 'MOV M,M\nQUIT\n');
        assert.equal(result.status, 1);
        const text = fs.readFileSync(listing, 'utf8');
        assert.doesNotMatch(text, /Machine Code/);
        assert.match(text, /Instructions\s*:\s*0/);
        assert.match(text, /Errors\s*:\s*1/);
    });
    test('Output-file open failure', () => {
        const result = run(['--output', path.join(temp, 'missing', 'listing.txt'), 'NOP']);
        assert.equal(result.status, 1);
        assert.match(result.stderr, /Error opening output file/);
        assert.doesNotMatch(result.stdout, /Machine Code/);
    });
} finally {
    if (fs.existsSync(listing)) fs.unlinkSync(listing);
    fs.rmdirSync(temp);
}
console.log(`${count} CLI tests passed`);
