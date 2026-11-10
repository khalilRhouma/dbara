import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Relative paths: the same build works at the site root and under a sub-path such as
  // https://<user>.github.io/dbara/, so the repo name is not hard-coded here.
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
})
