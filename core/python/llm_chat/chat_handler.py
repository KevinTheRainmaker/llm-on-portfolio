"""
Chat Handler module
Main handler for processing chat requests with memory-based system
"""

import uuid
import sys
import logging
from typing import Dict, Any, List, Optional
from .config import config
from .response_generator import generate_response
from .short_term_memory import get_session_manager
from .relevance_filter import check_relevance, generate_rejection_message
from .language_detector import detect_language
from .langchain_memory import get_memory_manager

# Set up logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Create console handler if not exists
if not logger.handlers:
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)


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
        
        # Get LangChain memory manager for better context management
        langchain_memory = get_memory_manager(session_id)

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

        # Detect language from user message
        detected_language = detect_language(message)
        
        # Update preferred language in short-term memory if not set or if detected language is different
        if not stm.preferred_language or detected_language != stm.preferred_language:
            stm.set_preferred_language(detected_language)
        
        # Get preferred language from short-term memory
        preferred_language = stm.get_preferred_language()

        # Check if question is relevant to profile (only for uncertain cases)
        # For obviously relevant questions, skip this check to save time
        relevance_check = await check_relevance(message)
        if not relevance_check["relevant"]:
            # Generate rejection message using Gemini 2.5 Flash with preferred language
            rejection_message = await generate_rejection_message(message, preferred_language)
            if trace:
                trace.update(
                    input=message,
                    output=rejection_message,
                    metadata={
                        "rejected": True,
                        "reason": relevance_check.get("reason"),
                        "language": preferred_language
                    }
                )
            return {
                "response": rejection_message,
                "sessionId": session_id
            }

        # Get long-term memory for chain creation
        from .long_term_memory import get_long_term_memory
        ltm = get_long_term_memory()
        profile_context = ltm.get_context_for_llm()
        site_links = ltm.get_site_links()
        from datetime import datetime
        current_time = datetime.utcnow().isoformat()
        
        # Create LangChain conversation chain with memory
        # This ensures LLM automatically references conversation history
        # Note: ConversationChain automatically adds messages to memory when predict() is called
        langchain_chain = langchain_memory.create_chain(
            profile_context=profile_context,
            site_links=site_links,
            current_time=current_time
        )

        # Debug: Check memory state before generating response
        memory_before = langchain_memory.get_chat_history_string(limit=10)
        logger.info(f"[MEMORY DEBUG] Session ID: {session_id}")
        logger.info(f"[MEMORY DEBUG] Memory before response generation:")
        logger.info(f"[MEMORY DEBUG] {memory_before}")
        logger.info(f"[MEMORY DEBUG] Current user message: {message[:100]}...")
        
        # Generate response using LangChain chain (automatically includes conversation history)
        # ConversationChain.predict() or apredict() automatically adds user message and AI response to memory
        response = await generate_response(
            query=message,
            session_history="",  # Not used when langchain_chain is provided
            trace=trace,
            langchain_chain=langchain_chain
        )
        
        # Debug: Check memory state after generating response
        memory_after = langchain_memory.get_chat_history_string(limit=10)
        logger.info(f"[MEMORY DEBUG] Memory after response generation:")
        logger.info(f"[MEMORY DEBUG] {memory_after}")
        logger.info(f"[MEMORY DEBUG] Generated response: {response[:100]}...")

        # Add messages to short-term memory for compatibility
        # Note: ConversationChain already added both messages to LangChain memory automatically
        stm.add_message("user", message)
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
        logger.error(f"Chat handler error: {error}", exc_info=True)

        if trace:
            trace.event(
                name='error',
                input={"type": "api-error", "message": str(error)}
            )

        return {"error": "서버 오류가 발생했습니다."}
