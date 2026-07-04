import { NextResponse } from 'next/server'
import { PLATFORMS } from '@/lib/scanner/platforms'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ platforms: PLATFORMS })
}
