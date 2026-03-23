import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { idwInterpolate, grapStage, aqiColor, aqiLabel } from '@/lib/idw'
import fs from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest) {
  const hour     = req.nextUrl.searchParams.get('hour')
  const supabase = await createClient()

  const geoPath = path.join(process.cwd(), 'public', 'geodata', 'delhi_wards.geojson')
  const wardGeo = JSON.parse(await fs.readFile(geoPath, 'utf8'))

  let query = supabase
    .from('aqi_readings')
    .select('lat,lon,aqi,pm25,pm10,so2,no2,humidity,wind_speed,wind_direction')
    .eq('city_token', 'delhi')

  if (hour) {
    const t  = new Date(hour)
    const lo = new Date(t.getTime() - 30 * 60000).toISOString()
    const hi = new Date(t.getTime() + 30 * 60000).toISOString()
    query = query.gte('recorded_at', lo).lte('recorded_at', hi)
  } else {
    query = query.order('recorded_at', { ascending: false }).limit(300)
  }

  const { data: stations } = await query

  if (!stations?.length) {
    return NextResponse.json({ type: 'FeatureCollection', features: [] })
  }

  const features = wardGeo.features.map((f: any) => {
    const coords = f.geometry.coordinates[0]
    const cLon   = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length
    const cLat   = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length
    const aqi    = idwInterpolate(cLat, cLon, stations, 'aqi')
    const pm25   = idwInterpolate(cLat, cLon, stations, 'pm25')
    const pm10   = idwInterpolate(cLat, cLon, stations, 'pm10')
    const so2    = idwInterpolate(cLat, cLon, stations, 'so2')
    const no2    = idwInterpolate(cLat, cLon, stations, 'no2')
    const hum    = idwInterpolate(cLat, cLon, stations, 'humidity')
    const ws     = idwInterpolate(cLat, cLon, stations, 'wind_speed')
    const wd     = idwInterpolate(cLat, cLon, stations, 'wind_direction')

    return {
      ...f,
      properties: {
        ...f.properties,
        aqi:            Math.round(aqi),
        pm25:           Math.round(pm25),
        pm10:           Math.round(pm10),
        so2:            Math.round(so2),
        no2:            Math.round(no2),
        humidity:       Math.round(hum),
        wind_speed:     +ws.toFixed(1),
        wind_direction: Math.round(wd),
        grap_stage:     grapStage(aqi),
        fill_color:     aqiColor(aqi),
        aqi_label:      aqiLabel(aqi),
      },
    }
  })

  return NextResponse.json({ type: 'FeatureCollection', features })
}