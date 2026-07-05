import { NextRequest, NextResponse } from 'next/server'
import { runScan } from '@/lib/scanner/server-scanner'
import { ScanConfig } from '@/lib/scanner/types'
import { getPlatformById } from '@/lib/scanner/platforms'
import { parseShareLink } from '@/lib/scanner/sample-config'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const sessionEmitters = new Map<string, (event: string, data: any) => void>()

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const platformId: string = body?.platformId
  const config: Partial<ScanConfig> = body?.config || {}
  const customIpList: string[] | undefined = body?.customIpList
  const sampleConfigText: string | undefined = body?.sampleConfigText

  const platform = getPlatformById(platformId)
  if (!platform) {
    return NextResponse.json({ error: `Unknown platform: ${platformId}` }, { status: 400 })
  }

  // Parse sample config if provided
  let sampleConfig
  if (sampleConfigText && sampleConfigText.trim()) {
    const parseRes = parseShareLink(sampleConfigText)
    if (!parseRes.ok || !parseRes.config) {
      return NextResponse.json({ error: `کانفیگ نامعتبر: ${parseRes.error}` }, { status: 400 })
    }
    sampleConfig = parseRes.config
  }

  const fullConfig: ScanConfig = {
    platformId,
    ports: config.ports ?? [443, 80],
    timeoutMs: config.timeoutMs ?? 3000,
    concurrency: config.concurrency ?? 50,
    maxIpsPerRange: config.maxIpsPerRange ?? 32,
    checkTls: config.checkTls ?? true,
    checkHttp: config.checkHttp ?? true,
    sniHost: config.sniHost ?? 'speedtest.net',
    maxLatencyMs: config.maxLatencyMs ?? 1500,
    customIpList,
    selectedRanges: config.selectedRanges,
    realPing: config.realPing ?? false,
    scanAllIps: config.scanAllIps ?? false,
    sampleConfig,
  }

  const sessionId = randomUUID()

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }
      sessionEmitters.set(sessionId, send)

      send('session', { sessionId, sampleConfig: sampleConfig ? {
        protocol: sampleConfig.protocol,
        address: sampleConfig.address,
        port: sampleConfig.port,
        sni: sampleConfig.sni,
        host: sampleConfig.host,
        path: sampleConfig.path,
        network: sampleConfig.network,
        security: sampleConfig.security,
      } : null })

      try {
        await runScan(sessionId, platform, fullConfig, (event, data) => send(event, data))
      } catch (e: any) {
        send('error', { message: e?.message || 'scan failed' })
      } finally {
        sessionEmitters.delete(sessionId)
        try { controller.close() } catch {}
      }
    },
    cancel() {
      import('@/lib/scanner/server-scanner').then(({ cancelScan }) => cancelScan(sessionId))
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
