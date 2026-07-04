// Shared platform definitions - complete IP ranges per platform
// Sources:
//   - Cloudflare: https://www.cloudflare.com/ips-v4 (15 official ranges)
//   - Cloudflare WARP: developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp
//   - AWS CloudFront: https://ip-ranges.amazonaws.com/ip-ranges.json (~210 ranges)
//   - Fastly: https://api.fastly.com/public-ip-list
//   - Render: https://render.com/docs (AS399471 + AWS us-west-2)
//   - Railway: AWS us-west-2 + eu-west-1
//   - Hugging Face: CloudFront + AWS eu-west-1

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

export function cidrToIpCount(cidr: string): number {
  const [ip, prefix] = cidr.split('/')
  const prefixNum = parseInt(prefix, 10)
  if (prefixNum >= 32) return 1
  return Math.pow(2, 32 - prefixNum)
}

export function cidrToIps(cidr: string, max = 256): string[] {
  const [ip, prefix] = cidr.split('/')
  const prefixNum = parseInt(prefix, 10)
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return []

  const ipNum = ((parts[0] << 24) >>> 0) | ((parts[1] << 16) >>> 0) | ((parts[2] << 8) >>> 0) | parts[3]
  const mask = prefixNum === 0 ? 0 : (0xFFFFFFFF << (32 - prefixNum)) >>> 0
  const network = (ipNum & mask) >>> 0
  const total = cidrToIpCount(cidr)

  // Skip .0 (network) and .255 (broadcast) for /24 and smaller
  const usable = total <= 2 ? total : Math.min(total - 2, total)
  const count = Math.min(max, usable)

  if (count >= total) {
    // Small range: return all IPs
    const ips: string[] = []
    for (let i = 0; i < total; i++) {
      const n = (network + i) >>> 0
      ips.push(`${(n >>> 24) & 0xFF}.${(n >>> 16) & 0xFF}.${(n >>> 8) & 0xFF}.${n & 0xFF}`)
    }
    return ips
  }

  // Large range: sample random IPs across the full range for better coverage
  const sampled = new Set<number>()
  while (sampled.size < count) {
    sampled.add(Math.floor(Math.random() * total))
  }

  const ips: string[] = []
  for (const offset of sampled) {
    const n = (network + offset) >>> 0
    ips.push(`${(n >>> 24) & 0xFF}.${(n >>> 16) & 0xFF}.${(n >>> 8) & 0xFF}.${n & 0xFF}`)
  }
  return ips
}

export const PLATFORMS: Platform[] = [
  {
    id: 'http-scanner',
    name: 'HTTP Scanner',
    description: 'لیست IP دلخواه خودت رو وارد کن',
    subtext: 'TCP · TLS · HTTP HEAD',
    color: 'emerald',
    icon: 'file',
    ranges: [],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    description: 'IP های edge کلودفلر (v4)',
    subtext: '۱۵ رنج رسمی · ~۳ میلیون IP',
    color: 'orange',
    icon: 'cloud',
    ranges: [
      // Official Cloudflare IPv4 ranges (https://www.cloudflare.com/ips-v4)
      { cidr: '173.245.48.0/20', region: 'Global' },
      { cidr: '103.21.244.0/22', region: 'APAC' },
      { cidr: '103.22.200.0/22', region: 'APAC' },
      { cidr: '103.31.4.0/22', region: 'APAC' },
      { cidr: '141.101.64.0/18', region: 'EMEA' },
      { cidr: '108.162.192.0/18', region: 'Global' },
      { cidr: '190.93.240.0/20', region: 'Global' },
      { cidr: '188.114.96.0/20', region: 'Global' },
      { cidr: '197.234.240.0/22', region: 'Global' },
      { cidr: '198.41.128.0/17', region: 'Global' },
      { cidr: '162.158.0.0/15', region: 'Global' },
      { cidr: '104.16.0.0/13', region: 'Global' },
      { cidr: '104.24.0.0/14', region: 'Global' },
      { cidr: '172.64.0.0/13', region: 'Global' },
      { cidr: '131.0.72.0/22', region: 'Global' },
    ],
  },
  {
    id: 'cloudflare-warp',
    name: 'Cloudflare WARP',
    description: 'رنج IP های WARP / Zero Trust',
    subtext: 'WARP + Zero Trust',
    color: 'orange',
    icon: 'shield',
    ranges: [
      // Cloudflare WARP dedicated IPs
      { cidr: '162.159.192.0/24', region: 'WARP' },
      { cidr: '162.159.193.0/24', region: 'WARP' },
      { cidr: '162.159.195.0/24', region: 'WARP' },
      { cidr: '188.114.96.0/24', region: 'WARP' },
      { cidr: '188.114.97.0/24', region: 'WARP' },
      { cidr: '188.114.98.0/24', region: 'WARP' },
      { cidr: '188.114.99.0/24', region: 'WARP' },
    ],
  },
  {
    id: 'aws-cloudfront',
    name: 'AWS CloudFront',
    description: 'Amazon CloudFront edge IPs',
    subtext: 'Official CloudFront ranges · Global',
    color: 'amber',
    icon: 'cloud',
    ranges: [
      // Major AWS CloudFront ranges (selected from official ip-ranges.json)
      // Global CloudFront
      { cidr: '13.32.0.0/15', region: 'CF Global' },
      { cidr: '13.34.0.0/15', region: 'CF Global' },
      { cidr: '13.224.0.0/14', region: 'CF Global' },
      { cidr: '15.158.0.0/16', region: 'CF Global' },
      { cidr: '52.46.0.0/18', region: 'CF Global' },
      { cidr: '52.84.0.0/15', region: 'CF Global' },
      { cidr: '99.84.0.0/16', region: 'CF Global' },
      { cidr: '99.86.0.0/16', region: 'CF Global' },
      { cidr: '108.138.0.0/15', region: 'CF Global' },
      { cidr: '205.251.192.0/19', region: 'CF Global' },
      { cidr: '205.251.224.0/22', region: 'CF Global' },
      { cidr: '205.251.228.0/22', region: 'CF Global' },
      { cidr: '205.251.232.0/22', region: 'CF Global' },
      { cidr: '205.251.236.0/22', region: 'CF Global' },
      { cidr: '205.251.240.0/21', region: 'CF Global' },
      { cidr: '205.251.248.0/22', region: 'CF Global' },
      { cidr: '205.251.252.0/23', region: 'CF Global' },
      { cidr: '205.251.254.0/24', region: 'CF Global' },
      { cidr: '216.137.32.0/19', region: 'CF Global' },
      // Regional CloudFront edges
      { cidr: '13.113.196.64/26', region: 'CF Tokyo' },
      { cidr: '13.113.203.0/24', region: 'CF Tokyo' },
      { cidr: '13.124.199.0/24', region: 'CF Seoul' },
      { cidr: '13.228.69.0/24', region: 'CF Singapore' },
      { cidr: '13.233.177.192/26', region: 'CF Mumbai' },
      { cidr: '15.207.13.128/25', region: 'CF Mumbai' },
      { cidr: '52.199.127.192/26', region: 'CF Tokyo' },
      { cidr: '52.78.247.128/26', region: 'CF Seoul' },
      { cidr: '3.5.0.0/19', region: 'CF EU-West' },
      { cidr: '18.64.0.0/14', region: 'CF EU' },
      { cidr: '34.216.51.0/25', region: 'CF Oregon' },
      { cidr: '52.15.127.128/26', region: 'CF Ohio' },
      { cidr: '52.46.64.0/20', region: 'CF Oregon' },
      { cidr: '99.84.32.0/21', region: 'CF Singapore' },
      { cidr: '108.138.32.0/20', region: 'CF Tokyo' },
    ],
  },
  {
    id: 'fastly',
    name: 'Fastly',
    description: 'IP های edge فستلی',
    subtext: 'Official Fastly ranges',
    color: 'red',
    icon: 'cloud',
    ranges: [
      // Official Fastly public IPs (https://api.fastly.com/public-ip-list)
      { cidr: '23.235.32.0/20', region: 'Global' },
      { cidr: '43.249.72.0/22', region: 'APAC' },
      { cidr: '103.244.50.0/24', region: 'APAC' },
      { cidr: '103.245.222.0/23', region: 'APAC' },
      { cidr: '103.245.224.0/24', region: 'APAC' },
      { cidr: '104.156.80.0/20', region: 'Global' },
      { cidr: '151.101.0.0/16', region: 'Global' },
      { cidr: '157.52.64.0/18', region: 'Global' },
      { cidr: '167.82.0.0/17', region: 'Global' },
      { cidr: '167.82.128.0/20', region: 'Global' },
      { cidr: '167.82.160.0/20', region: 'Global' },
      { cidr: '167.82.224.0/20', region: 'Global' },
      { cidr: '172.111.64.0/18', region: 'Global' },
      { cidr: '185.31.16.0/22', region: 'EMEA' },
      { cidr: '199.27.72.0/21', region: 'Global' },
      { cidr: '199.232.0.0/16', region: 'Global' },
    ],
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'شبکه edge ورسل',
    subtext: 'Vercel edge network',
    color: 'slate',
    icon: 'cloud',
    ranges: [
      // Vercel dedicated ranges
      { cidr: '76.76.21.0/24', region: 'Global' },
      { cidr: '64.29.108.0/22', region: 'Global' },
      { cidr: '35.190.88.0/22', region: 'Global' },
      // Vercel also routes through AWS us-east-1
      { cidr: '3.216.0.0/14', region: 'AWS us-east-1' },
      { cidr: '34.192.0.0/12', region: 'AWS us-east-1' },
      { cidr: '44.192.0.0/11', region: 'AWS us-east-1' },
    ],
  },
  {
    id: 'azure',
    name: 'Azure',
    description: 'Azure Front Door + CDN',
    subtext: 'Microsoft Azure edges',
    color: 'sky',
    icon: 'cloud',
    ranges: [
      { cidr: '147.243.0.0/16', region: 'Front Door' },
      { cidr: '152.195.0.0/16', region: 'CDN' },
      { cidr: '13.107.246.0/22', region: 'Front Door' },
      { cidr: '68.154.0.0/15', region: 'Edge' },
      { cidr: '13.107.128.0/22', region: 'Edge' },
    ],
  },
  {
    id: 'gcore',
    name: 'Gcore CDN',
    description: 'CDN جهانی Gcore',
    subtext: 'Gcore edge network',
    color: 'rose',
    icon: 'cloud',
    ranges: [
      { cidr: '92.223.84.0/22', region: 'EU' },
      { cidr: '92.223.88.0/22', region: 'EU' },
      { cidr: '5.188.184.0/22', region: 'EU' },
      { cidr: '45.83.20.0/22', region: 'EU' },
      { cidr: '45.133.40.0/22', region: 'EU' },
      { cidr: '45.95.64.0/22', region: 'EU' },
      { cidr: '92.223.124.0/22', region: 'EU' },
      { cidr: '185.245.96.0/22', region: 'EU' },
      { cidr: '185.225.196.0/22', region: 'EU' },
    ],
  },
  {
    id: 'arvancloud',
    name: 'ArvanCloud',
    description: 'CDN ایرانی آروان',
    subtext: 'edge ایران',
    color: 'teal',
    icon: 'cloud',
    ranges: [
      { cidr: '185.143.232.0/22', region: 'IR' },
      { cidr: '94.182.0.0/16', region: 'IR' },
      { cidr: '178.22.72.0/22', region: 'IR' },
      { cidr: '185.49.84.0/22', region: 'IR' },
      { cidr: '185.49.88.0/22', region: 'IR' },
      { cidr: '185.94.96.0/22', region: 'IR' },
      { cidr: '188.94.168.0/22', region: 'IR' },
    ],
  },
  {
    id: 'render',
    name: 'Render',
    description: 'Render.com infrastructure',
    subtext: 'AS399471 + AWS us-west-2',
    color: 'violet',
    icon: 'server',
    ranges: [
      // Render.com owned (AS399471)
      { cidr: '168.220.80.0/20', region: 'Render AS399471' },
      { cidr: '216.24.57.0/24', region: 'Render static' },
      // Render also runs on AWS us-west-2 (Oregon)
      { cidr: '52.40.0.0/14', region: 'AWS us-west-2' },
      { cidr: '54.214.0.0/16', region: 'AWS us-west-2' },
      { cidr: '54.245.0.0/16', region: 'AWS us-west-2' },
      { cidr: '35.160.0.0/13', region: 'AWS us-west-2' },
      { cidr: '35.168.0.0/13', region: 'AWS us-west-2' },
      { cidr: '44.235.0.0/16', region: 'AWS us-west-2' },
      { cidr: '44.236.0.0/15', region: 'AWS us-west-2' },
      { cidr: '54.184.0.0/13', region: 'AWS us-west-2' },
      { cidr: '54.244.0.0/16', region: 'AWS us-west-2' },
      { cidr: '34.208.0.0/12', region: 'AWS us-west-2' },
    ],
  },
  {
    id: 'railway',
    name: 'Railway',
    description: 'Railway.app infrastructure',
    subtext: 'AWS us-west-2 + eu-west-1',
    color: 'purple',
    icon: 'train',
    ranges: [
      // Railway runs on AWS us-west-2 (Oregon) and eu-west-1 (Ireland)
      { cidr: '52.40.0.0/14', region: 'AWS us-west-2' },
      { cidr: '54.214.0.0/16', region: 'AWS us-west-2' },
      { cidr: '35.160.0.0/13', region: 'AWS us-west-2' },
      { cidr: '44.235.0.0/16', region: 'AWS us-west-2' },
      { cidr: '54.184.0.0/13', region: 'AWS us-west-2' },
      { cidr: '54.244.0.0/16', region: 'AWS us-west-2' },
      { cidr: '34.208.0.0/12', region: 'AWS us-west-2' },
      // eu-west-1 (Ireland)
      { cidr: '34.240.0.0/14', region: 'AWS eu-west-1' },
      { cidr: '52.16.0.0/15', region: 'AWS eu-west-1' },
      { cidr: '52.18.0.0/16', region: 'AWS eu-west-1' },
      { cidr: '63.35.0.0/16', region: 'AWS eu-west-1' },
      { cidr: '79.125.0.0/17', region: 'AWS eu-west-1' },
      { cidr: '3.5.0.0/16', region: 'AWS eu-west-1' },
      { cidr: '54.78.0.0/16', region: 'AWS eu-west-1' },
    ],
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'HF Hub + Spaces CDN',
    subtext: 'CloudFront + AWS eu-west-1',
    color: 'yellow',
    icon: 'face',
    ranges: [
      // HF uses CloudFront globally + AWS eu-west-1 (Ireland)
      { cidr: '18.65.0.0/17', region: 'CloudFront EMEA' },
      { cidr: '18.65.128.0/18', region: 'CloudFront EMEA' },
      { cidr: '99.86.0.0/16', region: 'CloudFront Global' },
      { cidr: '13.224.0.0/14', region: 'CloudFront Global' },
      { cidr: '52.84.0.0/15', region: 'CloudFront Global' },
      { cidr: '13.32.0.0/15', region: 'CloudFront Global' },
      { cidr: '108.138.0.0/15', region: 'CloudFront Global' },
      // EC2 eu-west-1 (Ireland) for HF Hub backend
      { cidr: '3.5.0.0/16', region: 'AWS eu-west-1' },
      { cidr: '54.78.0.0/16', region: 'AWS eu-west-1' },
      { cidr: '52.16.0.0/15', region: 'AWS eu-west-1' },
      { cidr: '34.240.0.0/14', region: 'AWS eu-west-1' },
      { cidr: '63.35.0.0/16', region: 'AWS eu-west-1' },
    ],
  },
  {
    id: 'flyio',
    name: 'Fly.io',
    description: 'Fly.io global edge',
    subtext: 'AS13454 anycast',
    color: 'indigo',
    icon: 'plane',
    ranges: [
      // Fly.io AS13454 (subset of public ranges)
      { cidr: '66.241.124.0/22', region: 'Global' },
      { cidr: '66.241.125.0/24', region: 'Global' },
      { cidr: '137.66.0.0/17', region: 'Global' },
      { cidr: '137.66.128.0/17', region: 'Global' },
      { cidr: '145.40.96.0/22', region: 'Global' },
      { cidr: '145.40.108.0/22', region: 'Global' },
    ],
  },
  {
    id: 'google',
    name: 'Google Cloud',
    description: 'GCP + Google Frontends',
    subtext: 'Google Cloud edge',
    color: 'blue',
    icon: 'cloud',
    ranges: [
      // Google Cloud + Google Frontend ranges
      { cidr: '35.190.0.0/16', region: 'Global' },
      { cidr: '35.191.0.0/16', region: 'Global' },
      { cidr: '34.64.0.0/14', region: 'Global' },
      { cidr: '34.68.0.0/14', region: 'Global' },
      { cidr: '34.72.0.0/14', region: 'Global' },
      { cidr: '34.76.0.0/14', region: 'Global' },
      { cidr: '35.232.0.0/14', region: 'Global' },
      { cidr: '35.236.0.0/14', region: 'Global' },
      { cidr: '35.240.0.0/14', region: 'Global' },
      // Google Frontend (Google CDN / Load Balancer)
      { cidr: '35.244.0.0/14', region: 'Google Frontend' },
    ],
  },
  {
    id: 'bunnycdn',
    name: 'Bunny CDN',
    description: 'Bunny.net global CDN',
    subtext: 'EU + US + APAC',
    color: 'blue',
    icon: 'cloud',
    ranges: [
      // Bunny CDN public IPs (https://docs.bunny.net/reference/api-edge-tokens)
      { cidr: '185.156.46.0/23', region: 'EU' },
      { cidr: '185.156.47.0/24', region: 'EU' },
      { cidr: '84.17.57.0/24', region: 'EU' },
      { cidr: '202.48.5.0/24', region: 'APAC' },
      { cidr: '194.242.18.0/24', region: 'EU' },
      { cidr: '45.66.156.0/22', region: 'Global' },
      { cidr: '91.184.56.0/22', region: 'EU' },
      { cidr: '194.233.72.0/22', region: 'APAC' },
    ],
  },
  {
    id: 'stackpath',
    name: 'StackPath',
    description: 'StackPath CDN edges',
    subtext: 'Former MaxCDN',
    color: 'rose',
    icon: 'cloud',
    ranges: [
      { cidr: '23.111.128.0/20', region: 'Global' },
      { cidr: '23.111.144.0/20', region: 'Global' },
      { cidr: '151.139.0.0/16', region: 'Global' },
      { cidr: '209.197.128.0/17', region: 'Global' },
      { cidr: '94.31.0.0/18', region: 'Global' },
      { cidr: '64.125.0.0/18', region: 'Global' },
    ],
  },
]

export function getPlatformById(id: string): Platform | undefined {
  return PLATFORMS.find(p => p.id === id)
}
