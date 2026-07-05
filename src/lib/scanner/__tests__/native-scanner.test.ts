// Unit tests for the cancellation flow in native-scanner.ts.
//
// These tests mock @tauri-apps/api/core (the Tauri IPC bridge) so the scanner
// runs in pure Node + jsdom without needing a real Rust backend.
//
// Test design notes:
// - `pendingResolvers` / `pendingRejecters` let us control when each in-flight
//   `check_ip` call resolves or rejects, which is the key to testing the
//   cancellation race (in-flight probe vs. user clicking Stop).
// - `setAutoResolve` is used for "happy path" tests that don't care about
//   timing — every check_ip returns immediately so the scan finishes quickly
//   and the handle becomes available for testing handle.cancel() itself.
// - For mid-flight cancel tests we use a **fire-and-forget** pattern: the
//   startNativeScan promise is NOT awaited directly (the scanner awaits
//   Promise.all(workers) before returning the handle, so it would block
//   forever when workers are stuck in `await invoke`). Instead we wait for
//   onDone via vi.waitFor, which fires when the cancellation propagates and
//   the workers exit.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startNativeScan } from '../native-scanner'
import {
  createControllableInvoke,
  createMockCallbacks,
} from './test-utils'

// Hoisted mock so individual tests can reconfigure the return value.
const platformsMock = vi.hoisted(() => ({
  getPlatformById: vi.fn(),
  cidrToIps: vi.fn(),
}))

vi.mock('../platforms', () => platformsMock)

const { mockInvoke, pendingResolvers, pendingRejecters, setAutoResolve } =
  createControllableInvoke()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}))

describe('Native Scanner — cancellation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pendingResolvers.length = 0
    pendingRejecters.length = 0
    setAutoResolve(null)
    platformsMock.getPlatformById.mockReturnValue({
      id: 'test',
      name: 'Test Platform',
      ranges: [],
    })
    platformsMock.cidrToIps.mockReturnValue([])
  })

  // -------------------------------------------------------------------------
  // Session lifecycle
  // -------------------------------------------------------------------------

  it('calls start_session before the first check_ip', async () => {
    setAutoResolve(() => ({ ok: false, latencyMs: 0, tcpOk: false }))

    const cbs = createMockCallbacks()
    await startNativeScan(
      'test',
      { ports: [443], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1'],
      undefined,
      cbs,
    )

    const callOrder = mockInvoke.mock.calls.map(([cmd]) => cmd)
    const startIdx = callOrder.indexOf('start_session')
    const checkIdx = callOrder.indexOf('check_ip')

    expect(startIdx).toBeGreaterThanOrEqual(0)
    expect(checkIdx).toBeGreaterThanOrEqual(0)
    expect(startIdx).toBeLessThan(checkIdx)
  })

  it('calls end_session naturally on completion when NOT cancelled', async () => {
    setAutoResolve(() => ({ ok: false, latencyMs: 0, tcpOk: false }))

    const cbs = createMockCallbacks()
    await startNativeScan(
      'test',
      { ports: [443], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1'],
      undefined,
      cbs,
    )

    expect(cbs.onDone).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true }),
    )
    expect(mockInvoke).toHaveBeenCalledWith(
      'end_session',
      expect.objectContaining({ sessionId: expect.any(String) }),
    )
    expect(mockInvoke).not.toHaveBeenCalledWith(
      'cancel_session',
      expect.any(Object),
    )
  })

  it('reports onError when getPlatformById returns undefined', async () => {
    platformsMock.getPlatformById.mockReturnValue(undefined)

    const cbs = createMockCallbacks()
    const handle = await startNativeScan(
      'unknown-platform',
      { ports: [443], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1'],
      undefined,
      cbs,
    )

    expect(cbs.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Unknown platform'),
      }),
    )
    // No probes were issued
    expect(mockInvoke).not.toHaveBeenCalledWith(
      'start_session',
      expect.any(Object),
    )
    // The returned handle's cancel is a safe no-op
    await expect(handle.cancel()).resolves.toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // Post-completion handle.cancel() behaviour
  // -------------------------------------------------------------------------

  it('handle.cancel() calls cancel_session + end_session (post-completion cleanup)', async () => {
    setAutoResolve(() => ({ ok: false, latencyMs: 0, tcpOk: false }))

    const cbs = createMockCallbacks()
    const handle = await startNativeScan(
      'test',
      { ports: [443], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1'],
      undefined,
      cbs,
    )

    mockInvoke.mockClear()
    await handle.cancel()

    expect(mockInvoke).toHaveBeenCalledWith(
      'cancel_session',
      expect.objectContaining({ sessionId: expect.any(String) }),
    )
    expect(mockInvoke).toHaveBeenCalledWith(
      'end_session',
      expect.objectContaining({ sessionId: expect.any(String) }),
    )
  })

  it('handle.cancel() is idempotent — second call does not re-fire cancel_session', async () => {
    setAutoResolve(() => ({ ok: false, latencyMs: 0, tcpOk: false }))

    const cbs = createMockCallbacks()
    const handle = await startNativeScan(
      'test',
      { ports: [443], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1'],
      undefined,
      cbs,
    )

    mockInvoke.mockClear()
    await handle.cancel()
    await handle.cancel()

    const cancelCalls = mockInvoke.mock.calls.filter(
      ([cmd]) => cmd === 'cancel_session',
    )
    expect(cancelCalls.length).toBe(1)
  })

  // -------------------------------------------------------------------------
  // Mid-flight cancel: verify "workers don't shift new IPs" and "post-cancel
  // results are dropped". These use the Rust-error path because the
  // ScanHandle is only returned AFTER all workers complete, so we cannot
  // invoke handle.cancel() mid-scan from outside the scanner.
  //
  // The pattern:
  //   1. Call startNativeScan WITHOUT await (fire-and-forget — the scanner
  //      awaits Promise.all(workers) internally so awaiting would block
  //      forever on a stuck invoke).
  //   2. vi.waitFor for the expected number of pendingResolvers — the
  //      workers have all called invoke and are now blocked.
  //   3. Trigger the cancel (reject one invoke with "cancelled" — this
  //      simulates the Rust side's tokio::select! cancel branch).
  //   4. Resolve any remaining invokes with positive results.
  //   5. vi.waitFor for onDone (fires when the workers exit and the
  //      scanner's await Promise.all resolves).
  //   6. Assert post-cancel state.
  // -------------------------------------------------------------------------

  it('exits workers and does NOT drain the queue when Rust throws /cancel/i', async () => {
    const cbs = createMockCallbacks()
    // Fire-and-forget: do NOT await — scanner awaits workers internally.
    const pending = startNativeScan(
      'test',
      { ports: [443], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1', '2.2.2.2', '3.3.3.3'],
      undefined,
      cbs,
    )

    // Wait for the single in-flight check_ip call (concurrency=1)
    await vi.waitFor(() => expect(pendingResolvers.length).toBe(1))

    // Simulate the Rust side's tokio::select! cancel branch — the in-flight
    // probe rejects with a "cancelled" error.
    const rejecter = pendingRejecters.shift()
    expect(rejecter).toBeTypeOf('function')
    rejecter!(new Error('operation cancelled by user'))

    // Wait for the scanner to finish (workers exit → onDone fires)
    await vi.waitFor(() => expect(cbs.onDone).toHaveBeenCalled())

    // No alive result was reported (the rejected probe returned null)
    expect(cbs.onResult).not.toHaveBeenCalled()
    // Scanner reported failure due to cancellation
    expect(cbs.onDone).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false }),
    )
    // Queue was NOT drained: only 1 of 3 IPs was probed before the worker exited
    const checkIpCalls = mockInvoke.mock.calls.filter(
      ([cmd]) => cmd === 'check_ip',
    )
    expect(checkIpCalls.length).toBe(1)

    // The scanner promise must have resolved (no leaked hanging promise)
    await expect(pending).resolves.toBeDefined()
  })

  it('drops positive results that resolve AFTER the cancellation flag is set', async () => {
    // 3 workers, 3 IPs — all 3 check_ip calls in flight at the same time.
    // Note: we don't rely on which worker picked up which IP — the JS event
    // loop usually processes them in order, but that's an implementation
    // detail. Instead, we just resolve ALL pending resolvers with positive
    // results (the rejected one is a no-op) and assert that NO positive
    // result reached onResult. This is a stronger and more robust check.
    const cbs = createMockCallbacks()
    const pending = startNativeScan(
      'test',
      { ports: [443], concurrency: 3, timeoutMs: 1000 },
      ['1.1.1.1', '2.2.2.2', '3.3.3.3'],
      undefined,
      cbs,
    )

    // Wait for all 3 in-flight check_ip calls
    await vi.waitFor(() => expect(pendingResolvers.length).toBe(3))
    expect(pendingRejecters.length).toBe(3)

    // Step 1: reject the first invoke (whichever worker it was) with
    // "cancelled" → sets the local cancelled flag.
    const rejecter = pendingRejecters.shift()
    expect(rejecter).toBeTypeOf('function')
    rejecter!(new Error('cancelled by user'))
    // Yield to let the catch handler run and set the local `cancelled` flag
    await new Promise((r) => setTimeout(r, 0))

    // Step 2: resolve ALL remaining invokes with positive (alive) results.
    // (The first resolve fn was for the rejected promise — it's a no-op.)
    // These should be dropped because cancelled=true.
    pendingResolvers.forEach((resolve) =>
      resolve({
        ok: true,
        latencyMs: 10,
        tcpOk: true,
        tlsOk: true,
        httpOk: true,
      }),
    )

    await vi.waitFor(() => expect(cbs.onDone).toHaveBeenCalled())

    // The post-cancel positive results MUST be dropped — onResult never fires.
    expect(cbs.onResult).not.toHaveBeenCalled()
    expect(cbs.onDone).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false }),
    )
    // No hanging promise
    await expect(pending).resolves.toBeDefined()
  })

  it('reports onDone(ok:true) when every probe resolves successfully (control case)', async () => {
    setAutoResolve(() => ({
      ok: true,
      latencyMs: 10,
      tcpOk: true,
      tlsOk: true,
      httpOk: true,
    }))

    const cbs = createMockCallbacks()
    await startNativeScan(
      'test',
      { ports: [443], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1', '2.2.2.2'],
      undefined,
      cbs,
    )

    // Both probes produced alive results
    expect(cbs.onResult).toHaveBeenCalledTimes(2)
    expect(cbs.onDone).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, alive: 2, scanned: 2, total: 2 }),
    )
  })
})
