'use client'

import { Platform, ScanProgress, ScanResult, ScanConfig, ParsedConfig } from './types'

interface ScannerStore {
  connected: boolean
  platforms: Platform[]
  scannerMode: 'server' | 'client' | 'unknown' // backend detected at runtime
  status: 'idle' | 'scanning' | 'stopped' | 'completed'
  selectedPlatformId: string
  progress: ScanProgress | null
  results: ScanResult[]
  config: ScanConfig
  sessionId: string | null
  // NEW: sample config (parsed)
  sampleConfig: ParsedConfig | null
  sampleConfigText: string

  setConnected: (v: boolean) => void
  setPlatforms: (p: Platform[]) => void
  setScannerMode: (m: 'server' | 'client') => void
  selectPlatform: (id: string) => void
  setStatus: (s: 'idle' | 'scanning' | 'stopped' | 'completed') => void
  setProgress: (p: ScanProgress | null) => void
  addResult: (r: ScanResult) => void
  clearResults: () => void
  updateConfig: (patch: Partial<ScanConfig>) => void
  setCustomIpList: (ips: string[]) => void
  setSelectedRanges: (ranges: string[]) => void
  toggleRange: (cidr: string) => void
  selectAllRanges: () => void
  clearRanges: () => void
  setSessionId: (id: string | null) => void
  setSampleConfig: (c: ParsedConfig | null, text?: string) => void
}

const DEFAULT_CONFIG: ScanConfig = {
  platformId: 'cloudflare',
  ports: [443, 80],
  timeoutMs: 3000,
  concurrency: 50,
  maxIpsPerRange: 128,
  checkTls: true,
  checkHttp: true,
  sniHost: 'speedtest.net',
  maxLatencyMs: 1500,
  realPing: true,
  selectedRanges: [],
  scanAllIps: false,
}

import { create } from 'zustand'

export const useScanner = create<ScannerStore>((set, get) => ({
  connected: false,
  platforms: [],
  scannerMode: 'unknown',
  status: 'idle',
  selectedPlatformId: 'cloudflare',
  progress: null,
  results: [],
  config: DEFAULT_CONFIG,
  sessionId: null,
  sampleConfig: null,
  sampleConfigText: '',

  setConnected: (v) => set({ connected: v }),
  setPlatforms: (p) => set({ platforms: p }),
  setScannerMode: (m) => set({ scannerMode: m }),
  selectPlatform: (id) => set((s) => ({
    selectedPlatformId: id,
    config: { ...s.config, platformId: id, selectedRanges: [] },
  })),
  setStatus: (s) => set({ status: s }),
  setProgress: (p) => set({ progress: p }),
  addResult: (r) => set((s) => ({ results: [...s.results, r] })),
  clearResults: () => set({ results: [], progress: null }),
  updateConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
  setCustomIpList: (ips) => set((s) => ({ config: { ...s.config, customIpList: ips } })),
  setSelectedRanges: (ranges) => set((s) => ({ config: { ...s.config, selectedRanges: ranges } })),
  toggleRange: (cidr) => set((s) => {
    const cur = s.config.selectedRanges || []
    const next = cur.includes(cidr) ? cur.filter(r => r !== cidr) : [...cur, cidr]
    return { config: { ...s.config, selectedRanges: next } }
  }),
  selectAllRanges: () => set((s) => {
    const p = s.platforms.find(p => p.id === s.selectedPlatformId)
    return { config: { ...s.config, selectedRanges: p?.ranges.map(r => r.cidr) || [] } }
  }),
  clearRanges: () => set((s) => ({ config: { ...s.config, selectedRanges: [] } })),
  setSessionId: (id) => set({ sessionId: id }),
  setSampleConfig: (c, text) => set({
    sampleConfig: c,
    sampleConfigText: text !== undefined ? text : get().sampleConfigText,
  }),
}))
