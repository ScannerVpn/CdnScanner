'use client'

import { Card } from '@/components/ui/card'
import { Activity, Server, CheckCircle2, Clock, Sparkles } from 'lucide-react'
import { ScanProgress } from '@/lib/scanner/types'

interface StatsCardsProps {
  progress: ScanProgress | null
  aliveCount: number
  configOkCount: number
}

function fmtTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  const rem = (s - m * 60).toFixed(0)
  return `${m}m ${rem}s`
}

export function StatsCards({ progress, aliveCount, configOkCount }: StatsCardsProps) {
  const total = progress?.total ?? 0
  const scanned = progress?.scanned ?? 0
  const elapsed = progress?.elapsedMs ?? 0

  const cards = [
    { label: 'کل', value: total.toLocaleString('fa-IR'), icon: Server, color: 'text-zinc-300', ring: 'ring-zinc-500/20', bg: 'bg-zinc-500/10' },
    { label: 'اسکن‌شده', value: scanned.toLocaleString('fa-IR'), icon: Activity, color: 'text-sky-300', ring: 'ring-sky-500/20', bg: 'bg-sky-500/10' },
    { label: 'زنده', value: aliveCount.toLocaleString('fa-IR'), icon: CheckCircle2, color: 'text-emerald-300', ring: 'ring-emerald-500/20', bg: 'bg-emerald-500/10' },
    { label: 'تست کانفیگ', value: configOkCount.toLocaleString('fa-IR'), icon: Sparkles, color: 'text-violet-300', ring: 'ring-violet-500/20', bg: 'bg-violet-500/10' },
    { label: 'زمان', value: fmtTime(elapsed), icon: Clock, color: 'text-amber-300', ring: 'ring-amber-500/20', bg: 'bg-amber-500/10' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="border-white/5 bg-[#0f141b] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500">{c.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
            <div className={`grid h-9 w-9 place-items-center rounded-lg ${c.bg} ring-1 ${c.ring}`}>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
