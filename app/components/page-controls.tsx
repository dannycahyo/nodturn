import { ChevronLeft, ChevronRight, Home, Hand } from 'lucide-react';
import { Link } from 'react-router';
import { usePerformanceStore } from '~/stores/performance-store';
import { Button } from '~/components/ui/button';
import { MetronomeControls } from '~/components/metronome-controls';

interface PageControlsProps {
  onToggleGestures?: () => void;
  gestureEnabled?: boolean;
  modelLoading?: boolean;
}

export function PageControls({
  onToggleGestures,
  gestureEnabled = false,
  modelLoading = false,
}: PageControlsProps) {
  const { currentPage, totalPages, nextPage, prevPage } =
    usePerformanceStore();

  const handlePrevClick = () => {
    prevPage();
  };

  const handleNextClick = () => {
    nextPage();
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur rounded-lg shadow-lg px-4 py-2 flex items-center gap-4 border">
      <Link to="/library">
        <Button variant="ghost" size="sm">
          <Home className="h-4 w-4 mr-2" />
          Library
        </Button>
      </Link>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevClick}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-sm font-medium min-w-[80px] text-center">
          {currentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextClick}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {onToggleGestures && (
        <Button
          variant={gestureEnabled ? 'default' : 'ghost'}
          size="sm"
          onClick={onToggleGestures}
          disabled={modelLoading}
        >
          <Hand className="h-4 w-4 mr-2" />
          {modelLoading
            ? 'Loading...'
            : gestureEnabled
              ? 'Gestures On'
              : 'Gestures'}
        </Button>
      )}

      <MetronomeControls />
    </div>
  );
}
