"""
Configuration module for LLM Chat
Manages environment variables and API clients initialization
"""

import os
from typing import Optional
from google.generativeai import configure

try:
    from langfuse import Langfuse
    HAS_LANGFUSE = True
except ImportError:
    HAS_LANGFUSE = False
    Langfuse = None


class Config:
    """Configuration class for LLM Chat system with memory-based architecture"""

    def __init__(self):
        # API Keys
        self.gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

        # Langfuse configuration (Optional for observability)
        self.langfuse_public_key: str = os.getenv("LANGFUSE_PUBLIC_KEY", "")
        self.langfuse_secret_key: str = os.getenv("LANGFUSE_SECRET_KEY", "")
        self.langfuse_host: str = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")

        # Model names
        self.chat_model_name: str = "gemini-pro"

        # Initialize clients
        self._init_clients()

    def _init_clients(self):
        """Initialize API clients"""
        # Configure Google Generative AI
        if self.gemini_api_key:
            configure(api_key=self.gemini_api_key)

        # Initialize Langfuse (optional)
        self.langfuse_client = None
        if HAS_LANGFUSE and self.langfuse_public_key and self.langfuse_secret_key:
            try:
                self.langfuse_client = Langfuse(
                    public_key=self.langfuse_public_key,
                    secret_key=self.langfuse_secret_key,
                    host=self.langfuse_host
                )
            except Exception as e:
                print(f"Warning: Langfuse initialization failed: {e}")


# Global configuration instance
config = Config()
