"""
LLM Chat Package
Python-based LLM chat module for portfolio website with memory architecture
"""

from .config import config
from .long_term_memory import LongTermMemory, get_long_term_memory
from .short_term_memory import ShortTermMemory, SessionManager, get_session_manager
from .response_generator import generate_response, linkify_response
from .chat_handler import handle_chat_request

__all__ = [
    "config",
    "LongTermMemory",
    "get_long_term_memory",
    "ShortTermMemory",
    "SessionManager",
    "get_session_manager",
    "generate_response",
    "linkify_response",
    "handle_chat_request",
]

__version__ = "2.0.0"
