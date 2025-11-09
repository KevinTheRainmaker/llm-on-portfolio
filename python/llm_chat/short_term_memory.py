"""
Short-term Memory Module
Manages conversation history for each session
"""

from typing import Dict, List, Any
from datetime import datetime
import uuid


class ShortTermMemory:
    """
    Short-term memory stores conversation history for a session
    Each session has its own isolated memory
    """

    def __init__(self, session_id: str = None):
        """
        Initialize short-term memory for a session

        Args:
            session_id: Unique session identifier
        """
        self.session_id = session_id or str(uuid.uuid4())
        self.history: List[Dict[str, Any]] = []
        self.created_at = datetime.utcnow()
        self.last_updated = datetime.utcnow()

    def add_message(self, role: str, content: str, metadata: Dict[str, Any] = None):
        """
        Add a message to the conversation history

        Args:
            role: Message role ('user' or 'model')
            content: Message content
            metadata: Optional metadata for the message
        """
        message = {
            "role": role,
            "parts": [{"text": content}],
            "timestamp": datetime.utcnow().isoformat(),
        }

        if metadata:
            message["metadata"] = metadata

        self.history.append(message)
        self.last_updated = datetime.utcnow()

    def get_history(self, limit: int = None) -> List[Dict[str, Any]]:
        """
        Get conversation history

        Args:
            limit: Maximum number of messages to return (most recent)

        Returns:
            List of message dictionaries
        """
        if limit:
            return self.history[-limit:]
        return self.history

    def get_context_for_llm(self, limit: int = 10) -> str:
        """
        Get formatted conversation history for LLM

        Args:
            limit: Maximum number of messages to include

        Returns:
            Formatted string with conversation history
        """
        recent_history = self.get_history(limit)

        if not recent_history:
            return "No previous conversation."

        formatted = []
        for msg in recent_history:
            role = "User" if msg["role"] == "user" else "Assistant"
            text = msg.get("parts", [{}])[0].get("text", "")
            formatted.append(f"{role}: {text}")

        return "\n".join(formatted)

    def clear(self):
        """Clear all conversation history"""
        self.history = []
        self.last_updated = datetime.utcnow()

    def get_last_user_message(self) -> str:
        """Get the last user message"""
        for msg in reversed(self.history):
            if msg["role"] == "user":
                return msg.get("parts", [{}])[0].get("text", "")
        return ""

    def get_last_assistant_message(self) -> str:
        """Get the last assistant message"""
        for msg in reversed(self.history):
            if msg["role"] == "model":
                return msg.get("parts", [{}])[0].get("text", "")
        return ""

    def get_message_count(self) -> int:
        """Get total number of messages"""
        return len(self.history)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "session_id": self.session_id,
            "history": self.history,
            "created_at": self.created_at.isoformat(),
            "last_updated": self.last_updated.isoformat(),
            "message_count": len(self.history)
        }


class SessionManager:
    """
    Manages multiple short-term memory sessions
    """

    def __init__(self):
        self.sessions: Dict[str, ShortTermMemory] = {}

    def get_session(self, session_id: str) -> ShortTermMemory:
        """
        Get or create a session

        Args:
            session_id: Session identifier

        Returns:
            ShortTermMemory instance for the session
        """
        if session_id not in self.sessions:
            self.sessions[session_id] = ShortTermMemory(session_id)
        return self.sessions[session_id]

    def delete_session(self, session_id: str):
        """Delete a session"""
        if session_id in self.sessions:
            del self.sessions[session_id]

    def clear_old_sessions(self, max_age_hours: int = 24):
        """
        Clear sessions older than specified hours

        Args:
            max_age_hours: Maximum age in hours
        """
        current_time = datetime.utcnow()
        to_delete = []

        for session_id, session in self.sessions.items():
            age = (current_time - session.last_updated).total_seconds() / 3600
            if age > max_age_hours:
                to_delete.append(session_id)

        for session_id in to_delete:
            del self.sessions[session_id]

        if to_delete:
            print(f"Cleared {len(to_delete)} old sessions")

    def get_session_count(self) -> int:
        """Get total number of active sessions"""
        return len(self.sessions)


# Global session manager
_session_manager = None


def get_session_manager() -> SessionManager:
    """Get or create global session manager instance"""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager
