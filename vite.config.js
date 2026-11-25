import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 7725, strictPort: true, open: true },
  preview: { port: 7725, strictPort: true },
})
