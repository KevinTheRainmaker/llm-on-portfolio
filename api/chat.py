from http.server import BaseHTTPRequestHandler
import json
import os
from datetime import datetime
import sys

# Add python directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python'))

try:
    from llm_chat import handle_chat_request
    HAS_LLM_CHAT = True
except ImportError:
    HAS_LLM_CHAT = False
    print("Warning: llm_chat module not available")


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests"""
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            message = data.get('message', '')
            history = data.get('history', [])
            session_id = data.get('sessionId')

            # Validate message
            if not message:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': '메시지가 없습니다.'
                }).encode())
                return

            if not HAS_LLM_CHAT:
                self.send_response(503)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': 'LLM chat module not available'
                }).encode())
                return

            # Handle chat request (sync version for Vercel)
            import asyncio
            result = asyncio.run(handle_chat_request(
                message=message,
                history=history,
                session_id=session_id
            ))

            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            print(f"Error in chat handler: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': '서버 오류가 발생했습니다.'
            }).encode())

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
