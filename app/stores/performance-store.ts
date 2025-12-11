import { create } from 'zustand';

interface PerformanceState {
  // Page navigation
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Gesture lock state
  gestureLocked: boolean;
  lockGesture: () => void;
  unlockGesture: () => void;

  // Camera/tracking state
  cameraEnabled: boolean;
  faceDetected: boolean;
  setCameraEnabled: (enabled: boolean) => void;
  setFaceDetected: (detected: boolean) => void;

  // Reset state
  resetPerformance: () => void;
}

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  currentPage: 1,
  totalPages: 0,
  gestureLocked: false,
  cameraEnabled: false,
  faceDetected: false,

  setCurrentPage: (page) => {
    const { totalPages } = get();
    set({ currentPage: Math.max(1, Math.min(page, totalPages)) });
  },

  setTotalPages: (total) => set({ totalPages: total }),

  nextPage: () => {
    const { currentPage, totalPages } = get();
    if (currentPage < totalPages) {
      set({ currentPage: currentPage + 1 });
    }
  },

  prevPage: () => {
    const { currentPage } = get();
    if (currentPage > 1) {
      set({ currentPage: currentPage - 1 });
    }
  },

  lockGesture: () => set({ gestureLocked: true }),

  unlockGesture: () => set({ gestureLocked: false }),

  setCameraEnabled: (enabled) => set({ cameraEnabled: enabled }),

  setFaceDetected: (detected) => set({ faceDetected: detected }),

  resetPerformance: () =>
    set({
      currentPage: 1,
      totalPages: 0,
      gestureLocked: false,
      cameraEnabled: false,
      faceDetected: false
    })
}));
