import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages: repo name làm base path
  // Thay 'project-management' bằng tên repo GitHub của bạn
  base: mode === 'production' ? '/project-management/' : '/',
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
}))