'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { aqiColor, aqiLabel, grapStage } from '@/lib/idw'
import {
  AlertTriangle, Wind, Activity, FileDown,
  Play, Pause, SkipBack, Radio, ChevronRight
} from 'lucide-react'

// ── AQI helpers ──────────────────────────────────────────────────────
const GRAP_COLORS: Record<number, string> = {
  0: '#22c55e', 1: '#eab308', 2: '#f97316', 3: '#ef4444', 4: '#7c3aed',
}
const GRAP_LABELS: Record<number, string> = {
  0: 'Good', 1: 'Moderate', 2: 'Poor', 3: 'Very Poor', 4: 'Severe',
}

// ── Mock ward data for instant render before API loads ───────────────
const MOCK_STATIONS = [
  { id:'1', name:'Anand Vihar',    lat:28.6469, lon:77.3161, aqi:387, pm25:280, pm10:410, so2:18, no2:65, ws:1.2, wd:220, humidity:45 },
  { id:'2', name:'Bawana',         lat:28.7891, lon:77.0502, aqi:412, pm25:300, pm10:350, so2:85, no2:95, ws:1.5, wd:250, humidity:42 },
  { id:'3', name:'Jahangirpuri',   lat:28.7247, lon:77.1659, aqi:311, pm25:240, pm10:290, so2:14, no2:40, ws:0.8, wd:300, humidity:50 },
  { id:'4', name:'Rohini',         lat:28.7324, lon:77.1148, aqi:303, pm25:220, pm10:300, so2:16, no2:50, ws:1.1, wd:240, humidity:48 },
  { id:'5', name:'Mundka',         lat:28.6935, lon:77.0340, aqi:356, pm25:268, pm10:380, so2:32, no2:62, ws:1.0, wd:220, humidity:44 },
  { id:'6', name:'Wazirpur',       lat:28.6927, lon:77.1649, aqi:334, pm25:245, pm10:330, so2:28, no2:72, ws:1.3, wd:205, humidity:46 },
  { id:'7', name:'Punjabi Bagh',   lat:28.6699, lon:77.1312, aqi:276, pm25:200, pm10:260, so2:20, no2:70, ws:1.8, wd:160, humidity:52 },
  { id:'8', name:'Patparganj',     lat:28.6273, lon:77.2939, aqi:267, pm25:192, pm10:250, so2:16, no2:58, ws:2.2, wd:195, humidity:54 },
  { id:'9', name:'Lodhi Road',     lat:28.5918, lon:77.2273, aqi:175, pm25:120, pm10:165, so2:10, no2:42, ws:3.8, wd:155, humidity:60 },
  { id:'10',name:'RK Puram',       lat:28.5665, lon:77.1700, aqi:241, pm25:170, pm10:220, so2:25, no2:60, ws:2.5, wd:190, humidity:55 },
  { id:'11',name:'Sirifort',       lat:28.5516, lon:77.2211, aqi:182, pm25:128, pm10:172, so2:10, no2:45, ws:3.5, wd:160, humidity:58 },
  { id:'12',name:'Narela',         lat:28.8516, lon:77.0959, aqi:345, pm25:260, pm10:390, so2:20, no2:45, ws:0.9, wd:215, humidity:43 },
  { id:'13',name:'Shadipur',       lat:28.6505, lon:77.1532, aqi:221, pm25:155, pm10:195, so2:18, no2:62, ws:2.8, wd:175, humidity:53 },
  { id:'14',name:'Okhla Phase 2',  lat:28.5355, lon:77.2756, aqi:290, pm25:210, pm10:280, so2:30, no2:80, ws:2.0, wd:170, humidity:51 },
  { id:'15',name:'Dwarka Sec 8',   lat:28.5685, lon:77.0556, aqi:225, pm25:160, pm10:210, so2:15, no2:55, ws:2.1, wd:200, humidity:56 },
]

type Tab = 'map' | 'analytics' | 'operations'

export default function Dashboard() {
  const [tab, setTab]               = useState<Tab>('map')
  const [wardData, setWardData]     = useState<any>(null)
  const [selectedWard, setSelected] = useState<any>(null)
  const [showHeat, setShowHeat]     = useState(false)
  const [showWind, setShowWind]     = useState(false)
  const [isPlaying, setIsPlaying]   = useState(false)
  const [timeIdx, setTimeIdx]       = useState(23)
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [broadcastMsg, setBMsg]     = useState('')
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [reportMsg, setReportMsg]   = useState('')
  const [stations, setStations]     = useState(MOCK_STATIONS)
  const [toast, setToast] = useState('')

// Fetch live stations from AQICN on load
useEffect(() => {
  const loadLive = async () => {
    try {
      const res = await fetch('/api/aqi')
      if (!res.ok) return
      const { readings } = await res.json()
      if (readings?.length > 0) {
        setStations(readings.map((r: any) => ({
          id:       r.station_id,
          name:     r.station_name,
          lat:      r.lat,
          lon:      r.lon,
          aqi:      r.aqi,
          pm25:     r.pm25,
          pm10:     r.pm10,
          so2:      r.so2,
          no2:      r.no2,
          ws:       r.wind_speed,
          wd:       r.wind_direction,
          humidity: r.humidity,
        })))
      }
    } catch(e) { console.error('Live fetch failed', e) }
  }
  loadLive()
  const interval = setInterval(loadLive, 60000)
  return () => clearInterval(interval)
}, [])
//useEffect to update markers when stations state change
useEffect(() => {
  const map = mapRef.current
  if (!map || !map.isStyleLoaded()) return
  const src = map.getSource('stations') as maptilersdk.GeoJSONSource
  if (!src) return
  src.setData({
    type: 'FeatureCollection',
    features: stations.map(s => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: { ...s, fill_color: aqiColor(s.aqi) },
    })),
  } as any)
}, [stations])

  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<maptilersdk.Map | null>(null)
  const popupRef     = useRef<maptilersdk.Popup | null>(null)
  const playRef      = useRef<ReturnType<typeof setInterval> | null>(null)

  const hours = Array.from({ length: 24 }, (_, i) => {
    const d = new Date()
    d.setMinutes(0, 0, 0)
    d.setHours(d.getHours() - (23 - i))
    return d.toISOString()
  })
  // ── Fetch ward GeoJSON ──────────────────────────────────────────────
const fetchWards = useCallback(async (hour?: string) => {
  const url = hour
    ? `/api/wards?hour=${encodeURIComponent(hour)}`
    : '/api/wards'
  const res = await fetch(url).catch(() => null)
  if (!res?.ok) return
  const geo = await res.json()
  setWardData(geo)

  const map = mapRef.current
  if (!map) return

  const apply = () => {
    const src = map.getSource('wards') as maptilersdk.GeoJSONSource
    if (src) src.setData(geo)
    // Also update label layer source data
    const labelSrc = map.getSource('wards')
    if (labelSrc) (labelSrc as maptilersdk.GeoJSONSource).setData(geo)
  }

  if (map.isStyleLoaded() && map.getSource('wards')) {
    apply()
  } else {
    map.once('idle', apply)
  }
}, [])
  // ── Fetch live AQI ──────────────────────────────────────────────────
useEffect(() => {
  const refresh = async () => {
    await fetch('/api/aqi').catch(() => null)
    await fetchWards()
  }
  refresh()
  const interval = setInterval(refresh, 60 * 1000)
  return () => clearInterval(interval)
}, [fetchWards])


  useEffect(() => { fetchWards() }, [fetchWards])

  // ── Fetch maintenance ───────────────────────────────────────────────
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient()
        .from('maintenance').select('*').eq('city_token', 'delhi')
        .order('started_at', { ascending: false })
        .then(({ data }) => setMaintenance(data ?? []))
    })
  }, [])

  // ── Timeline player ─────────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setTimeIdx(p => {
          const n = p + 1
          if (n >= 23) { setIsPlaying(false); fetchWards(); return 23 }
          fetchWards(hours[n])
          return n
        })
      }, 900)
    } else {
      if (playRef.current) clearInterval(playRef.current)
    }
    return () => { if (playRef.current) clearInterval(playRef.current) }
  }, [isPlaying, fetchWards, hours])

  // ── Map init ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || tab !== 'map') return

    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY!

    const map = new maptilersdk.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/dark-matter/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`,      
      center: [77.209, 28.613] as [number, number],
      zoom:      10.5,
    })

    map.on('load', () => {
      // Ward layer
      map.addSource('wards', {
        type: 'geojson',
        data: wardData ?? { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'ward-fill', type: 'fill', source: 'wards',
        paint: {
          'fill-color':   ['coalesce', ['get', 'fill_color'], '#888'],
          'fill-opacity': 0.45,
        },
      })
      map.addLayer({
        id: 'ward-line', type: 'line', source: 'wards',
        paint: {
          'line-color': 'rgba(255,255,255,0.6)',
          'line-width': 1.5,
        },      })

      map.addLayer({
      id: 'ward-labels',
      type: 'symbol',
      source: 'wards',
      layout: {
        'text-field': ['coalesce', ['get', 'ward_name'], ['get', 'name'], ['get', 'NAME'], ''],
        'text-size': 9,
        'text-font': ['Open Sans Regular'],
        'text-max-width': 8,
        'text-allow-overlap': false,
        'text-ignore-placement': false,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 1,
        'text-opacity': 0.8,
      },
    })

      // Station markers
      map.addSource('stations', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: stations.map(s => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
            properties: s,
          })),
        },
      })
      map.addLayer({
        id: 'station-circles', type: 'circle', source: 'stations',
        paint: {
          'circle-radius': 8,
          'circle-color':  ['get', 'fill_color'],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#fff',
        },
      })

      // Set station colors
      const stationGeo = {
        type: 'FeatureCollection',
        features: MOCK_STATIONS.map(s => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
          properties: { ...s, fill_color: aqiColor(s.aqi) },
        })),
      }
      ;(map.getSource('stations') as maptilersdk.GeoJSONSource)?.setData(stationGeo as any)

      // Ward hover tooltip
      map.on('mousemove', 'ward-fill', (e: any) => {
        if (!e.features?.length) return
        const p = e.features[0].properties
        popupRef.current?.remove()
        popupRef.current = new maptilersdk.Popup({
          closeButton: false, closeOnClick: false, offset: 12, maxWidth: '200px',
        })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:system-ui;padding:4px;color:#111">
              <b style="font-size:13px">${p.ward_name ?? 'Ward'}</b><br/>
              <span style="font-size:24px;font-weight:900;color:${p.fill_color}">${p.aqi ?? '—'}</span><br/>
              <span style="font-size:10px;color:#666">${p.aqi_label ?? ''}</span><br/>
              <div style="font-size:11px;margin-top:4px">
                PM2.5: <b>${p.pm25}</b> · PM10: <b>${p.pm10}</b><br/>
                Humidity: <b>${p.humidity}%</b> · Wind: <b>${p.wind_speed} m/s</b>
              </div>
            </div>`)
          .addTo(map)
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'ward-fill', () => {
        popupRef.current?.remove()
        map.getCanvas().style.cursor = ''
      })

      // Station hover tooltip
      map.on('mousemove', 'station-circles', (e: any) => {
        if (!e.features?.length) return
        const p = e.features[0].properties
        popupRef.current?.remove()
        popupRef.current = new maptilersdk.Popup({
          closeButton: false, closeOnClick: false, offset: 12, maxWidth: '180px',
        })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:system-ui;padding:4px;color:#111">
              <b>${p.name}</b><br/>
              <span style="font-size:22px;font-weight:900;color:${aqiColor(p.aqi)}">${p.aqi}</span><br/>
              <div style="font-size:11px;margin-top:3px">
                PM2.5: <b>${p.pm25}</b> μg/m³<br/>
                SO₂: <b>${p.so2}</b> μg/m³<br/>
                Humidity: <b>${p.humidity}%</b>
              </div>
            </div>`)
          .addTo(map)
      })
      map.on('mouseleave', 'station-circles', () => popupRef.current?.remove())

      // Ward click → drawer
      map.on('click', 'ward-fill', (e: any) => {
        if (!e.features?.length) return
        setSelected(e.features[0].properties)
      })

      mapRef.current = map
    })

    return () => { map.remove(); mapRef.current = null }
  }, [tab])

  // ── Wind overlay (station-based arrows) ──────────────────────────────
useEffect(() => {
  const map = mapRef.current
  if (!map || !map.isStyleLoaded()) return

  if (!showWind) {
    if (map.getLayer('wind-lines')) {
      map.setLayoutProperty('wind-lines', 'visibility', 'none')
    }
    return
  }

  const features = stations.map(s => {
    const rad    = (s.wd * Math.PI) / 180
    const len    = Math.min(s.ws * 0.018, 0.07)
    const endLat = s.lat + len * Math.cos(rad)
    const endLon = s.lon + len * Math.sin(rad)
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [[s.lon, s.lat], [endLon, endLat]],
      },
      properties: { ws: s.ws },
    }
  })

  const geo = { type: 'FeatureCollection' as const, features }

  if (!map.getSource('wind-lines')) {
    map.addSource('wind-lines', { type: 'geojson', data: geo })
    map.addLayer({
      id: 'wind-lines',
      type: 'line',
      source: 'wind-lines',
      paint: {
        'line-color': '#60a5fa',
        'line-width': 2,
        'line-opacity': 0.85,
      },
    })
  } else {
    ;(map.getSource('wind-lines') as maptilersdk.GeoJSONSource).setData(geo)
    map.setLayoutProperty('wind-lines', 'visibility', 'visible')
  }
}, [showWind, stations])

  // ── Heatmap ─────────────────────────────────────────────────────────
useEffect(() => {
  const map = mapRef.current
  if (!map || !map.isStyleLoaded()) return

  if (showHeat) {
    const heatData = {
      type: 'FeatureCollection' as const,
      features: stations.map(s => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.lon, s.lat] },
        properties: { weight: s.aqi / 500 },
      })),
    }

    if (!map.getSource('heat')) {
      map.addSource('heat', { type: 'geojson', data: heatData })
      map.addLayer({
        id: 'heatmap-layer',
        type: 'heatmap',
        source: 'heat',
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 5, 1, 15, 3],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 5, 40, 15, 80],
          'heatmap-opacity': 0.75,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,   'rgba(0,0,0,0)',
            0.1, '#22c55e',
            0.3, '#eab308',
            0.6, '#f97316',
            0.8, '#ef4444',
            1.0, '#7c3aed',
          ],
        },
      })
    } else {
      ;(map.getSource('heat') as maptilersdk.GeoJSONSource).setData(heatData)
      map.setLayoutProperty('heatmap-layer', 'visibility', 'visible')
    }
  } else {
    if (map.getLayer('heatmap-layer')) {
      map.setLayoutProperty('heatmap-layer', 'visibility', 'none')
    }
  }
}, [showHeat])

  // ── Alert state ─────────────────────────────────────────────────────
  const maxAQI     = Math.max(...stations.map(s => s.aqi))
  const isRedAlert = maxAQI > 300
  const topWards   = [...stations].sort((a, b) => b.aqi - a.aqi).slice(0, 3)

  // ── Broadcast ───────────────────────────────────────────────────────
  const sendBroadcast = async (sev: string) => {
    if (!broadcastMsg.trim()) return
    await fetch('/api/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: broadcastMsg, severity: sev, recipients: ['all-staff'] }),
    })
    setBroadcasts(p => [{
      message: broadcastMsg, severity: sev,
      sent_at: new Date().toLocaleTimeString('en-IN'),
    }, ...p])
    setBMsg('')
  }
 //---Action---------------------------------------------------------
 const sendAction = async (message: string, severity: string) => {
  await fetch('/api/alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      severity,
      recipients: ['field-staff'],
    }),
  })
  setBroadcasts(p => [{
    message,
    severity,
    sent_at: new Date().toLocaleTimeString('en-IN'),
  }, ...p])
  // Show confirmation toast
  setToast(message)
  setTimeout(() => setToast(''), 3000)
}
  // ── Report ──────────────────────────────────────────────────────────
  const generateReport = async (period: string, format: string) => {
    setReportMsg('Generating…')
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, format }),
    })
    if (res.ok && format === 'csv') {
      const blob = await res.blob()
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `delhi_aqi_${period}.csv`
      a.click()
      setReportMsg('Downloaded!')
    } else if (res.ok) {
      setReportMsg('Report data ready (connect PDF renderer to export)')
    } else {
      setReportMsg('No data yet — collect AQI data first')
    }
    setTimeout(() => setReportMsg(''), 3000)
  }

  // ── Tabs ─────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'map',        label: 'Live Map',    icon: Activity },
    { id: 'analytics',  label: 'Analytics',   icon: ChevronRight },
    { id: 'operations', label: 'Operations',  icon: Wind },
  ]

  return (
    <div className="h-screen flex flex-col bg-[#0b0c10] text-white overflow-hidden">

      {/* ── Top bar ── */}
      <header className={`h-12 flex-shrink-0 flex items-center px-5 gap-4 z-30
        border-b transition-colors duration-500
        ${isRedAlert
          ? 'bg-red-950 border-red-700 animate-pulse'
          : 'bg-[#12141c] border-white/10'}`}>
        <span className="font-mono text-sm font-bold text-[#00d4ff] tracking-widest">
          AtmosIntel
        </span>
        <span className="text-white/20">·</span>
        <span className="text-white/40 text-xs">Delhi-NCR</span>

        {isRedAlert && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full
                          bg-red-500/20 border border-red-500/40">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-400 text-xs font-bold">
              🚨 RED ALERT: Severe Pollution Detected
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${tab === t.id
                        ? 'bg-white/10 text-white'
                        : 'text-white/40 hover:text-white/70'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 1: LIVE MAP                                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'map' && (
        <div className="flex flex-1 overflow-hidden">

          {/* Map area */}
          <div className="relative flex-1">
            <div ref={mapContainer} className="w-full h-full" />

            {/* Layer toggles */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
              <button onClick={() => setShowHeat(h => !h)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all
                        ${showHeat
                          ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                          : 'bg-black/60 border-white/10 text-white/50 hover:text-white'}`}>
                🌡 Heatmap
              </button>
              <button onClick={() => setShowWind(w => !w)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all
                        ${showWind
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                          : 'bg-black/60 border-white/10 text-white/50 hover:text-white'}`}>
                💨 Wind
              </button>
            </div>

            {/* Red alert top 3 overlay */}
            {isRedAlert && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10
                              bg-red-950/90 border border-red-500/50 rounded-xl
                              px-4 py-3 backdrop-blur-sm">
                <div className="text-xs text-red-400 font-bold mb-2 text-center">
                  ⚠ Top Polluted Zones
                </div>
                {topWards.map((w, i) => (
                  <div key={w.id} className="flex items-center gap-3 text-xs py-1">
                    <span className="text-red-300/60">#{i+1}</span>
                    <span className="text-white/80 w-32">{w.name}</span>
                    <span className="font-mono font-bold" style={{ color: aqiColor(w.aqi) }}>
                      {w.aqi}
                    </span>
                    <span className="text-white/40">{aqiLabel(w.aqi)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline scrubber */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10
                            flex items-center gap-3 px-5 py-3 rounded-2xl
                            bg-black/85 backdrop-blur border border-white/10
                            shadow-xl min-w-[400px]">
              <button onClick={() => { setIsPlaying(false); setTimeIdx(23); fetchWards() }}
                      className="text-white/50 hover:text-white transition-colors">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => {
                          if (timeIdx === 23) { setTimeIdx(0); fetchWards(hours[0]) }
                          setIsPlaying(p => !p)
                        }}
                      className="text-white transition-colors">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <input type="range" min={0} max={23} value={timeIdx}
                     onChange={e => {
                       if (isPlaying) return
                       const i = Number(e.target.value)
                       setTimeIdx(i)
                       if (i === 23) fetchWards()
                       else fetchWards(hours[i])
                     }}
                     className="flex-1 accent-[#00d4ff]" />
              <span className="text-xs font-mono text-amber-300 min-w-[80px] text-right">
                {timeIdx === 23 ? '● Live' : new Date(hours[timeIdx]).toLocaleTimeString('en-IN', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>

            {/* AQI legend */}
            <div className="absolute bottom-20 left-3 z-10 bg-black/75
                            backdrop-blur border border-white/10 rounded-xl p-3">
              <div className="text-[9px] text-white/40 uppercase tracking-wider mb-2">AQI Scale</div>
              {[
                ['#22c55e', 'Good (0–50)'],
                ['#84cc16', 'Satisfactory (51–100)'],
                ['#eab308', 'Moderate (101–200)'],
                ['#f97316', 'Poor (201–300)'],
                ['#ef4444', 'Very Poor (301–400)'],
                ['#7c3aed', 'Severe (>400)'],
              ].map(([c, l]) => (
                <div key={l} className="flex items-center gap-2 text-[10px] mb-1">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c }} />
                  <span className="text-white/60">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ward drawer */}
          <div className={`flex-shrink-0 bg-[#12141c] border-l border-white/10
                           flex flex-col overflow-hidden transition-all duration-300
                           ${selectedWard ? 'w-80' : 'w-0'}`}>
            {selectedWard && (
              <>
                <div className="flex items-start justify-between p-4 border-b border-white/10">
                  <div>
                    <h2 className="text-white font-semibold text-sm">
                      {selectedWard.ward_name ?? 'Ward'}
                    </h2>
                    <span className="text-[10px] mt-1 inline-block px-2 py-0.5 rounded-full"
                          style={{
                            background: (GRAP_COLORS[selectedWard.grap_stage] ?? '#888') + '22',
                            color: GRAP_COLORS[selectedWard.grap_stage] ?? '#888',
                            border: `1px solid ${GRAP_COLORS[selectedWard.grap_stage] ?? '#888'}44`,
                          }}>
                      GRAP {['—','I','II','III','IV'][selectedWard.grap_stage]} ·{' '}
                      {GRAP_LABELS[selectedWard.grap_stage] ?? 'Unknown'}
                    </span>
                  </div>
                  <button onClick={() => setSelected(null)}
                          className="text-white/30 hover:text-white text-lg leading-none">
                    ✕
                  </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                  {/* AQI */}
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="font-mono text-5xl font-black"
                          style={{ color: GRAP_COLORS[selectedWard.grap_stage] ?? '#888' }}>
                      {selectedWard.aqi}
                    </span>
                    <span className="text-white/30">AQI</span>
                  </div>

                  {/* Pollutant bars */}
                  {[
                    { k:'PM2.5', v:selectedWard.pm25, max:300, c:'#ef4444' },
                    { k:'PM10',  v:selectedWard.pm10, max:500, c:'#f97316' },
                    { k:'SO₂',   v:selectedWard.so2,  max:80,  c:'#a78bfa' },
                    { k:'NO₂',   v:selectedWard.no2,  max:120, c:'#60a5fa' },
                  ].map(p => (
                    <div key={p.k} className="mb-3">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-white/40">{p.k}</span>
                        <span style={{ color: p.c }} className="font-mono font-bold">
                          {p.v ?? '—'} μg/m³
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                             style={{
                               width: `${Math.min(100, ((p.v ?? 0) / p.max) * 100)}%`,
                               background: p.c,
                             }} />
                      </div>
                    </div>
                  ))}

                  {/* Wind + humidity */}
                  <div className="text-xs text-white/30 font-mono mt-2 mb-4">
                    💨 {selectedWard.wind_speed} m/s · {selectedWard.wind_direction}° ·
                    Humidity {selectedWard.humidity}%
                  </div>

                  {/* Recommended actions */}
                  {/* Action buttons */}
<div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-3">
    Quick Actions
  </div>
  <div className="space-y-2">
    {selectedWard.grap_stage >= 3 && (
      <button
        onClick={() => sendAction('🚧 HALT CONSTRUCTION orders issued for ' + selectedWard.ward_name, 'critical')}
        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium
                   bg-red-500/10 border border-red-500/30 text-red-300
                   hover:bg-red-500/20 transition-all">
        🚧 Halt All Construction in {selectedWard.ward_name}
      </button>
    )}
    {selectedWard.grap_stage >= 2 && (
      <button
        onClick={() => sendAction('🚗 TRAFFIC RESTRICTION activated in ' + selectedWard.ward_name, 'warning')}
        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium
                   bg-orange-500/10 border border-orange-500/30 text-orange-300
                   hover:bg-orange-500/20 transition-all">
        🚗 Restrict Heavy Traffic in {selectedWard.ward_name}
      </button>
    )}
    <button
      onClick={() => sendAction('💧 WATER SPRINKLERS deployed in ' + selectedWard.ward_name, 'info')}
      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium
                 bg-blue-500/10 border border-blue-500/30 text-blue-300
                 hover:bg-blue-500/20 transition-all">
      💧 Deploy Water Sprinklers
    </button>
    <button
      onClick={() => sendAction('📢 HEALTH ADVISORY issued for residents of ' + selectedWard.ward_name, 'warning')}
      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium
                 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300
                 hover:bg-yellow-500/20 transition-all">
      📢 Issue Health Advisory
    </button>
    <button
      onClick={() => sendAction('📍 INCREASED MONITORING requested for ' + selectedWard.ward_name, 'info')}
      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium
                 bg-purple-500/10 border border-purple-500/30 text-purple-300
                 hover:bg-purple-500/20 transition-all">
      📍 Increase Monitoring Frequency
    </button>
  </div>
</div>   
                  </div>
              
              </>
            )}
            {toast && (
  <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50
                  bg-green-900/90 border border-green-500/50 text-green-300
                  px-4 py-2 rounded-xl text-xs font-medium backdrop-blur
                  shadow-xl max-w-sm text-center">
    ✅ {toast}
  </div>
)}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 2: ANALYTICS                                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'analytics' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Top / Bottom 5 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#12141c] rounded-xl border border-white/10 p-4">
                <div className="text-xs text-white/40 uppercase tracking-wider mb-3">
                  🔴 Most Polluted
                </div>
                {[...stations].sort((a,b) => b.aqi-a.aqi).slice(0,5).map((s,i) => (
                  <div key={s.id} className="flex items-center gap-3 py-2
                                              border-b border-white/[0.05] last:border-0">
                    <span className="text-white/20 text-xs w-4">#{i+1}</span>
                    <span className="flex-1 text-sm text-white/70">{s.name}</span>
                    <span className="font-mono font-bold text-sm"
                          style={{ color: aqiColor(s.aqi) }}>
                      {s.aqi}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-[#12141c] rounded-xl border border-white/10 p-4">
                <div className="text-xs text-white/40 uppercase tracking-wider mb-3">
                  🟢 Cleanest Areas
                </div>
                {[...stations].sort((a,b) => a.aqi-b.aqi).slice(0,5).map((s,i) => (
                  <div key={s.id} className="flex items-center gap-3 py-2
                                              border-b border-white/[0.05] last:border-0">
                    <span className="text-white/20 text-xs w-4">#{i+1}</span>
                    <span className="flex-1 text-sm text-white/70">{s.name}</span>
                    <span className="font-mono font-bold text-sm"
                          style={{ color: aqiColor(s.aqi) }}>
                      {s.aqi}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action zones */}
            <div className="bg-[#12141c] rounded-xl border border-red-500/20 p-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-400">
                  Where Should We Act Now
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[...stations].sort((a,b) => b.aqi-a.aqi).slice(0,3).map((s) => {
                  const stage = grapStage(s.aqi)
                  const color = GRAP_COLORS[stage]
                  return (
                    <div key={s.id}
                         className="bg-white/[0.03] rounded-xl p-3 border"
                         style={{ borderColor: color + '33' }}>
                      <div className="font-semibold text-sm text-white mb-1">{s.name}</div>
                      <div className="font-mono text-3xl font-black mb-2"
                           style={{ color }}>
                        {s.aqi}
                      </div>
                      <div className="text-[10px] text-white/40 mb-2">
                        Primary: PM2.5 ({s.pm25} μg/m³)
                      </div>
                      <div className="space-y-1">
                        {stage >= 3 && (
                          <div className="text-[10px] bg-red-500/10 text-red-300
                                          px-2 py-1 rounded">
                            🚧 Halt construction
                          </div>
                        )}
                        {stage >= 2 && (
                          <div className="text-[10px] bg-orange-500/10 text-orange-300
                                          px-2 py-1 rounded">
                            🚗 Restrict traffic
                          </div>
                        )}
                        <div className="text-[10px] bg-blue-500/10 text-blue-300
                                        px-2 py-1 rounded">
                          📊 Increase monitoring
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Prediction */}
            <div className="bg-[#12141c] rounded-xl border border-white/10 p-4">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-3">
                📈 6-Hour Outlook (Logic-Based)
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[...stations].sort((a,b) => b.aqi-a.aqi).slice(0,3).map(s => {
                  const trend = s.ws < 1.5 ? 'up' : 'down'
                  const pred  = trend === 'up'
                    ? Math.min(500, Math.round(s.aqi * 1.08))
                    : Math.max(50,  Math.round(s.aqi * 0.93))
                  return (
                    <div key={s.id} className="text-center">
                      <div className="text-xs text-white/40 mb-1">{s.name}</div>
                      <div className="font-mono text-2xl font-bold"
                           style={{ color: aqiColor(pred) }}>
                        {pred}
                      </div>
                      <div className={`text-xs mt-1 ${trend === 'up' ? 'text-red-400' : 'text-green-400'}`}>
                        {trend === 'up' ? '↑ Worsening' : '↓ Improving'}
                      </div>
                      <div className="text-[10px] text-white/20 mt-0.5">
                        Wind: {s.ws} m/s
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Scenario simulation */}
            <div className="bg-[#12141c] rounded-xl border border-white/10 p-4">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-3">
                🔬 Scenario Simulation
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Reduce traffic by 20%', improvement: 0.88 },
                  { label: 'Stop construction',      improvement: 0.82 },
                ].map(sc => (
                  <div key={sc.label}
                       className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                    <div className="text-xs text-white/60 mb-2">{sc.label}</div>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-[9px] text-white/30">Current</div>
                        <div className="font-mono font-bold text-lg"
                             style={{ color: aqiColor(maxAQI) }}>
                          {maxAQI}
                        </div>
                      </div>
                      <div className="text-white/20">→</div>
                      <div>
                        <div className="text-[9px] text-white/30">Estimated</div>
                        <div className="font-mono font-bold text-lg"
                             style={{ color: aqiColor(Math.round(maxAQI * sc.improvement)) }}>
                          {Math.round(maxAQI * sc.improvement)}
                        </div>
                      </div>
                      <div className="ml-auto text-xs text-green-400 font-bold">
                        -{Math.round((1 - sc.improvement) * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 3: OPERATIONS                                              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'operations' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Fleet stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label:'Active Stations', value:`${stations.length}/${stations.length}`, color:'#22c55e', sub:'All online' },
                { label:'Data Latency',    value:'142 ms',  color:'#22c55e', sub:'avg last 15 min' },
                { label:'Uptime',          value:'99.2%',   color:'#22c55e', sub:'rolling 24h' },
              ].map(t => (
                <div key={t.label}
                     className="bg-[#12141c] rounded-xl border border-white/10 p-4">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
                    {t.label}
                  </div>
                  <div className="font-mono text-2xl font-bold" style={{ color: t.color }}>
                    {t.value}
                  </div>
                  <div className="text-[10px] text-white/25 mt-1">{t.sub}</div>
                </div>
              ))}
            </div>

            {/* Maintenance table */}
            <div className="bg-[#12141c] rounded-xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <span className="text-sm font-semibold text-white/70">
                  Maintenance Log
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] text-white/30
                                  uppercase tracking-wider">
                    <th className="text-left p-3">Station ID</th>
                    <th className="text-left p-3">Service</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Technician</th>
                    <th className="text-left p-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-white/20 text-sm">
                        No maintenance records yet
                      </td>
                    </tr>
                  ) : maintenance.map((m: any) => {
                    const sc: Record<string, string> = {
                      'Completed':       '#22c55e',
                      'In-Progress':     '#f97316',
                      'Scheduled':       '#60a5fa',
                      'Action Required': '#ef4444',
                    }
                    const c = sc[m.status] ?? '#888'
                    return (
                      <tr key={m.id}
                          className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-white font-semibold">
                          {m.station_id}
                        </td>
                        <td className="p-3 text-white/60">{m.service_type}</td>
                        <td className="p-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{
                                  background: c + '22',
                                  color: c,
                                  border: `1px solid ${c}44`,
                                }}>
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3 text-white/40 text-xs">{m.technician_name}</td>
                        <td className="p-3 text-white/30 text-xs font-mono">
                          {new Date(m.started_at).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Reports */}
            <div className="bg-[#12141c] rounded-xl border border-white/10 p-4">
              <div className="text-sm font-semibold text-white/70 mb-4">
                📄 Generate Report
              </div>
              <div className="flex gap-3 flex-wrap">
                {['daily','weekly','monthly'].map(p => (
                  <div key={p} className="flex gap-2">
                    <button onClick={() => generateReport(p, 'csv')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs
                                       bg-green-500/10 border border-green-500/30 text-green-400
                                       hover:bg-green-500/20 transition-all capitalize">
                      <FileDown className="w-3.5 h-3.5" />
                      {p} CSV
                    </button>
                  </div>
                ))}
              </div>
              {reportMsg && (
                <p className="text-xs text-white/40 mt-3">{reportMsg}</p>
              )}
            </div>

            {/* Alert broadcast */}
            <div className="bg-[#12141c] rounded-xl border border-white/10 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Radio className="w-4 h-4 text-white/40" />
                <span className="text-sm font-semibold text-white/70">
                  Alert Broadcast
                </span>
              </div>
              <textarea
                value={broadcastMsg}
                onChange={e => setBMsg(e.target.value)}
                placeholder="Type message to send to all field staff…"
                className="w-full bg-white/[0.04] border border-white/10 text-white
                           placeholder:text-white/20 text-sm rounded-lg p-3
                           resize-none h-20 focus:outline-none focus:border-white/20 mb-3"
              />
              <div className="flex gap-2 mb-4">
                {[
                  { s:'info',     label:'Info',     c:'#60a5fa' },
                  { s:'warning',  label:'Warning',  c:'#f97316' },
                  { s:'critical', label:'Critical', c:'#ef4444' },
                ].map(({ s, label, c }) => (
                  <button key={s} onClick={() => sendBroadcast(s)}
                          disabled={!broadcastMsg.trim()}
                          className="flex-1 py-2 rounded-lg text-xs font-medium
                                     disabled:opacity-30 transition-all"
                          style={{ background: c + '22', color: c, border: `1px solid ${c}44` }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Broadcast log */}
              {broadcasts.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] text-white/30 uppercase tracking-wider">
                    Sent
                  </div>
                  {broadcasts.slice(0,5).map((b, i) => (
                    <div key={i}
                         className="text-xs p-2 rounded-lg bg-white/[0.03]
                                    border border-white/[0.05] flex items-start gap-2">
                      <span className={`font-bold ${
                        b.severity === 'critical' ? 'text-red-400' :
                        b.severity === 'warning'  ? 'text-orange-400' : 'text-blue-400'
                      }`}>
                        [{b.severity.toUpperCase()}]
                      </span>
                      <span className="text-white/60 flex-1">{b.message}</span>
                      <span className="text-white/20 text-[10px]">{b.sent_at}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}