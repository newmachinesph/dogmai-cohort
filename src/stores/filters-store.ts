import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FiltersState {
  // Global cohort filter (used across analytics, bulk ops, etc.)
  selectedCohortId: string | null;
  selectedCohortName: string | null;

  // Date range filters
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  period: '7' | '30' | '90' | 'all';

  // Search
  globalSearch: string;

  // Actions
  setSelectedCohort: (id: string | null, name?: string | null) => void;
  setDateRange: (start: Date | null, end: Date | null) => void;
  setPeriod: (period: '7' | '30' | '90' | 'all') => void;
  setGlobalSearch: (search: string) => void;
  resetFilters: () => void;
}

const initialState = {
  selectedCohortId: null,
  selectedCohortName: null,
  dateRange: {
    start: null,
    end: null,
  },
  period: '30' as const,
  globalSearch: '',
};

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      ...initialState,

      setSelectedCohort: (id, name) => set({
        selectedCohortId: id,
        selectedCohortName: name || null
      }),

      setDateRange: (start, end) => set({
        dateRange: { start, end }
      }),

      setPeriod: (period) => set({ period }),

      setGlobalSearch: (search) => set({ globalSearch: search }),

      resetFilters: () => set(initialState),
    }),
    {
      name: 'filters-storage',
      partialize: (state) => ({
        selectedCohortId: state.selectedCohortId,
        selectedCohortName: state.selectedCohortName,
        period: state.period,
      }),
    }
  )
);
