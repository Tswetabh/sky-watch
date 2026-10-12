import * as satellite from 'satellite.js';
import cachedTle from '../data/cachedTle.json';
import { SkyEvent } from '../types/planner';
import { azimuthToCompass } from './astronomy';

export interface IssPass {
  riseTime: Date;
  culminationTime: Date;
  setTime: Date;
  maxElevationDeg: number;
  riseAzimuthDeg: number;
  riseCompass: string;
  culminationCompass: string;
  setCompass: string;
  durationSeconds: number;
}

export function computeIssPasses(
  observerLat: number,
  observerLon: number,
  startTime: Date,
  windowHours: number = 6,
  tleData = cachedTle
): IssPass[] {
  try {
    const satrec = satellite.twoline2satrec(tleData.line1, tleData.line2);
    if (!satrec) return [];

    const observerGd = {
      latitude: satellite.degreesToRadians(observerLat),
      longitude: satellite.degreesToRadians(observerLon),
      height: 0.1, // 100 meters above sea level
    };

    const passes: IssPass[] = [];
    const stepSeconds = 20; // 20s propagation step
    const totalSteps = Math.floor((windowHours * 3600) / stepSeconds);

    let inPass = false;
    let currentRiseTime: Date | null = null;
    let currentRiseAz = 0;
    let maxElevation = 0;
    let maxElevTime: Date | null = null;
    let maxElevAz = 0;

    for (let i = 0; i < totalSteps; i++) {
      const time = new Date(startTime.getTime() + i * stepSeconds * 1000);
      const posVel = satellite.propagate(satrec, time);
      if (!posVel || !posVel.position || typeof posVel.position !== 'object') continue;

      const gmst = satellite.gstime(time);
      const eci = posVel.position as satellite.EciVec3<number>;
      const ecf = satellite.eciToEcf(eci, gmst);
      const lookAngles = satellite.ecfToLookAngles(observerGd, ecf);

      const elevationDeg = lookAngles.elevation * (180 / Math.PI);
      const azimuthDeg = ((lookAngles.azimuth * (180 / Math.PI) % 360) + 360) % 360;

      if (elevationDeg >= 10) {
        if (!inPass) {
          inPass = true;
          currentRiseTime = time;
          currentRiseAz = azimuthDeg;
          maxElevation = elevationDeg;
          maxElevTime = time;
          maxElevAz = azimuthDeg;
        } else {
          if (elevationDeg > maxElevation) {
            maxElevation = elevationDeg;
            maxElevTime = time;
            maxElevAz = azimuthDeg;
          }
        }
      } else {
        if (inPass && currentRiseTime && maxElevTime) {
          inPass = false;
          passes.push({
            riseTime: currentRiseTime,
            culminationTime: maxElevTime,
            setTime: time,
            maxElevationDeg: Math.round(maxElevation),
            riseAzimuthDeg: Math.round(currentRiseAz),
            riseCompass: azimuthToCompass(currentRiseAz),
            culminationCompass: azimuthToCompass(maxElevAz),
            setCompass: azimuthToCompass(azimuthDeg),
            durationSeconds: Math.round((time.getTime() - currentRiseTime.getTime()) / 1000),
          });

          // If we found at least 2 passes, that's plenty
          if (passes.length >= 2) break;
        }
      }
    }

    return passes;
  } catch (err) {
    console.warn('ISS pass calculation error:', err);
    return [];
  }
}

export function formatIssPassEvent(pass: IssPass): SkyEvent {
  const timeFormatted = pass.riseTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const spokenCue = `ISS pass in two minutes! Look ${pass.riseCompass}. It will climb to ${pass.maxElevationDeg} degrees in the ${pass.culminationCompass}.`;

  return {
    id: `iss-${pass.riseTime.getTime()}`,
    name: 'International Space Station (ISS Flyby)',
    type: 'iss',
    timeFormatted,
    timeIso: pass.riseTime.toISOString(),
    altitudeDeg: pass.maxElevationDeg,
    azimuthDeg: pass.riseAzimuthDeg,
    directionCompass: pass.riseCompass,
    magnitude: -3.0,
    spokenCue,
    description: `Bright naked-eye pass of the ISS! Rises in the ${pass.riseCompass}, peaks at ${pass.maxElevationDeg}° overhead in the ${pass.culminationCompass}, and sets in the ${pass.setCompass}. Duration ~${Math.round(pass.durationSeconds / 60)} mins.`,
    highlights: [
      `Rises: ${pass.riseCompass} (${timeFormatted})`,
      `Peak Altitude: ${pass.maxElevationDeg}° (${pass.culminationCompass})`,
      `Magnitude: -3.0 (Bright steady white beacon, non-blinking)`
    ]
  };
}
