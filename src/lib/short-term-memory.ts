/**
 * Short-term Memory Module
 * Manages conversation history for each session
 */

export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
  timestamp: string;
  metadata?: Record<string, any>;
}

export class ShortTermMemory {
  sessionId: string;
  history: Message[];
  createdAt: Date;
  lastUpdated: Date;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.history = [];
    this.createdAt = new Date();
    this.lastUpdated = new Date();
  }

  /**
   * Add a message to the conversation history
   */
  addMessage(role: 'user' | 'model', content: string, metadata?: Record<string, any>) {
    const message: Message = {
      role,
      parts: [{ text: content }],
      timestamp: new Date().toISOString(),
    };

    if (metadata) {
      message.metadata = metadata;
    }

    this.history.push(message);
    this.lastUpdated = new Date();
  }

  /**
   * Get conversation history
   */
  getHistory(limit?: number): Message[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return this.history;
  }

  /**
   * Get formatted conversation history for LLM
   */
  getContextForLLM(limit: number = 10): string {
    const recentHistory = this.getHistory(limit);

    if (recentHistory.length === 0) {
      return 'No previous conversation.';
    }

    const formatted = recentHistory.map((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      const text = msg.parts[0]?.text || '';
      return `${role}: ${text}`;
    });

    return formatted.join('\n');
  }

  /**
   * Clear all conversation history
   */
  clear() {
    this.history = [];
    this.lastUpdated = new Date();
  }

  /**
   * Get the last user message
   */
  getLastUserMessage(): string {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].role === 'user') {
        return this.history[i].parts[0]?.text || '';
      }
    }
    return '';
  }

  /**
   * Get the last assistant message
   */
  getLastAssistantMessage(): string {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].role === 'model') {
        return this.history[i].parts[0]?.text || '';
      }
    }
    return '';
  }

  /**
   * Get total number of messages
   */
  getMessageCount(): number {
    return this.history.length;
  }
}

/**
 * Session Manager
 * Manages multiple short-term memory sessions
 */
export class SessionManager {
  private sessions: Map<string, ShortTermMemory>;

  constructor() {
    this.sessions = new Map();
  }

  /**
   * Get or create a session
   */
  getSession(sessionId: string): ShortTermMemory {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new ShortTermMemory(sessionId));
    }
    return this.sessions.get(sessionId)!;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  /**
   * Clear old sessions (older than maxAgeHours)
   */
  clearOldSessions(maxAgeHours: number = 24) {
    const currentTime = new Date();
    const sessionsToDelete: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      const age = (currentTime.getTime() - session.lastUpdated.getTime()) / (1000 * 60 * 60);
      if (age > maxAgeHours) {
        sessionsToDelete.push(sessionId);
      }
    });

    sessionsToDelete.forEach((sessionId) => {
      this.sessions.delete(sessionId);
    });

    if (sessionsToDelete.length > 0) {
      console.log(`Cleared ${sessionsToDelete.length} old sessions`);
    }
  }

  /**
   * Get total number of active sessions
   */
  getSessionCount(): number {
    return this.sessions.size;
  }
}

// Global session manager
let sessionManager: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }
  return sessionManager;
}
