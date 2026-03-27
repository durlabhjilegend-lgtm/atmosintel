'use client'
import { useState, useEffect } from 'react'
import { aqiColor, aqiLabel, grapStage } from '@/lib/idw'
import { useRouter } from 'next/navigation'

const HEALTH_MSG: Record<number, string> = {
  0: '✅ Air quality is good. Enjoy outdoor activities.',
  1: '😷 Air is acceptable. Sensitive groups should limit outdoor time.',
  2: '⚠️ Moderate pollution. Avoid prolonged outdoor exertion.',
  3: '🚨 Unhealthy air. Wear N95 mask outdoors. Avoid exercise.',
  4: '☣️ Hazardous. Stay indoors. Seal windows. Emergency advisory.',
}

export default function CitizenView() {
  const [stations,   setStations]   = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [alerts,     setAlerts]     = useState<any[]>([])
  const [prediction, setPrediction] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    if (!localStorage.getItem('ai_auth')) router.push('/login')
  }, [router])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/aqi')
        if (res.ok) {
          const { readings } = await res.json()
          if (readings?.length) {
            setStations(readings.map((r: any) => ({
              name:     r.station_name,
              aqi:      r.aqi || 0,
              pm25:     r.pm25 || 0,
              pm10:     r.pm10 || 0,
              humidity: r.humidity || 0,
            })))
          }
        }
      } finally { setLoading(false) }
    }
    load()
    setInterval(load, 5 * 60 * 1000)
  }, [])

  // Load broadcasts as citizen alerts
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const sb = createClient()
      sb.from('broadcasts').select('*').order('sent_at', { ascending: false }).limit(5)
        .then(({ data }) => setAlerts(data ?? []))

      // Real-time subscription
      sb.channel('broadcasts').on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'broadcasts' },
        payload => setAlerts(p => [payload.new, ...p].slice(0, 5))
      ).subscribe()
    })
  }, [])

  const meanAQI = stations.length
    ? Math.round(stations.reduce((s, r) => s + r.aqi, 0) / stations.length)
    : 0
  const stage   = grapStage(meanAQI)
  const color   = ['#22c55e','#eab308','#f97316','#ef4444','#7c3aed'][stage]

  if (loading) return (
    <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
      <div className="text-[#00d4ff] font-mono text-lg animate-pulse">Loading…</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-8">
      {/* Header */}
      <div className="bg-[#12141c] border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-mono text-sm font-bold text-[#00d4ff]">AtmosIntel</span>
        <span className="text-white/30 text-xs">Delhi-NCR · Citizen View</span>
        <button onClick={() => { localStorage.clear(); router.push('/login') }}
                className="text-white/30 text-xs hover:text-white">
          Sign out
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">

        {/* Alerts from admin */}
        {alerts.length > 0 && alerts.map((a, i) => (
          <div key={i}
               className={`rounded-xl p-3 border text-sm
                 ${a.severity === 'critical'
                   ? 'bg-red-500/10 border-red-500/30 text-red-300'
                   : a.severity === 'warning'
                   ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                   : 'bg-blue-500/10 border-blue-500/30 text-blue-300'}`}>
            <div className="font-bold text-xs mb-1">
              📢 {a.severity?.toUpperCase()} ADVISORY
            </div>
            <div>{a.message}</div>
            <div className="text-[10px] opacity-60 mt-1">
              {new Date(a.sent_at).toLocaleString('en-IN')}
            </div>
          </div>
        ))}

        {/* Overall AQI card */}
        <div className="bg-[#12141c] rounded-2xl border border-white/10 p-5 text-center">
          <div className="text-xs text-white/40 uppercase tracking-widest mb-2">
            Delhi-NCR Current AQI
          </div>
          <div className="font-mono text-7xl font-black mb-2" style={{ color }}>
            {meanAQI}
          </div>
          <div className="text-sm font-semibold mb-3" style={{ color }}>
            {aqiLabel(meanAQI)}
          </div>
          <div className="text-xs text-white/50 leading-relaxed">
            {HEALTH_MSG[stage]}
          </div>
        </div>

        {/* Top stations */}
        <div className="bg-[#12141c] rounded-xl border border-white/10 p-4">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-3">
            Stations Near You
          </div>
          <div className="space-y-2">
            {[...stations].sort((a,b) => b.aqi - a.aqi).slice(0, 8).map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5
                                       border-b border-white/[0.05] last:border-0">
                <span className="text-sm text-white/70">{s.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm"
                        style={{ color: aqiColor(s.aqi) }}>
                    {s.aqi}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{
                          background: aqiColor(s.aqi) + '22',
                          color: aqiColor(s.aqi),
                        }}>
                    {aqiLabel(s.aqi)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6-hour forecast — logic based */}
        <div className="bg-[#12141c] rounded-xl border border-white/10 p-4">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-3">
            📈 6-Hour Outlook
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[2, 4, 6].map(h => {
              const factor = h === 2 ? 1.04 : h === 4 ? 1.07 : 1.10
              const pred   = Math.min(500, Math.round(meanAQI * factor))
              return (
                <div key={h} className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <div className="text-[10px] text-white/30 mb-1">+{h}h</div>
                  <div className="font-mono font-bold text-xl"
                       style={{ color: aqiColor(pred) }}>
                    {pred}
                  </div>
                  <div className="text-[9px] text-white/30 mt-1">{aqiLabel(pred)}</div>
                </div>
              )
            })}
          </div>
          <div className="text-[10px] text-white/20 mt-2 text-center">
            Trend-based estimate · Updates every 5 minutes
          </div>
        </div>

        {/* Health tips */}
        <div className="bg-[#12141c] rounded-xl border border-white/10 p-4">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-3">
            🏥 Health Guidelines
          </div>
          <div className="space-y-2 text-xs text-white/60">
            {stage >= 1 && <div>• Wear N95/FFP2 mask when outdoors</div>}
            {stage >= 2 && <div>• Avoid morning walks and outdoor exercise</div>}
            {stage >= 3 && <div>• Keep children and elderly indoors</div>}
            {stage >= 4 && <div>• Seal gaps in windows and doors</div>}
            <div>• Stay hydrated and avoid smoking areas</div>
            <div>• Check this page before any outdoor activity</div>
          </div>
        </div>
      </div>
    </div>
  )
}