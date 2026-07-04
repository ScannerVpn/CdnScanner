'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Copy, Download, FileJson, Link2, FileText, Sparkles } from 'lucide-react'
import { ScanResult } from '@/lib/scanner/types'
import { exportV2RayJson, exportShareLinks, exportPlainIpList, ExportOptions, V2RayProtocol } from '@/lib/scanner/export'
import { useScanner } from '@/lib/scanner/store'
import { configToShareLink } from '@/lib/scanner/sample-config'
import { toast } from 'sonner'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  results: ScanResult[]
}

export function ExportDialog({ open, onOpenChange, results }: ExportDialogProps) {
  const { sampleConfig } = useScanner()
  // Use sample config uuid as part of a key — we expose a child keyed by it
  return <ExportDialogInner
    key={sampleConfig?.uuid || 'no-sample'}
    open={open}
    onOpenChange={onOpenChange}
    results={results}
    sampleConfig={sampleConfig}
  />
}

interface ExportDialogInnerProps extends ExportDialogProps {
  sampleConfig: ReturnType<typeof useScanner.getState>['sampleConfig']
}

function ExportDialogInner({ open, onOpenChange, results, sampleConfig }: ExportDialogInnerProps) {
  const initFromSample = sampleConfig
  const [protocol, setProtocol] = useState<V2RayProtocol>(initFromSample?.protocol || 'vless')
  const [uuid, setUuid] = useState(initFromSample?.uuid || '8b2ad8f0-aaaa-bbbb-cccc-1234567890ab')
  const [port, setPort] = useState(initFromSample?.port || 443)
  const [sni, setSni] = useState(initFromSample?.sni || 'speedtest.net')
  const [host, setHost] = useState(initFromSample?.host || 'speedtest.net')
  const [path, setPath] = useState(initFromSample?.path || '/ray')
  const [network, setNetwork] = useState<'ws' | 'grpc' | 'tcp'>(initFromSample?.network || 'ws')
  const [security, setSecurity] = useState<'tls' | 'none' | 'reality'>(initFromSample?.security || 'tls')
  const [flow, setFlow] = useState(initFromSample?.flow || '')
  const [remark, setRemark] = useState(initFromSample?.remark || 'CF-Clean')
  const [includeLatency, setIncludeLatency] = useState(true)
  const [onlyConfigOk, setOnlyConfigOk] = useState<boolean>(!!initFromSample)

  const filteredResults = useMemo(() => {
    if (onlyConfigOk && sampleConfig) {
      return results.filter(r => r.configOk)
    }
    return results
  }, [results, onlyConfigOk, sampleConfig])

  const opts: ExportOptions = useMemo(() => ({
    protocol, uuid, port, sni, host, path, network, security, flow, remark, includeLatency,
  }), [protocol, uuid, port, sni, host, path, network, security, flow, remark, includeLatency])

  const jsonOutput = useMemo(() => JSON.stringify(exportV2RayJson(filteredResults, opts), null, 2), [filteredResults, opts])
  const linksOutput = useMemo(() => exportShareLinks(filteredResults, opts), [filteredResults, opts])
  const ipListOutput = useMemo(() => exportPlainIpList(filteredResults), [filteredResults])

  // NEW: when sampleConfig present, generate configs using its actual settings (more accurate)
  const sampleConfigLinks = useMemo(() => {
    if (!sampleConfig) return ''
    return filteredResults
      .map((r, i) => configToShareLink(sampleConfig, r.ip, includeLatency ? `${r.latencyMs}ms` : `${i + 1}`))
      .join('\n')
  }, [sampleConfig, filteredResults, includeLatency])

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} کپی شد`)
  }

  const download = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`دانلود: ${filename}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0f141b] border-white/10 text-zinc-100" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-400" />
            خروجی V2Ray / Xray
            {sampleConfig && (
              <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-300 mr-2">
                <Sparkles className="h-3 w-3 ml-1" />
                با کانفیگ نمونه
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {filteredResults.length} آی‌پی آماده خروجی
            {sampleConfig && onlyConfigOk && ` (فقط تست‌شده با کانفیگ واقعی)`}
          </DialogDescription>
        </DialogHeader>

        {sampleConfig && (
          <div className="flex items-center justify-between gap-3 p-2 rounded-md bg-violet-500/5 border border-violet-500/15">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <Switch checked={onlyConfigOk} onCheckedChange={setOnlyConfigOk} id="onlyOk" />
              <Label htmlFor="onlyOk">فقط IP های تست‌شده با کانفیگ واقعی ({results.filter(r => r.configOk).length})</Label>
            </div>
            <span className="text-[11px] text-zinc-500">
              کل: {results.length} · تست موفق: {results.filter(r => r.configOk).length}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-2 max-h-[30vh] overflow-y-auto custom-scroll">
          <div>
            <Label className="text-xs text-zinc-400">پروتکل</Label>
            <Select value={protocol} onValueChange={(v) => setProtocol(v as V2RayProtocol)}>
              <SelectTrigger className="bg-[#0a0d12] border-white/10 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0f141b] border-white/10">
                <SelectItem value="vless">VLESS</SelectItem>
                <SelectItem value="vmess">VMess</SelectItem>
                <SelectItem value="trojan">Trojan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1 md:col-span-2">
            <Label className="text-xs text-zinc-400">UUID / Password</Label>
            <Input value={uuid} onChange={(e) => setUuid(e.target.value)} className="bg-[#0a0d12] border-white/10 mt-1 font-mono text-xs" />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">پورت</Label>
            <Input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} className="bg-[#0a0d12] border-white/10 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">SNI</Label>
            <Input value={sni} onChange={(e) => setSni(e.target.value)} className="bg-[#0a0d12] border-white/10 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Host (WS)</Label>
            <Input value={host} onChange={(e) => setHost(e.target.value)} className="bg-[#0a0d12] border-white/10 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Path (WS)</Label>
            <Input value={path} onChange={(e) => setPath(e.target.value)} className="bg-[#0a0d12] border-white/10 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Network</Label>
            <Select value={network} onValueChange={(v) => setNetwork(v as any)}>
              <SelectTrigger className="bg-[#0a0d12] border-white/10 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0f141b] border-white/10">
                <SelectItem value="ws">WebSocket</SelectItem>
                <SelectItem value="grpc">gRPC</SelectItem>
                <SelectItem value="tcp">TCP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Security</Label>
            <Select value={security} onValueChange={(v) => setSecurity(v as any)}>
              <SelectTrigger className="bg-[#0a0d12] border-white/10 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0f141b] border-white/10">
                <SelectItem value="tls">TLS</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="reality">Reality</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Flow (Reality/XTLS)</Label>
            <Input value={flow} onChange={(e) => setFlow(e.target.value)} placeholder="xtls-rprx-vision" className="bg-[#0a0d12] border-white/10 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">پیشوند نام</Label>
            <Input value={remark} onChange={(e) => setRemark(e.target.value)} className="bg-[#0a0d12] border-white/10 mt-1" />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Switch checked={includeLatency} onCheckedChange={setIncludeLatency} id="lat" />
            <Label htmlFor="lat" className="text-xs text-zinc-400">افزودن تأخیر به نام</Label>
          </div>
        </div>

        <Tabs defaultValue={sampleConfig ? 'sample' : 'links'} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="bg-[#0a0d12] border border-white/5">
            {sampleConfig && (
              <TabsTrigger value="sample" className="data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-300">
                <Sparkles className="h-3.5 w-3.5 ml-1" /> کانفیگ‌های آماده
              </TabsTrigger>
            )}
            <TabsTrigger value="links" className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300">
              <Link2 className="h-3.5 w-3.5 ml-1" /> Share Links
            </TabsTrigger>
            <TabsTrigger value="json" className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300">
              <FileJson className="h-3.5 w-3.5 ml-1" /> V2Ray JSON
            </TabsTrigger>
            <TabsTrigger value="ips" className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300">
              <FileText className="h-3.5 w-3.5 ml-1" /> لیست IP
            </TabsTrigger>
          </TabsList>
          {sampleConfig && (
            <TabsContent value="sample" className="flex-1 min-h-0 mt-2">
              <div className="mb-2 text-[11px] text-zinc-400 bg-violet-500/5 border border-violet-500/15 rounded p-2">
                ✓ این کانفیگ‌ها از تنظیمات کانفیگ نمونه شما ساخته شده و فقط IP های تست‌شده قرار داده شده.
                آماده‌ی import در V2RayN / V2RayNG.
              </div>
              <Textarea readOnly value={sampleConfigLinks} className="h-52 bg-[#0a0d12] border-white/10 font-mono text-[11px]" />
            </TabsContent>
          )}
          <TabsContent value="links" className="flex-1 min-h-0 mt-2">
            <Textarea readOnly value={linksOutput} className="h-56 bg-[#0a0d12] border-white/10 font-mono text-[11px]" />
          </TabsContent>
          <TabsContent value="json" className="flex-1 min-h-0 mt-2">
            <Textarea readOnly value={jsonOutput} className="h-56 bg-[#0a0d12] border-white/10 font-mono text-[11px]" />
          </TabsContent>
          <TabsContent value="ips" className="flex-1 min-h-0 mt-2">
            <Textarea readOnly value={ipListOutput} className="h-56 bg-[#0a0d12] border-white/10 font-mono text-[11px]" />
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-3 gap-2">
          {sampleConfig && (
            <Button variant="outline" onClick={() => copy(sampleConfigLinks, 'کانفیگ‌های آماده')} className="border-violet-500/30 text-violet-300">
              <Copy className="h-4 w-4 ml-1" /> کپی کانفیگ‌های آماده
            </Button>
          )}
          <Button variant="outline" onClick={() => copy(linksOutput, 'لینک‌ها')}>
            <Copy className="h-4 w-4 ml-1" /> کپی لینک‌ها
          </Button>
          <Button onClick={() => download(jsonOutput, 'v2ray-config.json')} className="bg-emerald-500 hover:bg-emerald-400 text-black">
            <Download className="h-4 w-4 ml-1" /> دانلود config.json
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
