import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { period } = await req.json()
  const supabase   = await createClient()
  const hours: Record<string, number> = { daily: 24, weekly: 168, monthly: 720 }
  const since = new Date(Date.now() - (hours[period] ?? 24) * 3600000).toISOString()

  const { data } = await supabase
    .from('aqi_readings').select('*')
    .eq('city_token', 'delhi')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true })

  return NextResponse.json({ data: data ?? [], period, since })
}