// Native scanner bridge — calls Rust check_ip commands via Tauri IPC.
//
// Used on Android (and as a desktop-Tauri fallback) where the webview's
// TLS hostname validation blocks direct-IP HTTPS probes. The Rust side
// (src-tauri/src/scanner.rs) bypasses that limitation natively.
//
// Mirrors the structure of client-scanner.ts so the routing layer in
// sse-client.ts can swap between them transparently.

import type { ScanConfig, ScanResult, ScanProgress, ParsedConfig } from './types'
import { getPlatformById } from './platforms'
import { parseShareLink } from './sample-config'
import type { ScannerCallbacks, ScanHandle } from './sse-client'

// We import lazily inside startNativeScan() so this module is only loaded
// in Tauri contexts (browsers fall through to client-scanner.ts instead).

interface NativeCheckResult {
  ok: boolean
  latencyMs: number
  tlsOk?: boolean
  httpOk?: boolean
  tcpOk: boolean
  error?: string
}

export async function startNativeScan(
  platformId: string,
  config: Partial<ScanConfig>,
  customIpList: string[] | undefined,
  sampleConfigText: string | undefined,
  cb: ScannerCallbacks,
): Promise<ScanHandle> {
  // Dynamic imports keep this file's weight off the web bundle.
  const { invoke } = await import('@tauri-apps/api/core')
  const { cidrToIps } = await import('./platforms')

  const platform = getPlatformById(platformId)
  if (!platform) {
    cb.onError?.({ message: `Unknown platform: ${platformId}` })
    return { cancel: async () => {} }
  }

  let sampleConfig: ParsedConfig | undefined
  if (sampleConfigText && sampleConfigText.trim()) {
    const p = parseShareLink(sampleConfigText)
    if (!p.ok || !p.config) {
      cb.onError?.({ message: `کانفیگ نامعتبر: ${p.error}` })
      return { cancel: async () => {} }
    }
    sampleConfig = p.config
  }

  const fullConfig: ScanConfig = {
    platformId,
    ports: config.ports && config.ports.length ? config.ports : [443],
    timeoutMs: config.timeoutMs ?? 3000,
    // Android Rust → many concurrent tokio tasks; cap at 200 to avoid
    // exhausting file descriptors (OS typically allows ~1024).
    concurrency: Math.min(config.concurrency ?? 100, 200),
    maxIpsPerRange: config.maxIpsPerRange ?? 32,
    checkTls: config.checkTls ?? true,
    checkHttp: config.checkHttp ?? true,
    sniHost: config.sniHost ?? 'speedtest.net',
    maxLatencyMs: config.maxLatencyMs ?? 1500,
    customIpList,
    selectedRanges: config.selectedRanges,
    realPing: false, // ICMP needs root — TCP latency is the signal here
    scanAllIps: config.scanAllIps ?? false,
    sampleConfig,
  }

  // Build IP list
  let ipList: string[] = []
  if (fullConfig.customIpList && fullConfig.customIpList.length > 0) {
    ipList = fullConfig.customIpList
  } else {
    const selectedSet = fullConfig.selectedRanges && fullConfig.selectedRanges.length > 0
      ? new Set(fullConfig.selectedRanges)
      : null
    const perRange = fullConfig.scanAllIps ? 999999 : fullConfig.maxIpsPerRange
    for (const r of platform.ranges) {
      if (selectedSet && !selectedSet.has(r.cidr)) continue
      ipList = ipList.concat(cidrToIps(r.cidr, perRange))
    }
  }
  // Native backend is more efficient — allow up to 50k IPs per scan
  const HARD_CAP = 50000
  if (ipList.length > HARD_CAP) ipList = ipList.slice(0, HARD_CAP)

  const sessionId = crypto.randomUUID()
  const total = ipList.length
  let scanned = 0
  let alive = 0
  let configOkCount = 0
  const startTime = Date.now()
  let cancelled = false

  cb.onSession?.(sessionId)
  cb.onProgress?.({
    total, scanned: 0, alive: 0, configOk: 0,
    elapsedMs: 0, status: 'scanning', currentPlatform: platform.name,
  } satisfies ScanProgress)

  async function checkIp(ip: string): Promise<ScanResult | null> {
    for (const port of fullConfig.ports) {
      if (cancelled) return null
      let res: NativeCheckResult
      try {
        res = await invoke<NativeCheckResult>('check_ip', {
          ip,
          port,
          config: {
            timeoutMs: fullConfig.timeoutMs,
            sniHost: fullConfig.sniHost,
            checkTls: fullConfig.checkTls,
            checkHttp: fullConfig.checkHttp,
          },
        })
      } catch (e: any) {
        res = { ok: false, latencyMs: 0, tcpOk: false, error: String(e?.message || e) }
      }
      if (!res.ok && !res.tcpOk) continue
      if (res.latencyMs > fullConfig.maxLatencyMs) continue

      const result: ScanResult = {
        ip,
        port,
        alive: res.ok,
        // Use ?? so 0/false from Rust is preserved (don't fall back on real 0).
        latencyMs: res.latencyMs ?? (Date.now() - startTime),
        pingMethod: 'tcp',
        tlsOk: res.tlsOk,
      }
      if (res.httpOk !== undefined) result.httpOk = res.httpOk

      // Sample-config WebSocket test — NOT yet implemented in Rust.
      // Until we add a real `tokio-tungstenite` probe (verify TLS handshake +
      // WebSocket upgrade + SNI + Path against the actual config), we must
      // NOT claim `configOk = true` just because TCP+HTTPS succeeded — that
      // produces false positives that fail in real V2Ray clients.
      // Leave `configOk` undefined → UI shows "—" → user verifies manually.
      // TODO(rust): add ws_probe command with rustls+tokio-tungstenite
      // similar to openssl s_client then HTTP/1.1 Upgrade.
      void sampleConfig // suppress unused

      return result
    }
    return null
  }

  const emitProgress = (status: ScanProgress['status'] = 'scanning') => {
    cb.onProgress?.({
      total, scanned, alive, configOk: configOkCount,
      elapsedMs: Date.now() - startTime,
      status,
      currentPlatform: platform.name,
    } satisfies ScanProgress)
  }

  const queue = [...ipList]
  const concurrency = Math.max(1, fullConfig.concurrency)

  async function worker() {
    while (queue.length > 0 && !cancelled) {
      const ip = queue.shift()
      if (!ip) break
      const r = await checkIp(ip)
      scanned++
      if (r) {
        alive++
        cb.onResult?.(r)
      }
      if (scanned % 4 === 0 || scanned === total) emitProgress()
    }
  }

  const workers: Promise<void>[] = []
  for (let i = 0; i < concurrency; i++) workers.push(worker())
  await Promise.all(workers)

  const finalStatus: ScanProgress['status'] = cancelled ? 'stopped' : 'completed'
  emitProgress(finalStatus)
  cb.onDone?.({ ok: !cancelled, alive, scanned, total, configOk: configOkCount })

  return {
    cancel: async () => { cancelled = true },
  }
}
