import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
    mimeTypes: {
      'js': 'application/javascript',
      'jsx': 'application/javascript',
      'ts': 'application/javascript',
      'tsx': 'application/javascript',
    },
    watch: {
      usePolling: true
    }
  },
  optimizeDeps: {
    exclude: ['js-big-decimal']
  }
})
