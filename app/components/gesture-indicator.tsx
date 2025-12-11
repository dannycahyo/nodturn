import { Camera, CameraOff, Lock } from 'lucide-react';
import { usePerformanceStore } from '~/stores/performance-store';

interface GestureIndicatorProps {
  enabled: boolean;
  isLoading: boolean;
}

export function GestureIndicator({ enabled, isLoading }: GestureIndicatorProps) {
  const { gestureLocked, faceDetected, cameraEnabled } = usePerformanceStore();

  if (!enabled || !cameraEnabled) {
    return null;
  }

  const getStatus = () => {
    if (isLoading) {
      return { icon: Camera, color: 'text-gray-400', label: 'Loading...' };
    }
    if (gestureLocked) {
      return { icon: Lock, color: 'text-yellow-500', label: 'Locked' };
    }
    if (!faceDetected) {
      return { icon: CameraOff, color: 'text-red-500', label: 'No face' };
    }
    return { icon: Camera, color: 'text-green-500', label: 'Ready' };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <div className="fixed top-48 right-4 bg-background/95 backdrop-blur rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 border z-50">
      <Icon className={`h-4 w-4 ${status.color}`} />
      <span className="text-xs font-medium">{status.label}</span>
    </div>
  );
}
