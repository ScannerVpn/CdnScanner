// Shared test utilities for scanner tests.
//
// Used by both native-scanner.test.ts (Tauri path) and client-scanner.test.ts
// (browser path) to build controllable mocks without duplicating boilerplate.

import { vi } from 'vitest'
import type { ScannerCallbacks } from '../sse-client'

/**
 * Build a ScannerCallbacks stub where every method is a vi.fn().
 * Tests assert on these directly: `cbs.onResult.mock.calls`, etc.
 */
export function createMockCallbacks(): ScannerCallbacks & {
  onSession: ReturnType<typeof vi.fn>
  onProgress: ReturnType<typeof vi.fn>
  onResult: ReturnType<typeof vi.fn>
  onDone: ReturnType<typeof vi.fn>
  onError: ReturnType<typeof vi.fn>
} {
  return {
    onSession: vi.fn(),
    onProgress: vi.fn(),
    onResult: vi.fn(),
    onDone: vi.fn(),
    onError: vi.fn(),
  }
}

export interface ControllableInvoke {
  /**
   * Drop-in replacement for `invoke` from `@tauri-apps/api/core`.
   *
   * - `start_session` / `cancel_session` / `end_session` resolve immediately.
   * - `check_ip` returns a pending promise. The test resolves it manually via
   *   `pendingResolvers.shift()(payload)`, or rejects via `pendingRejecters`.
   * - If `setAutoResolve(fn)` has been called, `check_ip` resolves immediately
   *   to whatever the function returns (used for the "natural completion"
   *   test that doesn't care about cancel timing).
   */
  mockInvoke: ReturnType<typeof vi.fn>
  pendingResolvers: Array<(value: unknown) => void>
  pendingRejecters: Array<(err: unknown) => void>
  setAutoResolve: (fn: ((args: { ip: string; port: number }) => unknown) | null) => void
}

/**
 * Build a controllable invoke mock for native-scanner tests.
 *
 * Tracks every `check_ip` call and exposes the resolve/reject functions so a
 * test can:
 *   1. Start a scan
 *   2. Wait for a `check_ip` call to be in flight
 *   3. Call `handle.cancel()`
 *   4. Resolve the pending invoke (simulating Rust returning AFTER cancel)
 *   5. Assert that the result was dropped (onResult not called)
 */
export function createControllableInvoke(): ControllableInvoke {
  const pendingResolvers: Array<(value: unknown) => void> = []
  const pendingRejecters: Array<(err: unknown) => void> = []
  let autoResolve: ((args: { ip: string; port: number }) => unknown) | null = null

  const mockInvoke = vi.fn().mockImplementation(async (cmd: string, args?: unknown) => {
    if (cmd === 'start_session' || cmd === 'cancel_session' || cmd === 'end_session') {
      return Promise.resolve()
    }
    if (cmd === 'check_ip') {
      if (autoResolve) {
        return Promise.resolve(autoResolve(args as { ip: string; port: number }))
      }
      return new Promise((resolve, reject) => {
        pendingResolvers.push(resolve)
        pendingRejecters.push(reject)
      })
    }
    return Promise.resolve()
  })

  return {
    mockInvoke,
    pendingResolvers,
    pendingRejecters,
    setAutoResolve: (fn) => {
      autoResolve = fn
    },
  }
}
