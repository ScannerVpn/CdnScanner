'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useScanner } from '@/lib/scanner/store'
import { toast } from 'sonner'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { config, updateConfig } = useScanner()

  const portOptions = [
    { label: '443 (HTTPS)', value: '443' },
    { label: '80 (HTTP)', value: '80' },
    { label: '2053', value: '2053' },
    { label: '2083', value: '2083' },
    { label: '2087', value: '2087' },
    { label: '2096', value: '2096' },
    { label: '8443', value: '8443' },
    { label: '2052', value: '2052' },
    { label: '2082', value: '2082' },
    { label: '2086', value: '2086' },
    { label: '2095', value: '2095' },
    { label: '8080', value: '8080' },
    { label: '8880', value: '8880' },
  ]

  const togglePort = (p: string) => {
    const pn = Number(p)
    const has = config.ports.includes(pn)
    const next = has ? config.ports.filter(x => x !== pn) : [...config.ports, pn].sort((a, b) => a - b)
    updateConfig({ ports: next.length ? next : [443] })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto custom-scroll bg-[#0f141b] border-white/10 text-zinc-100" dir="rtl">
        <DialogHeader>
          <DialogTitle>تنظیمات اسکنر</DialogTitle>
          <DialogDescription className="text-zinc-400">
            پارامترهای اتصال و تست رو تنظیم کن — تأثیر مستقیم روی دقت و سرعت اسکن
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* SNI Host */}
          <div>
            <Label className="text-xs text-zinc-400">SNI / Host تست</Label>
            <Input
              value={config.sniHost}
              onChange={(e) => updateConfig({ sniHost: e.target.value })}
              placeholder="speedtest.net"
              className="bg-[#0a0d12] border-white/10 mt-1 font-mono"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              دامنه‌ای که برای handshake و HTTP HEAD استفاده میشه — معمولاً یه دامنه روی CDN
            </p>
          </div>

          {/* Ports */}
          <div>
            <Label className="text-xs text-zinc-400">پورت‌های اسکن</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {portOptions.map((p) => {
                const active = config.ports.includes(Number(p.value))
                return (
                  <button
                    key={p.value}
                    onClick={() => togglePort(p.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition ${
                      active
                        ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-300'
                        : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Concurrency */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-400">همزمانی</Label>
              <span className="text-xs font-mono text-emerald-300">{config.concurrency}</span>
            </div>
            <Slider
              value={[config.concurrency]}
              onValueChange={(v) => updateConfig({ concurrency: v[0] })}
              min={5}
              max={200}
              step={5}
              className="mt-2"
            />
            <p className="text-[11px] text-zinc-500 mt-1">تعداد سوکت‌های همزمان — بیشتر = سریع‌تر ولی فشار بیشتر</p>
          </div>

          {/* Timeout */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-400">Timeout (ms)</Label>
              <span className="text-xs font-mono text-emerald-300">{config.timeoutMs}</span>
            </div>
            <Slider
              value={[config.timeoutMs]}
              onValueChange={(v) => updateConfig({ timeoutMs: v[0] })}
              min={500}
              max={10000}
              step={500}
              className="mt-2"
            />
          </div>

          {/* Max latency */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-400">حداکثر تأخیر مجاز (ms)</Label>
              <span className="text-xs font-mono text-emerald-300">{config.maxLatencyMs}</span>
            </div>
            <Slider
              value={[config.maxLatencyMs]}
              onValueChange={(v) => updateConfig({ maxLatencyMs: v[0] })}
              min={100}
              max={5000}
              step={100}
              className="mt-2"
            />
          </div>

          {/* IPs per range */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-400">نمونه IP در هر CIDR</Label>
              <span className="text-xs font-mono text-emerald-300">{config.maxIpsPerRange}</span>
            </div>
            <Slider
              value={[config.maxIpsPerRange]}
              onValueChange={(v) => updateConfig({ maxIpsPerRange: v[0] })}
              min={4}
              max={512}
              step={4}
              className="mt-2"
            />
            <p className="text-[11px] text-zinc-500 mt-1">برای هر رنج CIDR به این تعداد IP تصادفی تست میشه — هرچی بیشتر، پوشش بهتر</p>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">تست TLS SNI</p>
                <p className="text-[11px] text-zinc-500">handshake واقعی TLS با servername</p>
              </div>
              <Switch checked={config.checkTls} onCheckedChange={(v) => updateConfig({ checkTls: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">تست HTTP HEAD</p>
                <p className="text-[11px] text-zinc-500">درخواست HEAD با Host header برای راستی‌آزمایی</p>
              </div>
              <Switch checked={config.checkHttp} onCheckedChange={(v) => updateConfig({ checkHttp: v })} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => { toast.success('تنظیمات ذخیره شد'); onOpenChange(false) }}
            className="bg-emerald-500 hover:bg-emerald-400 text-black"
          >
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
