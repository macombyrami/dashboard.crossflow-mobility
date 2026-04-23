import type { City } from '@/types'
import citiesData from '@/lib/data/cities.json'

export const CITIES: City[] = citiesData as City[]

export const getCityById = (id: string): City | undefined =>
  CITIES.find(c => c.id === id)

export const DEFAULT_CITY_ID = 'paris'
