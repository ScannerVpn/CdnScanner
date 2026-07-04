import { NextRequest, NextResponse } from 'next/server'
import { cancelScan } from '@/lib/scanner/server-scanner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const sessionId: string | undefined = body?.sessionId
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }
  const ok = cancelScan(sessionId)
  return NextResponse.json({ ok, sessionId })
}
