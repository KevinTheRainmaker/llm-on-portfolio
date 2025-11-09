"""
Chat Handler module
Main handler for processing chat requests
"""

import uuid
from typing import Dict, Any, List, Optional
from .config import config
from .vector_search import search_vector_db
from .response_generator import generate_response


async def handle_chat_request(
    message: str,
    history: List[Dict[str, Any]] = None,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Handle a chat request and return a response

    Args:
        message: User's message
        history: Chat history (list of messages)
        session_id: Optional session ID from client

    Returns:
        Dictionary with:
            - response (str): Generated response text
            - error (str, optional): Error message if any
    """
    if history is None:
        history = []

    # Generate session and user IDs
    trace_session_id = session_id or str(uuid.uuid4())
    user_id = f"user-{uuid.uuid4().hex[:8]}"

    # Initialize Langfuse trace
    trace = None
    if config.langfuse_client:
        trace = config.langfuse_client.trace(
            name='chat-session',
            user_id=user_id,
            metadata={
                "sessionId": trace_session_id,
                "timestamp": None,  # Will be set automatically
                "source": "python-api"
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

        # Search vector DB
        search_result = await search_vector_db(message, history, trace)

        relevant = search_result.get("relevant", False)
        retrieval_required = search_result.get("retrievalRequired", False)
        contexts = search_result.get("contexts", [])
        rewritten_query = search_result.get("rewrittenQuery")

        # If rewritten query is a question, return it directly
        if rewritten_query and rewritten_query != message and rewritten_query.endswith('?'):
            if trace:
                trace.update(input=message, output=rewritten_query)
            return {"response": rewritten_query}

        # If not relevant, return rejection
        if not relevant:
            rejection = "Sorry. Your questions is not related to me."
            if trace:
                trace.update(input=message, output=rejection)
            return {"response": rejection}

        # Generate response (use contexts regardless of retrievalRequired)
        response = await generate_response(message, contexts, history, trace)

        if trace:
            trace.update(input=message, output=response)

        return {"response": response}

    except Exception as error:
        print(f"Chat handler error: {error}")

        if trace:
            trace.event(
                name='error',
                input={"type": "api-error", "message": str(error)}
            )

        return {"error": "서버 오류가 발생했습니다."}
