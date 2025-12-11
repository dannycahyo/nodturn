import { useEffect } from 'react';
import { Music } from 'lucide-react';
import { useLibraryStore } from '~/stores/library-store';
import { PDFUpload } from '~/components/pdf-upload';
import { PDFCard } from '~/components/pdf-card';
import { Alert, AlertDescription } from '~/components/ui/alert';

export default function Library() {
  const { pdfs, isLoading, error, loadLibrary, removePDF, clearError } =
    useLibraryStore();

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Music className="h-8 w-8" />
            <h1 className="text-4xl font-bold">NodTurn</h1>
          </div>
          <p className="text-muted-foreground">Your sheet music library</p>
        </header>

        <div className="mb-8">
          <PDFUpload />
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              {error}{' '}
              <button
                onClick={clearError}
                className="underline"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading && pdfs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading library...
          </div>
        ) : pdfs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No sheet music yet</p>
            <p className="text-sm mt-2">Upload a PDF to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pdfs.map((pdf) => (
              <PDFCard key={pdf.id} pdf={pdf} onDelete={removePDF} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
