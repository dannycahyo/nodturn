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
      console.log('[PerformReducer] SET_VIDEO_ELEMENT', {
        hasVideo: !!action.payload,
      });
      return { ...state, videoElement: action.payload };
    case 'TOGGLE_GESTURE':
      console.log('[PerformReducer] TOGGLE_GESTURE', {
        from: state.gestureEnabled,
        to: !state.gestureEnabled,
      });
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
      console.log('[Perform] Video ready callback', {
        video: !!video,
        dimensions: video
          ? `${video.videoWidth}x${video.videoHeight}`
          : 'N/A',
      });
      dispatch({ type: 'SET_VIDEO_ELEMENT', payload: video });
      setCameraEnabled(!!video);
    },
    [], // setCameraEnabled is stable from Zustand
  );

  // Debug: Log hook inputs
  useEffect(() => {
    console.log('[Perform] useHeadTracking inputs', {
      detector: !!detector,
      videoElement: !!state.videoElement,
      videoReady: state.videoElement
        ? `${state.videoElement.videoWidth}x${state.videoElement.videoHeight}`
        : 'N/A',
      gestureEnabled: state.gestureEnabled,
      modelLoading,
      modelError,
    });
  }, [
    detector,
    state.videoElement,
    state.gestureEnabled,
    modelLoading,
    modelError,
  ]);

  // Start head tracking
  const { gestureLocked, poses, rollAngle, velocity } = useHeadTracking(
    detector,
    state.videoElement,
    state.gestureEnabled,
  );

  // Debug: Log hook outputs
  useEffect(() => {
    console.log('[Perform] useHeadTracking outputs', {
      gestureLocked,
      posesCount: poses.length,
      rollAngle,
    });
  }, [gestureLocked, poses.length, rollAngle]);

  // Cleanup video element when gestures are disabled
  useEffect(() => {
    if (!state.gestureEnabled && state.videoElement) {
      console.log(
        '[Perform] Gestures disabled, cleaning up video element',
      );
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
      console.log('[Perform] Keyboard event', { key: e.key });
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          console.log('[Perform] Next page key pressed');
          nextPage();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          console.log('[Perform] Prev page key pressed');
          prevPage();
          break;
        case 'Home':
          e.preventDefault();
          console.log('[Perform] Home key pressed');
          setCurrentPage(1);
          break;
        case 'End':
          e.preventDefault();
          console.log('[Perform] End key pressed');
          if (state.pdf) setCurrentPage(state.pdf.pageCount);
          break;
        case 'Escape':
          console.log('[Perform] Escape key pressed');
          window.location.href = '/library';
          break;
      }
    };

    console.log('[Perform] Setting up keyboard event listener');
    window.addEventListener('keydown', handleKeyboard);
    return () => {
      console.log('[Perform] Removing keyboard event listener');
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
          console.log('[Perform] Toggling gestures', {
            currentState: state.gestureEnabled,
          });
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
