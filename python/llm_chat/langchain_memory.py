"""
LangChain Memory Module
Manages conversation history using LangChain's memory system
"""

import sys
import logging
from typing import Optional, List
from langchain.memory import ConversationBufferMemory
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import ConversationChain
from langchain.prompts import PromptTemplate
from .config import config

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


class LangChainMemoryManager:
    """
    Manages conversation memory using LangChain's ConversationBufferMemory
    """
    
    def __init__(self, session_id: str):
        """
        Initialize LangChain memory for a session
        
        Args:
            session_id: Unique session identifier
        """
        self.session_id = session_id
        self.memory = ConversationBufferMemory(
            return_messages=True,
            memory_key="chat_history"
        )
        self.llm = None
        self._cached_chain = None
        self._cached_profile_context = None
        self._cached_site_links = None
        self._cached_current_time = None
        self._init_llm()
    
    def _init_llm(self):
        """Initialize LangChain ChatGoogleGenerativeAI"""
        if config.gemini_api_key:
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=config.gemini_api_key,
                temperature=0.7,
            )
    
    def create_chain(self, profile_context: str, site_links: List[dict], current_time: str) -> ConversationChain:
        """
        Create or reuse a ConversationChain with custom prompt template
        
        Args:
            profile_context: Profile information context
            site_links: List of site links
            current_time: Current time string
            
        Returns:
            ConversationChain instance (reused if context hasn't changed)
        """
        if not self.llm:
            raise ValueError("LLM not initialized")
        
        # Check if we can reuse cached chain (profile_context and site_links rarely change)
        # Only recreate if context actually changed
        site_links_str = "\n".join([f"- {link['label']}: {link['href']}" for link in site_links])
        can_reuse = (
            self._cached_chain is not None and
            self._cached_profile_context == profile_context and
            self._cached_site_links == site_links_str
        )
        
        if can_reuse:
            # Reuse cached chain (same memory object, so conversation history is preserved)
            logger.debug(f"[LANGCHAIN MEMORY] Reusing cached chain for session {self.session_id}")
            return self._cached_chain
        
        logger.debug(f"[LANGCHAIN MEMORY] Creating new chain for session {self.session_id}")
        
        # Format site links as string
        # Create custom prompt template that includes profile context and site links
        # Use {chat_history} and {input} as input_variables (handled by ConversationChain)
        # Use partial_variables for fixed values (profile_context, site_links, current_time)
        template = """You are Kangbeen Ko(고강빈)'s digital twin assistant.
You help visitors learn more about his academic and professional background using information from his personal website.

## Objective:
Answer the user's question using the provided profile information and conversation history. Always include relevant site links to help users navigate to more detailed information.

## Long-term Memory (Profile Information):
{profile_context}

## Available Site Links:
{site_links}

## Instructions:
1. **CRITICAL - Context Resolution**: When the user uses references like "this paper", "that project", "it", "that research", "the latest one", "the paper I just asked about", etc., you MUST check the conversation history below to identify what they are referring to. Use the EXACT names from the conversation history.
2. Use the profile information to provide an accurate, informative answer.
3. Respond in the same language as the user (Korean or English).
4. Keep your response concise (300-500 characters) but comprehensive.
5. **IMPORTANT - Link Formatting**: When you want to add a link, wrap the link label with <link> tags. For example:
   - Use <link>Papers</link> instead of just "Papers"
   - Use <link>LEGOLAS</link> instead of just "LEGOLAS"
   - Use <link>Research</link> instead of just "Research"
6. **ONLY wrap labels that exist in the Available Site Links list above**. Do NOT wrap words that are not in the list.
7. Format important terms naturally so they can be linked (e.g., mention "LEGOLAS" when discussing the golf research).
8. If the question is not related to Kangbeen Ko's profile, politely decline and redirect to relevant topics.
9. When mentioning publications, projects, or specific sections, use their exact names from the available links and wrap them with <link> tags.

## Current Time:
{current_time}

## Conversation History:
{{chat_history}}

## User Question:
{{input}}

## Response:"""

        # Create PromptTemplate with partial_variables for fixed values
        # This allows LangChain to properly handle {chat_history} and {input} dynamically
        prompt = PromptTemplate(
            input_variables=["chat_history", "input"],
            template=template,
            partial_variables={
                "profile_context": profile_context,
                "site_links": site_links_str,
                "current_time": current_time
            }
        )
        
        chain = ConversationChain(
            llm=self.llm,
            memory=self.memory,
            prompt=prompt,
            verbose=False
        )
        
        # Cache the chain and context for potential reuse
        self._cached_chain = chain
        self._cached_profile_context = profile_context
        self._cached_site_links = site_links_str
        self._cached_current_time = current_time
        
        return chain
    
    def add_user_message(self, message: str):
        """
        Add a user message to memory
        
        Args:
            message: User's message
        """
        logger.debug(f"[LANGCHAIN MEMORY] Adding user message to session {self.session_id}: {message[:50]}...")
        self.memory.chat_memory.add_user_message(message)
        logger.debug(f"[LANGCHAIN MEMORY] Total messages in memory: {len(self.memory.chat_memory.messages)}")
    
    def add_ai_message(self, message: str):
        """
        Add an AI response to memory
        
        Args:
            message: AI's response
        """
        logger.debug(f"[LANGCHAIN MEMORY] Adding AI message to session {self.session_id}: {message[:50]}...")
        self.memory.chat_memory.add_ai_message(message)
        logger.debug(f"[LANGCHAIN MEMORY] Total messages in memory: {len(self.memory.chat_memory.messages)}")
    
    def get_chat_history(self) -> list[BaseMessage]:
        """
        Get conversation history as LangChain messages
        
        Returns:
            List of BaseMessage objects
        """
        return self.memory.chat_memory.messages
    
    def get_chat_history_string(self, limit: Optional[int] = None) -> str:
        """
        Get formatted conversation history as string
        
        Args:
            limit: Maximum number of messages to include (None for all)
        
        Returns:
            Formatted string with conversation history
        """
        messages = self.get_chat_history()
        
        if not messages:
            return "No previous conversation."
        
        # Apply limit if specified (take last N messages)
        if limit:
            messages = messages[-limit:]
        
        formatted = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                formatted.append(f"User: {msg.content}")
            elif isinstance(msg, AIMessage):
                formatted.append(f"Assistant: {msg.content}")
        
        return "\n".join(formatted)
    
    def clear(self):
        """Clear all conversation history"""
        self.memory.clear()
    
    def get_memory_variables(self) -> dict:
        """
        Get memory variables for LangChain chains
        
        Returns:
            Dictionary with memory variables
        """
        return self.memory.load_memory_variables({})


# Global memory managers by session
_memory_managers: dict[str, LangChainMemoryManager] = {}


def get_memory_manager(session_id: str) -> LangChainMemoryManager:
    """
    Get or create LangChain memory manager for a session
    
    Args:
        session_id: Session identifier
    
    Returns:
        LangChainMemoryManager instance
    """
    if session_id not in _memory_managers:
        _memory_managers[session_id] = LangChainMemoryManager(session_id)
    return _memory_managers[session_id]


def clear_memory_manager(session_id: str):
    """Clear memory manager for a session"""
    if session_id in _memory_managers:
        del _memory_managers[session_id]

