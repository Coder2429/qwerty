import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Для GitHub Pages: если есть переменная BASE_PATH, используем её, иначе '/'
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})

