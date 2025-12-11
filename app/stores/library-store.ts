import { create } from 'zustand';
import { get as idbGet, set as idbSet, del, keys } from 'idb-keyval';

export interface PDFMetadata {
  id: string;
  title: string;
  pageCount: number;
  addedAt: number; // timestamp
  blob: Blob;
}

interface LibraryState {
  pdfs: PDFMetadata[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadLibrary: () => Promise<void>;
  addPDF: (
    file: File,
    metadata: Omit<PDFMetadata, 'blob' | 'addedAt'>
  ) => Promise<void>;
  removePDF: (id: string) => Promise<void>;
  getPDF: (id: string) => Promise<PDFMetadata | null>;
  clearError: () => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  pdfs: [],
  isLoading: false,
  error: null,

  loadLibrary: async () => {
    set({ isLoading: true, error: null });
    try {
      const allKeys = await keys();
      const pdfKeys = allKeys.filter(
        (key) => typeof key === 'string' && key.startsWith('pdf:')
      );

      const pdfs: PDFMetadata[] = [];
      for (const key of pdfKeys) {
        const data = await idbGet(key as IDBValidKey);
        if (data) {
          pdfs.push(data as unknown as PDFMetadata);
        }
      }

      // Sort by addedAt desc
      pdfs.sort((a, b) => b.addedAt - a.addedAt);

      set({ pdfs, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to load library', isLoading: false });
      console.error('Load library error:', error);
    }
  },

  addPDF: async (file, metadata) => {
    set({ isLoading: true, error: null });
    try {
      const blob = new Blob([await file.arrayBuffer()], {
        type: 'application/pdf'
      });

      const pdfData: PDFMetadata = {
        ...metadata,
        blob,
        addedAt: Date.now()
      };

      await idbSet(`pdf:${pdfData.id}`, pdfData);

      const { pdfs } = get();
      set({
        pdfs: [pdfData, ...pdfs],
        isLoading: false
      });
    } catch (error) {
      console.error('Add PDF error:', error);
      set({ error: 'Failed to add PDF', isLoading: false });
      throw error;
    }
  },

  removePDF: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await del(`pdf:${id}`);

      const { pdfs } = get();
      set({
        pdfs: pdfs.filter((pdf) => pdf.id !== id),
        isLoading: false
      });
    } catch (error) {
      set({ error: 'Failed to remove PDF', isLoading: false });
      console.error('Remove PDF error:', error);
    }
  },

  getPDF: async (id) => {
    try {
      const data = await idbGet(`pdf:${id}` as IDBValidKey);
      return (data as unknown as PDFMetadata) || null;
    } catch (error) {
      console.error('Get PDF error:', error);
      return null;
    }
  },

  clearError: () => set({ error: null })
}));
