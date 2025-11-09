"""
Embeddings module for converting text to vector embeddings
Uses Google Generative AI embedding model
"""

from typing import List
import google.generativeai as genai
from .config import config


async def embed_text(text: str) -> List[float]:
    """
    Convert text to embedding vector using Google Generative AI

    Args:
        text: Text to embed

    Returns:
        List of floats representing the embedding vector

    Raises:
        Exception: If embedding generation fails
    """
    try:
        result = genai.embed_content(
            model=config.embed_model_name,
            content=text,
            task_type="retrieval_query"
        )
        return result['embedding']
    except Exception as error:
        print(f"Error generating embedding: {error}")
        raise error
