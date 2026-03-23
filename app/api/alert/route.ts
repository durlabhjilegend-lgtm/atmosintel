import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { message, severity, recipients } = await req.json()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('broadcasts')
    .insert({ message, severity, recipients, city_token: 'delhi' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, status: 'delivered' })
}