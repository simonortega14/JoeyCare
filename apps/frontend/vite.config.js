import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@itk-wasm/image-io']
  },
  worker: {
    format: 'es'
  }
})