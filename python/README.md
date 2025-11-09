# LLM Chat Python Module (Memory-based Architecture)

Python-based LLM chat module for the portfolio website with **memory architecture** replacing RAG. This module uses **long-term memory** (profile data) and **short-term memory** (conversation history) to provide contextual responses with relevant site links.

## Architecture

### Memory System

```
┌─────────────────────────────────────────┐
│         Chat Request                    │
└───────────────┬─────────────────────────┘
                │
        ┌───────▼────────┐
        │  Chat Handler  │
        └───────┬────────┘
                │
        ┌───────▼────────────────────────────┐
        │                                    │
   ┌────▼─────────────┐        ┌───────────▼─────────┐
   │  Long-term Memory│        │ Short-term Memory   │
   │  (Profile Data)  │        │ (Session History)   │
   │                  │        │                     │
   │ • Education      │        │ • User messages     │
   │ • Publications   │        │ • Bot responses     │
   │ • Projects       │        │ • Per-session       │
   │ • Skills         │        │ • Auto-managed      │
   │ • Experiences    │        │                     │
   └──────────────────┘        └─────────────────────┘
                │
        ┌───────▼────────┐
        │ Response Gen   │
        │ + Link Inject  │
        └───────┬────────┘
                │
        ┌───────▼────────┐
        │   Response     │
        └────────────────┘
```

## Features

- **🧠 Long-term Memory**: Static profile information loaded from JSON
- **💭 Short-term Memory**: Session-based conversation history
- **🔗 Automatic Link Generation**: Adds HTML links to relevant pages
- **🌐 Multi-language Support**: Korean and English
- **📊 Observability**: Optional Langfuse tracing
- **🚀 Fast & Lightweight**: No vector database required

## Project Structure

```
python/
├── data/
│   └── profile_data.json      # Long-term memory data
├── llm_chat/                  # Main package
│   ├── __init__.py           # Package initialization
│   ├── config.py             # Configuration (Gemini, Langfuse)
│   ├── long_term_memory.py   # Profile data management
│   ├── short_term_memory.py  # Session history management
│   ├── response_generator.py # Response generation + linkification
│   └── chat_handler.py       # Main request handler
├── main.py                    # FastAPI server
├── requirements.txt           # Python dependencies
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## Setup

### 1. Install Dependencies

```bash
cd python
pip install -r requirements.txt
```

Or use a virtual environment (recommended):

```bash
cd python
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional (for observability)
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key_here
LANGFUSE_SECRET_KEY=your_langfuse_secret_key_here
LANGFUSE_HOST=https://cloud.langfuse.com
```

**Note**: Only `GEMINI_API_KEY` is required. Langfuse is optional for tracing.

### 3. Run the Server

```bash
python main.py
```

Or use the start script:

```bash
./start.sh
```

The server will start on `http://localhost:8000`

## API Endpoints

### POST /api/chat

Chat with the memory-based LLM system.

**Request Body:**
```json
{
  "message": "What is your latest research?",
  "history": [],
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "response": "My latest research is <a href='https://...' class='text-blue-600 underline font-bold'>LEGOLAS</a>, published at CHI 2025. You can find more details in the <a href='/papers' class='text-blue-600 underline font-bold'>Papers</a> section.",
  "sessionId": "generated-or-provided-session-id"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

## Memory System Details

### Long-term Memory

**Location**: `python/data/profile_data.json`

Contains static profile information:
- Education history
- Skills and technologies
- Publications
- Work experiences
- Projects
- Awards
- Other experiences

**Features**:
- Loaded once on startup
- Provides context for all responses
- Includes site navigation links

**Usage**:
```python
from llm_chat import get_long_term_memory

ltm = get_long_term_memory()
education = ltm.get_education()
publications = ltm.get_publications()
context = ltm.get_context_for_llm()
```

### Short-term Memory

**Management**: In-memory session storage

Stores conversation history per session:
- User messages
- Assistant responses
- Session metadata

**Features**:
- Auto-managed per session
- Automatic cleanup of old sessions
- Maintains context within conversation

**Usage**:
```python
from llm_chat import get_session_manager

manager = get_session_manager()
session = manager.get_session(session_id)
session.add_message("user", "Hello")
history = session.get_context_for_llm()
```

## Link Generation

Responses automatically include HTML links to relevant pages:

**Input**: "Tell me about your golf research"

**Output**:
```
My latest research is <a href="..." class="text-blue-600 underline font-bold">LEGOLAS</a>,
which focuses on golf skill learning. Check out the
<a href="/papers" class="text-blue-600 underline font-bold">Papers</a> section for details.
```

Links are generated for:
- Publications (with external URLs)
- Projects (with external URLs)
- Internal pages (Home, Papers, CV, etc.)
- CV sections (Education, Experiences, etc.)

## Updating Profile Data

To update profile information:

1. Edit `python/data/profile_data.json`
2. Restart the server
3. Changes will be reflected immediately

**Example**:
```json
{
  "publications": [
    {
      "title": "New Paper Title",
      "authors": "Ko, K., et al.",
      "journal": "CHI 2026",
      "time": "May 2026",
      "link": "https://...",
      "abstract": "..."
    }
  ]
}
```

## Development

### Running in Development Mode

```bash
# With auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Testing

Test the API using curl:

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your research interests?",
    "history": []
  }'
```

### Module Usage

Use the modules directly in Python:

```python
from llm_chat import handle_chat_request, get_long_term_memory

# Get profile data
ltm = get_long_term_memory()
print(ltm.get_publications())

# Handle chat request
result = await handle_chat_request(
    message="Tell me about your research",
    session_id="my-session-123"
)
print(result["response"])
```

## Migration from RAG

This version replaces the previous RAG (Retrieval-Augmented Generation) system:

### What Changed

| Before (RAG) | After (Memory) |
|-------------|----------------|
| Pinecone vector database | JSON file (long-term memory) |
| Text embeddings | Direct data access |
| Query rewriting | Simplified processing |
| Retrieval planning | Direct memory lookup |
| Complex dependencies | Minimal dependencies |
| Vector search latency | Instant access |

### Benefits

- ✅ **Simpler**: No vector database needed
- ✅ **Faster**: Direct memory access
- ✅ **Cheaper**: No Pinecone costs
- ✅ **Easier to update**: Edit JSON file
- ✅ **More predictable**: Deterministic responses
- ✅ **Better links**: Guaranteed accurate links

## Deployment

### Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

For production deployment:
```bash
# Required
GEMINI_API_KEY=your_key_here

# Optional
LANGFUSE_PUBLIC_KEY=your_key_here
LANGFUSE_SECRET_KEY=your_secret_here
```

## Troubleshooting

### Server won't start

- Check Python version: `python3 --version` (requires 3.9+)
- Check port 8000: `lsof -i :8000`
- Verify GEMINI_API_KEY is set

### Import errors

- Activate virtual environment: `source venv/bin/activate`
- Reinstall dependencies: `pip install -r requirements.txt`

### Profile data not loading

- Check file exists: `ls data/profile_data.json`
- Validate JSON: `python -m json.tool data/profile_data.json`

## Dependencies

- **fastapi**: Web framework
- **uvicorn**: ASGI server
- **pydantic**: Data validation
- **google-generativeai**: Gemini LLM
- **langfuse**: Observability (optional)
- **python-dotenv**: Environment variables

## License

Same as the main portfolio project.
