'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Play, Square, Loader2, CheckCircle2, Ban, Sparkles } from 'lucide-react'
import { ParsedConfig } from '@/lib/scanner/types'
import { describeConfig } from '@/lib/scanner/sample-config'

interface StatusPanelProps {
  status: 'idle' | 'scanning' | 'stopped' | 'completed'
  platformName?: string
  onStart: () => void
  onStop: () => void
  sampleConfig?: ParsedConfig | null
}

export function StatusPanel({ status, platformName, onStart, onStop, sampleConfig }: StatusPanelProps) {
  const isScanning = status === 'scanning'

  return (
    <Card className="relative overflow-hidden border-white/5 bg-gradient-to-br from-[#0f141b] to-[#0a0d12] p-6">
      <div className="absolute inset-0 opacity-30 pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.12), transparent 50%)' }} />
      <div className="relative flex flex-col items-center justify-center py-6 gap-4 text-center">
        {status === 'idle' && (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-zinc-700/30 ring-1 ring-zinc-600/40">
            <div className="h-3 w-3 rounded-full bg-zinc-500" />
          </div>
        )}
        {isScanning && (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 animate-pulse">
            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          </div>
        )}
        {status === 'completed' && (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
        )}
        {status === 'stopped' && (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/30">
            <Ban className="h-8 w-8 text-amber-400" />
          </div>
        )}

        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">
            {status === 'idle' && 'آماده'}
            {isScanning && 'در حال اسکن'}
            {status === 'completed' && 'اسکن کامل شد'}
            {status === 'stopped' && 'متوقف شد'}
          </h2>
          <p className="text-sm text-zinc-400">
            {status === 'idle' && (platformName ? `پلتفرم انتخابی: ${platformName} — برای شروع دکمه‌ی زیر را بزن` : 'پلتفرمی را انتخاب کن یا دکمه شروع را بزن')}
            {isScanning && (platformName ? `اسکن ${platformName} در حال اجراست` : 'در حال اسکن...')}
            {status === 'completed' && 'می‌تونی نتایج رو تو جدول زیر ببینی و خروجی V2Ray بگیری'}
            {status === 'stopped' && 'اسکن متوقف شد — می‌تونی دوباره شروع کنی'}
          </p>
          {sampleConfig && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 text-[11px] text-emerald-300">
              <Sparkles className="h-3 w-3" />
              <span>تست با کانفیگ فعال:</span>
              <span className="font-mono" dir="ltr">{describeConfig(sampleConfig).slice(0, 50)}...</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!isScanning ? (
            <Button
              onClick={onStart}
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
            >
              <Play className="h-4 w-4 ml-2" />
              شروع اسکن
            </Button>
          ) : (
            <Button
              onClick={onStop}
              size="lg"
              variant="destructive"
              className="bg-red-500/90 hover:bg-red-500"
            >
              <Square className="h-4 w-4 ml-2" />
              توقف
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
