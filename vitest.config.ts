import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // jsdom: needed for fetch, AbortController, crypto.randomUUID, and
    // (optionally) WebSocket — even though our cancellation tests pass
    // sampleConfigText=undefined to avoid the WebSocket code path.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    include: ['src/**/__tests__/**/*.test.ts'],
    // Print full diffs when assertions fail (helps spot race conditions)
    reporters: ['default'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
