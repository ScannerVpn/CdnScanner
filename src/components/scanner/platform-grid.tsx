'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cloud, FileText, Check, Server, Train, Smile, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { Platform, PlatformRange } from '@/lib/scanner/types'
import { cidrToIpCount } from '@/lib/scanner/platforms'
import { useScanner } from '@/lib/scanner/store'
import { cn } from '@/lib/utils'

interface PlatformGridProps {
  platforms: Platform[]
  selectedId: string
  onSelect: (id: string) => void
  onOpenHttpScanner: () => void
}

const COLOR_MAP: Record<string, { bg: string; ring: string; text: string }> = {
  emerald: { bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20', text: 'text-emerald-300' },
  orange:  { bg: 'bg-orange-500/10',  ring: 'ring-orange-500/20',  text: 'text-orange-300'  },
  amber:   { bg: 'bg-amber-500/10',   ring: 'ring-amber-500/20',   text: 'text-amber-300'   },
  red:     { bg: 'bg-red-500/10',     ring: 'ring-red-500/20',     text: 'text-red-300'     },
  slate:   { bg: 'bg-slate-500/10',   ring: 'ring-slate-500/20',   text: 'text-slate-300'   },
  sky:     { bg: 'bg-sky-500/10',     ring: 'ring-sky-500/20',     text: 'text-sky-300'     },
  rose:    { bg: 'bg-rose-500/10',    ring: 'ring-rose-500/20',    text: 'text-rose-300'    },
  teal:    { bg: 'bg-teal-500/10',    ring: 'ring-teal-500/20',    text: 'text-teal-300'    },
  violet:  { bg: 'bg-violet-500/10',  ring: 'ring-violet-500/20',  text: 'text-violet-300'  },
  purple:  { bg: 'bg-purple-500/10',  ring: 'ring-purple-500/20',  text: 'text-purple-300'  },
  yellow:  { bg: 'bg-yellow-500/10',  ring: 'ring-yellow-500/20',  text: 'text-yellow-300'  },
  indigo:  { bg: 'bg-indigo-500/10',  ring: 'ring-indigo-500/20',  text: 'text-indigo-300'  },
  blue:    { bg: 'bg-blue-500/10',    ring: 'ring-blue-500/20',    text: 'text-blue-300'    },
}

function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  if (platform.id === 'http-scanner') return <FileText className={className} />
  if (platform.id === 'render') return <Server className={className} />
  if (platform.id === 'railway') return <Train className={className} />
  if (platform.id === 'huggingface') return <Smile className={className} />
  return <Cloud className={className} />
}

export function PlatformGrid({ platforms, selectedId, onSelect, onOpenHttpScanner }: PlatformGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { config, setSelectedRanges } = useScanner()
  const selectedRanges = config.selectedRanges || []

  const handleCardClick = (id: string, isHttp: boolean) => {
    onSelect(id)
    setExpandedId(expandedId === id ? null : id)
    if (isHttp) onOpenHttpScanner()
    // Auto-select all ranges when clicking a platform (first time or re-click)
    if (!isHttp) {
      const platform = platforms.find(p => p.id === id)
      if (platform && platform.ranges.length > 0) {
        const platformCidrs = platform.ranges.map(r => r.cidr)
        const allReady = platformCidrs.every(c => selectedRanges.includes(c))
        if (!allReady) {
          const others = selectedRanges.filter(r => !platformCidrs.includes(r))
          setSelectedRanges([...others, ...platformCidrs])
        }
      }
    }
  }

  // Toggle a single CIDR (preserve other-platform selections if any)
  const toggleRange = (cidr: string) => {
    const cur = selectedRanges
    const next = cur.includes(cidr) ? cur.filter(r => r !== cidr) : [...cur, cidr]
    setSelectedRanges(next)
  }

  // Select all ranges for THIS platform (only — replace others from same platform)
  const selectAllForPlatform = (p: Platform) => {
    const platformCidrs = new Set(p.ranges.map(r => r.cidr))
    const others = selectedRanges.filter(r => !platformCidrs.has(r))
    setSelectedRanges([...others, ...p.ranges.map(r => r.cidr)])
  }

  // Clear ranges for THIS platform only
  const clearForPlatform = (p: Platform) => {
    const platformCidrs = new Set(p.ranges.map(r => r.cidr))
    setSelectedRanges(selectedRanges.filter(r => !platformCidrs.has(r)))
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wider text-zinc-500">پلتفرم‌ها</h3>
        <Badge variant="outline" className="border-white/10 text-zinc-400">
          {platforms.length} موجود
        </Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {platforms.map((p) => {
          const c = COLOR_MAP[p.color] || COLOR_MAP.emerald
          const isSelected = p.id === selectedId
          const isExpanded = expandedId === p.id
          const isHttp = p.id === 'http-scanner'
          const selectedCount = p.ranges.filter(r => selectedRanges.includes(r.cidr)).length
          const allSelected = selectedCount === p.ranges.length && p.ranges.length > 0

          return (
            <Card
              key={p.id}
              className={cn(
                'relative border bg-[#0f141b] transition-all',
                isSelected ? `border-white/20 ring-1 ${c.ring}` : 'border-white/5',
              )}
            >
              <button
                onClick={() => handleCardClick(p.id, isHttp)}
                className="w-full text-right p-4 flex items-start gap-3 cursor-pointer"
              >
                <div className={cn('grid h-10 w-10 place-items-center rounded-lg shrink-0', c.bg, 'ring-1', c.ring)}>
                  <PlatformIcon platform={p} className={cn('h-5 w-5', c.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-zinc-100 truncate">{p.name}</h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected && (
                        <div className={cn('grid h-5 w-5 place-items-center rounded-full', c.bg)}>
                          <Check className={cn('h-3 w-3', c.text)} />
                        </div>
                      )}
                      {p.ranges.length > 0 && (
                        isExpanded
                          ? <ChevronUp className="h-4 w-4 text-zinc-500" />
                          : <ChevronDown className="h-4 w-4 text-zinc-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-[12px] text-zinc-400 mt-0.5 truncate">{p.description}</p>
                  <p className="text-[11px] text-zinc-500 mt-1.5 font-mono">
                    {p.subtext}
                    {p.ranges.length > 0 && (
                      <span className="mr-2">· {p.ranges.length} رنج</span>
                    )}
                  </p>
                </div>
              </button>

              {/* Range selection — expandable */}
              {isExpanded && p.ranges.length > 0 && (
                <div className="border-t border-white/5 px-4 py-3 bg-[#0a0d12]">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <p className="text-[11px] text-zinc-400">
                      رنج‌های قابل اسکن ({selectedCount} از {p.ranges.length})
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); selectAllForPlatform(p) }}
                        className={cn(
                          'text-[11px] px-2 py-0.5 rounded transition',
                          allSelected
                            ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                            : 'bg-white/5 text-emerald-300 hover:bg-emerald-500/10'
                        )}
                      >
                        همه
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); clearForPlatform(p) }}
                        disabled={selectedCount === 0}
                        className={cn(
                          'text-[11px] px-2 py-0.5 rounded transition',
                          selectedCount === 0
                            ? 'bg-white/5 text-zinc-600 cursor-not-allowed'
                            : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                        )}
                      >
                        هیچ‌کدوم
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {p.ranges.map((r) => {
                      const active = selectedRanges.includes(r.cidr)
                      return (
                        <RangeChip
                          key={r.cidr}
                          range={r}
                          active={active}
                          onToggle={() => toggleRange(r.cidr)}
                        />
                      )
                    })}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-2 leading-relaxed flex flex-wrap items-center gap-2">
                    {selectedCount === 0
                      ? 'همه رنج‌ها اسکن می‌شن — برای محدود کردن، چند رنج رو تیک بزن'
                      : (() => {
                          const totalIps = p.ranges
                            .filter(r => selectedRanges.includes(r.cidr))
                            .reduce((sum, r) => sum + cidrToIpCount(r.cidr), 0)
                          const scannedIps = config.scanAllIps
                            ? totalIps
                            : p.ranges
                                .filter(r => selectedRanges.includes(r.cidr))
                                .reduce((sum, r) => sum + Math.min(config.maxIpsPerRange, cidrToIpCount(r.cidr)), 0)
                          const fmt = (n: number) => n > 1000000 ? `${(n / 1000000).toFixed(1)}M` : n > 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)
                          const scanNote = config.scanAllIps ? '' : ` (اسکن: ${fmt(scannedIps)})`
                          const showAllLink = !config.scanAllIps && totalIps > scannedIps
                          return (
                            <>
                              <span>{`${selectedCount} رنج — ${fmt(totalIps)} IP${scanNote}`}</span>
                              {showAllLink && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    useScanner.getState().updateConfig({ scanAllIps: true })
                                  }}
                                  className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded transition"
                                >
                                  اسکن همه {fmt(totalIps)} IP
                                </button>
                              )}
                            </>
                          )
                        })()}
                  </div>
                </div>
              )}

              {/* HTTP scanner helper text */}
              {isExpanded && isHttp && (
                <div className="border-t border-white/5 px-4 py-3 bg-[#0a0d12]">
                  <p className="text-[11px] text-zinc-400 mb-2">
                    روی «HTTP Scanner» کلیک کن تا لیست IP یا دامنه دلخواهت رو وارد کنی.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/5 border-white/10 text-emerald-300 hover:bg-emerald-500/10"
                    onClick={(e) => { e.stopPropagation(); onOpenHttpScanner() }}
                  >
                    باز کردن فرم لیست IP
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </section>
  )
}

// Separate component for range chip — uses shadcn-style checkbox
function RangeChip({ range, active, onToggle }: { range: PlatformRange; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className={cn(
        'group flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-mono transition text-right',
        active
          ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-200'
          : 'bg-white/5 text-zinc-300 hover:bg-white/10'
      )}
      title={range.region}
    >
      <span className={cn(
        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition',
        active
          ? 'border-emerald-400 bg-emerald-400 text-black'
          : 'border-zinc-500 bg-transparent group-hover:border-zinc-400'
      )}>
        {active && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="flex-1 whitespace-nowrap" dir="ltr">{range.cidr}</span>
      {range.region && (
        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 flex items-center gap-0.5 shrink-0">
          <MapPin className="h-2.5 w-2.5" /> {range.region}
        </span>
      )}
    </button>
  )
}
