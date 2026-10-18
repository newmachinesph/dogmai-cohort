import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/stores/ui-store';
import { useFiltersStore } from '@/stores/filters-store';
import { useNotificationsStore } from '@/stores/notifications-store';

describe('Zustand Stores', () => {
  describe('UI Store', () => {
    beforeEach(() => {
      // Reset store state
      const store = useUIStore.getState();
      store.setSidebarOpen(false);
      store.closeModal();
      store.setGlobalLoading(false);
    });

    it('should have correct initial state', () => {
      const state = useUIStore.getState();
      expect(state.sidebarOpen).toBe(false);
      expect(state.activeModal).toBeNull();
      expect(state.globalLoading).toBe(false);
    });

    it('should toggle sidebar', () => {
      const store = useUIStore.getState();

      store.toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      store.toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it('should set sidebar open state directly', () => {
      const store = useUIStore.getState();

      store.setSidebarOpen(true);
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      store.setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it('should open modal with data', () => {
      const store = useUIStore.getState();
      const modalData = { userId: '123', action: 'edit' };

      store.openModal('user-edit', modalData);

      const state = useUIStore.getState();
      expect(state.activeModal).toBe('user-edit');
      expect(state.modalData).toEqual(modalData);
    });

    it('should close modal and clear data', () => {
      const store = useUIStore.getState();
      store.openModal('test-modal', { test: true });
      store.closeModal();

      const state = useUIStore.getState();
      expect(state.activeModal).toBeNull();
      expect(state.modalData).toBeNull();
    });

    it('should set global loading with message', () => {
      const store = useUIStore.getState();

      store.setGlobalLoading(true, 'Loading data...');

      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.loadingMessage).toBe('Loading data...');
    });

    it('should clear loading message when loading is false', () => {
      const store = useUIStore.getState();
      store.setGlobalLoading(true, 'Loading...');
      store.setGlobalLoading(false);

      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(false);
      expect(state.loadingMessage).toBeNull();
    });
  });

  describe('Filters Store', () => {
    beforeEach(() => {
      // Reset store state
      const store = useFiltersStore.getState();
      store.resetFilters();
    });

    it('should have correct initial state', () => {
      const state = useFiltersStore.getState();
      expect(state.selectedCohortId).toBeNull();
      expect(state.globalSearch).toBe('');
      expect(state.dateRange).toEqual({ start: null, end: null });
    });

    it('should set selected cohort', () => {
      const store = useFiltersStore.getState();

      store.setSelectedCohort('cohort-123', 'Test Cohort');
      expect(useFiltersStore.getState().selectedCohortId).toBe('cohort-123');
      expect(useFiltersStore.getState().selectedCohortName).toBe('Test Cohort');
    });

    it('should set global search', () => {
      const store = useFiltersStore.getState();

      store.setGlobalSearch('test search');
      expect(useFiltersStore.getState().globalSearch).toBe('test search');
    });

    it('should set date range', () => {
      const store = useFiltersStore.getState();
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');

      store.setDateRange(start, end);

      const state = useFiltersStore.getState();
      expect(state.dateRange.start).toEqual(start);
      expect(state.dateRange.end).toEqual(end);
    });

    it('should set period', () => {
      const store = useFiltersStore.getState();

      store.setPeriod('90');
      expect(useFiltersStore.getState().period).toBe('90');
    });

    it('should reset all filters', () => {
      const store = useFiltersStore.getState();

      // Set some filters
      store.setSelectedCohort('cohort-123', 'Test');
      store.setGlobalSearch('test');
      store.setPeriod('90');

      // Reset
      store.resetFilters();

      const state = useFiltersStore.getState();
      expect(state.selectedCohortId).toBeNull();
      expect(state.globalSearch).toBe('');
      expect(state.period).toBe('30');
    });
  });

  describe('Notifications Store', () => {
    beforeEach(() => {
      // Reset store state
      const store = useNotificationsStore.getState();
      store.clearNotifications();
      store.setUnreadMessageCount(0);
      store.setPendingGradingCount(0);
    });

    it('should have correct initial state', () => {
      const state = useNotificationsStore.getState();
      expect(state.unreadMessageCount).toBe(0);
      expect(state.pendingGradingCount).toBe(0);
      expect(state.notifications).toEqual([]);
    });

    it('should set unread message count', () => {
      const store = useNotificationsStore.getState();

      store.setUnreadMessageCount(5);
      expect(useNotificationsStore.getState().unreadMessageCount).toBe(5);
    });

    it('should set pending grading count', () => {
      const store = useNotificationsStore.getState();

      store.setPendingGradingCount(10);
      expect(useNotificationsStore.getState().pendingGradingCount).toBe(10);
    });

    it('should add notification', () => {
      const store = useNotificationsStore.getState();

      store.addNotification({
        type: 'success',
        title: 'Test Notification',
        message: 'This is a test',
      });

      const state = useNotificationsStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].title).toBe('Test Notification');
      expect(state.notifications[0].type).toBe('success');
    });

    it('should remove notification by id', () => {
      const store = useNotificationsStore.getState();

      store.addNotification({ type: 'info', title: 'Notification 1' });
      store.addNotification({ type: 'info', title: 'Notification 2' });

      const notificationId = useNotificationsStore.getState().notifications[0].id;
      store.removeNotification(notificationId);

      const state = useNotificationsStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].title).toBe('Notification 2');
    });

    it('should clear all notifications', () => {
      const store = useNotificationsStore.getState();

      store.setUnreadMessageCount(5);
      store.setPendingGradingCount(10);
      store.addNotification({ type: 'info', title: 'Test' });

      store.clearNotifications();
      store.setUnreadMessageCount(0);
      store.setPendingGradingCount(0);

      const state = useNotificationsStore.getState();
      expect(state.unreadMessageCount).toBe(0);
      expect(state.pendingGradingCount).toBe(0);
      expect(state.notifications).toEqual([]);
    });
  });
});
