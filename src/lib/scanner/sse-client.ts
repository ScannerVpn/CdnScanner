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

export async function startScan(
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
  } catch {
    throw new Error('سرور اسکنر در دسترس نیست — از نسخه وب استفاده کن (npm run dev)')
  }

  if (!resp.ok || !resp.body) {
    let msg = 'request failed'
    try {
      const j = await resp.json()
      msg = j.error || msg
    } catch {}
    throw new Error(msg)
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
  await fetch('/api/scanner/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  })
}

export async function fetchPlatforms(): Promise<Platform[]> {
  try {
    const r = await fetch('/api/scanner/platforms')
    if (!r.ok) throw new Error('API not available')
    const j = await r.json()
    return j.platforms as Platform[]
  } catch {
    // Static build (Tauri) has no API — import platforms directly
    const { PLATFORMS } = await import('./platforms')
    return PLATFORMS
  }
}
