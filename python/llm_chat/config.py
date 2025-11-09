"""
Configuration module for LLM Chat
Manages environment variables and API clients initialization
"""

import os
from typing import Optional
from google.generativeai import GenerativeModel, configure
from pinecone import Pinecone
from langfuse import Langfuse


class Config:
    """Configuration class for LLM Chat system"""

    def __init__(self):
        # API Keys
        self.gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
        self.pinecone_api_key: str = os.getenv("PINECONE_API_KEY", "")
        self.pinecone_index_name: str = os.getenv("PINECONE_INDEX_NAME", "kangbeen-context-profile-data")

        # Langfuse configuration
        self.langfuse_public_key: str = os.getenv("LANGFUSE_PUBLIC_KEY", "")
        self.langfuse_secret_key: str = os.getenv("LANGFUSE_SECRET_KEY", "")
        self.langfuse_host: str = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")

        # Model names
        self.chat_model_name: str = "gemini-1.5-pro"
        self.embed_model_name: str = "models/embedding-001"
        self.planner_model_name: str = "gemini-1.5-flash"

        # Initialize clients
        self._init_clients()

    def _init_clients(self):
        """Initialize API clients"""
        # Configure Google Generative AI
        if self.gemini_api_key:
            configure(api_key=self.gemini_api_key)

        # Initialize Pinecone
        self.pinecone_client: Optional[Pinecone] = None
        if self.pinecone_api_key:
            self.pinecone_client = Pinecone(api_key=self.pinecone_api_key)

        # Initialize Langfuse
        self.langfuse_client: Optional[Langfuse] = None
        if self.langfuse_public_key and self.langfuse_secret_key:
            self.langfuse_client = Langfuse(
                public_key=self.langfuse_public_key,
                secret_key=self.langfuse_secret_key,
                host=self.langfuse_host
            )

    def get_pinecone_index(self):
        """Get Pinecone index"""
        if not self.pinecone_client:
            raise ValueError("Pinecone client not initialized")
        return self.pinecone_client.Index(self.pinecone_index_name)


# Global configuration instance
config = Config()
