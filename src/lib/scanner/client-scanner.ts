// Browser-based scanner — works without Node backend (Tauri static build, static deploy)
//
// IMPORTANT: Browsers enforce TLS hostname validation regardless of `mode: 'no-cors'`.
// So `fetch('https://1.2.3.4/')` will FAIL with NET::ERR_CERT_COMMON_NAME_INVALID because:
//   - Browser sends SNI = "1.2.3.4"
//   - Server returns cert for "speedtest.net" (or similar domain)
//   - Browser rejects because cert hostname doesn't match SNI
//
// Workaround: probe HTTP (port 80) instead. Most CDNs listen on 80 with a 301 redirect
// to HTTPS, which is itself proof the IP is alive and serving CDN traffic.
//
// Trade-offs vs server scanner:
//   - Probes HTTP port 80 only (TLS to IPs is impossible from browser)
//   - No ICMP ping (use HEAD latency as proxy, marked as 'tcp')
//   - No TLS cert issuer check (we only know the IP is alive)
//   - Concurrency capped to 50 to protect browser's connection pool

import { ScanConfig, ScanResult, ScanProgress, ParsedConfig } from './types'
import { getPlatformById } from './platforms'
import { parseShareLink } from './sample-config'
import type { ScannerCallbacks, ScanHandle } from './sse-client'

// HTTP probe on port 80 (works in browser without TLS hostname issues)
// CDN port 80 typically responds with 301 redirect to HTTPS — that redirect itself
// proves the IP is alive and serving CDN config.
async function probeHttp80(
  ip: string,
  timeoutMs: number,
): Promise<{ ok: boolean; latencyMs: number }> {
  const url = `http://${ip}/`
  const t0 = performance.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs + 500)
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
    })
    clearTimeout(timer)
    return { ok: true, latencyMs: Math.round(performance.now() - t0) }
  } catch {
    return { ok: false, latencyMs: 0 }
  }
}

// HTTP probe on arbitrary port (browser blocks some ports: 6665-6669 etc.)
async function probeHttpPort(
  ip: string,
  port: number,
  timeoutMs: number,
): Promise<{ ok: boolean; latencyMs: number }> {
  const url = `http://${ip}:${port}/`
  const t0 = performance.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs + 500)
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
    })
    clearTimeout(timer)
    return { ok: true, latencyMs: Math.round(performance.now() - t0) }
  } catch (e: any) {
    // Some errors mean TCP+TLS happened but cert mismatched → server is alive
    // Examples: "SSL_ERROR", "CERT_", "TLS_"
    const msg = String(e?.message || e?.cause?.message || e)
    if (/SSL|CERT|TLS|certificate/i.test(msg)) {
      return { ok: true, latencyMs: Math.round(performance.now() - t0) }
    }
    return { ok: false, latencyMs: 0 }
  }
}

// Resolve an IP to pick the right probe strategy for the requested port
async function probe(
  ip: string,
  port: number,
  timeoutMs: number,
): Promise<{ ok: boolean; latencyMs: number; probedPort: number }> {
  // For HTTPS (443) — try port 80 first as HTTP is more reliable in browsers;
  // if 80 fails and 443 was requested, try 443 too (may pass if cert has IP SAN).
  if (port === 443) {
    const r80 = await probeHttp80(ip, timeoutMs)
    if (r80.ok) return { ...r80, probedPort: 80 }
    // Fall through to 443 attempt
    const r443 = await probeHttpPort(ip, 443, timeoutMs)
    return { ...r443, probedPort: 443 }
  }
  const r = await probeHttpPort(ip, port, timeoutMs)
  return { ...r, probedPort: port }
}

// WebSocket-based config test (approximate — connects via browser, SNI = IP)
// Browsers will reject TLS if cert doesn't match IP, so this is best-effort.
function testConfigWS(
  ip: string,
  port: number,
  cfg: ParsedConfig,
  timeoutMs: number,
): Promise<{ ok: boolean; latencyMs: number }> {
  return new Promise((resolve) => {
    const t0 = Date.now()
    let settled = false
    const rawPath = cfg.path || '/'
    const path = rawPath.startsWith('/') ? rawPath : '/' + rawPath
    const url = `${ip}:${port}${path}`

    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      resolve({ ok, latencyMs: Date.now() - t0 })
    }

    const isTls = port === 443 || cfg.security === 'tls' || cfg.security === 'reality'
    const proto = isTls ? 'wss' : 'ws'
    let ws: WebSocket
    try {
      ws = new WebSocket(`${proto}://${url}`)
    } catch {
      finish(false)
      return
    }

    ws.onopen = () => finish(true)
    ws.onerror = () => finish(false)
    setTimeout(() => finish(false), timeoutMs + 1500)
    // Note: we don't close() here because if the connection succeeded we want to
    // let it complete naturally; cancellation is handled by the timeout/error
  })
}

export async function startClientScan(
  platformId: string,
  config: Partial<ScanConfig>,
  customIpList: string[] | undefined,
  sampleConfigText: string | undefined,
  cb: ScannerCallbacks,
): Promise<ScanHandle> {
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
    concurrency: Math.min(config.concurrency ?? 50, 50), // browser cap
    maxIpsPerRange: config.maxIpsPerRange ?? 32,
    checkTls: false, // TLS verification is unreliable from browser to IPs
    checkHttp: true,
    sniHost: config.sniHost ?? 'speedtest.net',
    maxLatencyMs: config.maxLatencyMs ?? 1500,
    customIpList,
    selectedRanges: config.selectedRanges,
    realPing: false, // ICMP not possible in browser
    scanAllIps: config.scanAllIps ?? false,
    sampleConfig,
  }

  // Defer dynamic import (avoids circular dep risk in Next.js)
  const { cidrToIps } = await import('./platforms')

  // Build IP list from platform ranges + selectedRanges + customIpList
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
  const HARD_CAP = 10000 // browser cap
  if (ipList.length > HARD_CAP) ipList = ipList.slice(0, HARD_CAP)

  const sessionId = crypto.randomUUID()
  const total = ipList.length
  let scanned = 0
  let alive = 0
  let configOk = 0
  const startTime = Date.now()
  let cancelled = false

  cb.onSession?.(sessionId)
  cb.onProgress?.({
    total, scanned: 0, alive: 0, configOk: 0,
    elapsedMs: 0, status: 'scanning', currentPlatform: platform.name,
  } satisfies ScanProgress)

  const queue = [...ipList]
  const concurrency = Math.max(1, fullConfig.concurrency)

  async function checkIp(ip: string): Promise<ScanResult | null> {
    // Try each port the user requested. For port 443, probe() internally
    // tries 80 first then 443 as fallback.
    for (const port of fullConfig.ports) {
      if (cancelled) return null
      const r = await probe(ip, port, fullConfig.timeoutMs)
      if (!r.ok) continue
      if (r.latencyMs > fullConfig.maxLatencyMs) continue

      const result: ScanResult = {
        ip,
        port: r.probedPort, // may differ from requested (e.g. 80 for 443 request)
        alive: true,
        latencyMs: r.latencyMs,
        pingMethod: 'tcp',
        // Don't claim TLS verified from browser — UI shows "—"
        tlsOk: undefined,
      }

      result.httpOk = true

      if (sampleConfig) {
        const cfgTest = await testConfigWS(ip, port, sampleConfig, fullConfig.timeoutMs)
        result.configOk = cfgTest.ok
        result.configLatencyMs = cfgTest.latencyMs
        if (cfgTest.ok) configOk++
      }

      return result
    }
    return null
  }

  const emitProgress = (status: ScanProgress['status'] = 'scanning') => {
    cb.onProgress?.({
      total, scanned, alive, configOk,
      elapsedMs: Date.now() - startTime,
      status,
      currentPlatform: platform.name,
    } satisfies ScanProgress)
  }

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
      if (scanned % 4 === 0 || scanned === total) emitProgress('scanning')
    }
  }

  // Spawn `concurrency` workers; await all.
  const workers: Promise<void>[] = []
  for (let i = 0; i < concurrency; i++) workers.push(worker())
  await Promise.all(workers)

  const finalStatus: ScanProgress['status'] = cancelled ? 'stopped' : 'completed'
  emitProgress(finalStatus)
  cb.onDone?.({ ok: !cancelled, alive, scanned, total, configOk })

  return {
    cancel: async () => { cancelled = true },
  }
}
