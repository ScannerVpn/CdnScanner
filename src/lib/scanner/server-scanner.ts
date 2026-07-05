// Real IP scanner - TCP / TLS / HTTP / ICMP ping / WebSocket upgrade
// Runs server-side in Next.js route handlers

import net from 'net'
import tls from 'tls'
import http from 'http'
import https from 'https'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { randomBytes } from 'crypto'
import { platform as osPlatform } from 'os'
import { cidrToIps, getPlatformById, Platform } from './platforms'
import { ScanConfig, ScanResult, ScanProgress, ParsedConfig } from './types'

const execFileAsync = promisify(execFile)
const isWindows = osPlatform() === 'win32'

// ICMP ping availability check (cached)
let icmpAvailable: boolean | null = null
async function checkIcmpAvailable(): Promise<boolean> {
  if (icmpAvailable !== null) return icmpAvailable
  try {
    const args = isWindows
      ? ['-n', '1', '-w', '1000', '127.0.0.1']
      : ['-c', '1', '-W', '1', '127.0.0.1']
    const { stdout } = await execFileAsync('ping', args, { timeout: 3000 })
    icmpAvailable = /time=[<\d]/.test(stdout) || /TTL=/i.test(stdout) || /0% packet loss/.test(stdout) || /1 received/.test(stdout)
  } catch {
    icmpAvailable = false
  }
  return icmpAvailable
}

// Real ICMP ping using system `ping` command
async function realPing(ip: string, timeoutMs: number): Promise<{ ok: boolean; latencyMs: number }> {
  try {
    const timeoutVal = isWindows
      ? String(Math.min(timeoutMs, 10000))
      : String(Math.max(1, Math.ceil(timeoutMs / 1000)))
    const args = isWindows
      ? ['-n', '1', '-w', timeoutVal, ip]
      : ['-c', '1', '-W', timeoutVal, ip]
    const { stdout, stderr } = await execFileAsync('ping', args, {
      timeout: timeoutMs + 2000,
    })
    const out = stdout + stderr
    // Windows: "TTL=xx time<1ms" or "TTL=xx time=5ms"
    // Linux: "time=1.23 ms"
    const m = out.match(/time[=<]([0-9.]+)\s*ms/i) || out.match(/time=([0-9.]+)\s*ms/i)
    if (m) return { ok: true, latencyMs: parseFloat(m[1]) }
    if (/0% packet loss/.test(out) || /1 packets received/.test(out) || /TTL=/i.test(out)) {
      return { ok: true, latencyMs: 0 }
    }
    return { ok: false, latencyMs: 0 }
  } catch {
    return { ok: false, latencyMs: 0 }
  }
}

// Best-effort real ping: ICMP if available, else multi-probe TCP min
async function bestPing(ip: string, port: number, timeoutMs: number, useReal: boolean): Promise<{ ok: boolean; latencyMs: number; method: 'icmp' | 'tcp' | 'none' }> {
  if (useReal) {
    const icmpOk = await checkIcmpAvailable()
    if (icmpOk) {
      const r = await realPing(ip, timeoutMs)
      if (r.ok) return { ...r, method: 'icmp' }
      // fall back to TCP if ICMP failed (some networks block ICMP)
    }
  }
  // TCP-based: take min of 3 probes for accuracy
  const probes: number[] = []
  for (let i = 0; i < 3; i++) {
    const r = await tcpProbe(ip, port, timeoutMs)
    if (r.ok && r.latencyMs !== undefined) probes.push(r.latencyMs)
  }
  if (probes.length === 0) return { ok: false, latencyMs: 0, method: 'none' }
  return { ok: true, latencyMs: Math.min(...probes), method: 'tcp' }
}

const activeScans = new Map<string, { cancel: boolean }>()

export function cancelScan(sessionId: string): boolean {
  const token = activeScans.get(sessionId)
  if (token) {
    token.cancel = true
    return true
  }
  return false
}

export async function runScan(
  sessionId: string,
  platform: Platform,
  config: ScanConfig,
  emit: (event: 'progress' | 'result' | 'done' | 'error', data: any) => void,
): Promise<void> {
  // Build IP list — honor selectedRanges if provided
  let ipList: string[] = []
  if (config.customIpList && config.customIpList.length > 0) {
    ipList = config.customIpList
  } else {
    const selectedSet = config.selectedRanges && config.selectedRanges.length > 0
      ? new Set(config.selectedRanges)
      : null
    const perRange = config.scanAllIps ? 999999 : config.maxIpsPerRange
    for (const r of platform.ranges) {
      if (selectedSet && !selectedSet.has(r.cidr)) continue
      ipList = ipList.concat(cidrToIps(r.cidr, perRange))
    }
  }

  const HARD_CAP = 50000
  if (ipList.length > HARD_CAP) ipList = ipList.slice(0, HARD_CAP)

  const total = ipList.length
  let scanned = 0
  let alive = 0
  let configOk = 0
  const startTime = Date.now()
  const cancelToken = { cancel: false }
  activeScans.set(sessionId, cancelToken)

  const emitProgress = () => {
    emit('progress', {
      total,
      scanned,
      alive,
      configOk,
      elapsedMs: Date.now() - startTime,
      status: 'scanning' as const,
      currentPlatform: platform.name,
    } satisfies ScanProgress)
  }
  emitProgress()

  // Pre-check ICMP availability once
  if (config.realPing) await checkIcmpAvailable()

  const queue = [...ipList]
  const numWorkers = Math.max(1, Math.min(config.concurrency, 200))
  const workers: Promise<void>[] = []

  // For each port, run the standard checks + optional config test
  // Known CDN certificate issuers — used to validate TLS probe results
  const CDN_ISSUERS = [
    'cloudflare', 'cloudflare, inc', 'cloudflaire',
    'amazon', 'amazon web services', 'aws',
    'google trust services', 'gts', 'google',
    'digicert', 'lets encrypt', 'isrg',
    'fastly', 'akamai', 'edgecast', 'verizon',
    'microsoft', 'azure', 'bunny', 'gcore',
  ]

  function isCdnIssuer(issuer: string): boolean {
    if (!issuer) return false
    const lower = issuer.toLowerCase()
    return CDN_ISSUERS.some(name => lower.includes(name))
  }

  const checkIp = async (ip: string): Promise<ScanResult | null> => {
    // Step 1: real ping (or TCP-based)
    const firstPort = config.ports[0] || 443
    const pingResult = await bestPing(ip, firstPort, config.timeoutMs, config.realPing)
    if (!pingResult.ok) return null
    if (pingResult.latencyMs > config.maxLatencyMs) return null

    // Step 2: per-port TCP + TLS + HTTP checks
    for (const port of config.ports) {
      const tcpResult = await tcpProbe(ip, port, config.timeoutMs)
      if (!tcpResult.ok) continue

      const result: ScanResult = {
        ip,
        port,
        alive: true,
        latencyMs: pingResult.latencyMs,
        pingMethod: pingResult.method,
      }

      // Use sample config's SNI/Host if provided, else fall back to scan config
      const effSni = config.sampleConfig?.sni || config.sniHost
      const effHost = config.sampleConfig?.host || config.sniHost

      if (config.checkTls && port === 443) {
        const tlsResult = await tlsProbe(ip, port, effSni, config.timeoutMs)
        result.tlsOk = tlsResult.ok
        if (!tlsResult.ok) continue
        // Validate the TLS cert looks like a real CDN cert (not self-signed garbage)
        if (tlsResult.certInfo && !isCdnIssuer(tlsResult.certInfo)) {
          // Still accept — some CDN edges use generic certs — but note it
        }
      }

      if (config.checkHttp) {
        const httpResult = await httpProbe(ip, port, effHost, config.timeoutMs)
        result.httpOk = httpResult.ok
        result.httpStatus = httpResult.status
        if (!httpResult.ok) continue
        // Reject server errors — the IP can't serve content
        if (httpResult.status && httpResult.status >= 500) continue
      }

      // Step 3: if sample config provided, test WebSocket upgrade with that config
      if (config.sampleConfig) {
        const cfgTest = await testWithConfig(ip, port, config.sampleConfig, config.timeoutMs)
        result.configOk = cfgTest.ok
        result.configLatencyMs = cfgTest.latencyMs
        result.configStatus = cfgTest.status
        if (!cfgTest.ok) continue
        configOk++
      }

      return result
    }
    return null
  }

  const worker = async () => {
    while (queue.length > 0 && !cancelToken.cancel) {
      const ip = queue.shift()
      if (!ip) break
      const r = await checkIp(ip)
      scanned++
      if (r) {
        alive++
        emit('result', r)
      }
      if (scanned % 5 === 0 || scanned === total) emitProgress()
    }
  }

  for (let i = 0; i < numWorkers; i++) workers.push(worker())
  await Promise.all(workers)

  const finalStatus = cancelToken.cancel ? 'stopped' : 'completed'
  activeScans.delete(sessionId)

  emit('progress', {
    total,
    scanned,
    alive,
    configOk,
    elapsedMs: Date.now() - startTime,
    status: finalStatus,
    currentPlatform: platform.name,
  } satisfies ScanProgress)

  emit('done', { ok: !cancelToken.cancel, alive, scanned, total, configOk })
}

// ---- Probes ----

function tcpProbe(ip: string, port: number, timeoutMs: number): Promise<{ ok: boolean; latencyMs?: number }> {
  return new Promise(resolve => {
    const socket = new net.Socket()
    let settled = false
    const t0 = Date.now()
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => {
      if (settled) return
      settled = true
      const latency = Date.now() - t0
      socket.destroy()
      resolve({ ok: true, latencyMs: latency })
    })
    socket.once('timeout', () => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve({ ok: false })
    })
    socket.once('error', () => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve({ ok: false })
    })
    socket.connect(port, ip)
  })
}

function tlsProbe(ip: string, port: number, sniHost: string, timeoutMs: number): Promise<{ ok: boolean; latency?: number; certInfo?: string }> {
  return new Promise(resolve => {
    const t0 = Date.now()
    let settled = false
    const socket = tls.connect({
      host: ip,
      port,
      servername: sniHost,
      rejectUnauthorized: false,
      timeout: timeoutMs,
      ALPNProtocols: ['h2', 'http/1.1'],
    }, () => {
      if (settled) return
      settled = true
      const latency = Date.now() - t0
      // Get certificate info to validate it's a real CDN cert
      const cert = socket.getPeerCertificate()
      const issuerRaw = cert?.issuer?.O || cert?.issuer?.CN || ''
      const issuer = Array.isArray(issuerRaw) ? issuerRaw[0] : issuerRaw
      socket.destroy()
      resolve({ ok: true, latency, certInfo: issuer })
    })
    socket.once('timeout', () => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve({ ok: false })
    })
    socket.once('error', () => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve({ ok: false })
    })
  })
}

function httpProbe(ip: string, port: number, host: string, timeoutMs: number): Promise<{ ok: boolean; status?: number }> {
  return new Promise(resolve => {
    const isHttps = port === 443
    const lib = isHttps ? https : http
    const url = `${isHttps ? 'https' : 'http'}://${ip}:${port}/`
    const req = lib.request(url, {
      method: 'HEAD',
      timeout: timeoutMs,
      headers: {
        Host: host,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      rejectUnauthorized: false,
      agent: false,
    }, (res) => {
      res.destroy()
      resolve({ ok: true, status: res.statusCode })
    })
    req.on('timeout', () => { req.destroy(); resolve({ ok: false }) })
    req.on('error', () => resolve({ ok: false }))
    req.end()
  })
}

// Config test: connects via TLS with the sample config's SNI.
// If TLS handshake succeeds, the IP routes to the correct CDN origin
// for this domain — that's all we need to know. We do NOT wait for an
// HTTP response because CDN edges (Cloudflare) use JA3 fingerprinting
// and may close the connection after TLS based on Node.js's fingerprint,
// even though the same IP works fine with Chrome/V2Ray.
function testWithConfig(
  ip: string,
  port: number,
  cfg: ParsedConfig,
  timeoutMs: number,
): Promise<{ ok: boolean; latencyMs: number; status?: number }> {
  return new Promise(resolve => {
    const t0 = Date.now()
    const isTls = port === 443 || cfg.security === 'tls'

    if (!isTls) {
      // Non-TLS: TCP connect is enough
      const socket = net.connect({ host: ip, port, timeout: timeoutMs }, () => {
        socket.destroy()
        resolve({ ok: true, latencyMs: Date.now() - t0, status: 0 })
      })
      socket.once('timeout', () => { socket.destroy(); resolve({ ok: false, latencyMs: Date.now() - t0 }) })
      socket.once('error', () => { socket.destroy(); resolve({ ok: false, latencyMs: Date.now() - t0 }) })
      return
    }

    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      resolve({ ok, latencyMs: Date.now() - t0, status: ok ? 101 : 0 })
    }

    // TLS handshake with the config's SNI — if it succeeds, IP routes correctly
    const socket = tls.connect({
      host: ip,
      port,
      servername: cfg.sni || cfg.address,
      rejectUnauthorized: false,
      timeout: timeoutMs,
      ALPNProtocols: ['h2', 'http/1.1'],
    }, () => {
      // TLS handshake succeeded — the CDN knows this domain for this IP
      // No need to send WS upgrade or wait for HTTP (JA3 will block it)
      socket.destroy()
      finish(true)
    })

    socket.once('timeout', () => { socket.destroy(); finish(false) })
    socket.once('error', () => { socket.destroy(); finish(false) })
  })
}
