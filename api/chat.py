from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import traceback

# Add python directory to path
# Try multiple paths for Vercel deployment
python_paths = [
    os.path.join(os.path.dirname(__file__), 'llm_chat'),  # Vercel (copied to api/llm_chat)
    os.path.join(os.path.dirname(__file__), '..', 'python'),  # Local development
    os.path.join(os.path.dirname(__file__), 'python'),  # Alternative Vercel path
    '/var/task/python',  # Vercel Lambda path
    os.path.join(os.getcwd(), 'python'),  # Current working directory
]

for path in python_paths:
    if os.path.exists(path):
        sys.path.insert(0, path)
        print(f"[INIT] Added Python path: {path}")
        break
else:
    print(f"[INIT] Warning: Python directory not found. Tried: {python_paths}")

# Disable Langfuse for Vercel (optional dependency issue)
os.environ['LANGFUSE_PUBLIC_KEY'] = ''
os.environ['LANGFUSE_SECRET_KEY'] = ''

try:
    from llm_chat import handle_chat_request
    HAS_LLM_CHAT = True
    print("[INIT] Successfully imported llm_chat module")
except ImportError as e:
    HAS_LLM_CHAT = False
    print(f"[INIT] Warning: llm_chat module not available: {e}")
    print(f"[INIT] Python path: {sys.path}")
    traceback.print_exc()


class handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """Override to use print instead of stderr"""
        print(f"[HTTP] {format % args}")
    
    def do_POST(self):
        """Handle POST requests"""
        try:
            print(f"[POST] Received POST request to {self.path}")
            
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': 'Request body is empty'
                }).encode())
                return
                
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            print(f"[POST] Parsed request data: message={data.get('message', '')[:50]}...")

            message = data.get('message', '')
            history = data.get('history', [])
            session_id = data.get('sessionId')

            # Validate message
            if not message:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': '메시지가 없습니다.'
                }).encode())
                return

            if not HAS_LLM_CHAT:
                print("[POST] ERROR: LLM chat module not available")
                self.send_response(503)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': 'LLM chat module not available'
                }).encode())
                return

            print("[POST] Calling handle_chat_request...")
            # Handle chat request (sync version for Vercel)
            import asyncio
            result = asyncio.run(handle_chat_request(
                message=message,
                history=history,
                session_id=session_id
            ))
            print(f"[POST] Got result: {str(result)[:100]}...")

            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            print("[POST] Response sent successfully")

        except Exception as e:
            print(f"[POST] Error in chat handler: {e}")
            traceback.print_exc()
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': '서버 오류가 발생했습니다.',
                'details': str(e)
            }).encode())

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        print("[OPTIONS] Handling CORS preflight")
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
