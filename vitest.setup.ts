// Vitest setup — runs before every test file.
// Ensures crypto.randomUUID is available (jsdom 29 has it natively, but be safe)
// and provides a minimal WebSocket shim so client-scanner.ts compiles in any env.

import { webcrypto } from 'node:crypto'

// jsdom 29 has crypto.randomUUID, but some CI runners strip globals.
// Use Node's webcrypto as a fallback for the test env only.
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.randomUUID) {
  // @ts-expect-error - assigning webcrypto to the global is intentional in tests
  globalThis.crypto = webcrypto
}

// client-scanner.ts references `new WebSocket(...)` inside testConfigWS. That code
// path only runs when sampleConfigText is provided. Our cancellation tests pass
// undefined, so the shim below is defensive — it satisfies the TS compiler if a
// future test happens to touch the WS code path.
class TestWebSocket {
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  readyState = 0
  constructor() {
    // Default: error out so testConfigWS returns ok=false. Tests that want a
    // successful WS can replace the global with a custom implementation.
    setTimeout(() => this.onerror?.(), 0)
  }
  close() {
    this.readyState = 3
    this.onclose?.()
  }
  send() {}
}
// @ts-expect-error - test-only global shim
globalThis.WebSocket = TestWebSocket
