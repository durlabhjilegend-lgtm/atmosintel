import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifySource } from '@/lib/idw'

function safeNum(v: unknown, fb = 0): number {
  const n = parseFloat(String(v))
  return isNaN(n) || n < 0 ? fb : n
}

// Delhi CPCB stations with known coords — fetch individual feeds for full pollutant data
const DELHI_STATIONS = [
  { name: 'Anand Vihar',     lat: 28.6469, lon: 77.3161 },
  { name: 'IGI Airport',     lat: 28.5562, lon: 77.0999 },
  { name: 'Punjabi Bagh',    lat: 28.6699, lon: 77.1312 },
  { name: 'RK Puram',        lat: 28.5665, lon: 77.1700 },
  { name: 'Rohini',          lat: 28.7324, lon: 77.1148 },
  { name: 'Okhla',           lat: 28.5355, lon: 77.2756 },
  { name: 'Bawana',          lat: 28.7891, lon: 77.0502 },
  { name: 'Jahangirpuri',    lat: 28.7247, lon: 77.1659 },
  { name: 'Vivek Vihar',     lat: 28.6713, lon: 77.3145 },
  { name: 'Narela',          lat: 28.8516, lon: 77.0959 },
  { name: 'Shadipur',        lat: 28.6505, lon: 77.1532 },
  { name: 'Wazirpur',        lat: 28.6927, lon: 77.1649 },
  { name: 'Patparganj',      lat: 28.6273, lon: 77.2939 },
  { name: 'Lodhi Road',      lat: 28.5918, lon: 77.2273 },
  { name: 'Mundka',          lat: 28.6935, lon: 77.0340 },
  { name: 'Dwarka Sec 8',    lat: 28.5685, lon: 77.0556 },
  { name: 'Chandni Chowk',   lat: 28.6506, lon: 77.2334 },
  { name: 'Burari',          lat: 28.7566, lon: 77.1964 },
  { name: 'Ashok Vihar',     lat: 28.6921, lon: 77.1754 },
  { name: 'Laxmi Nagar',     lat: 28.6344, lon: 77.2780 },
]

export async function GET() {
  const token = process.env.AQICN_TOKEN!
  const bbox  = '28.38,76.84,28.90,77.45'

  const supabase = await createClient()
  const now = new Date()

  // STEP 1: Get ALL stations
  const mapRes = await fetch(
    `https://api.waqi.info/map/bounds/?token=${token}&latlng=${bbox}`,
    { next: { revalidate: 600 } }
  )
  const mapJson = await mapRes.json()

  if (mapJson.status !== 'ok') {
    return NextResponse.json({ error: 'AQICN unavailable' }, { status: 502 })
  }

  const readings: any[] = []

  // STEP 2: Enrich EACH station with detailed feed
  await Promise.all(
    mapJson.data.map(async (s: any) => {
      try {
        const feedUrl = `https://api.waqi.info/feed/@${s.uid}/?token=${token}`
        const res = await fetch(feedUrl, { next: { revalidate: 900 } })
        const json = await res.json()
        if (json.status !== 'ok') return

        const d = json.data
        const iaqi = d.iaqi ?? {}

        const aqi  = safeNum(d.aqi, -1)
        if (aqi < 0) return

        const pm25 = safeNum(iaqi.pm25?.v)
        const pm10 = safeNum(iaqi.pm10?.v)
        const so2  = safeNum(iaqi.so2?.v)
        const no2  = safeNum(iaqi.no2?.v)
        const ws   = safeNum(iaqi.w?.v, 2)
        const wd   = safeNum(iaqi.wd?.v, 180)
        const hum  = safeNum(iaqi.h?.v, 50)

        readings.push({
          station_id:     String(s.uid),
          station_name:   s.station?.name ?? 'Unknown',
          lat: s.lat,
          lon: s.lon,
          city_token: 'delhi',
          aqi, pm25, pm10, so2, no2,
          humidity:       hum,
          wind_speed:     ws,
          wind_direction: wd,
          source_label:   classifySource(pm25, pm10, so2, no2, ws),
          recorded_at:    now.toISOString(),
        })

        await supabase.from('stations').upsert({
          id: String(s.uid),
          name: s.station?.name ?? 'Unknown',
          lat: s.lat,
          lon: s.lon,
          city_token: 'delhi',
          last_seen: now.toISOString(),
          is_stale: false,
        }, { onConflict: 'id' })

      } catch (e) {
        console.error(`Failed station ${s.uid}`, e)
      }
    })
  )

  if (readings.length > 0) {
    await supabase.from('aqi_readings').insert(readings)
  }

  return NextResponse.json({ count: readings.length, readings })
}