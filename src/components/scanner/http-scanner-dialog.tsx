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
  // Strip any invisible/RTL characters that might come from the textarea
  const clean = cidr.replace(/[\u200B-\u200F\u2028-\u202F\u2066-\u2069\uFEFF]/g, '').trim()
  const match = clean.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/)
  if (!match) return []
  const [, ip, prefixStr] = match
  const prefix = parseInt(prefixStr, 10)
  if (prefix < 0 || prefix > 32) return []

  const parts = ip.split('.').map(Number)
  if (parts.some(p => p < 0 || p > 255)) return []

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

// Also expand ranges like 44.196.116.0-44.196.116.255
function expandDashRange(input: string): string[] {
  const clean = input.replace(/[\u200B-\u200F\u2028-\u202F\u2066-\u2069\uFEFF]/g, '').trim()
  const match = clean.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s*-\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (!match) return []
  const [, startIp, endIp] = match
  const s = startIp.split('.').map(Number)
  const e = endIp.split('.').map(Number)
  if (s.some(p => p < 0 || p > 255) || e.some(p => p < 0 || p > 255)) return []

  const start = ((s[0] << 24) >>> 0) | ((s[1] << 16) >>> 0) | ((s[2] << 8) >>> 0) | s[3]
  const end = ((e[0] << 24) >>> 0) | ((e[1] << 16) >>> 0) | ((e[2] << 8) >>> 0) | e[3]
  const count = Math.min(end - start + 1, 65536)
  if (count <= 0) return []

  const ips: string[] = []
  for (let i = 0; i < count; i++) {
    const n = (start + i) >>> 0
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

  // Preview: parse input and show count
  const preview = (() => {
    const items = text
      .split(/[\s,\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)

    let total = 0
    let cidrCount = 0
    for (const item of items) {
      if (item.includes('/')) {
        const ips = expandCidr(item, 999999)
        total += ips.length
        if (ips.length > 0) cidrCount++
      } else if (item.includes('-')) {
        const ips = expandDashRange(item)
        total += ips.length
      } else {
        total++
      }
    }
    return { total, cidrCount, itemCount: items.length }
  })()

  const handleApply = () => {
    const items = text
      .split(/[\s,\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)

    if (items.length === 0) {
      toast.error('لیست خالی است')
      return
    }

    // Expand CIDRs and dash ranges, keep IPs and domains as-is
    const expanded: string[] = []
    for (const item of items) {
      if (item.includes('/')) {
        const ips = expandCidr(item, 999999)
        if (ips.length > 0) {
          expanded.push(...ips)
        } else {
          expanded.push(item)
        }
      } else if (item.includes('-')) {
        const ips = expandDashRange(item)
        if (ips.length > 0) {
          expanded.push(...ips)
        } else {
          expanded.push(item)
        }
      } else {
        expanded.push(item)
      }
    }

    setCustomIpList(expanded)
    selectPlatform('http-scanner')
    toast.success(`${expanded.length} آی‌پی ثبت شد`)
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
            placeholder={'1.1.1.1\n8.8.8.8\n104.16.0.0/24\n44.196.116.0/24\n1.1.1.0-1.1.1.255\nexample.com'}
            className="h-44 bg-[#0a0d12] border-white/10 font-mono text-xs"
          />
          {text.trim() && (
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] text-zinc-500">
                پشتیبانی از: IP تکی، دامنه، CIDR (44.196.116.0/24)، و بازه (1.1.1.0-1.1.1.255)
              </p>
              <span className="text-[11px] font-mono text-emerald-400">
                {preview.total.toLocaleString('fa-IR')} آی‌پی
              </span>
            </div>
          )}
          {!text.trim() && (
            <p className="text-[11px] text-zinc-500">
              پشتیبانی از: IP تکی، دامنه، CIDR (44.196.116.0/24)، و بازه (1.1.1.0-1.1.1.255). رنج‌ها خودکار باز میشن.
            </p>
          )}
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
