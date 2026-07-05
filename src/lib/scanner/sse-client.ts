'use client'

import { Platform, ScanConfig, ScanProgress, ScanResult } from './types'

export interface ScannerCallbacks {
  onSession?: (sessionId: string) => void
  onProgress?: (p: ScanProgress) => void
  onResult?: (r: ScanResult) => void
  onDone?: (data: { ok: boolean; alive: number; scanned: number; total: number; configOk?: number }) => void
  onError?: (err: { message: string }) => void
}

export interface ScanHandle {
  cancel: () => Promise<void>
}

// Cached result of backend detection
let serverAvailable: boolean | null = null
let serverCheckPromise: Promise<boolean> | null = null

// Probe whether the server-side scanner API is reachable.
// On Tauri static builds, /api routes return 404 from webview, so this returns false.
export async function hasServerScanner(): Promise<boolean> {
  if (serverAvailable !== null) return serverAvailable
  if (serverCheckPromise) return serverCheckPromise

  serverCheckPromise = (async () => {
    try {
      const r = await fetch('/api/scanner/platforms', {
        method: 'HEAD',
        signal: AbortSignal.timeout(2500),
        cache: 'no-store',
      })
      // 200 = healthy API. 405 = endpoint exists but wrong method (still a backend).
      // 404 from a static deploy means no backend.
      serverAvailable = r.ok || r.status === 405
    } catch {
      serverAvailable = false
    }
    return serverAvailable
  })()

  try {
    return await serverCheckPromise
  } finally {
    serverCheckPromise = null
  }
}

export async function startScan(
  platformId: string,
  config: Partial<ScanConfig>,
  customIpList: string[] | undefined,
  sampleConfigText: string | undefined,
  cb: ScannerCallbacks,
): Promise<ScanHandle> {
  const useServer = await hasServerScanner()

  if (useServer) {
    try {
      return await startServerScan(platformId, config, customIpList, sampleConfigText, cb)
    } catch (e: any) {
      // If SSE stream fails after we thought backend was available, fall back once
      console.warn('[scanner] server scan failed, falling back to client:', e?.message)
      serverAvailable = false
    }
  }

  // Client-side fallback (works in Tauri static build + any browser)
  const { startClientScan } = await import('./client-scanner')
  return startClientScan(platformId, config, customIpList, sampleConfigText, cb)
}

async function startServerScan(
  platformId: string,
  config: Partial<ScanConfig>,
  customIpList: string[] | undefined,
  sampleConfigText: string | undefined,
  cb: ScannerCallbacks,
): Promise<ScanHandle> {
  const controller = new AbortController()

  let resp: Response
  try {
    resp = await fetch('/api/scanner/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platformId, config, customIpList, sampleConfigText }),
      signal: controller.signal,
    })
  } catch (e: any) {
    throw new Error(`سرور اسکنر در دسترس نیست: ${e?.message || e}`)
  }

  if (!resp.ok || !resp.body) {
    let msg = 'request failed'
    try {
      const j = await resp.json()
      msg = j.error || msg
    } catch {}
    throw new Error(msg)
  }

  // Validate that this is actually an SSE stream (not an HTML 404 page from static export)
  const ct = resp.headers.get('content-type') || ''
  if (!ct.includes('text/event-stream')) {
    throw new Error('پاسخ سرور یک stream نیست — احتمالاً static build بدون backend')
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const pump = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          let event = 'message'
          let data = ''
          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim()
            else if (line.startsWith('data:')) data += line.slice(5).trim()
          }
          try {
            const parsed = JSON.parse(data)
            if (event === 'session') cb.onSession?.(parsed.sessionId)
            else if (event === 'progress') cb.onProgress?.(parsed)
            else if (event === 'result') cb.onResult?.(parsed)
            else if (event === 'done') cb.onDone?.(parsed)
            else if (event === 'error') cb.onError?.(parsed)
          } catch {
            // ignore malformed line
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        cb.onError?.({ message: e?.message || 'stream error' })
      }
    }
  }

  pump()

  return {
    cancel: async () => {
      controller.abort()
      try { await reader.cancel() } catch {}
    },
  }
}

export async function stopScan(sessionId: string): Promise<void> {
  try {
    await fetch('/api/scanner/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
  } catch {
    // Stop endpoint may not exist in static build — that's fine
  }
}

export async function fetchPlatforms(): Promise<Platform[]> {
  try {
    const r = await fetch('/api/scanner/platforms')
    if (!r.ok) throw new Error('API not available')
    const ct = r.headers.get('content-type') || ''
    if (!ct.includes('application/json')) throw new Error('API not JSON')
    const j = await r.json()
    if (!j.platforms) throw new Error('Invalid response')
    return j.platforms as Platform[]
  } catch {
    // Static build (Tauri) or non-JSON response — import platforms directly
    const { PLATFORMS } = await import('./platforms')
    return PLATFORMS
  }
}
