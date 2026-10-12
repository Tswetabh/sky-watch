export interface NightCard {
  id: string;
  createdAt: string; // ISO date
  dateString: string; // YYYY-MM-DD for streaks
  minutesOutside: number;
  screenSeconds: number; // THE HEADLINE STAT
  screenTimeRatioPct: number; // e.g. screenSeconds / (minutesOutside * 60) * 100
  objectsObserved: string[];
  photosCaptured: number;
  bestMoment: string;
  nextTarget: string;
  mode: string;
  locationName: string;
  notes?: string;
  photoDataUrls?: string[];
}

export interface SessionState {
  isActive: boolean;
  startTime: number | null; // ms epoch
  currentScreenSeconds: number;
  observedIds: string[];
  photos: string[];
  spokenCueQueue: Array<{ id: string; text: string; time: number; spoken: boolean }>;
}
