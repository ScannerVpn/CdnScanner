// Unit tests for the cancellation flow in client-scanner.ts.
//
// client-scanner is the browser/Tauri-static-build fallback. It uses native
// fetch (not Tauri invoke) so we mock globalThis.fetch with vi.stubGlobal.
//
// Cancellation design notes:
// - The cancel function sets the local `cancelled` flag, but the in-flight
//   fetch is NOT aborted. Instead, the worker checks `if (cancelled) break`
//   after the await to drop the result.
// - handle.cancel() is a synchronous-style flag flip wrapped in a Promise.
//   It's safe to call multiple times (idempotent).
//
// Note: We can't directly test "drop in-flight result" via handle.cancel()
// in client-scanner because the handle is only returned AFTER all workers
// complete. The post-cancel drop is implicitly verified by the
// "cancelled" flag check in the worker loop. The corresponding test for
// the native path (src/lib/scanner/__tests__/native-scanner.test.ts) does
// cover this via the Rust error path.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startClientScan } from '../client-scanner'
import { createMockCallbacks } from './test-utils'

// Hoisted mock so per-test reconfiguration is possible.
const platformsMock = vi.hoisted(() => ({
  getPlatformById: vi.fn(),
  cidrToIps: vi.fn(),
}))

vi.mock('../platforms', () => platformsMock)

// We deliberately do NOT mock @tauri-apps/api/core. client-scanner should
// never call invoke — it's the browser path. If it ever does, the test
// fails because invoke is undefined in jsdom by default.

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  // Default: every probe succeeds immediately
  fetchMock.mockResolvedValue({ ok: true, status: 200 })
  vi.stubGlobal('fetch', fetchMock)
  platformsMock.getPlatformById.mockReturnValue({
    id: 'test',
    name: 'Test Platform',
    ranges: [],
  })
  platformsMock.cidrToIps.mockReturnValue([])
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Client Scanner — cancellation flow', () => {
  // -------------------------------------------------------------------------
  // Probe mechanics
  // -------------------------------------------------------------------------

  it('uses fetch (not Tauri invoke) for probes', async () => {
    const cbs = createMockCallbacks()
    await startClientScan(
      'test',
      { ports: [80], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1'],
      undefined,
      cbs,
    )

    expect(fetchMock).toHaveBeenCalled()
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('http://1.1.1.1')
  })

  it('completes a successful scan and reports onDone with ok:true', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })

    const cbs = createMockCallbacks()
    await startClientScan(
      'test',
      { ports: [80], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1', '2.2.2.2'],
      undefined,
      cbs,
    )

    expect(cbs.onDone).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true }),
    )
    expect(cbs.onResult).toHaveBeenCalledTimes(2)
  })

  it('does not call onResult when fetch throws a generic network error', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    const cbs = createMockCallbacks()
    await startClientScan(
      'test',
      { ports: [80], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1'],
      undefined,
      cbs,
    )

    expect(cbs.onResult).not.toHaveBeenCalled()
    // Scan still completes successfully (just no alive IPs)
    expect(cbs.onDone).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true }),
    )
  })

  it('treats TLS / cert errors on port 443 as "alive" (CDN responded with a cert)', async () => {
    // Port 443 strategy:
    //   1. probe() first tries port 80 via probeHttp80() — we make that fail
    //   2. then falls through to port 443 via probeHttpPort() — that throws a
    //      TLS error which probeHttpPort() translates to ok:true
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith('http://1.1.1.1/')) {
        // Port 80 attempt — network unreachable
        throw new Error('network unreachable')
      }
      // Port 443 attempt — TLS error
      throw new Error('SSL_ERROR_BAD_CERT_DOMAIN')
    })

    const cbs = createMockCallbacks()
    await startClientScan(
      'test',
      { ports: [443], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1'],
      undefined,
      cbs,
    )

    // 1.1.1.1 was marked alive even though the only successful signal was a TLS error
    expect(cbs.onResult).toHaveBeenCalledTimes(1)
    expect(cbs.onResult).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '1.1.1.1', alive: true }),
    )
    expect(cbs.onDone).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, alive: 1 }),
    )
  })

  // -------------------------------------------------------------------------
  // handle.cancel() behaviour
  // -------------------------------------------------------------------------

  it('handle.cancel() returns a Promise and is idempotent', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })

    const cbs = createMockCallbacks()
    const handle = await startClientScan(
      'test',
      { ports: [80], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1'],
      undefined,
      cbs,
    )

    const p1 = handle.cancel()
    expect(p1).toBeInstanceOf(Promise)
    await p1

    const p2 = handle.cancel()
    await p2

    expect(cbs.onDone).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true }),
    )
  })

  it('handle.cancel() post-completion does not dispatch any new probes', async () => {
    // After natural completion, handle.cancel() is a no-op flag-flip — but
    // importantly it must NOT trigger any new fetches. This is a regression
    // guard against a future change that might re-enter the worker loop.
    fetchMock.mockResolvedValue({ ok: true, status: 200 })

    const cbs = createMockCallbacks()
    const handle = await startClientScan(
      'test',
      { ports: [80], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1'],
      undefined,
      cbs,
    )

    // Sanity: scan completed with onDone
    expect(cbs.onDone).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, alive: 1 }),
    )

    // After cancel, no further work is dispatched
    fetchMock.mockClear()
    await handle.cancel()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Progress / session callbacks
  // -------------------------------------------------------------------------

  it('emits onSession and an initial onProgress before any probes', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })

    const cbs = createMockCallbacks()
    await startClientScan(
      'test',
      { ports: [80], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1'],
      undefined,
      cbs,
    )

    expect(cbs.onSession).toHaveBeenCalledWith(expect.any(String))
    const firstProgress = cbs.onProgress.mock.calls[0]?.[0]
    expect(firstProgress).toMatchObject({
      total: 1,
      scanned: 0,
      status: 'scanning',
    })
  })

  it('emits final onProgress with status:"completed" on natural completion', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })

    const cbs = createMockCallbacks()
    await startClientScan(
      'test',
      { ports: [80], concurrency: 1, timeoutMs: 1000 },
      ['1.1.1.1'],
      undefined,
      cbs,
    )

    const lastProgress =
      cbs.onProgress.mock.calls[cbs.onProgress.mock.calls.length - 1]?.[0]
    expect(lastProgress).toMatchObject({ status: 'completed' })
  })
})
