import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom', 'three'] },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'three', '@react-three/fiber', '@react-three/drei', '@react-three/rapier', '@react-three/postprocessing', 'postprocessing', 'framer-motion', 'zustand', 'zustand/middleware', 'troika-three-text'],
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          physics: ['@react-three/rapier'],
          post: ['@react-three/postprocessing', 'postprocessing'],
        },
      },
    },
  },
});
