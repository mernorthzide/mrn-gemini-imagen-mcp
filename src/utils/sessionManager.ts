import { Content, Session } from "../types.js";
import { randomUUID } from "crypto";

/**
 * Manages multi-turn conversation sessions for iterative image editing
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private maxSessions: number = 100;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes

  constructor(options?: { maxSessions?: number; sessionTimeout?: number }) {
    if (options?.maxSessions) {
      this.maxSessions = options.maxSessions;
    }
    if (options?.sessionTimeout) {
      this.sessionTimeout = options.sessionTimeout;
    }
  }

  /**
   * Create a new session with initial image
   */
  createSession(initialContent: Content, imagePath: string): string {
    // Clean up old sessions first
    this.cleanupExpiredSessions();

    // Check if we're at max capacity
    if (this.sessions.size >= this.maxSessions) {
      this.removeOldestSession();
    }

    const sessionId = randomUUID();
    const now = new Date();

    const session: Session = {
      id: sessionId,
      history: [initialContent],
      lastImagePath: imagePath,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return undefined;
    }

    // Check if session has expired
    const now = Date.now();
    if (now - session.updatedAt.getTime() > this.sessionTimeout) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    return session;
  }

  /**
   * Add a turn to an existing session
   */
  addTurn(
    sessionId: string,
    userContent: Content,
    assistantContent: Content,
    newImagePath: string
  ): boolean {
    const session = this.getSession(sessionId);

    if (!session) {
      return false;
    }

    session.history.push(userContent);
    session.history.push(assistantContent);
    session.lastImagePath = newImagePath;
    session.updatedAt = new Date();

    return true;
  }

  /**
   * Get the conversation history for a session
   */
  getHistory(sessionId: string): Content[] | undefined {
    const session = this.getSession(sessionId);
    return session?.history;
  }

  /**
   * Get the last image path for a session
   */
  getLastImagePath(sessionId: string): string | undefined {
    const session = this.getSession(sessionId);
    return session?.lastImagePath;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Check if a session exists and is valid
   */
  hasSession(sessionId: string): boolean {
    return this.getSession(sessionId) !== undefined;
  }

  /**
   * Get the number of active sessions
   */
  getActiveSessionCount(): number {
    this.cleanupExpiredSessions();
    return this.sessions.size;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, session] of this.sessions) {
      if (now - session.updatedAt.getTime() > this.sessionTimeout) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      this.sessions.delete(id);
    }
  }

  /**
   * Remove the oldest session when at capacity
   */
  private removeOldestSession(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, session] of this.sessions) {
      if (session.updatedAt.getTime() < oldestTime) {
        oldestTime = session.updatedAt.getTime();
        oldestId = id;
      }
    }

    if (oldestId) {
      this.sessions.delete(oldestId);
    }
  }

  /**
   * List all active session IDs
   */
  listSessions(): string[] {
    this.cleanupExpiredSessions();
    return Array.from(this.sessions.keys());
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    this.sessions.clear();
  }
}
