import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { period, format } = await req.json()
  const supabase = await createClient()
  const hours: Record<string, number> = { daily: 24, weekly: 168, monthly: 720 }
  const since = new Date(Date.now() - (hours[period] ?? 24) * 3600000).toISOString()

  const { data } = await supabase
    .from('aqi_readings')
    .select('*')
    .eq('city_token', 'delhi')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true })

  if (!data?.length) {
    return NextResponse.json({ error: 'No data' }, { status: 404 })
  }

  if (format === 'csv') {
    const header = 'station_id,station_name,aqi,pm25,pm10,so2,no2,humidity,wind_speed,recorded_at'
    const rows   = data.map((r: any) =>
      [r.station_id, r.station_name, r.aqi, r.pm25, r.pm10,
       r.so2, r.no2, r.humidity, r.wind_speed, r.recorded_at].join(','))
    return new NextResponse([header, ...rows].join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="delhi_aqi_${period}.csv"`,
      },
    })
  }

  return NextResponse.json({
    city: 'Delhi-NCR', period,
    generated: new Date().toISOString(),
    stats: {
      meanAQI: +(data.reduce((s: number, r: any) => s + r.aqi, 0) / data.length).toFixed(1),
      maxAQI:  Math.max(...data.map((r: any) => r.aqi)),
      total:   data.length,
    },
    readings: data,
  })
}