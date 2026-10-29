export const PILOT_CITIES = ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata'] as const
export type PilotCity = (typeof PILOT_CITIES)[number]

const CITY_ALIASES: Record<string, PilotCity> = {
  bengaluru: 'Bengaluru',
  bangalore: 'Bengaluru',
  'delhi ncr': 'Delhi NCR',
  delhi: 'Delhi NCR',
  'new delhi': 'Delhi NCR',
  ncr: 'Delhi NCR',
  gurugram: 'Delhi NCR',
  gurgaon: 'Delhi NCR',
  mumbai: 'Mumbai',
  bombay: 'Mumbai',
  pune: 'Pune',
  hyderabad: 'Hyderabad',
  chennai: 'Chennai',
  madras: 'Chennai',
  kolkata: 'Kolkata',
  calcutta: 'Kolkata',
}

export function normalizePilotCity(value: string): PilotCity | null {
  const base = value.trim().toLowerCase().replace(/, india$/, '')
  return CITY_ALIASES[base] ?? null
}
