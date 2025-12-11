export interface ExtractedMetadata {
  title: string;
  pageCount: number;
}

export async function extractPDFMetadata(
  file: File
): Promise<ExtractedMetadata> {
  const pdfjs = await import('pdfjs-dist');
  
  // Configure worker if not already set
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let title = file.name.replace(/\.pdf$/i, '');

  try {
    const metadata = await pdf.getMetadata();
    const info = metadata.info as Record<string, unknown>;
    if (info?.Title && typeof info.Title === 'string' && info.Title.trim()) {
      title = info.Title.trim();
    }
  } catch (error) {
    // Fallback to filename if metadata extraction fails
  }

  return {
    title,
    pageCount: pdf.numPages
  };
}

export function generatePDFId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
