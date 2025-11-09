"""
Chat Handler module
Main handler for processing chat requests with memory-based system
"""

import uuid
from typing import Dict, Any, List, Optional
from .config import config
from .response_generator import generate_response
from .short_term_memory import get_session_manager


async def handle_chat_request(
    message: str,
    history: List[Dict[str, Any]] = None,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Handle a chat request using memory-based system

    Args:
        message: User's message
        history: Chat history (list of messages) - can be provided by client
        session_id: Optional session ID from client

    Returns:
        Dictionary with:
            - response (str): Generated response text
            - error (str, optional): Error message if any
    """
    if history is None:
        history = []

    # Generate or use session ID
    if not session_id:
        session_id = str(uuid.uuid4())

    user_id = f"user-{uuid.uuid4().hex[:8]}"

    # Get session manager
    session_manager = get_session_manager()

    # Get or create session's short-term memory
    stm = session_manager.get_session(session_id)

    # Initialize Langfuse trace
    trace = None
    if config.langfuse_client:
        trace = config.langfuse_client.trace(
            name='chat-session',
            user_id=user_id,
            session_id=session_id,
            metadata={
                "timestamp": None,  # Will be set automatically
                "source": "python-memory-api",
                "memoryType": "long-term + short-term"
            }
        )

    try:
        # Validate message
        if not message:
            error_response = {"error": "메시지가 없습니다."}
            if trace:
                trace.event(
                    name='error',
                    input={"type": "validation-error"},
                    output=error_response
                )
            return error_response

        # Add user message to short-term memory
        stm.add_message("user", message)

        # Get conversation context from short-term memory
        session_context = stm.get_context_for_llm(limit=10)

        # Generate response using long-term memory (profile) and short-term memory (conversation)
        response = await generate_response(
            query=message,
            session_history=session_context,
            trace=trace
        )

        # Add assistant response to short-term memory
        stm.add_message("model", response)

        if trace:
            trace.update(
                input=message,
                output=response,
                metadata={
                    "sessionMessageCount": stm.get_message_count(),
                    "sessionId": session_id
                }
            )

        return {
            "response": response,
            "sessionId": session_id
        }

    except Exception as error:
        print(f"Chat handler error: {error}")

        if trace:
            trace.event(
                name='error',
                input={"type": "api-error", "message": str(error)}
            )

        return {"error": "서버 오류가 발생했습니다."}
