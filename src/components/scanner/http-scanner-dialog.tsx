'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useScanner } from '@/lib/scanner/store'
import { toast } from 'sonner'

interface HttpScannerDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function HttpScannerDialog({ open, onOpenChange }: HttpScannerDialogProps) {
  const { setCustomIpList, selectPlatform, config } = useScanner()
  const [text, setText] = useState('')

  const handleApply = () => {
    const ips = text
      .split(/[\s,\n]+/)
      .map(s => s.trim())
      .filter(s => {
        // accept IP or domain — actually we only resolve IPs in scanner, so domain → keep too (scanner just connects)
        return s.length > 0
      })
    if (ips.length === 0) {
      toast.error('لیست خالی است')
      return
    }
    setCustomIpList(ips)
    selectPlatform('http-scanner')
    toast.success(`${ips.length} آیتم در لیست اسکنر HTTP ثبت شد`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#0f141b] border-white/10 text-zinc-100" dir="rtl">
        <DialogHeader>
          <DialogTitle>HTTP Scanner — لیست IP دلخواه</DialogTitle>
          <DialogDescription className="text-zinc-400">
            لیست آی‌پی‌ها یا دامنه‌ها رو با کاما، فاصله یا خط جدید جدا کن
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label className="text-xs text-zinc-400">لیست (سطر به سطر یا کاما جدا)</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'1.1.1.1\n8.8.8.8\n104.16.0.1\nexample.com'}
            className="h-44 bg-[#0a0d12] border-white/10 font-mono text-xs"
          />
          <p className="text-[11px] text-zinc-500">
            اگه دامنه وارد کنی، اسکنر فقط به پورت مستقیم وصل میشه (بدون DNS resolution).
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
