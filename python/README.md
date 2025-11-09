# LLM Chat Python Module

Python-based LLM chat module for the portfolio website. This module provides a complete RAG (Retrieval-Augmented Generation) system using Google Gemini, Pinecone vector database, and Langfuse observability.

## Architecture

```
python/
├── llm_chat/               # Main package
│   ├── __init__.py        # Package initialization
│   ├── config.py          # Configuration and API clients
│   ├── embeddings.py      # Text embedding generation
│   ├── query_rewriter.py  # Query rewriting logic
│   ├── retrieval_planner.py  # Retrieval planning
│   ├── vector_search.py   # Vector database search
│   ├── response_generator.py # Response generation
│   └── chat_handler.py    # Main chat request handler
├── main.py                # FastAPI server
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
└── README.md             # This file
```

## Features

- **Query Rewriting**: Enhances user queries for better context understanding
- **Retrieval Planning**: Determines if vector search is needed
- **Vector Search**: Searches Pinecone for relevant contexts
- **Response Generation**: Generates personalized responses using Gemini
- **Observability**: Full request tracing with Langfuse
- **REST API**: FastAPI endpoints for easy integration

## Setup

### 1. Install Dependencies

```bash
cd python
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required variables:
- `GEMINI_API_KEY`: Your Google Gemini API key
- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_INDEX_NAME`: Your Pinecone index name (default: `kangbeen-context-profile-data`)

Optional (for observability):
- `LANGFUSE_PUBLIC_KEY`: Langfuse public key
- `LANGFUSE_SECRET_KEY`: Langfuse secret key
- `LANGFUSE_HOST`: Langfuse host URL (default: `https://cloud.langfuse.com`)

### 3. Run the Server

```bash
python main.py
```

The server will start on `http://localhost:8000`

## API Endpoints

### POST /api/chat

Chat with the LLM system.

**Request Body:**
```json
{
  "message": "What is your latest research?",
  "history": [
    {
      "role": "user",
      "parts": [{"text": "Hello"}]
    },
    {
      "role": "model",
      "parts": [{"text": "Hi! How can I help you?"}]
    }
  ],
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "response": "My latest research is LEGOLAS, an LLM-augmented system for golf skill learning..."
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

## Module Usage

You can also use the modules directly in your Python code:

```python
from llm_chat import handle_chat_request

# Handle a chat request
result = await handle_chat_request(
    message="Tell me about your research",
    history=[],
    session_id="my-session-123"
)

print(result["response"])
```

## Migration from TypeScript

This module is a complete migration of the TypeScript chat functionality from `src/pages/api/chat.ts` and `src/pages/api/retrieval-planner.ts`. It maintains the same logic and behavior while providing better performance and easier maintenance in Python.

### Key Differences

1. **Async/Await**: Uses Python's native async/await instead of JavaScript Promises
2. **Type Hints**: Uses Python type hints instead of TypeScript types
3. **Environment Variables**: Uses `os.getenv()` instead of `import.meta.env`
4. **FastAPI**: Uses FastAPI instead of Astro API routes

## Development

### Running in Development Mode

```bash
# With auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Testing

You can test the API using curl:

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your research interests?",
    "history": []
  }'
```

## Deployment

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t llm-chat .
docker run -p 8000:8000 --env-file .env llm-chat
```

### Environment Deployment

For production deployment, ensure:
1. Set all required environment variables
2. Use a production ASGI server (uvicorn with workers)
3. Enable HTTPS/TLS
4. Configure CORS properly in `main.py`

## License

Same as the main portfolio project.
