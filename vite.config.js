import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['firebase/app', 'firebase/auth', 'firebase/firestore']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 3000,
    open: true,
    strictPort: true,
    cors: true
  },
  preview: {
    host: '0.0.0.0', // Allow external connections for preview
    port: 3000,
    strictPort: true,
    cors: true
  }
})
