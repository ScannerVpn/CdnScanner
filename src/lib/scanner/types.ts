// Shared platform types

export interface PlatformRange {
  cidr: string
  region?: string
}

export interface Platform {
  id: string
  name: string
  description: string
  subtext: string
  color: string
  icon: string
  ranges: PlatformRange[]
}

export interface ScanConfig {
  platformId: string
  ports: number[]
  timeoutMs: number
  concurrency: number
  maxIpsPerRange: number
  checkTls: boolean
  checkHttp: boolean
  sniHost: string
  maxLatencyMs: number
  customIpList?: string[]
  // NEW: selected CIDR ranges — only these will be scanned
  selectedRanges?: string[]
  // NEW: real ICMP ping (vs TCP-based)
  realPing: boolean
  // NEW: sample config to test IPs against (parsed)
  sampleConfig?: ParsedConfig
  // NEW: scan ALL IPs in each CIDR range (ignore maxIpsPerRange)
  scanAllIps: boolean
}

export interface ScanResult {
  ip: string
  port: number
  alive: boolean
  latencyMs: number
  pingMethod: 'icmp' | 'tcp' | 'none'
  tlsOk?: boolean
  httpOk?: boolean
  httpStatus?: number
  // NEW: passed config test (WS upgrade + actual SNI)
  configOk?: boolean
  configLatencyMs?: number
  configStatus?: number
}

export interface ScanProgress {
  total: number
  scanned: number
  alive: number
  configOk: number
  elapsedMs: number
  status: 'idle' | 'scanning' | 'stopped' | 'completed'
  currentPlatform?: string
}

// NEW: parsed sample config from user's share link
export interface ParsedConfig {
  protocol: 'vless' | 'vmess' | 'trojan'
  uuid: string
  address: string
  port: number
  sni?: string
  host?: string
  path?: string
  network: 'ws' | 'grpc' | 'tcp'
  security: 'tls' | 'none' | 'reality'
  flow?: string
  remark?: string
}
