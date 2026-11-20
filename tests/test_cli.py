import os
import subprocess
import tempfile
import unittest

EXECUTABLE = os.path.abspath(os.path.join('build', 'assembler'))

def run_assembler(args, input_data=''):
    res = subprocess.run([EXECUTABLE] + args, input=input_data, capture_output=True, text=True, timeout=10)
    return res

class TestCLI(unittest.TestCase):
    def test_synopsis_mvi(self):
        res = run_assembler(['MVI A,05H'])
        self.assertEqual(res.returncode, 0)
        self.assertIn('Opcode       : 3E', res.stdout)
        self.assertIn('Machine Code : 3E 05', res.stdout)
        self.assertIn('Size         : 2 Bytes', res.stdout)

    def test_synopsis_mov(self):
        res = run_assembler(['MOV B,A'])
        self.assertEqual(res.returncode, 0)
        self.assertIn('Machine Code : 47', res.stdout)
        self.assertIn('Size         : 1 Byte', res.stdout)

    def test_little_endian_address(self):
        res = run_assembler(['LDA 2050H'])
        self.assertEqual(res.returncode, 0)
        self.assertIn('Machine Code : 3A 50 20', res.stdout)

    def test_unknown_mnemonic(self):
        res = run_assembler(['XYZ A,B'])
        self.assertEqual(res.returncode, 1)
        self.assertIn('Unknown or unsupported mnemonic', res.stderr)

    def test_help(self):
        res = run_assembler(['--help'])
        self.assertEqual(res.returncode, 0)
        self.assertIn('Usage:', res.stdout)

    def test_instruction_list(self):
        res = run_assembler(['--list'])
        self.assertEqual(res.returncode, 0)
        self.assertIn('MVI', res.stdout)
        self.assertIn('RST', res.stdout)

    def test_invalid_cli_arguments(self):
        invalid_cases = [
            ['--unknown'],
            ['--output'],
            ['--output', ''],
            ['--output', 'one.txt', '--output', 'two.txt'],
            ['MOV', 'B,A']
        ]
        for args in invalid_cases:
            with self.subTest(args=args):
                res = run_assembler(args)
                self.assertEqual(res.returncode, 2)
                self.assertIn('Error:', res.stderr)

    def test_interactive_session(self):
        inp = '\n; ignored\nMVI A,05H\nMOV B,A\nHLT\nQUIT\nLDA 2050H\n'
        res = run_assembler([], inp)
        self.assertEqual(res.returncode, 0)
        self.assertIn('Instructions : 3', res.stdout)
        self.assertIn('Total Bytes  : 4', res.stdout)
        self.assertIn('Errors       : 0', res.stdout)
        self.assertNotIn('3A 50 20', res.stdout)

    def test_error_recovery(self):
        inp = 'XYZ\nMOV B,A\nQUIT\n'
        res = run_assembler([], inp)
        self.assertEqual(res.returncode, 1)
        self.assertIn('Machine Code : 47', res.stdout)
        self.assertIn('Instructions : 1', res.stdout)
        self.assertIn('Errors       : 1', res.stdout)

    def test_multi_line_assembly_file(self):
        res = run_assembler(['examples/addition_8bit.asm', '--sym'])
        self.assertEqual(res.returncode, 0)
        self.assertIn('MVI C, 00H', res.stdout)
        self.assertIn('START', res.stdout)
        self.assertIn('NOCARRY', res.stdout)
        self.assertIn('SYMBOL TABLE', res.stdout)

    def test_simulator_execution(self):
        res = run_assembler(['examples/block_transfer.asm', '--run'])
        self.assertEqual(res.returncode, 0)
        self.assertIn('Executing 8085 Simulator', res.stdout)
        self.assertIn('Status: HALTED', res.stdout)

    def test_single_instruction_listing_file(self):
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as tf:
            path = tf.name
        try:
            res = run_assembler(['--output', path, 'LXI H,2050H'])
            self.assertEqual(res.returncode, 0)
            with open(path, 'r') as f:
                content = f.read()
            self.assertIn('21 50 20', content)
        finally:
            if os.path.exists(path):
                os.unlink(path)

if __name__ == '__main__':
    unittest.main()
