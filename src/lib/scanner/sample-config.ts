// Parser for V2Ray share links: vless://, vmess://, trojan://
// Also supports v2ray JSON config (inbound/outbound style).

import { ParsedConfig } from './types'

export interface ParseResult {
  ok: boolean
  config?: ParsedConfig
  error?: string
}

export function parseShareLink(input: string): ParseResult {
  const text = input.trim()
  if (!text) return { ok: false, error: 'ورودی خالی است' }

  // Try share links first
  if (text.startsWith('vless://')) return parseVless(text)
  if (text.startsWith('trojan://')) return parseTrojan(text)
  if (text.startsWith('vmess://')) return parseVmess(text)

  // Try JSON config (single outbound)
  if (text.startsWith('{')) {
    try {
      const obj = JSON.parse(text)
      return parseJsonConfig(obj)
    } catch (e: any) {
      return { ok: false, error: `JSON نامعتبر: ${e.message}` }
    }
  }

  return { ok: false, error: 'فرمت پشتیبانی نمی‌شود — vless://, vmess://, trojan:// یا JSON' }
}

function parseVless(link: string): ParseResult {
  try {
    // vless://uuid@host:port?params#remark
    const u = new URL(link)
    const uuid = decodeURIComponent(u.username)
    const port = parseInt(u.port, 10) || 443
    const params = u.searchParams

    return {
      ok: true,
      config: {
        protocol: 'vless',
        uuid,
        address: u.hostname,
        port,
        sni: params.get('sni') || params.get('peer') || u.hostname,
        host: params.get('host') || params.get('sni') || u.hostname,
        path: params.get('path') || '/',
        network: (params.get('type') as any) || 'ws',
        security: (params.get('security') as any) || 'tls',
        flow: params.get('flow') || undefined,
        remark: decodeURIComponent(u.hash.slice(1)) || 'VLESS',
      },
    }
  } catch (e: any) {
    return { ok: false, error: `پارس VLESS ناموفق: ${e.message}` }
  }
}

function parseTrojan(link: string): ParseResult {
  try {
    const u = new URL(link)
    const password = decodeURIComponent(u.username)
    const port = parseInt(u.port, 10) || 443
    const params = u.searchParams

    return {
      ok: true,
      config: {
        protocol: 'trojan',
        uuid: password,
        address: u.hostname,
        port,
        sni: params.get('sni') || params.get('peer') || u.hostname,
        host: params.get('host') || params.get('sni') || u.hostname,
        path: params.get('path') || '/',
        network: (params.get('type') as any) || 'ws',
        security: (params.get('security') as any) || 'tls',
        flow: params.get('flow') || undefined,
        remark: decodeURIComponent(u.hash.slice(1)) || 'Trojan',
      },
    }
  } catch (e: any) {
    return { ok: false, error: `پارس Trojan ناموفق: ${e.message}` }
  }
}

function parseVmess(link: string): ParseResult {
  try {
    const b64 = link.slice('vmess://'.length)
    const json = Buffer.from(b64, 'base64').toString('utf8')
    const obj = JSON.parse(json)

    return {
      ok: true,
      config: {
        protocol: 'vmess',
        uuid: obj.id,
        address: obj.add,
        port: parseInt(obj.port, 10) || 443,
        sni: obj.sni || obj.host || obj.add,
        host: obj.host || obj.sni || obj.add,
        path: obj.path || '/',
        network: (obj.net as any) || 'ws',
        security: obj.tls === 'tls' ? 'tls' : obj.tls === 'reality' ? 'reality' : 'none',
        flow: obj.flow,
        remark: obj.ps || 'VMess',
      },
    }
  } catch (e: any) {
    return { ok: false, error: `پارس VMess ناموفق: ${e.message}` }
  }
}

function parseJsonConfig(obj: any): ParseResult {
  // Accept either a single outbound or a full V2Ray config
  const outbounds = obj.outbounds || [obj]
  const ob = outbounds.find((o: any) =>
    o.protocol === 'vless' || o.protocol === 'vmess' || o.protocol === 'trojan'
  )
  if (!ob) return { ok: false, error: 'هیچ outbound با پروتکل پشتیبانی‌شده پیدا نشد' }

  const ss = ob.streamSettings || {}
  const isVless = ob.protocol === 'vless'
  const isVmess = ob.protocol === 'vmess'

  const server = isVless
    ? ob.settings.vnext?.[0]
    : ob.settings.servers?.[0]
  if (!server) return { ok: false, error: 'آدرس/پورت سرور پیدا نشد' }

  const user = isVless ? server.users?.[0] : (isVmess ? server.users?.[0] : null)
  const uuid = user?.id || user?.password || (isVless || isVmess ? '' : server.password)

  return {
    ok: true,
    config: {
      protocol: ob.protocol,
      uuid,
      address: server.address,
      port: server.port,
      sni: ss.tlsSettings?.serverName || ss.realitySettings?.serverName || server.address,
      host: ss.wsSettings?.headers?.Host || ss.tlsSettings?.serverName || server.address,
      path: ss.wsSettings?.path || ss.grpcSettings?.serviceName || '/',
      network: (ss.network as any) || 'ws',
      security: (ss.security as any) || 'tls',
      flow: user?.flow,
      remark: ob.tag || ob.protocol,
    },
  }
}

export function configToShareLink(c: ParsedConfig, ipOverride?: string, remarkSuffix?: string): string {
  const addr = ipOverride || c.address
  const remark = remarkSuffix ? `${c.remark || c.protocol}-${remarkSuffix}` : (c.remark || c.protocol)

  if (c.protocol === 'vless') {
    const params = new URLSearchParams({
      encryption: 'none',
      security: c.security,
      type: c.network,
      sni: c.sni || '',
      host: c.host || '',
      path: c.path || '/',
    })
    if (c.flow) params.set('flow', c.flow)
    return `vless://${c.uuid}@${addr}:${c.port}?${params.toString()}#${encodeURIComponent(remark)}`
  }
  if (c.protocol === 'trojan') {
    const params = new URLSearchParams({
      security: c.security,
      type: c.network,
      sni: c.sni || '',
      host: c.host || '',
      path: c.path || '/',
    })
    if (c.flow) params.set('flow', c.flow)
    return `trojan://${c.uuid}@${addr}:${c.port}?${params.toString()}#${encodeURIComponent(remark)}`
  }
  // vmess
  const obj = {
    v: '2',
    ps: remark,
    add: addr,
    port: String(c.port),
    id: c.uuid,
    aid: '0',
    net: c.network,
    type: 'none',
    host: c.host || '',
    path: c.path || '/',
    tls: c.security === 'tls' ? 'tls' : '',
    sni: c.sni || '',
  }
  return `vmess://${Buffer.from(JSON.stringify(obj)).toString('base64')}`
}

export function describeConfig(c: ParsedConfig): string {
  return `${c.protocol.toUpperCase()} · ${c.address}:${c.port} · ${c.network}/${c.security} · SNI: ${c.sni}`
}
