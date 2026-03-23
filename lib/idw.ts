export interface StationPoint {
  lat: number
  lon: number
  [key: string]: number | string
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function idwInterpolate(
  targetLat: number,
  targetLon: number,
  stations: StationPoint[],
  field: string,
  power = 2,
  kNearest = 8,
): number {
  const dists = stations
    .filter((s) => typeof s[field] === 'number')
    .map((s) => ({
      d: Math.max(haversineKm(targetLat, targetLon, s.lat, s.lon), 0.01),
      v: s[field] as number,
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, kNearest)
  if (dists.length === 0) return 0
  const weights = dists.map((n) => 1 / n.d ** power)
  const wSum = weights.reduce((a, b) => a + b, 0)
  return weights.reduce((acc, w, i) => acc + w * dists[i].v, 0) / wSum
}

export function grapStage(aqi: number): number {
  if (aqi > 400) return 4
  if (aqi > 300) return 3
  if (aqi > 200) return 2
  if (aqi > 100) return 1
  return 0
}

export function aqiColor(aqi: number): string {
  if (aqi > 400) return '#7c3aed'
  if (aqi > 300) return '#ef4444'
  if (aqi > 200) return '#f97316'
  if (aqi > 100) return '#eab308'
  if (aqi > 50)  return '#84cc16'
  return '#22c55e'
}

export function aqiLabel(aqi: number): string {
  if (aqi > 400) return 'Severe'
  if (aqi > 300) return 'Very Poor'
  if (aqi > 200) return 'Poor'
  if (aqi > 100) return 'Moderate'
  if (aqi > 50)  return 'Satisfactory'
  return 'Good'
}

export function classifySource(
  pm25: number, pm10: number, so2: number, no2: number, ws: number
): string {
  const ratio = pm10 / Math.max(pm25, 1)
  if (pm10 > 300 && ws > 5)                return 'Dust Storm'
  if (pm10 > 150 && ws < 2.5 && ratio > 3) return 'Construction Dust'
  if (pm25 > 120 && so2 > 40)              return 'Industrial'
  if (pm25 > 80 && ratio < 2 && so2 < 30)  return 'Biomass Burning'
  if (no2 > 60 && so2 < 20)               return 'Vehicular'
  return 'Mixed'
}