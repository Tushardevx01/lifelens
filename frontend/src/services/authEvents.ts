/**
 * LifeLens Auth Events Service
 *
 * Provides event broadcasting for global authentication state transitions:
 * - Session expiry (HTTP 401 / 403)
 * - User login and logout
 */

type AuthEventListener = () => void;

class AuthEventManager {
  private unauthorizedListeners = new Set<AuthEventListener>();

  onUnauthorized(listener: AuthEventListener): () => void {
    this.unauthorizedListeners.add(listener);
    return () => {
      this.unauthorizedListeners.delete(listener);
    };
  }

  notifyUnauthorized(): void {
    for (const listener of this.unauthorizedListeners) {
      try {
        listener();
      } catch (err) {
        console.warn('[LifeLens AuthEvents] Error in unauthorized listener:', err);
      }
    }
  }
}

export const authEvents = new AuthEventManager();
