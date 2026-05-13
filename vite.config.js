import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// On GitHub Pages the site is served from /NotVerify/. In local dev (and
// any host that serves from /) the base remains '/'.
export default defineConfig({
  base: process.env.GITHUB_PAGES === '1' ? '/NotVerify/' : '/',
  plugins: [react(), tailwindcss()],
})
