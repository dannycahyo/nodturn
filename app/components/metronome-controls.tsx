import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useSettingsStore } from '~/stores/settings-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Slider } from '~/components/ui/slider';
import { Button } from '~/components/ui/button';

export function MetronomeControls() {
  const [open, setOpen] = useState(false);
  const {
    metronomeBPM,
    metronomeEnabled,
    metronomePosition,
    setMetronomeBPM,
    setMetronomeEnabled,
    setMetronomePosition,
    darkMode,
    setDarkMode,
  } = useSettingsStore();

  const positions: Array<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'> = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Performance Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Dark Mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Display</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Dark mode (invert colors)</span>
            </div>
          </div>

          {/* Metronome Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Visual Metronome</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={metronomeEnabled}
                onChange={(e) => setMetronomeEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Enable metronome</span>
            </div>
          </div>

          {/* BPM Slider */}
          {metronomeEnabled && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Tempo</label>
                <span className="text-sm text-muted-foreground">{metronomeBPM} BPM</span>
              </div>
              <Slider
                value={[metronomeBPM]}
                onValueChange={(value) => setMetronomeBPM(value[0])}
                min={30}
                max={240}
                step={1}
              />
            </div>
          )}

          {/* Position Selector */}
          {metronomeEnabled && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Metronome Position</label>
              <div className="grid grid-cols-2 gap-2">
                {positions.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setMetronomePosition(pos)}
                    className={`px-3 py-2 text-sm border rounded ${
                      metronomePosition === pos
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-accent'
                    }`}
                  >
                    {pos.split('-').join(' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
