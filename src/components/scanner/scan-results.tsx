'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown, Copy, Loader2, ShieldCheck, Activity, Sparkles, Zap } from 'lucide-react'
import { ScanResult, ScanProgress, ParsedConfig } from '@/lib/scanner/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ScanResultsProps {
  results: ScanResult[]
  status: 'idle' | 'scanning' | 'stopped' | 'completed'
  progress: ScanProgress | null
  sampleConfig?: ParsedConfig | null
}

type SortKey = 'latency' | 'ip' | 'port' | 'configLatency'

export function ScanResults({ results, status, progress, sampleConfig }: ScanResultsProps) {
  const [sortKey, setSortKey] = useState<SortKey>('latency')
  const [asc, setAsc] = useState(true)
  const [onlyConfigOk, setOnlyConfigOk] = useState(false)

  const filtered = useMemo(() => {
    if (onlyConfigOk && sampleConfig) {
      return results.filter(r => r.configOk)
    }
    return results
  }, [results, onlyConfigOk, sampleConfig])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'latency') cmp = a.latencyMs - b.latencyMs
      if (sortKey === 'ip') cmp = a.ip.localeCompare(b.ip, undefined, { numeric: true })
      if (sortKey === 'port') cmp = a.port - b.port
      if (sortKey === 'configLatency') cmp = (a.configLatencyMs || 99999) - (b.configLatencyMs || 99999)
      return asc ? cmp : -cmp
    })
    return arr
  }, [filtered, sortKey, asc])

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setAsc(!asc)
    else { setSortKey(k); setAsc(true) }
  }

  const copyIp = (ip: string) => {
    navigator.clipboard.writeText(ip)
    toast.success(`کپی شد: ${ip}`)
  }

  const copyAll = () => {
    const text = sorted.map(r => r.ip).join('\n')
    navigator.clipboard.writeText(text)
    toast.success(`${sorted.length} آی‌پی کپی شد`)
  }

  const latencyColor = (ms: number) => {
    if (ms < 200) return 'text-emerald-300'
    if (ms < 600) return 'text-amber-300'
    return 'text-orange-300'
  }

  return (
    <Card className="border-white/5 bg-[#0f141b] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold">نتایج اسکن</h3>
          <Badge variant="outline" className="border-white/10 text-zinc-400">
            {filtered.length} آی‌پی
          </Badge>
          {sampleConfig && (
            <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-300">
              <Sparkles className="h-3 w-3 ml-1" />
              {results.filter(r => r.configOk).length} تست موفق ({results.filter(r => r.configOk && r.configStatus === 101).length} قطعی)
            </Badge>
          )}
          {status === 'scanning' && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {sampleConfig && (
            <button
              onClick={() => setOnlyConfigOk(!onlyConfigOk)}
              className={cn(
                'text-[11px] px-2 py-1 rounded-md transition',
                onlyConfigOk
                  ? 'bg-violet-500/20 ring-1 ring-violet-500/30 text-violet-300'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              )}
            >
              {onlyConfigOk ? '✓ فقط تست‌شده با کانفیگ' : 'فقط تست‌شده با کانفیگ'}
            </button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-zinc-300 hover:text-white hover:bg-white/5 h-8"
            onClick={copyAll}
            disabled={sorted.length === 0}
          >
            <Copy className="h-3.5 w-3.5 ml-1" />
            کپی همه
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="p-10 text-center text-sm text-zinc-500">
          {status === 'idle' && 'هنوز اسکنی انجام نشده — دکمه شروع رو بزن'}
          {status === 'scanning' && 'در حال جستجوی آی‌پی‌های تمیز...'}
          {status === 'completed' && (onlyConfigOk ? 'هیچ IP تست‌شده با کانفیگ پیدا نشد' : 'نتیجه‌ای پیدا نشد — تنظیمات رو تغییر بده')}
          {status === 'stopped' && 'اسکن متوقف شد'}
        </div>
      ) : (
        <div className="max-h-[480px] overflow-y-auto custom-scroll">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0f141b] z-10">
              <tr className="text-[11px] uppercase tracking-wider text-zinc-500 border-b border-white/5">
                <th className="px-4 py-2 text-right font-medium">
                  <button onClick={() => toggleSort('ip')} className="inline-flex items-center gap-1 hover:text-zinc-300">
                    آی‌پی <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-2 text-right font-medium">پورت</th>
                <th className="px-4 py-2 text-right font-medium">پینگ</th>
                <th className="px-4 py-2 text-right font-medium">
                  <button onClick={() => toggleSort('latency')} className="inline-flex items-center gap-1 hover:text-zinc-300">
                    تأخیر <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-2 text-right font-medium">TLS</th>
                <th className="px-4 py-2 text-right font-medium">HTTP</th>
                {sampleConfig && (
                  <th className="px-4 py-2 text-right font-medium">
                    <button onClick={() => toggleSort('configLatency')} className="inline-flex items-center gap-1 hover:text-zinc-300">
                      <Sparkles className="h-3 w-3 text-violet-400" /> تست کانفیگ <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                )}
                <th className="px-4 py-2 text-left font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={`${r.ip}-${r.port}-${i}`}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-zinc-200">{r.ip}</td>
                  <td className="px-4 py-2.5 font-mono text-zinc-400">{r.port}</td>
                  <td className="px-4 py-2.5">
                    {r.pingMethod === 'icmp' ? (
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px]">
                        <Zap className="h-2.5 w-2.5 ml-1" />ICMP
                      </Badge>
                    ) : r.pingMethod === 'tcp' ? (
                      <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-300 text-[10px]">
                        TCP
                      </Badge>
                    ) : (
                      <span className="text-zinc-600 text-[10px]">—</span>
                    )}
                  </td>
                  <td className={cn('px-4 py-2.5 font-mono tabular-nums', latencyColor(r.latencyMs))}>
                    {r.latencyMs}ms
                  </td>
                  <td className="px-4 py-2.5">
                    {r.tlsOk === undefined ? (
                      <span className="text-zinc-600">—</span>
                    ) : r.tlsOk ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <span className="text-red-400">✕</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.httpOk === undefined ? (
                      <span className="text-zinc-600">—</span>
                    ) : r.httpOk ? (
                      <span className="text-emerald-300 font-mono text-xs">{r.httpStatus || 'OK'}</span>
                    ) : (
                      <span className="text-red-400">✕</span>
                    )}
                  </td>
                  {sampleConfig && (
                    <td className="px-4 py-2.5">
                      {r.configOk ? (
                        <div className="flex items-center gap-1.5">
                          {r.configStatus === 101 ? (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px]">
                              <Sparkles className="h-2.5 w-2.5 ml-1" />101 قطعی
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px]">
                              <Sparkles className="h-2.5 w-2.5 ml-1" />{r.configStatus || '?'}
                            </Badge>
                          )}
                          {r.configLatencyMs && (
                            <span className="text-[11px] text-zinc-500 font-mono">{r.configLatencyMs}ms</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-xs">✕</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-left">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-zinc-300 hover:text-white hover:bg-white/5"
                      onClick={() => copyIp(r.ip)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status === 'scanning' && progress && (
        <div className="px-4 py-2 border-t border-white/5 bg-emerald-500/5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>
              پیشرفت: {progress.scanned.toLocaleString('fa-IR')} / {progress.total.toLocaleString('fa-IR')}
              {' · '}زنده: {progress.alive.toLocaleString('fa-IR')}
              {sampleConfig && progress.configOk > 0 && (
                <span className="mr-2 text-violet-300">· تست موفق: {progress.configOk.toLocaleString('fa-IR')}</span>
              )}
            </span>
            <span className="font-mono">
              {progress.total > 0 ? ((progress.scanned / progress.total) * 100).toFixed(1) : '0'}%
            </span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
              style={{ width: `${progress.total > 0 ? (progress.scanned / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
