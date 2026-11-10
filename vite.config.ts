import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // './' keeps asset paths relative; step 7 sets the real GitHub Pages base.
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
})
