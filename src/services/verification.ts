import { VerificationSession } from '../types';
import crypto from 'crypto';

class VerificationService {
  private sessions: Map<string, VerificationSession> = new Map();
  private readonly SESSION_EXPIRY_MINUTES = 5;

  generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  createSession(bookingDetails: VerificationSession['bookingDetails']): VerificationSession {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_EXPIRY_MINUTES * 60000);

    const session: VerificationSession = {
      sessionId,
      bookingDetails,
      status: 'pending',
      createdAt: now,
      expiresAt
    };

    this.sessions.set(sessionId, session);
    this.scheduleCleanup(sessionId, this.SESSION_EXPIRY_MINUTES * 60000);

    return session;
  }

  getSession(sessionId: string): VerificationSession | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  confirmSession(sessionId: string): boolean {
    const session = this.getSession(sessionId);

    if (!session || session.status !== 'pending') {
      return false;
    }

    session.status = 'confirmed';
    // Extend expiry for confirmed sessions (keep for 1 hour for webhook access)
    session.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    return true;
  }

  cancelSession(sessionId: string): boolean {
    const session = this.getSession(sessionId);

    if (!session) {
      return false;
    }

    session.status = 'cancelled';
    this.sessions.delete(sessionId);
    return true;
  }

  private scheduleCleanup(sessionId: string, delay: number): void {
    setTimeout(() => {
      const session = this.sessions.get(sessionId);
      if (session && session.status === 'pending') {
        this.sessions.delete(sessionId);
      }
    }, delay);
  }

  getAllActiveSessions(): VerificationSession[] {
    const now = new Date();
    const activeSessions: VerificationSession[] = [];

    this.sessions.forEach((session) => {
      if (session.expiresAt > now) {
        activeSessions.push(session);
      }
    });

    return activeSessions;
  }

  checkForConflicts(
    staffName: string,
    date: string,
    time: string,
    endTime: string
  ): boolean {
    const activeSessions = this.getAllActiveSessions();

    return activeSessions.some(session =>
      session.status === 'pending' &&
      session.bookingDetails.staff === staffName &&
      session.bookingDetails.date === date &&
      this.timesOverlap(
        session.bookingDetails.time,
        session.bookingDetails.endTime,
        time,
        endTime
      )
    );
  }

  private timesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start1Min = toMinutes(start1);
    const end1Min = toMinutes(end1);
    const start2Min = toMinutes(start2);
    const end2Min = toMinutes(end2);

    return (
      (start1Min >= start2Min && start1Min < end2Min) ||
      (end1Min > start2Min && end1Min <= end2Min) ||
      (start1Min <= start2Min && end1Min >= end2Min)
    );
  }
}

export const verificationService = new VerificationService();