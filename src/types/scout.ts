export interface ScoutLocation {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  distanceKm: number;
  bortle: number; // 1 to 9
  artificialBrightnessMcd: number;
  cloudCoverPct: number; // 0 to 100
  moonIlluminationPct: number; // 0 to 100
  moonAltitudeDeg: number;
  score: number; // 0 to 100
  reason: string; // One-line reason as required by prompt
  elevationM?: number;
  type?: string;
  cachedAt?: string;
}
