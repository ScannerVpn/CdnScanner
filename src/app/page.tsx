'use client'

import dynamic from 'next/dynamic'

// Avoid SSR issues with socket.io — render only on client
const ScannerShell = dynamic(() => import('@/components/scanner/scanner-shell').then(m => m.ScannerShell), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen grid place-items-center bg-[#0a0d12] text-zinc-400" dir="rtl">
      <div className="text-center space-y-3">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
        <p className="text-sm">در حال راه‌اندازی اسکنر...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  return <ScannerShell />
}
