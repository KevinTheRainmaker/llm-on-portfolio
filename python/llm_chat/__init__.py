"""
LLM Chat Package
Python-based LLM chat module for portfolio website
"""

from .config import config
from .embeddings import embed_text
from .query_rewriter import rewrite_query, is_likely_question
from .retrieval_planner import get_retrieval_plan
from .vector_search import search_vector_db
from .response_generator import generate_response, linkify_response
from .chat_handler import handle_chat_request

__all__ = [
    "config",
    "embed_text",
    "rewrite_query",
    "is_likely_question",
    "get_retrieval_plan",
    "search_vector_db",
    "generate_response",
    "linkify_response",
    "handle_chat_request",
]

__version__ = "1.0.0"
