import path from 'node:path';
import { createRequire } from 'node:module';

import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, normalizePath } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const require = createRequire(import.meta.url);

// Get paths to pdfjs-dist static assets
const pdfjsDistPath = path.dirname(
  require.resolve('pdfjs-dist/package.json'),
);
const cMapsDir = normalizePath(path.join(pdfjsDistPath, 'cmaps'));
const standardFontsDir = normalizePath(
  path.join(pdfjsDistPath, 'standard_fonts'),
);
const wasmDir = normalizePath(path.join(pdfjsDistPath, 'wasm'));

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    viteStaticCopy({
      targets: [
        { src: cMapsDir, dest: '' },
        { src: standardFontsDir, dest: '' },
        { src: wasmDir, dest: '' },
      ],
    }),
  ],
  ssr: {
    // Externalize react-pdf and pdfjs-dist to prevent SSR issues
    noExternal: [],
    external: ['react-pdf', 'pdfjs-dist'],
  },
});
