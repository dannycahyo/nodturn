import { create } from 'zustand';

interface PerformanceState {
  // Page navigation
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Camera/tracking state
  cameraEnabled: boolean;
  poseDetected: boolean;
  setCameraEnabled: (enabled: boolean) => void;
  setPoseDetected: (detected: boolean) => void;

  // Reset state
  resetPerformance: () => void;
}

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  currentPage: 1,
  totalPages: 0,
  cameraEnabled: false,
  poseDetected: false,

  setCurrentPage: (page) => {
    const { totalPages } = get();
    set({ currentPage: Math.max(1, Math.min(page, totalPages)) });
  },

  setTotalPages: (total) => {
    console.log('[PerformanceStore] setTotalPages called', { total });
    set({ totalPages: total });
  },

  nextPage: () => {
    const { currentPage, totalPages } = get();
    console.log('[PerformanceStore] nextPage called', {
      currentPage,
      totalPages,
      canAdvance: currentPage < totalPages
    });
    if (currentPage < totalPages) {
      set({ currentPage: currentPage + 1 });
    }
  },

  prevPage: () => {
    const { currentPage, totalPages } = get();
    console.log('[PerformanceStore] prevPage called', {
      currentPage,
      totalPages,
      canGoBack: currentPage > 1
    });
    if (currentPage > 1) {
      set({ currentPage: currentPage - 1 });
    }
  },

  setCameraEnabled: (enabled) => set({ cameraEnabled: enabled }),

  setPoseDetected: (detected) => set({ poseDetected: detected }),

  resetPerformance: () =>
    set({
      currentPage: 1,
      totalPages: 0,
      cameraEnabled: false,
      poseDetected: false
    })
}));
