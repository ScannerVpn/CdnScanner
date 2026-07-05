'use client'

import { useEffect, useState, useRef } from 'react'
import { useScanner } from '@/lib/scanner/store'
import { startScan, stopScan, fetchPlatforms, ScanHandle, hasServerScanner } from '@/lib/scanner/sse-client'
import { StatusPanel } from './status-panel'
import { StatsCards } from './stats-cards'
import { PlatformGrid } from './platform-grid'
import { ScanResults } from './scan-results'
import { ExportDialog } from './export-dialog'
import { SettingsDialog } from './settings-dialog'
import { HttpScannerDialog } from './http-scanner-dialog'
import { SampleConfigDialog } from './sample-config-dialog'
import { Globe, Settings, Download, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { describeConfig } from '@/lib/scanner/sample-config'

export function ScannerShell() {
  const {
    connected, platforms, scannerMode, selectedPlatformId, status, progress, results, config, sessionId,
    sampleConfig, sampleConfigText,
    setConnected, setPlatforms, setScannerMode, selectPlatform, setStatus, setProgress, addResult, clearResults,
    setSessionId, setSampleConfig,
  } = useScanner()

  const [exportOpen, setExportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [httpOpen, setHttpOpen] = useState(false)
  const [sampleConfigOpen, setSampleConfigOpen] = useState(false)
  const scanHandleRef = useRef<ScanHandle | null>(null)

  useEffect(() => {
    let mounted = true
    fetchPlatforms()
      .then((p) => { if (mounted) { setPlatforms(p); setConnected(true) } })
      .catch(() => { if (mounted) { setConnected(false); toast.error('بارگذاری پلتفرم‌ها ناموفق بود') } })
    // Detect backend mode once at startup
    hasServerScanner().then((has) => {
      if (mounted) setScannerMode(has ? 'server' : 'client')
    })
    return () => { mounted = false }
  }, [])

  const sendStart = async () => {
    if (selectedPlatformId === 'http-scanner' && (!config.customIpList || config.customIpList.length === 0)) {
      setHttpOpen(true)
      toast.info('برای HTTP Scanner اول لیست آی‌پی/دامنه را وارد کن')
      return
    }
    clearResults()
    setStatus('scanning')
    setProgress({
      total: 0, scanned: 0, alive: 0, configOk: 0, elapsedMs: 0, status: 'scanning',
      currentPlatform: platforms.find(p => p.id === selectedPlatformId)?.name,
    })

    try {
      const handle = await startScan(
        selectedPlatformId,
        {
          ports: config.ports,
          timeoutMs: config.timeoutMs,
          concurrency: config.concurrency,
          maxIpsPerRange: config.maxIpsPerRange,
          checkTls: config.checkTls,
          checkHttp: config.checkHttp,
          sniHost: config.sniHost,
          maxLatencyMs: config.maxLatencyMs,
          selectedRanges: config.selectedRanges,
          realPing: config.realPing,
          scanAllIps: config.scanAllIps,
        },
        config.customIpList,
        sampleConfigText || undefined,  // pass sample config text
        {
          onSession: (id) => setSessionId(id),
          onProgress: (p) => setProgress(p),
          onResult: (r) => addResult(r),
          onDone: (d) => {
            setStatus('completed')
            const msg = sampleConfig
              ? `اسکن کامل شد — ${useScanner.getState().results.length} آی‌پی (${(d as any)?.configOk || 0} تست کانفیگ موفق)`
              : `اسکن کامل شد — ${useScanner.getState().results.length} آی‌پی زنده`
            toast.success(msg)
          },
          onError: (e) => {
            setStatus('idle')
            toast.error(`خطا: ${e.message}`)
          },
        },
      )
      scanHandleRef.current = handle
    } catch (e: any) {
      setStatus('idle')
      toast.error(`شروع ناموفق: ${e?.message}`)
    }
  }

  const sendStop = async () => {
    if (sessionId) await stopScan(sessionId)
    if (scanHandleRef.current) {
      await scanHandleRef.current.cancel()
      scanHandleRef.current = null
    }
    setStatus('stopped')
    toast.info('توقف درخواست شد')
  }

  const selectedPlatform = platforms.find(p => p.id === selectedPlatformId)

  return (
    <div className="min-h-screen bg-[#0a0d12] text-zinc-100" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0d12]/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
              <Globe className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">SNI Scanner</h1>
              <p className="text-[11px] text-zinc-500">داشبورد اسکنر آی‌پی تمیز</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                scannerMode === 'server'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : scannerMode === 'client'
                  ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                  : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300'
              }
              title={scannerMode === 'server' ? 'Node backend (server-side scanner)' : scannerMode === 'client' ? 'Browser-based scanner (static / Tauri)' : 'در حال بررسی…'}
            >
              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                scannerMode === 'server' ? 'bg-emerald-400' :
                scannerMode === 'client' ? 'bg-sky-400' : 'bg-zinc-500'
              }`} />
              {scannerMode === 'server' ? 'سرور' : scannerMode === 'client' ? 'کلاینت' : '...'}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className={`text-zinc-300 hover:text-white hover:bg-white/5 ${sampleConfig ? 'ring-1 ring-emerald-500/30' : ''}`}
              onClick={() => setSampleConfigOpen(true)}
            >
              <Sparkles className="h-4 w-4 ml-1 text-emerald-400" />
              کانفیگ نمونه
              {sampleConfig && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-zinc-300 hover:text-white hover:bg-white/5"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4 ml-1" />
              تنظیمات
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-zinc-300 hover:text-white hover:bg-white/5"
              onClick={() => setExportOpen(true)}
              disabled={results.length === 0}
            >
              <Download className="h-4 w-4 ml-1" />
              خروجی V2Ray
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <StatusPanel
          status={status}
          platformName={selectedPlatform?.name}
          onStart={sendStart}
          onStop={sendStop}
          sampleConfig={sampleConfig}
        />
        <StatsCards progress={progress} aliveCount={results.length} configOkCount={results.filter(r => r.configOk).length} />

        {/* Quick settings row — real ping toggle + sample config indicator */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Real ping toggle card */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0f141b] border border-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`grid h-8 w-8 place-items-center rounded-md shrink-0 ${config.realPing ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30' : 'bg-white/5 ring-1 ring-white/10'}`}>
                <Zap className={`h-4 w-4 ${config.realPing ? 'text-emerald-400' : 'text-zinc-500'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200">پینگ واقعی (ICMP)</p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {config.realPing ? 'پینگ ICMP واقعی در صورت دسترسی' : 'استفاده از پینگ TCP'}
                </p>
              </div>
            </div>
            <Switch
              checked={config.realPing}
              onCheckedChange={(v) => useScanner.getState().updateConfig({ realPing: v })}
              id="realPing"
              className="shrink-0"
            />
          </div>

          {/* Sample config card */}
          <button
            onClick={() => setSampleConfigOpen(true)}
            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0f141b] border border-white/5 hover:bg-[#131922] transition text-right"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`grid h-8 w-8 place-items-center rounded-md shrink-0 ${sampleConfig ? 'bg-violet-500/15 ring-1 ring-violet-500/30' : 'bg-white/5 ring-1 ring-white/10'}`}>
                <Sparkles className={`h-4 w-4 ${sampleConfig ? 'text-violet-400' : 'text-zinc-500'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200">
                  کانفیگ نمونه {sampleConfig && <span className="text-violet-300">✓ فعال</span>}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {sampleConfig
                    ? describeConfig(sampleConfig).slice(0, 50) + '...'
                    : 'تست IP ها با کانفیگ واقعی شما'}
                </p>
              </div>
            </div>
            <span className="text-[11px] text-emerald-300 underline underline-offset-2 shrink-0">
              {sampleConfig ? 'ویرایش' : 'افزودن'}
            </span>
          </button>
        </div>

        <PlatformGrid
          platforms={platforms}
          selectedId={selectedPlatformId}
          onSelect={selectPlatform}
          onOpenHttpScanner={() => setHttpOpen(true)}
        />
        <ScanResults results={results} status={status} progress={progress} sampleConfig={sampleConfig} />

        <footer className="mt-12 pt-6 border-t border-white/5 text-[11px] text-zinc-500 flex flex-wrap items-center justify-between gap-3">
          <span>
            ساخته‌شده برای پیدا کردن IP تمیز CDN — اسکن از طریق Next.js API با SSE زنده
          </span>
          <span className="font-mono">
            SNI: <span className="text-zinc-300">{sampleConfig?.sni || config.sniHost}</span> · پورت‌ها:{' '}
            <span className="text-zinc-300">{config.ports.join(', ')}</span>
          </span>
        </footer>
      </main>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} results={results} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <HttpScannerDialog open={httpOpen} onOpenChange={setHttpOpen} />
      <SampleConfigDialog open={sampleConfigOpen} onOpenChange={setSampleConfigOpen} />
    </div>
  )
}
