import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // For Vercel, deploy at root. BASE_URL comes from Vite env if needed
  base: '/',
})
