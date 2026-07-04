'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useScanner } from '@/lib/scanner/store'
import { toast } from 'sonner'

// Expand CIDR to individual IPs (max 256 per range)
function expandCidr(cidr: string, max = 256): string[] {
  const match = cidr.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/)
  if (!match) return []
  const [ip, prefixStr] = match
  const prefix = parseInt(prefixStr, 10)
  if (prefix < 0 || prefix > 32) return []

  const parts = ip.split('.').map(Number)
  const ipNum = ((parts[0] << 24) >>> 0) | ((parts[1] << 16) >>> 0) | ((parts[2] << 8) >>> 0) | parts[3]
  const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0
  const network = (ipNum & mask) >>> 0
  const total = Math.pow(2, 32 - prefix)
  const count = Math.min(max, total)

  const ips: string[] = []
  for (let i = 0; i < count; i++) {
    const n = (network + i) >>> 0
    ips.push(`${(n >>> 24) & 0xFF}.${(n >>> 16) & 0xFF}.${(n >>> 8) & 0xFF}.${n & 0xFF}`)
  }
  return ips
}

interface HttpScannerDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function HttpScannerDialog({ open, onOpenChange }: HttpScannerDialogProps) {
  const { setCustomIpList, selectPlatform, config } = useScanner()
  const [text, setText] = useState('')

  const handleApply = () => {
    const items = text
      .split(/[\s,\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)

    if (items.length === 0) {
      toast.error('لیست خالی است')
      return
    }

    // Expand CIDRs, keep IPs and domains as-is
    const expanded: string[] = []
    let cidrCount = 0
    for (const item of items) {
      if (item.includes('/')) {
        const ips = expandCidr(item, 256)
        if (ips.length > 0) {
          expanded.push(...ips)
          cidrCount++
        } else {
          expanded.push(item) // keep as-is if invalid CIDR
        }
      } else {
        expanded.push(item)
      }
    }

    setCustomIpList(expanded)
    selectPlatform('http-scanner')
    const msg = cidrCount > 0
      ? `${expanded.length} آی‌پی از ${cidrCount} رنج CIDR ثبت شد`
      : `${expanded.length} آیتم در لیست اسکنر HTTP ثبت شد`
    toast.success(msg)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#0f141b] border-white/10 text-zinc-100" dir="rtl">
        <DialogHeader>
          <DialogTitle>HTTP Scanner — لیست IP دلخواه</DialogTitle>
          <DialogDescription className="text-zinc-400">
            لیست آی‌پی‌ها، دامنه‌ها یا رنج CIDR رو وارد کن
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label className="text-xs text-zinc-400">لیست (سطر به سطر یا کاما جدا)</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'1.1.1.1\n8.8.8.8\n104.16.0.0/24\n44.196.116.0/24\nexample.com'}
            className="h-44 bg-[#0a0d12] border-white/10 font-mono text-xs"
          />
          <p className="text-[11px] text-zinc-500">
            پشتیبانی از: IP تکی، دامنه، و رنج CIDR (مثل 44.196.116.0/24). رنج‌ها خودکار باز میشن.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button
            onClick={handleApply}
            className="bg-emerald-500 hover:bg-emerald-400 text-black"
            disabled={!text.trim()}
          >
            ثبت و آماده اسکن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
