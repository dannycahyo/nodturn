import { useReducer } from 'react';
import { Upload } from 'lucide-react';
import { useLibraryStore } from '~/stores/library-store';
import {
  extractPDFMetadata,
  generatePDFId,
} from '~/utils/pdf-metadata';
import { Alert, AlertDescription } from '~/components/ui/alert';

interface UploadState {
  isDragging: boolean;
  isUploading: boolean;
  error: string | null;
}

type UploadAction =
  | { type: 'SET_DRAGGING'; payload: boolean }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

function uploadReducer(
  state: UploadState,
  action: UploadAction,
): UploadState {
  switch (action.type) {
    case 'SET_DRAGGING':
      return { ...state, isDragging: action.payload };
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

export function PDFUpload() {
  const [state, dispatch] = useReducer(uploadReducer, {
    isDragging: false,
    isUploading: false,
    error: null,
  });

  const addPDF = useLibraryStore((s) => s.addPDF);

  const handleFile = async (file: File) => {
    if (!file.type.includes('pdf')) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Please upload a PDF file',
      });
      return;
    }

    dispatch({ type: 'SET_UPLOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const metadata = await extractPDFMetadata(file);
      const pdfData = {
        id: generatePDFId(),
        title: metadata.title,
        pageCount: metadata.pageCount,
      };

      await addPDF(file, pdfData);
    } catch (error) {
      console.error('Upload error:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_DRAGGING', payload: false });

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_DRAGGING', payload: true });
  };

  const handleDragLeave = () => {
    dispatch({ type: 'SET_DRAGGING', payload: false });
  };

  const handleFileInput = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          state.isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-primary/50'
        }`}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          className="hidden"
          id="pdf-input"
          disabled={state.isUploading}
        />
        <label htmlFor="pdf-input" className="cursor-pointer">
          <Upload
            className={`mx-auto h-12 w-12 mb-4 ${state.isUploading ? 'animate-pulse' : ''}`}
          />
          <p className="text-lg font-medium mb-2">
            {state.isUploading
              ? 'Processing...'
              : 'Drop PDF or click to upload'}
          </p>
          <p className="text-sm text-muted-foreground">
            Add sheet music to your library
          </p>
        </label>
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
