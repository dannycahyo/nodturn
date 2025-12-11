import { useSettingsStore } from '~/stores/settings-store';

export function VisualMetronome() {
  const { metronomeEnabled, metronomeBPM, metronomePosition } = useSettingsStore();

  if (!metronomeEnabled) {
    return null;
  }

  // Calculate animation duration from BPM
  const duration = 60000 / metronomeBPM; // milliseconds per beat

  // Position styles
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'bottom-right': 'bottom-20 right-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[metronomePosition]} z-50`}
      style={{
        animation: `pulse ${duration}ms ease-in-out infinite`,
      }}
    >
      <div className="w-6 h-6 rounded-full bg-primary" />
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
