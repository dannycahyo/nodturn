import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useReducer,
} from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { useSettingsStore } from '~/stores/settings-store';
import { usePerformanceStore } from '~/stores/performance-store';

// Configure PDF.js worker - MUST be in same module as Document/Page
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PDFViewerProps {
  fileBlob: Blob;
}

interface ViewerState {
  fileUrl: string;
  containerWidth: number;
  error: string | null;
  isClient: boolean;
  numPages: number | null;
}

type ViewerAction =
  | { type: 'SET_FILE_URL'; payload: string }
  | { type: 'SET_CONTAINER_WIDTH'; payload: number }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_IS_CLIENT'; payload: boolean }
  | { type: 'SET_NUM_PAGES'; payload: number | null };

function viewerReducer(
  state: ViewerState,
  action: ViewerAction,
): ViewerState {
  switch (action.type) {
    case 'SET_FILE_URL':
      return { ...state, fileUrl: action.payload };
    case 'SET_CONTAINER_WIDTH':
      return { ...state, containerWidth: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_IS_CLIENT':
      return { ...state, isClient: action.payload };
    case 'SET_NUM_PAGES':
      return { ...state, numPages: action.payload };
    default:
      return state;
  }
}

export function PDFViewer({ fileBlob }: PDFViewerProps) {
  const [state, dispatch] = useReducer(viewerReducer, {
    fileUrl: '',
    containerWidth: 0,
    error: null,
    isClient: false,
    numPages: null,
  });

  const mountedRef = useRef(true);
  const blobUrlRef = useRef<string>('');
  const previousBlobRef = useRef<Blob | null>(null);

  const darkMode = useSettingsStore((s) => s.darkMode);
  const { currentPage, setTotalPages } = usePerformanceStore();

  // Ensure component only renders on client
  useEffect(() => {
    dispatch({ type: 'SET_IS_CLIENT', payload: true });
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Create a stable blob URL
  useEffect(() => {
    if (!state.isClient || !fileBlob) return;

    // Check if blob actually changed
    const blobChanged = previousBlobRef.current !== fileBlob;

    if (blobChanged) {
      // Reset state when blob changes
      dispatch({ type: 'SET_NUM_PAGES', payload: null });

      // Clean up previous blob URL if exists
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = '';
      }

      try {
        // Create new blob URL
        const url = URL.createObjectURL(fileBlob);
        blobUrlRef.current = url;
        previousBlobRef.current = fileBlob;
        dispatch({ type: 'SET_FILE_URL', payload: url });
        dispatch({ type: 'SET_ERROR', payload: null });
      } catch (err) {
        console.error('Failed to create blob URL:', err);
        if (mountedRef.current) {
          dispatch({
            type: 'SET_ERROR',
            payload: 'Failed to load PDF file',
          });
        }
      }
    }

    // Cleanup on unmount - revoke blob URL
    return () => {
      if (!mountedRef.current && blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = '';
        previousBlobRef.current = null;
      }
    };
  }, [fileBlob, state.isClient]);

  const onDocumentLoadSuccess = useCallback(
    (pdf: any) => {
      if (!mountedRef.current) return;

      // Simply track page count - let react-pdf handle the rest
      dispatch({ type: 'SET_NUM_PAGES', payload: pdf.numPages });
      setTotalPages(pdf.numPages);
      dispatch({ type: 'SET_ERROR', payload: null });
    },
    [setTotalPages],
  );

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);

    if (mountedRef.current) {
      let msg = 'Failed to load PDF. ';

      if (error.message.includes('worker')) {
        msg += 'Worker failed to load. Check internet connection.';
      } else if (error.message.includes('Invalid PDF')) {
        msg += 'PDF file corrupted.';
      } else {
        msg += 'Refresh and try again.';
      }

      dispatch({ type: 'SET_ERROR', payload: msg });
      dispatch({ type: 'SET_NUM_PAGES', payload: null });
    }
  }, []);

  // Use the blob URL directly
  const fileProp = useMemo(() => {
    if (!state.fileUrl) return null;

    // Pass URL string directly - PDF.js handles blob URLs well
    return state.fileUrl;
  }, [state.fileUrl]);

  // Memoize options prop to prevent unnecessary reloads
  const options = useMemo(
    () => ({
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/',
      wasmUrl: '/wasm/',
    }),
    [],
  );

  const measureContainer = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        const updateWidth = () => {
          dispatch({
            type: 'SET_CONTAINER_WIDTH',
            payload: node.offsetWidth,
          });
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () =>
          window.removeEventListener('resize', updateWidth);
      }
    },
    [],
  );

  if (!state.isClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">
          Initializing PDF viewer...
        </p>
      </div>
    );
  }

  if (!state.fileUrl || !fileProp) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading PDF...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-destructive mb-2">{state.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-primary underline mr-4"
          >
            Reload Page
          </button>
          <button
            onClick={() => (window.location.href = '/library')}
            className="text-primary underline"
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={measureContainer}
      className={`flex items-start justify-center min-h-screen p-4 ${
        darkMode ? 'invert hue-rotate-180' : ''
      }`}
      style={{ backgroundColor: darkMode ? '#000' : '#525659' }}
    >
      <Document
        key={state.fileUrl}
        file={fileProp}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        options={options}
        loading={
          <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">
              Loading document...
            </p>
          </div>
        }
      >
        <Page
          key={`page-${currentPage}`}
          pageNumber={currentPage}
          width={
            state.containerWidth > 0
              ? Math.min(state.containerWidth - 32, 1200)
              : undefined
          }
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={
            <div
              className="flex items-center justify-center"
              style={{ height: '800px' }}
            >
              <p className="text-muted-foreground">Loading page...</p>
            </div>
          }
          error={
            <div
              className="flex items-center justify-center"
              style={{ height: '800px' }}
            >
              <p className="text-destructive">
                Failed to load page. Please refresh.
              </p>
            </div>
          }
          onLoadError={(error) => {
            console.error('Page load error:', error);
            if (mountedRef.current) {
              dispatch({
                type: 'SET_ERROR',
                payload: 'Failed to load page content',
              });
            }
          }}
        />
      </Document>
    </div>
  );
}
