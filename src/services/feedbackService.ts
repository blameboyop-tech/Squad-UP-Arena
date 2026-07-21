import { soundService } from './soundService';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastListener = (toast: ToastMessage) => void;

class FeedbackService {
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(toast: ToastMessage) {
    this.listeners.forEach((listener) => {
      try {
        listener(toast);
      } catch (err) {
        console.error('Error in toast listener:', err);
      }
    });
  }

  showSuccess(message: string, options: { playSound?: boolean; duration?: number } = {}) {
    const { playSound = true, duration = 4000 } = options;
    if (playSound) {
      soundService.playSuccess();
    }
    this.notify({
      id: Math.random().toString(36).substr(2, 9),
      message,
      type: 'success',
      duration,
    });
  }

  showWarning(message: string, options: { playSound?: boolean; duration?: number } = {}) {
    const { playSound = true, duration = 4000 } = options;
    if (playSound) {
      soundService.playWarning();
    }
    this.notify({
      id: Math.random().toString(36).substr(2, 9),
      message,
      type: 'warning',
      duration,
    });
  }

  showInfo(message: string, options: { playSound?: boolean; duration?: number } = {}) {
    const { playSound = true, duration = 4000 } = options;
    if (playSound) {
      soundService.playNotification();
    }
    this.notify({
      id: Math.random().toString(36).substr(2, 9),
      message,
      type: 'info',
      duration,
    });
  }

  showError(error: any, options: { playSound?: boolean; duration?: number; fallback?: string } = {}) {
    const { playSound = true, duration = 5000, fallback = 'An unexpected error occurred' } = options;
    if (playSound) {
      soundService.playError();
    }

    let userFriendlyMessage = fallback;

    if (error) {
      if (typeof error === 'string') {
        userFriendlyMessage = error;
      } else if (error.code) {
        // Standardize Firestore / Firebase Auth errors
        switch (error.code) {
          case 'permission-denied':
          case 'firestore/permission-denied':
            userFriendlyMessage = 'Permission Denied: You do not have permission to perform this action.';
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            userFriendlyMessage = 'Invalid credentials. Please double-check your email and password.';
            break;
          case 'auth/email-already-in-use':
            userFriendlyMessage = 'Email already in use. Try signing in or use a different email.';
            break;
          case 'auth/weak-password':
            userFriendlyMessage = 'Weak password. Please use at least 6 characters.';
            break;
          case 'auth/network-request-failed':
          case 'unavailable':
          case 'firestore/unavailable':
            userFriendlyMessage = 'Network Failure: Unable to connect to the servers. Please check your internet connection.';
            break;
          case 'resource-exhausted':
          case 'firestore/resource-exhausted':
            userFriendlyMessage = 'Server Busy: API limit reached. Please try again shortly.';
            break;
          default:
            userFriendlyMessage = error.message || fallback;
        }
      } else if (error.message) {
        userFriendlyMessage = error.message;
      }
    }

    // Clean up Firebase prefixes like "Firebase: Error (auth/invalid-email)." if present
    if (userFriendlyMessage.includes('Firebase:')) {
      userFriendlyMessage = userFriendlyMessage.replace(/Firebase:\s*Error\s*\((.*?)\)\.?/g, '$1').trim();
    }

    this.notify({
      id: Math.random().toString(36).substr(2, 9),
      message: userFriendlyMessage,
      type: 'error',
      duration,
    });
  }
}

export const feedbackService = new FeedbackService();
