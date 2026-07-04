// V2Ray / Xray config export utilities
import { ScanResult } from './types'

export type V2RayProtocol = 'vless' | 'vmess' | 'trojan'

export interface ExportOptions {
  protocol: V2RayProtocol
  uuid: string               // user id
  port: number               // remote port (usually 443)
  sni: string                // serverName / SNI
  host: string               // Host / ws host header
  path: string               // websocket path
  network: 'ws' | 'grpc' | 'tcp'
  security: 'tls' | 'none' | 'reality'
  flow?: string              // for reality / xtls
  remark: string             // out-bound tag prefix
  includeLatency: boolean    // include latency in remark
}

export function exportV2RayJson(results: ScanResult[], opts: ExportOptions) {
  const outbounds = results.map((r, i) => ({
    tag: `${opts.remark}-${i + 1}${opts.includeLatency ? `-${r.latencyMs}ms` : ''}`,
    protocol: opts.protocol,
    settings: {
      vnext:
        opts.protocol === 'vless'
          ? [
              {
                address: r.ip,
                port: opts.port,
                users: [
                  {
                    id: opts.uuid,
                    encryption: 'none',
                    flow: opts.flow || '',
                  },
                ],
              },
            ]
          : undefined,
      servers:
        opts.protocol === 'vmess' || opts.protocol === 'trojan'
          ? [
              {
                address: r.ip,
                port: opts.port,
                users:
                  opts.protocol === 'trojan'
                    ? [{ password: opts.uuid }]
                    : [{ id: opts.uuid, alterId: 0 }],
              },
            ]
          : undefined,
    },
    streamSettings: {
      network: opts.network,
      security: opts.security,
      tlsSettings:
        opts.security === 'tls'
          ? {
              serverName: opts.sni,
              allowInsecure: true,
              fingerprint: 'chrome',
            }
          : undefined,
      wsSettings:
        opts.network === 'ws'
          ? {
              path: opts.path,
              headers: { Host: opts.host },
            }
          : undefined,
    },
    mux: { enabled: true, concurrency: 8 },
  }))

  return {
    log: { loglevel: 'warning' },
    inbounds: [
      {
        tag: 'socks',
        port: 10808,
        listen: '127.0.0.1',
        protocol: 'socks',
        settings: { udp: true },
      },
      {
        tag: 'http',
        port: 10809,
        listen: '127.0.0.1',
        protocol: 'http',
      },
    ],
    outbounds: [
      ...outbounds,
      {
        tag: 'direct',
        protocol: 'freedom',
        settings: {},
      },
      {
        tag: 'block',
        protocol: 'blackhole',
        settings: {},
      },
    ],
    routing: {
      domainStrategy: 'IPIfNonMatch',
      rules: [
        { type: 'field', outboundTag: 'direct', domain: ['geosite:category-ads-all'] },
        { type: 'field', outboundTag: 'direct', ip: ['geoip:private', 'geoip:cn'] },
      ],
    },
  }
}

// Build share links (vless://, vmess://, trojan://)
export function exportShareLinks(results: ScanResult[], opts: ExportOptions): string {
  return results
    .map((r, i) => {
      const remark = `${opts.remark}-${i + 1}${opts.includeLatency ? `-${r.latencyMs}ms` : ''}`
      if (opts.protocol === 'vless') {
        const params = new URLSearchParams({
          encryption: 'none',
          security: opts.security,
          type: opts.network,
          sni: opts.sni,
          host: opts.host,
          path: opts.path,
        })
        if (opts.flow) params.set('flow', opts.flow)
        return `vless://${opts.uuid}@${r.ip}:${opts.port}?${params.toString()}#${encodeURIComponent(remark)}`
      }
      if (opts.protocol === 'trojan') {
        const params = new URLSearchParams({
          security: opts.security,
          type: opts.network,
          sni: opts.sni,
          host: opts.host,
          path: opts.path,
        })
        return `trojan://${opts.uuid}@${r.ip}:${opts.port}?${params.toString()}#${encodeURIComponent(remark)}`
      }
      // vmess base64 json
      const vmessJson = {
        v: '2',
        ps: remark,
        add: r.ip,
        port: String(opts.port),
        id: opts.uuid,
        aid: '0',
        net: opts.network,
        type: 'none',
        host: opts.host,
        path: opts.path,
        tls: opts.security === 'tls' ? 'tls' : '',
        sni: opts.sni,
      }
      return `vmess://${Buffer.from(JSON.stringify(vmessJson)).toString('base64')}`
    })
    .join('\n')
}

export function exportPlainIpList(results: ScanResult[]): string {
  return results.map((r) => r.ip).join('\n')
}
