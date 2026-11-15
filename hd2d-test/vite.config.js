import { resolve } from 'node:path';
export default { base: './', server: { fs: { strict: false } }, build: { outDir: 'dist', chunkSizeWarningLimit: 4000, rollupOptions: { input: { main: resolve('index.html'), town: resolve('town.html') } } } };
