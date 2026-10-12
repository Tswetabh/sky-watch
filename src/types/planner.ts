export type SkyEventType = 'planet' | 'moon' | 'iss' | 'meteor_shower' | 'constellation';

export interface SkyEvent {
  id: string;
  name: string;
  type: SkyEventType;
  timeFormatted: string; // e.g. "8:40 PM"
  timeIso: string;
  altitudeDeg: number;
  azimuthDeg: number;
  directionCompass: string; // "NW", "S", "ENE"
  magnitude?: number;
  spokenCue: string; // e.g. "Look northwest, about halfway up. Jupiter is glowing bright white."
  description: string;
  highlights: string[];
}

export interface SkyPlan {
  planId: string;
  generatedAt: string;
  plannerModel: string; // "gemma3:4b" or "deterministic-astronomy-engine"
  mode: string;
  durationMinutes: number;
  leaveByTime: string; // e.g. "8:15 PM"
  bestLocationSuggestion: string;
  events: SkyEvent[];
  nightSummary: string;
  astronomyFactsGrounding: {
    moonPhase: string;
    moonIlluminationPct: number;
    cloudsPct: number;
    activeMeteorShowers: string[];
  };
}

export interface PlanRequest {
  minutes: number;
  mode: string;
  lat: number;
  lon: number;
  locationName?: string;
  date?: Date;
}
