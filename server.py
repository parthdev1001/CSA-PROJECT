#!/usr/bin/env python3
"""
8085 Microprocessor Studio - Web Server
Serves the web frontend and connects to the compiled C 8085 Assembler binary.
Zero external dependencies required (uses standard library http.server).
"""

import http.server
import json
import os
import socketserver
import subprocess
import sys
import tempfile
import webbrowser

PORT = 8085
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, 'web')
BUILD_DIR = os.path.join(BASE_DIR, 'build')
ASSEMBLER_BIN = os.path.join(BUILD_DIR, 'assembler')
if sys.platform == 'win32':
    ASSEMBLER_BIN += '.exe'

def ensure_assembler_binary():
    if not os.path.exists(ASSEMBLER_BIN):
        print("[Server] Compiling 8085 C Assembler binary...")
        try:
            if sys.platform == 'win32':
                subprocess.run(['powershell.exe', '-ExecutionPolicy', 'Bypass', '-File', '.\\build.ps1'], cwd=BASE_DIR, check=True)
            else:
                subprocess.run(['make'], cwd=BASE_DIR, check=True)
            print("[Server] Compilation successful.")
        except Exception as e:
            print(f"[Server] Warning: Could not compile C assembler: {e}")

class AssemblerHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        if self.path == '/api/voice-config':
            self.handle_voice_config()
        else:
            super().do_GET()

    def handle_voice_config(self):
        env_path = os.path.join(BASE_DIR, 'voice-agent-api.env')
        config = {'agent': 'mercury', 'configured': False}
        if os.path.exists(env_path):
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if '=' in line and not line.startswith('#'):
                            k, v = line.split('=', 1)
                            config[k.strip().lower()] = v.strip()
                config['configured'] = True
            except Exception:
                pass
        safe_config = {
            'agent': config.get('agent', 'mercury'),
            'configured': config.get('configured', False),
            'has_api_key': bool(config.get('api')),
            'model': 'mercury-2'
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(safe_config).encode('utf-8'))

    def do_POST(self):
        if self.path == '/api/assemble':
            self.handle_assemble()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_assemble(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data.decode('utf-8'))
            source = data.get('source', '')

            ensure_assembler_binary()

            if not os.path.exists(ASSEMBLER_BIN):
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Assembler binary not found.'}).encode('utf-8'))
                return

            with tempfile.NamedTemporaryFile('w', suffix='.asm', delete=False) as tf:
                tf.write(source)
                tmp_path = tf.name

            try:
                proc = subprocess.run(
                    [ASSEMBLER_BIN, tmp_path, '--json', '--sym'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )

                stdout_text = proc.stdout.strip()
                # Find start of JSON
                json_start = stdout_text.find('{')
                if json_start != -1:
                    json_payload = stdout_text[json_start:]
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json_payload.encode('utf-8'))
                else:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Could not parse assembler JSON output.'}).encode('utf-8'))

            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

        except Exception as ex:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(ex)}).encode('utf-8'))

def main():
    ensure_assembler_binary()
    os.chdir(BASE_DIR)

    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), AssemblerHTTPHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=================================================================")
        print(f"  8085 Microprocessor Studio Web Frontend is RUNNING!")
        print(f"  Open in browser: {url}")
        print("=================================================================")
        print("Press Ctrl+C to stop the server.\n")

        try:
            webbrowser.open(url)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == '__main__':
    main()
