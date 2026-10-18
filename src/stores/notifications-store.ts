import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  timestamp: Date;
}

interface NotificationsState {
  // Unread counts
  unreadMessageCount: number;
  pendingGradingCount: number;
  unreadAnnouncementCount: number;

  // Toast notifications queue
  notifications: Notification[];

  // Last fetch timestamps (for polling optimization)
  lastMessageCheck: Date | null;
  lastGradingCheck: Date | null;

  // Actions
  setUnreadMessageCount: (count: number) => void;
  setPendingGradingCount: (count: number) => void;
  setUnreadAnnouncementCount: (count: number) => void;
  incrementUnreadMessages: () => void;
  decrementUnreadMessages: (by?: number) => void;

  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  setLastMessageCheck: (date: Date) => void;
  setLastGradingCheck: (date: Date) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  // Initial state
  unreadMessageCount: 0,
  pendingGradingCount: 0,
  unreadAnnouncementCount: 0,
  notifications: [],
  lastMessageCheck: null,
  lastGradingCheck: null,

  // Actions
  setUnreadMessageCount: (count) => set({ unreadMessageCount: count }),
  setPendingGradingCount: (count) => set({ pendingGradingCount: count }),
  setUnreadAnnouncementCount: (count) => set({ unreadAnnouncementCount: count }),

  incrementUnreadMessages: () => set((state) => ({
    unreadMessageCount: state.unreadMessageCount + 1
  })),

  decrementUnreadMessages: (by = 1) => set((state) => ({
    unreadMessageCount: Math.max(0, state.unreadMessageCount - by)
  })),

  addNotification: (notification) => set((state) => ({
    notifications: [
      ...state.notifications,
      {
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      },
    ],
  })),

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),

  clearNotifications: () => set({ notifications: [] }),

  setLastMessageCheck: (date) => set({ lastMessageCheck: date }),
  setLastGradingCheck: (date) => set({ lastGradingCheck: date }),
}));
