import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves the preview at /[repo]/stylesheet/ (BASE, set by the Pages workflow)
  base: process.env.BASE || '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5175, strictPort: true },
})
