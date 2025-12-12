import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // Dark mode
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;

  // Visual metronome
  metronomeBPM: number;
  metronomeEnabled: boolean;
  metronomePosition:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right';
  setMetronomeBPM: (bpm: number) => void;
  setMetronomeEnabled: (enabled: boolean) => void;
  setMetronomePosition: (
    position:
      | 'top-left'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-right',
  ) => void;

  // Gesture detection thresholds
  gestureAngleThreshold: number; // degrees
  gestureVelocityThreshold: number; // degrees/sec
  gestureCooldown: number; // milliseconds
  gestureHoldDuration: number; // milliseconds
  setGestureAngleThreshold: (angle: number) => void;
  setGestureVelocityThreshold: (velocity: number) => void;
  setGestureCooldown: (cooldown: number) => void;
  setGestureHoldDuration: (duration: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default values
      darkMode: false,
      metronomeBPM: 120,
      metronomeEnabled: false,
      metronomePosition: 'top-right',
      gestureAngleThreshold: 45, // Require significant deliberate tilt (increased from 30)
      gestureVelocityThreshold: 30, // Reduced from 50 to 30 deg/sec - very slow movement OK
      gestureCooldown: 1500,
      gestureHoldDuration: 800, // Require sustained tilt for 800ms before trigger (increased from 400ms)

      // Actions
      setDarkMode: (enabled) => set({ darkMode: enabled }),
      setMetronomeBPM: (bpm) =>
        set({ metronomeBPM: Math.max(30, Math.min(240, bpm)) }),
      setMetronomeEnabled: (enabled) =>
        set({ metronomeEnabled: enabled }),
      setMetronomePosition: (position) =>
        set({ metronomePosition: position }),
      setGestureAngleThreshold: (angle) =>
        set({ gestureAngleThreshold: angle }),
      setGestureVelocityThreshold: (velocity) =>
        set({ gestureVelocityThreshold: velocity }),
      setGestureCooldown: (cooldown) =>
        set({ gestureCooldown: cooldown }),
      setGestureHoldDuration: (duration) =>
        set({ gestureHoldDuration: duration }),
    }),
    {
      name: 'nodturn-settings',
    },
  ),
);
