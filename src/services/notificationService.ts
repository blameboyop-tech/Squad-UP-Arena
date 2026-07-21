import { db, handleFirestoreError } from '../lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  writeBatch, 
  serverTimestamp, 
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';

export type NotificationType =
  | 'Friend Request'
  | 'Team Invitation'
  | 'Team Join Request'
  | 'Tournament Registration'
  | 'Tournament Approved'
  | 'Tournament Rejected'
  | 'Tournament Starting Soon'
  | 'Match Result Submitted'
  | 'Role Changed'
  | 'Warning Received'
  | 'Suspension Notice'
  | 'General Announcement';

export interface AppNotification {
  notificationId: string;
  type: NotificationType;
  title: string;
  message: string;
  icon: string;
  createdAt: Timestamp | Date | any;
  read: boolean;
  senderId?: string;
  targetId?: string;
  actionUrl?: string;
}

// Map notification types to Lucide icon names
export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  'Friend Request': 'UserPlus',
  'Team Invitation': 'Mail',
  'Team Join Request': 'Users',
  'Tournament Registration': 'Swords',
  'Tournament Approved': 'CheckCircle2',
  'Tournament Rejected': 'XCircle',
  'Tournament Starting Soon': 'Flame',
  'Match Result Submitted': 'Trophy',
  'Role Changed': 'ShieldAlert',
  'Warning Received': 'AlertTriangle',
  'Suspension Notice': 'Ban',
  'General Announcement': 'Megaphone'
};

export const NotificationService = {
  /**
   * Creates a notification for a target user.
   */
  async createNotification(
    userId: string,
    data: {
      type: NotificationType;
      title: string;
      message: string;
      icon?: string;
      senderId?: string;
      targetId?: string;
      actionUrl?: string;
    }
  ): Promise<string> {
    try {
      const path = `users/${userId}/notifications`;
      const notifCol = collection(db, 'users', userId, 'notifications');
      const defaultIcon = NOTIFICATION_ICONS[data.type] || 'Bell';
      
      const payload = {
        type: data.type,
        title: data.title,
        message: data.message,
        icon: data.icon || defaultIcon,
        createdAt: serverTimestamp(),
        read: false,
        senderId: data.senderId || null,
        targetId: data.targetId || null,
        actionUrl: data.actionUrl || null
      };

      const docRef = await addDoc(notifCol, payload);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${userId}/notifications`);
      throw error;
    }
  },

  /**
   * Marks a single notification as read.
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'notifications', notificationId);
      await updateDoc(docRef, {
        read: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${userId}/notifications/${notificationId}`);
    }
  },

  /**
   * Marks all specified/unread notifications as read.
   */
  async markAllAsRead(userId: string, notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;
    try {
      const batch = writeBatch(db);
      notificationIds.forEach((id) => {
        const docRef = doc(db, 'users', userId, 'notifications', id);
        batch.update(docRef, { 
          read: true,
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${userId}/notifications`);
    }
  },

  /**
   * Deletes a notification.
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'notifications', notificationId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${userId}/notifications/${notificationId}`);
    }
  },

  /**
   * Subscribes to real-time notification changes with a customizable limit.
   */
  listenToNotifications(
    userId: string,
    limitCount: number,
    onUpdate: (notifications: AppNotification[], hasMore: boolean) => void,
    onError?: (error: any) => void
  ) {
    const notifCol = collection(db, 'users', userId, 'notifications');
    // We request limitCount + 1 to check if there are more items to be loaded
    const q = query(
      notifCol,
      orderBy('createdAt', 'desc'),
      limit(limitCount + 1)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const items: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          items.push({
            notificationId: docSnap.id,
            ...(docSnap.data() as Omit<AppNotification, 'notificationId'>)
          });
        });

        const hasMore = items.length > limitCount;
        if (hasMore) {
          items.pop(); // Remove the extra item used for checking
        }

        onUpdate(items, hasMore);
      },
      (error) => {
        console.error('Error listening to notifications:', error);
        if (onError) {
          onError(error);
        } else {
          handleFirestoreError(error, 'list', `users/${userId}/notifications`);
        }
      }
    );
  },

  /**
   * Listens to the unread count in real-time.
   */
  listenToUnreadCount(
    userId: string,
    onUpdate: (count: number) => void
  ) {
    const notifCol = collection(db, 'users', userId, 'notifications');
    const q = query(notifCol, where('read', '==', false));

    return onSnapshot(
      q,
      (snapshot) => {
        onUpdate(snapshot.size);
      },
      (error) => {
        console.error('Error listening to unread notifications count:', error);
      }
    );
  }
};
