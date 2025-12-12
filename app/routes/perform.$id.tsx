import {
  useEffect,
  useCallback,
  lazy,
  Suspense,
  useReducer,
} from 'react';
import { useParams, redirect } from 'react-router';
import {
  useLibraryStore,
  type PDFMetadata,
} from '~/stores/library-store';
import { usePerformanceStore } from '~/stores/performance-store';
import { useSettingsStore } from '~/stores/settings-store';
import { ClientOnly } from '~/components/client-only';
import { PageControls } from '~/components/page-controls';
import { WebcamFeed } from '~/components/webcam-feed';
import { GestureIndicator } from '~/components/gesture-indicator';
import { VisualMetronome } from '~/components/visual-metronome';
import { usePoseDetector } from '~/hooks/use-pose-detector';
import { useHeadTracking } from '~/hooks/use-head-tracking';

// Lazy load PDFViewer to avoid SSR issues with react-pdf
const PDFViewer = lazy(() =>
  import('~/components/pdf-viewer').then((mod) => ({
    default: mod.PDFViewer,
  })),
);

interface PerformState {
  pdf: PDFMetadata | null;
  isLoading: boolean;
  videoElement: HTMLVideoElement | null;
  gestureEnabled: boolean;
}

type PerformAction =
  | { type: 'SET_PDF'; payload: PDFMetadata | null }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_VIDEO_ELEMENT'; payload: HTMLVideoElement | null }
  | { type: 'TOGGLE_GESTURE' };

function performReducer(
  state: PerformState,
  action: PerformAction,
): PerformState {
  switch (action.type) {
    case 'SET_PDF':
      return { ...state, pdf: action.payload };
    case 'SET_IS_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_VIDEO_ELEMENT':
      return { ...state, videoElement: action.payload };
    case 'TOGGLE_GESTURE':
      // Reset videoElement when turning gestures off to prevent stale references
      return {
        ...state,
        gestureEnabled: !state.gestureEnabled,
        videoElement: state.gestureEnabled
          ? null
          : state.videoElement,
      };
    default:
      return state;
  }
}

export default function Perform() {
  const { id } = useParams();
  const [state, dispatch] = useReducer(performReducer, {
    pdf: null,
    isLoading: true,
    videoElement: null,
    gestureEnabled: false,
  });

  const getPDF = useLibraryStore((s) => s.getPDF);
  const {
    setCurrentPage,
    nextPage,
    prevPage,
    resetPerformance,
    setCameraEnabled,
  } = usePerformanceStore();
  const gestureAngleThreshold = useSettingsStore(
    (s) => s.gestureAngleThreshold,
  );
  const gestureVelocityThreshold = useSettingsStore(
    (s) => s.gestureVelocityThreshold,
  );

  // Load face mesh model
  const {
    detector,
    isLoading: modelLoading,
    error: modelError,
  } = usePoseDetector();

  // Handle video element ready
  const handleVideoReady = useCallback(
    (video: HTMLVideoElement | null) => {
      dispatch({ type: 'SET_VIDEO_ELEMENT', payload: video });
      setCameraEnabled(!!video);
    },
    [], // setCameraEnabled is stable from Zustand
  );

  // Start head tracking
  const { poses, rollAngle, velocity } = useHeadTracking(
    detector,
    state.videoElement,
    state.gestureEnabled,
  );

  // Cleanup video element when gestures are disabled
  useEffect(() => {
    if (!state.gestureEnabled && state.videoElement) {
      dispatch({ type: 'SET_VIDEO_ELEMENT', payload: null });
      setCameraEnabled(false);
    }
  }, [state.gestureEnabled, state.videoElement, setCameraEnabled]);

  useEffect(() => {
    resetPerformance();

    if (!id) {
      dispatch({ type: 'SET_IS_LOADING', payload: false });
      return;
    }

    async function loadPDF() {
      const pdfData = await getPDF(id!);
      if (pdfData) {
        dispatch({ type: 'SET_PDF', payload: pdfData });
      }
      dispatch({ type: 'SET_IS_LOADING', payload: false });
    }

    loadPDF();
  }, [id, getPDF, resetPerformance]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          nextPage();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          prevPage();
          break;
        case 'Home':
          e.preventDefault();
          setCurrentPage(1);
          break;
        case 'End':
          e.preventDefault();
          if (state.pdf) setCurrentPage(state.pdf.pageCount);
          break;
        case 'Escape':
          window.location.href = '/library';
          break;
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => {
      window.removeEventListener('keydown', handleKeyboard);
    };
  }, [nextPage, prevPage, setCurrentPage, state.pdf]);

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">
          Loading sheet music...
        </p>
      </div>
    );
  }

  if (!state.pdf) {
    return redirect('/library');
  }

  return (
    <div className="relative">
      <ClientOnly
        fallback={
          <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">
              Initializing PDF viewer...
            </p>
          </div>
        }
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen">
              <p className="text-muted-foreground">
                Loading PDF viewer...
              </p>
            </div>
          }
        >
          <PDFViewer key={id} fileBlob={state.pdf.blob} />
        </Suspense>
      </ClientOnly>
      <PageControls
        onToggleGestures={() => {
          dispatch({ type: 'TOGGLE_GESTURE' });
        }}
        gestureEnabled={state.gestureEnabled}
        modelLoading={modelLoading}
      />
      <VisualMetronome />

      {state.gestureEnabled && (
        <>
          <WebcamFeed
            onVideoReady={handleVideoReady}
            poses={poses}
            rollAngle={rollAngle}
            threshold={gestureAngleThreshold}
            velocity={velocity}
            velocityThreshold={gestureVelocityThreshold}
          />
          <GestureIndicator
            enabled={state.gestureEnabled}
            isLoading={modelLoading}
          />
        </>
      )}

      {modelError && (
        <div className="fixed top-16 left-4 bg-destructive/10 text-destructive rounded-lg px-4 py-2 text-sm">
          {modelError}
        </div>
      )}
    </div>
  );
}
