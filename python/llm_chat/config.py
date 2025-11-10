"""
Configuration module for LLM Chat
Manages environment variables and API clients initialization
"""

import os
from typing import Optional
from google.generativeai import configure
from langfuse import Langfuse


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
        self.chat_model_name: str = "gemini-1.5-pro-latest"

        # Initialize clients
        self._init_clients()

    def _init_clients(self):
        """Initialize API clients"""
        # Configure Google Generative AI
        if self.gemini_api_key:
            configure(api_key=self.gemini_api_key)

        # Initialize Langfuse (optional)
        self.langfuse_client: Optional[Langfuse] = None
        if self.langfuse_public_key and self.langfuse_secret_key:
            self.langfuse_client = Langfuse(
                public_key=self.langfuse_public_key,
                secret_key=self.langfuse_secret_key,
                host=self.langfuse_host
            )


# Global configuration instance
config = Config()
