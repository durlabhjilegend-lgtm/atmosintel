'use client'
import { useState } from 'react'
import { aqiColor, aqiLabel } from '@/lib/idw'

type Period = 'daily' | 'weekly' | 'monthly'

export default function ReportGenerator() {
  const [period,  setPeriod]  = useState<Period>('daily')
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState('')

  const generate = async () => {
    setLoading(true)
    setMsg('')
    try {
      const res  = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      })
      const { data } = await res.json()
      if (!data?.length) { setMsg('No data yet. Visit /api/aqi first.'); setLoading(false); return }

      // Compute stats
      const meanAQI  = +(data.reduce((s: number, r: any) => s + r.aqi, 0) / data.length).toFixed(1)
      const maxEntry = data.reduce((a: any, b: any) => a.aqi > b.aqi ? a : b)
      const minEntry = data.reduce((a: any, b: any) => a.aqi < b.aqi ? a : b)

      // AQI category counts for pie
      const cats: Record<string, number> = {
        'Good (0-50)': 0, 'Satisfactory (51-100)': 0,
        'Moderate (101-200)': 0, 'Poor (201-300)': 0,
        'Very Poor (301-400)': 0, 'Severe (400+)': 0,
      }
      data.forEach((r: any) => {
        if      (r.aqi <= 50)  cats['Good (0-50)']++
        else if (r.aqi <= 100) cats['Satisfactory (51-100)']++
        else if (r.aqi <= 200) cats['Moderate (101-200)']++
        else if (r.aqi <= 300) cats['Poor (201-300)']++
        else if (r.aqi <= 400) cats['Very Poor (301-400)']++
        else                   cats['Severe (400+)']++
      })

      // Pollutant averages
      const avg = (field: string) =>
        +(data.reduce((s: number, r: any) => s + (r[field] || 0), 0) / data.length).toFixed(1)
      const pollutants = {
        'PM2.5': avg('pm25'), 'PM10': avg('pm10'),
        'SO₂':   avg('so2'),  'NO₂':  avg('no2'),
      }

      // Generate HTML report and open in new tab for printing/saving as PDF
      const periodLabel  = period.charAt(0).toUpperCase() + period.slice(1)
      const sinceDate    = new Date(Date.now() - (period === 'daily' ? 86400000 : period === 'weekly' ? 604800000 : 2592000000))
      const reportHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>AtmosIntel ${periodLabel} Report</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', sans-serif; background:#fff; color:#1a1a2e; padding:40px; }
  .header { text-align:center; margin-bottom:32px; border-bottom:3px solid #00d4ff; padding-bottom:20px; }
  .logo { font-size:28px; font-weight:800; color:#00d4ff; letter-spacing:2px; }
  .subtitle { font-size:13px; color:#666; margin-top:4px; }
  .title { font-size:22px; font-weight:700; margin-top:12px; color:#1a1a2e; }
  .period { font-size:12px; color:#888; margin-top:4px; }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin:24px 0; }
  .card { background:#f8f9ff; border:1px solid #e0e0f0; border-radius:12px; padding:16px; text-align:center; }
  .card .val { font-size:32px; font-weight:800; }
  .card .lbl { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:1px; margin-top:4px; }
  .card .sub { font-size:11px; color:#666; margin-top:6px; }
  h2 { font-size:16px; font-weight:700; margin:28px 0 12px; color:#1a1a2e; border-left:4px solid #00d4ff; padding-left:10px; }
  .bar-chart { display:flex; flex-direction:column; gap:10px; }
  .bar-row { display:flex; align-items:center; gap:10px; }
  .bar-label { width:60px; font-size:12px; font-weight:600; color:#555; text-align:right; }
  .bar-wrap { flex:1; background:#f0f0f0; border-radius:4px; height:28px; overflow:hidden; }
  .bar-fill { height:100%; border-radius:4px; display:flex; align-items:center; padding-left:8px; font-size:12px; font-weight:600; color:#fff; }
  .bar-val { width:60px; font-size:12px; font-weight:700; }
  .pie-row { display:flex; flex-wrap:wrap; gap:10px; }
  .pie-item { display:flex; align-items:center; gap:6px; font-size:12px; }
  .pie-dot { width:14px; height:14px; border-radius:50%; flex-shrink:0; }
  .footer { margin-top:40px; text-align:center; font-size:11px; color:#aaa; border-top:1px solid #eee; padding-top:16px; }
  @media print { body { padding:20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">AtmosIntel</div>
  <div class="subtitle">Delhi-NCR Hyper-Local Air Quality Intelligence Platform</div>
  <div class="title">${periodLabel} Air Quality Report</div>
  <div class="period">
    Period: ${sinceDate.toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'})}
    — ${new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'})}
    &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}
  </div>
</div>

<div class="grid">
  <div class="card">
    <div class="val" style="color:${aqiColor(meanAQI)}">${meanAQI}</div>
    <div class="lbl">Average AQI</div>
    <div class="sub">${aqiLabel(meanAQI)}</div>
  </div>
  <div class="card">
    <div class="val" style="color:${aqiColor(maxEntry.aqi)}">${maxEntry.aqi}</div>
    <div class="lbl">Peak AQI</div>
    <div class="sub">${maxEntry.station_name || 'Unknown'}</div>
  </div>
  <div class="card">
    <div class="val" style="color:${aqiColor(minEntry.aqi)}">${minEntry.aqi}</div>
    <div class="lbl">Lowest AQI</div>
    <div class="sub">${minEntry.station_name || 'Unknown'}</div>
  </div>
</div>

<h2>Pollutant Levels (City Average)</h2>
<div class="bar-chart">
  ${Object.entries(pollutants).map(([k, v]) => {
    const maxVal = k === 'PM10' ? 500 : k === 'PM2.5' ? 300 : 120
    const pct    = Math.min(100, (v / maxVal) * 100)
    const colors: Record<string, string> = {
      'PM2.5': '#ef4444', 'PM10': '#f97316', 'SO₂': '#a78bfa', 'NO₂': '#60a5fa',
    }
    return `<div class="bar-row">
      <div class="bar-label">${k}</div>
      <div class="bar-wrap">
        <div class="bar-fill" style="width:${pct}%;background:${colors[k]}">${v} μg/m³</div>
      </div>
    </div>`
  }).join('')}
</div>

<h2>AQI Distribution (% of Readings)</h2>
<div class="pie-row">
  ${Object.entries(cats).map(([cat, count]) => {
    const pct   = data.length ? ((count / data.length) * 100).toFixed(1) : '0'
    const colors: Record<string, string> = {
      'Good (0-50)': '#22c55e', 'Satisfactory (51-100)': '#84cc16',
      'Moderate (101-200)': '#eab308', 'Poor (201-300)': '#f97316',
      'Very Poor (301-400)': '#ef4444', 'Severe (400+)': '#7c3aed',
    }
    return `<div class="pie-item">
      <div class="pie-dot" style="background:${colors[cat]}"></div>
      <span><b>${pct}%</b> ${cat} (${count} readings)</span>
    </div>`
  }).join('')}
</div>

<div class="footer">
  AtmosIntel | Delhi-NCR Air Quality Intelligence | Data Source: AQICN / CPCB
  <br/>Total readings analysed: ${data.length} | Stations: ${new Set(data.map((r: any) => r.station_id)).size}
</div>
</body>
</html>`

      const win = window.open('', '_blank')
      if (win) {
        win.document.write(reportHTML)
        win.document.close()
        setTimeout(() => win.print(), 500)
      }
      setMsg('✅ Report opened — use Ctrl+P to save as PDF')
    } catch(e) {
      setMsg('Error generating report')
    }
    setLoading(false)
  }

  return (
    <div className="bg-[#12141c] rounded-xl border border-white/10 p-4">
      <div className="text-sm font-semibold text-white/70 mb-4">📄 Generate Report</div>
      <div className="flex gap-2 mb-4">
        {(['daily','weekly','monthly'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
                  className="flex-1 py-2 rounded-lg text-xs capitalize border transition-all"
                  style={{
                    borderColor: period === p ? '#00d4ff' : 'rgba(255,255,255,0.08)',
                    color:       period === p ? '#00d4ff' : 'rgba(255,255,255,0.4)',
                    background:  period === p ? 'rgba(0,212,255,0.08)' : 'transparent',
                  }}>
            {p}
          </button>
        ))}
      </div>
      <button onClick={generate} disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30
                         text-blue-400 text-sm hover:bg-blue-500/20 disabled:opacity-40
                         transition-all flex items-center justify-center gap-2">
        {loading ? '⏳ Generating…' : '📊 Generate & Download PDF Report'}
      </button>
      {msg && <p className="text-xs text-white/50 mt-2 text-center">{msg}</p>}
    </div>
  )
}