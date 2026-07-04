'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { parseShareLink, describeConfig } from '@/lib/scanner/sample-config'
import { useScanner } from '@/lib/scanner/store'
import { toast } from 'sonner'
import { FileText, CheckCircle2, XCircle, Sparkles } from 'lucide-react'

interface SampleConfigDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function SampleConfigDialog({ open, onOpenChange }: SampleConfigDialogProps) {
  const { sampleConfig, sampleConfigText, setSampleConfig } = useScanner()
  // Use key to force remount when dialog opens so initial state refreshes naturally
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SampleConfigDialogInner
        key={open ? 'open' : 'closed'}
        initialText={sampleConfigText}
        hasSampleConfig={!!sampleConfig}
        onApply={(text) => {
          if (!text.trim()) {
            setSampleConfig(null, '')
            toast.success('کانفیگ نمونه پاک شد')
          } else {
            const r = parseShareLink(text)
            if (!r.ok || !r.config) {
              toast.error(r.error || 'کانفیگ نامعتبر')
              return false
            }
            setSampleConfig(r.config, text)
            toast.success(`کانفیگ ${r.config.protocol.toUpperCase()} ثبت شد`)
          }
          onOpenChange(false)
          return true
        }}
        onClear={() => {
          setSampleConfig(null, '')
          toast.info('کانفیگ نمونه حذف شد')
          onOpenChange(false)
        }}
        onCancel={() => onOpenChange(false)}
        hasExistingConfig={!!sampleConfig}
      />
    </Dialog>
  )
}

interface InnerProps {
  initialText: string
  hasSampleConfig: boolean
  onApply: (text: string) => boolean
  onClear: () => void
  onCancel: () => void
  hasExistingConfig: boolean
}

function SampleConfigDialogInner({ initialText, hasExistingConfig, onApply, onClear, onCancel }: InnerProps) {
  const [text, setText] = useState(initialText)

  const parseResult = useMemo(() => {
    if (!text.trim()) return null
    return parseShareLink(text)
  }, [text])

  const handleApply = () => {
    if (!text.trim()) {
      onApply('')
      return
    }
    if (!parseResult?.ok || !parseResult.config) {
      toast.error(parseResult?.error || 'کانفیگ نامعتبر')
      return
    }
    onApply(text)
  }

  return (
    <DialogContent
      className="max-w-xl max-h-[90vh] flex flex-col bg-[#0f141b] border-white/10 text-zinc-100 overflow-hidden"
      dir="rtl"
    >
      <DialogHeader className="shrink-0">
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          کانفیگ نمونه برای تست IP ها
        </DialogTitle>
        <DialogDescription className="text-zinc-400 leading-relaxed">
          یکی از share link های V2Ray خودت رو اینجا بچسبون. IP های تمیز پیدا شده با این کانفیگ واقعی تست می‌شن.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-2 overflow-y-auto custom-scroll flex-1 min-h-0">
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-400">Share link یا JSON کانفیگ:</label>
          {parseResult && (
            parseResult.ok ? (
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3 ml-1" />
                معتبر
              </Badge>
            ) : (
              <Badge variant="destructive" className="bg-red-500/15 text-red-300 border-red-500/30">
                <XCircle className="h-3 w-3 ml-1" />
                نامعتبر
              </Badge>
            )
          )}
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`vless://8b2ad8f0-aaaa-bbbb-cccc-1234567890ab@your-domain.com:443?encryption=none&security=tls&type=ws&sni=your-domain.com&host=your-domain.com&path=%2Fray#my-config

یا trojan://...
یا vmess://...`}
          className="h-32 bg-[#0a0d12] border-white/10 font-mono text-[11px] resize-none"
          dir="ltr"
        />

        {parseResult?.ok && parseResult.config && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <FileText className="h-3.5 w-3.5" />
              <span>شناسایی شد — {parseResult.config.protocol.toUpperCase()}</span>
            </div>
            <div className="text-zinc-400 font-mono text-[11px] break-all" dir="ltr">
              {describeConfig(parseResult.config)}
            </div>
            <div className="text-[11px] text-zinc-500 flex flex-wrap gap-x-3 gap-y-1">
              <span>UUID: <span className="font-mono text-zinc-300" dir="ltr">{parseResult.config.uuid.slice(0, 8)}...</span></span>
              <span>Path: <span className="font-mono text-zinc-300" dir="ltr">{parseResult.config.path}</span></span>
            </div>
          </div>
        )}

        {parseResult && !parseResult.ok && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-md p-3 text-xs text-red-300 break-words">
            {parseResult.error}
          </div>
        )}

        <div className="text-[11px] text-zinc-500 bg-white/[0.02] border border-white/5 rounded-md p-3 leading-relaxed">
          <p className="font-semibold text-zinc-400 mb-1.5">چی کار می‌کنه؟</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>پس از اسکن، هر IP تمیز با این کانفیگ واقعی تست می‌شه</li>
            <li>WebSocket upgrade با SNI/Host/Path کانفیگ شما امتحان می‌شه</li>
            <li>اگر کد ۱۰۱، ۲xx، ۳xx یا ۴xx دریافت بشه = IP قابل استفاده</li>
            <li>خروجی: کانفیگ‌های آماده با IP های تمیز جایگزین‌شده</li>
          </ul>
        </div>
      </div>

      <DialogFooter className="gap-2 shrink-0 border-t border-white/5 pt-3">
        {hasExistingConfig && (
          <Button variant="outline" onClick={onClear} className="text-red-300 hover:text-red-200 border-white/10">
            حذف کانفیگ
          </Button>
        )}
        <Button variant="outline" onClick={onCancel} className="border-white/10">انصراف</Button>
        <Button
          onClick={handleApply}
          className="bg-emerald-500 hover:bg-emerald-400 text-black"
          disabled={!!text.trim() && !parseResult?.ok}
        >
          ثبت کانفیگ
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

