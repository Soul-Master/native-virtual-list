import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2024',
    outDir: 'lib',
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index'
    },
  }
});
