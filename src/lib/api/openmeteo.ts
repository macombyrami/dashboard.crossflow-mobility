/**
 * Open-Meteo API — Météo + Qualité de l'air
 * 100% GRATUIT · Aucune clé API · Aucune inscription
 * https://open-meteo.com
 * Données: température, précipitations, vent, neige, visibilité
 * + qualité de l'air (PM2.5, PM10, NO2, O3, CO, AQI européen)
 */

const WEATHER_BASE = 'https://api.open-meteo.com/v1'
const AIR_BASE     = 'https://air-quality-api.open-meteo.com/v1'

export interface OpenMeteoWeather {
  temp:            number      // °C
  feelsLike:       number      // °C
  humidity:        number      // %
  windSpeedKmh:    number
  windDirection:   number      // degrees
  precipitationMm: number
  snowDepthCm:     number
  visibilityM:     number      // meters
  weatherCode:     number      // WMO code
  weatherLabel:    string
  weatherEmoji:    string
  isDay:           boolean
  uvIndex:         number
  trafficImpact:   'none' | 'minor' | 'moderate' | 'severe'
  hourlyForecast:  HourlySlot[]
}

export interface HourlySlot {
  time:            string      // HH:MM
  temp:            number
  precipProb:      number      // %
  weatherCode:     number
  weatherEmoji:    string
  windSpeedKmh:    number
}

export interface AirQuality {
  aqi:             number      // 0–500 (US AQI)
  aqiEuropean:     number      // 0–100 (EU CAQI)
  pm25:            number      // μg/m³
  pm10:            number      // μg/m³
  no2:             number      // μg/m³
  o3:              number      // μg/m³
  co:              number      // μg/m³
  so2:             number      // μg/m³
  level:           'bon' | 'acceptable' | 'mauvais' | 'très mauvais' | 'dangereux'
  color:           string
  trafficImpact:   number      // 0-1 multiplication factor
  hourlyForecast:  AQHourly[]
}

export interface AQHourly {
  time:    string
  aqi:     number
  pm25:    number
  level:   string
  color:   string
}

// ─── Weather fetch ─────────────────────────────────────────────────────────

export async function fetchWeather(lat: number, lng: number): Promise<OpenMeteoWeather | null> {
  try {
    const params = new URLSearchParams({
      latitude:               lat.toString(),
      longitude:              lng.toString(),
      current:                [
        'temperature_2m', 'apparent_temperature', 'relative_humidity_2m',
        'wind_speed_10m', 'wind_direction_10m', 'precipitation',
        'snowfall', 'visibility', 'weather_code', 'is_day', 'uv_index',
      ].join(','),
      hourly:                 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m',
      forecast_days:          '1',
      wind_speed_unit:        'kmh',
      timezone:               'auto',
    })

    const res  = await fetch(`${WEATHER_BASE}/forecast?${params}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const d = await res.json()
    const c = d.current ?? {}

    const code     = c.weather_code ?? 0
    const label    = WMO_LABELS[code] ?? 'Inconnu'
    const emoji    = WMO_EMOJI[code] ?? '🌡️'
    const snow     = (c.snowfall ?? 0) > 0.1
    const vis      = c.visibility ?? 10000
    const precip   = c.precipitation ?? 0
    const wind     = c.wind_speed_10m ?? 0

    const trafficImpact =
      snow || vis < 500        ? 'severe'   :
      precip > 5 || vis < 2000 ? 'moderate' :
      precip > 1 || wind > 50  ? 'minor'    : 'none'

    // Hourly forecast (next 8 hours)
    const hours   = d.hourly?.time ?? []
    const nowHour = new Date().getHours()
    const hourlyForecast: HourlySlot[] = hours
      .slice(nowHour, nowHour + 8)
      .map((_: string, i: number) => {
        const idx = nowHour + i
        return {
          time:         `${String(idx % 24).padStart(2, '0')}:00`,
          temp:         Math.round(d.hourly.temperature_2m?.[idx] ?? 0),
          precipProb:   d.hourly.precipitation_probability?.[idx] ?? 0,
          weatherCode:  d.hourly.weather_code?.[idx] ?? 0,
          weatherEmoji: WMO_EMOJI[d.hourly.weather_code?.[idx] ?? 0] ?? '🌡️',
          windSpeedKmh: Math.round(d.hourly.wind_speed_10m?.[idx] ?? 0),
        }
      })

    return {
      temp:            Math.round(c.temperature_2m ?? 0),
      feelsLike:       Math.round(c.apparent_temperature ?? 0),
      humidity:        Math.round(c.relative_humidity_2m ?? 0),
      windSpeedKmh:    Math.round(wind),
      windDirection:   Math.round(c.wind_direction_10m ?? 0),
      precipitationMm: Math.round(precip * 10) / 10,
      snowDepthCm:     Math.round((c.snowfall ?? 0) * 10) / 10,
      visibilityM:     Math.round(vis),
      weatherCode:     code,
      weatherLabel:    label,
      weatherEmoji:    emoji,
      isDay:           Boolean(c.is_day),
      uvIndex:         Math.round(c.uv_index ?? 0),
      trafficImpact,
      hourlyForecast,
    }
  } catch {
    return null
  }
}

// ─── Air quality fetch ─────────────────────────────────────────────────────

export async function fetchAirQuality(lat: number, lng: number): Promise<AirQuality | null> {
  try {
    const params = new URLSearchParams({
      latitude:  lat.toString(),
      longitude: lng.toString(),
      current:   'pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide,european_aqi,us_aqi',
      hourly:    'pm2_5,european_aqi,us_aqi',
      forecast_days: '1',
      timezone:  'auto',
    })

    const res  = await fetch(`${AIR_BASE}/air-quality?${params}`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const d = await res.json()
    const c = d.current ?? {}

    const aqiEU     = c.european_aqi ?? 0
    const aqiUS     = c.us_aqi ?? 0
    const pm25      = Math.round((c.pm2_5 ?? 0) * 10) / 10
    const { level, color } = aqiToLevel(aqiEU, 'eu')

    // Hourly
    const hours = d.hourly?.time ?? []
    const nowH  = new Date().getHours()
    const hourlyForecast: AQHourly[] = hours
      .slice(nowH, nowH + 8)
      .map((_: string, i: number) => {
        const idx  = nowH + i
        const aqi  = d.hourly.european_aqi?.[idx] ?? 0
        const { level: lv, color: col } = aqiToLevel(aqi, 'eu')
        return {
          time:  `${String((nowH + i) % 24).padStart(2, '0')}:00`,
          aqi,
          pm25:  Math.round((d.hourly.pm2_5?.[idx] ?? 0) * 10) / 10,
          level: lv,
          color: col,
        }
      })

    return {
      aqi:            aqiUS,
      aqiEuropean:    aqiEU,
      pm25,
      pm10:           Math.round((c.pm10 ?? 0) * 10) / 10,
      no2:            Math.round((c.nitrogen_dioxide ?? 0) * 10) / 10,
      o3:             Math.round((c.ozone ?? 0) * 10) / 10,
      co:             Math.round((c.carbon_monoxide ?? 0) * 10) / 10,
      so2:            Math.round((c.sulphur_dioxide ?? 0) * 10) / 10,
      level,
      color,
      trafficImpact:  aqiEU > 75 ? 0.15 : aqiEU > 50 ? 0.08 : 0,
      hourlyForecast,
    }
  } catch {
    return null
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// Échelle IQA européen (EEA / Atmo France)
// Source: https://www.eea.europa.eu/themes/air/air-quality-index
// Bon 0-20 · Correct 20-40 · Modéré 40-60 · Mauvais 60-80 · Très mauvais 80-100 · Extrêmement mauvais >100
function aqiToLevel(aqi: number, scale: 'eu' | 'us'): { level: AirQuality['level']; color: string } {
  if (scale === 'eu') {
    if (aqi <= 20)  return { level: 'bon',          color: '#00E676' }
    if (aqi <= 40)  return { level: 'acceptable',   color: '#00BCD4' }
    if (aqi <= 60)  return { level: 'acceptable',   color: '#FFD600' }
    if (aqi <= 80)  return { level: 'mauvais',      color: '#FF6D00' }
    if (aqi <= 100) return { level: 'très mauvais', color: '#FF1744' }
    return               { level: 'dangereux',      color: '#9C27B0' }
  }
  // US AQI (0-500)
  if (aqi <= 50)  return { level: 'bon',          color: '#00E676' }
  if (aqi <= 100) return { level: 'acceptable',   color: '#FFD600' }
  if (aqi <= 150) return { level: 'mauvais',      color: '#FF6D00' }
  if (aqi <= 200) return { level: 'très mauvais', color: '#FF1744' }
  return               { level: 'dangereux',      color: '#9C27B0' }
}

// WMO Weather interpretation codes
const WMO_LABELS: Record<number, string> = {
  0: 'Ciel dégagé', 1: 'Principalement dégagé', 2: 'Partiellement nuageux',
  3: 'Couvert', 45: 'Brouillard', 48: 'Brouillard givrant',
  51: 'Bruine légère', 53: 'Bruine modérée', 55: 'Bruine dense',
  61: 'Pluie légère', 63: 'Pluie modérée', 65: 'Pluie forte',
  71: 'Neige légère', 73: 'Neige modérée', 75: 'Neige forte',
  77: 'Grains de neige', 80: 'Averses légères', 81: 'Averses modérées',
  82: 'Averses violentes', 85: 'Averses de neige légères',
  86: 'Averses de neige fortes', 95: 'Orage', 96: 'Orage avec grêle',
  99: 'Orage violent avec grêle',
}

const WMO_EMOJI: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '🌨️', 77: '🌨️', 80: '🌦️', 81: '🌧️',
  82: '⛈️', 85: '🌨️', 86: '🌨️', 95: '⛈️', 96: '⛈️', 99: '⛈️',
}
