# LLM Chat Migration to Python

This document describes the migration of the LLM chat functionality from TypeScript to Python.

## Overview

The LLM chat functionality has been migrated from TypeScript (in `src/pages/api/chat.ts`) to a separate Python module (in `python/llm_chat/`). This migration provides:

- **Better separation of concerns**: Chat logic is now in a dedicated Python module
- **Easier maintenance**: Python is better suited for ML/AI workflows
- **Improved performance**: Native async support in Python
- **Better observability**: Cleaner integration with Langfuse
- **Independent deployment**: Python server can be deployed separately

## Architecture

### Before Migration

```
Frontend (Astro) → TypeScript API (/api/chat) → Gemini/Pinecone
```

### After Migration

```
Frontend (Astro) → TypeScript Proxy (/api/chat) → Python FastAPI (/api/chat) → Gemini/Pinecone
```

## File Structure

### Migrated Files

- `src/pages/api/chat.ts` → Now a simple proxy to Python API
- `src/pages/api/retrieval-planner.ts` → Migrated to `python/llm_chat/retrieval_planner.py`

### Backup Files

Original implementations are backed up:
- `src/pages/api/chat.ts.backup` - Original TypeScript chat implementation
- `src/pages/api/retrieval-planner.ts.backup` - Original retrieval planner

### New Python Module

```
python/
├── llm_chat/                    # Main package
│   ├── __init__.py             # Package initialization
│   ├── config.py               # Configuration and clients
│   ├── embeddings.py           # Text embedding generation
│   ├── query_rewriter.py       # Query rewriting
│   ├── retrieval_planner.py    # Retrieval planning
│   ├── vector_search.py        # Vector database search
│   ├── response_generator.py   # Response generation
│   └── chat_handler.py         # Main request handler
├── main.py                      # FastAPI server
├── requirements.txt             # Dependencies
├── .env.example                # Environment template
├── .gitignore                  # Python gitignore
├── start.sh                    # Development start script
├── start-prod.sh               # Production start script
└── README.md                   # Python module documentation
```

## Setup Instructions

### 1. Install Python Dependencies

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

Copy the environment template:

```bash
cd python
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=kangbeen-context-profile-data

# Optional (for observability)
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key_here
LANGFUSE_SECRET_KEY=your_langfuse_secret_key_here
LANGFUSE_HOST=https://cloud.langfuse.com
```

### 3. Start Python Server

Development mode (with auto-reload):

```bash
cd python
./start.sh
```

Or manually:

```bash
cd python
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The Python server will start on `http://localhost:8000`

### 4. Start Astro Dev Server

In a separate terminal:

```bash
npm run dev
```

The Astro app will start on `http://localhost:4321`

### 5. Test the Chat

Visit `http://localhost:4321` and try the chat feature. The flow is:

1. Frontend sends request to `/api/chat` (Astro API)
2. Astro API proxies to `http://localhost:8000/api/chat` (Python API)
3. Python API processes request and returns response
4. Astro API returns response to frontend

## Development Workflow

### Running Both Servers

You need to run both servers during development:

**Terminal 1 - Python API:**
```bash
cd python && ./start.sh
```

**Terminal 2 - Astro Dev:**
```bash
npm run dev
```

### Making Changes

**Python Changes:**
- Edit files in `python/llm_chat/`
- Server auto-reloads (if using `--reload` flag)

**Frontend Changes:**
- Edit Astro components as usual
- Astro dev server auto-reloads

## Deployment

### Option 1: Deploy Python Separately

Deploy the Python server to a platform like:
- Railway
- Render
- Fly.io
- AWS Lambda (with adapter)
- Google Cloud Run

Then update the `PYTHON_API_URL` environment variable in your Astro deployment:

```env
PYTHON_API_URL=https://your-python-api.example.com
```

### Option 2: Deploy Together (Docker)

Use Docker Compose to deploy both services together:

```yaml
version: '3.8'
services:
  python-api:
    build: ./python
    ports:
      - "8000:8000"
    env_file:
      - ./python/.env

  astro-app:
    build: .
    ports:
      - "4321:4321"
    environment:
      - PYTHON_API_URL=http://python-api:8000
    depends_on:
      - python-api
```

### Option 3: Vercel (Advanced)

For Vercel deployment:
1. Deploy Python API to a separate service
2. Set `PYTHON_API_URL` in Vercel environment variables
3. Or use Vercel's Python runtime (experimental)

## Testing

### Test Python API Directly

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your research interests?",
    "history": []
  }'
```

### Test Through Astro Proxy

```bash
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your research interests?",
    "history": []
  }'
```

## Rollback

If you need to rollback to the TypeScript implementation:

1. Restore the backup:
   ```bash
   cp src/pages/api/chat.ts.backup src/pages/api/chat.ts
   ```

2. Stop the Python server

3. Restart Astro dev server

## Key Differences

### TypeScript → Python Mapping

| TypeScript | Python |
|------------|--------|
| `async function` | `async def` |
| `Promise<T>` | `Awaitable[T]` |
| `any[]` | `List[Any]` |
| `import.meta.env` | `os.getenv()` |
| `GoogleGenerativeAI` | `google.generativeai` |
| `Pinecone` client | `pinecone.Pinecone` |
| `Langfuse` | `langfuse.Langfuse` |

### Benefits of Python Implementation

1. **Better type safety**: Python type hints with Pydantic models
2. **Cleaner async/await**: Native Python async is more mature
3. **Better ML tooling**: Native integration with ML libraries
4. **Easier testing**: Python's testing ecosystem is more mature
5. **Independent scaling**: Python API can scale independently

## Troubleshooting

### Python server won't start

- Check if port 8000 is already in use: `lsof -i :8000`
- Verify environment variables are set: `cat python/.env`
- Check Python version: `python3 --version` (requires 3.9+)

### Connection refused error

- Make sure Python server is running on port 8000
- Check `PYTHON_API_URL` in Astro environment
- Verify firewall settings

### Import errors

- Activate virtual environment: `source venv/bin/activate`
- Reinstall dependencies: `pip install -r requirements.txt`

## Further Improvements

Potential enhancements:

1. **Caching**: Add Redis for response caching
2. **Rate limiting**: Implement rate limiting in Python API
3. **Authentication**: Add API key authentication
4. **Monitoring**: Enhanced monitoring with Prometheus/Grafana
5. **Testing**: Add unit and integration tests
6. **Documentation**: Add OpenAPI/Swagger documentation

## Support

For issues or questions:
- Check Python logs: Server output in terminal
- Check Astro logs: Browser console and terminal
- Verify environment variables are set correctly
- Ensure both servers are running
