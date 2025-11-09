"""
FastAPI Server for LLM Chat
Provides REST API endpoints for chat functionality
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn

from llm_chat import handle_chat_request

# Create FastAPI app
app = FastAPI(
    title="LLM Chat API",
    description="Python-based LLM chat API for portfolio website",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class ChatMessage(BaseModel):
    """Chat message structure"""
    role: str
    parts: List[Dict[str, str]]


class ChatRequest(BaseModel):
    """Chat request body"""
    message: str
    history: Optional[List[ChatMessage]] = []
    sessionId: Optional[str] = None


class ChatResponse(BaseModel):
    """Chat response body"""
    response: Optional[str] = None
    error: Optional[str] = None


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "LLM Chat API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint

    Args:
        request: ChatRequest with message, history, and optional sessionId

    Returns:
        ChatResponse with generated response or error
    """
    try:
        # Convert Pydantic models to dicts
        history = [msg.dict() for msg in request.history] if request.history else []

        # Handle chat request
        result = await handle_chat_request(
            message=request.message,
            history=history,
            session_id=request.sessionId
        )

        return ChatResponse(**result)

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    # Run server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
