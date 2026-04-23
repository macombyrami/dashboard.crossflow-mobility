import { isPointInPolygon } from '@/lib/utils/spatial'

export interface ParisArrondissement {
  id:   number
  name: string
  center: [number, number] // [lng, lat]
}

export const PARIS_ARRONDISSEMENTS: ParisArrondissement[] = [
  { id: 1,  name: '1er arr. — Louvre',         center: [2.3361, 48.8623] },
  { id: 2,  name: '2e arr. — Bourse',          center: [2.3413, 48.8679] },
  { id: 3,  name: '3e arr. — Temple',          center: [2.3601, 48.8629] },
  { id: 4,  name: '4e arr. — Hôtel-de-Ville',  center: [2.3556, 48.8543] },
  { id: 5,  name: '5e arr. — Panthéon',        center: [2.3461, 48.8447] },
  { id: 6,  name: '6e arr. — Luxembourg',     center: [2.3323, 48.8490] },
  { id: 7,  name: '7e arr. — Palais-Bourbon',  center: [2.3122, 48.8561] },
  { id: 8,  name: '8e arr. — Élysée',         center: [2.3075, 48.8727] },
  { id: 9,  name: '9e arr. — Opéra',          center: [2.3374, 48.8771] },
  { id: 10, name: '10e arr. — Entrepôt',      center: [2.3591, 48.8761] },
  { id: 11, name: '11e arr. — Popincourt',     center: [2.3787, 48.8590] },
  { id: 12, name: '12e arr. — Reuilly',        center: [2.4063, 48.8349] },
  { id: 13, name: '13e arr. — Gobelins',      center: [2.3582, 48.8283] },
  { id: 14, name: '14e arr. — Observatoire',  center: [2.3270, 48.8292] },
  { id: 15, name: '15e arr. — Vaugirard',     center: [2.2923, 48.8412] },
  { id: 16, name: '16e arr. — Passy',         center: [2.2618, 48.8604] },
  { id: 17, name: '17e arr. — Batignolles',    center: [2.2965, 48.8837] },
  { id: 18, name: '18e arr. — Buttes-Monmartre',center: [2.3444, 48.8925] },
  { id: 19, name: '19e arr. — Buttes-Chaumont',center: [2.3813, 48.8817] },
  { id: 20, name: '20e arr. — Ménilmontant',   center: [2.4011, 48.8631] },
]

/**
 * Find the closest arrondissement for a given coordinate.
 * Note: For production-grade GIS, this should use polygons.
 * Using centroid proximity as a fast and robust client-side fallback.
 */
export function findArrondissement(lng: number, lat: number): ParisArrondissement | null {
  // Rough bounding box for Paris to avoid false matches outside the city
  if (lat < 48.81 || lat > 48.91 || lng < 2.22 || lng > 2.48) return null

  let minData = Infinity
  let closest = null

  for (const a of PARIS_ARRONDISSEMENTS) {
    const d = Math.sqrt(Math.pow(a.center[0] - lng, 2) + Math.pow(a.center[1] - lat, 2))
    if (d < minData) {
      minData = d
      closest = a
    }
  }
  return closest
}
