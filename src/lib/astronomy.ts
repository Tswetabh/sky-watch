import * as Astronomy from 'astronomy-engine';
import meteorShowersData from '../data/meteorShowers.json';
import { SkyEvent, SkyEventType } from '../types/planner';

export interface ObserverLocation {
  lat: number;
  lon: number;
  elevationM?: number;
}

export interface MoonStatus {
  phaseName: string;
  phaseAngleDeg: number;
  illuminationFraction: number;
  illuminationPct: number;
  altitudeDeg: number;
  azimuthDeg: number;
  directionCompass: string;
  isUp: boolean;
}

export function azimuthToCompass(azDeg: number): string {
  const norm = ((azDeg % 360) + 360) % 360;
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(norm / 22.5) % 16;
  return directions[index];
}

export function getMoonPhaseName(phaseDeg: number): string {
  const deg = ((phaseDeg % 360) + 360) % 360;
  if (deg < 15 || deg >= 345) return 'New Moon';
  if (deg < 75) return 'Waxing Crescent';
  if (deg < 105) return 'First Quarter';
  if (deg < 165) return 'Waxing Gibbous';
  if (deg < 195) return 'Full Moon';
  if (deg < 255) return 'Waning Gibbous';
  if (deg < 285) return 'Third Quarter';
  return 'Waning Crescent';
}

export function computeMoonStatus(date: Date, loc: ObserverLocation): MoonStatus {
  const observer = new Astronomy.Observer(loc.lat, loc.lon, loc.elevationM || 0);
  const phaseDeg = Astronomy.MoonPhase(date);
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
  const eq = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);
  const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal');

  return {
    phaseName: getMoonPhaseName(phaseDeg),
    phaseAngleDeg: Math.round(phaseDeg),
    illuminationFraction: illum.phase_fraction,
    illuminationPct: Math.round(illum.phase_fraction * 100),
    altitudeDeg: Math.round(hor.altitude * 10) / 10,
    azimuthDeg: Math.round(hor.azimuth * 10) / 10,
    directionCompass: azimuthToCompass(hor.azimuth),
    isUp: hor.altitude > 0,
  };
}

const PLANETS_TO_CHECK = [
  { body: Astronomy.Body.Venus, name: 'Venus', desc: 'Blazing morning/evening star, brightest planet in Earth\'s sky' },
  { body: Astronomy.Body.Jupiter, name: 'Jupiter', desc: 'Brilliant gas giant, easily seen naked-eye with distinctive steady creamy glow' },
  { body: Astronomy.Body.Saturn, name: 'Saturn', desc: 'Golden jewel of the solar system, steady amber shine' },
  { body: Astronomy.Body.Mars, name: 'Mars', desc: 'The Red Planet, notable copper-crimson tint in the sky' },
  { body: Astronomy.Body.Mercury, name: 'Mercury', desc: 'Elusive swift planet low on the twilight horizon' },
];

export function computePlanetPositions(date: Date, loc: ObserverLocation): SkyEvent[] {
  const observer = new Astronomy.Observer(loc.lat, loc.lon, loc.elevationM || 0);
  const events: SkyEvent[] = [];

  for (const p of PLANETS_TO_CHECK) {
    try {
      const eq = Astronomy.Equator(p.body, date, observer, true, true);
      const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal');
      const illum = Astronomy.Illumination(p.body, date);

      // Only include if visible above horizon (> 5 degrees for realistic naked-eye view)
      if (hor.altitude >= 5) {
        const compass = azimuthToCompass(hor.azimuth);
        const altRound = Math.round(hor.altitude);
        const timeFormatted = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

        const altDesc = altRound < 20 ? 'low on the horizon' : altRound < 50 ? 'halfway up the sky' : 'high overhead';
        const spokenCue = `Look ${compass}, ${altDesc}. ${p.name} is visible with magnitude ${illum.mag.toFixed(1)}.`;

        events.push({
          id: `planet-${p.name.toLowerCase()}`,
          name: p.name,
          type: 'planet',
          timeFormatted,
          timeIso: date.toISOString(),
          altitudeDeg: altRound,
          azimuthDeg: Math.round(hor.azimuth),
          directionCompass: compass,
          magnitude: Math.round(illum.mag * 10) / 10,
          spokenCue,
          description: p.desc,
          highlights: [
            `Altitude: ${altRound}° (${compass})`,
            `Visual Magnitude: ${illum.mag.toFixed(1)}`,
            `Distance: ${eq.dist.toFixed(2)} AU`
          ]
        });
      }
    } catch {
      // Continue if planetary ephemeris calculation encounters out-of-range edge
    }
  }

  return events;
}

export function checkActiveMeteorShowers(date: Date): Array<{ name: string; zhr: number; radiant: string; notes: string; spokenCue: string }> {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const active: Array<{ name: string; zhr: number; radiant: string; notes: string; spokenCue: string }> = [];

  for (const shower of meteorShowersData) {
    const [startM, startD] = shower.start.split('-').map(Number);
    const [endM, endD] = shower.end.split('-').map(Number);

    let isActive = false;
    if (startM <= endM) {
      if ((month > startM || (month === startM && day >= startD)) &&
          (month < endM || (month === endM && day <= endD))) {
        isActive = true;
      }
    } else {
      // Wraps around new year (e.g. Quadrantids Dec-Jan)
      if ((month === startM && day >= startD) || (month === 12) ||
          (month === endM && day <= endD) || (month === 1)) {
        isActive = true;
      }
    }

    if (isActive) {
      active.push({
        name: shower.name,
        zhr: shower.zhr,
        radiant: shower.radiant,
        notes: shower.notes,
        spokenCue: `Active meteor shower: ${shower.name}. Watch near ${shower.radiant} radiant. Estimated rate around ${shower.zhr} meteors per hour.`,
      });
    }
  }

  return active;
}

export function getFullSkySnapshot(date: Date, loc: ObserverLocation) {
  const moon = computeMoonStatus(date, loc);
  const planets = computePlanetPositions(date, loc);
  const meteorShowers = checkActiveMeteorShowers(date);

  const moonEvent: SkyEvent | null = moon.isUp && moon.altitudeDeg >= 5 ? {
    id: 'moon',
    name: `The Moon (${moon.phaseName})`,
    type: 'moon',
    timeFormatted: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    timeIso: date.toISOString(),
    altitudeDeg: moon.altitudeDeg,
    azimuthDeg: moon.azimuthDeg,
    directionCompass: moon.directionCompass,
    magnitude: -10, // Approx
    spokenCue: `Look ${moon.directionCompass}, ${moon.altitudeDeg < 30 ? 'lower in the sky' : 'high above'}. The ${moon.phaseName} is illuminated at ${moon.illuminationPct} percent.`,
    description: `${moon.phaseName} illuminated at ${moon.illuminationPct}%. Great for craters along the terminator line.`,
    highlights: [
      `Phase: ${moon.phaseName}`,
      `Illumination: ${moon.illuminationPct}%`,
      `Position: ${moon.altitudeDeg}° ${moon.directionCompass}`
    ]
  } : null;

  return {
    moon,
    moonEvent,
    planets,
    meteorShowers,
  };
}
