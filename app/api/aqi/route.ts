import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifySource } from '@/lib/idw'

function safeNum(v: unknown, fb = 0): number {
  const n = parseFloat(String(v))
  return isNaN(n) || n < 0 ? fb : n
}

export async function GET() {
  const token = process.env.AQICN_TOKEN!
  const bbox  = '28.38,76.84,28.90,77.45'
  const url   = `https://api.waqi.info/map/bounds/?token=${token}&latlng=${bbox}`

  const resp = await fetch(url, { next: { revalidate: 900 } })
  const json = await resp.json()

  if (json.status !== 'ok') {
    return NextResponse.json({ error: 'AQICN unavailable' }, { status: 502 })
  }

  const supabase = await createClient()
  const now      = new Date()
  const readings: any[] = []

  for (const s of json.data) {
    const aqi = safeNum(s.aqi, -1)
    if (aqi < 0) continue
    const i    = s.iaqi ?? {}
    const pm25 = safeNum(i.pm25?.v)
    const pm10 = safeNum(i.pm10?.v)
    const so2  = safeNum(i.so2?.v)
    const no2  = safeNum(i.no2?.v)
    const ws   = safeNum(i.w?.v, 2)
    const wd   = safeNum(i.wd?.v, 180)
    const hum  = safeNum(i.h?.v, 50)

    readings.push({
      station_id:     String(s.uid),
      station_name:   s.station?.name ?? 'Unknown',
      lat: s.lat, lon: s.lon,
      city_token: 'delhi',
      aqi, pm25, pm10, so2, no2,
      humidity:       hum,
      wind_speed:     ws,
      wind_direction: wd,
      source_label:   classifySource(pm25, pm10, so2, no2, ws),
      recorded_at:    now.toISOString(),
    })

    await supabase.from('stations').upsert({
      id: String(s.uid), name: s.station?.name ?? 'Unknown',
      lat: s.lat, lon: s.lon, city_token: 'delhi',
      last_seen: now.toISOString(), is_stale: false,
    }, { onConflict: 'id' })
  }

  if (readings.length > 0) {
    await supabase.from('aqi_readings').insert(readings)
  }

  await supabase.from('stations')
    .update({ is_stale: true })
    .lt('last_seen', new Date(now.getTime() - 4 * 3600000).toISOString())
    .eq('city_token', 'delhi')

  return NextResponse.json({ count: readings.length })
}