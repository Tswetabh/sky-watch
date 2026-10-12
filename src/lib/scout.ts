import lightPollutionData from '../data/lightPollutionGrid.json';
import { ScoutLocation } from '../types/scout';
import { computeMoonStatus } from './astronomy';
import { getWeather } from './weather';
import { cacheScoutResults, getCachedScoutResults } from './db';

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const BORTLE_DARKNESS_POINTS: Record<number, number> = {
  1: 55,
  2: 50,
  3: 42,
  4: 32,
  5: 22,
  6: 14,
  7: 8,
  8: 3,
  9: 0,
};

export function computeDarkSkyScore(params: {
  bortle: number;
  cloudCoverPct: number;
  moonIlluminationPct: number;
  moonAltitudeDeg: number;
}): { score: number; reason: string } {
  const { bortle, cloudCoverPct, moonIlluminationPct, moonAltitudeDeg } = params;

  // 1. Darkness component (max 55)
  const clampedBortle = Math.max(1, Math.min(9, Math.round(bortle)));
  const darknessScore = BORTLE_DARKNESS_POINTS[clampedBortle] ?? 10;

  // 2. Moon interference component (max 20)
  let moonScore = 20;
  if (moonAltitudeDeg > 0) {
    const altitudeFactor = Math.sin((Math.min(90, moonAltitudeDeg) * Math.PI) / 180);
    const moonInterference = (Math.min(100, moonIlluminationPct) / 100) * altitudeFactor;
    moonScore = Math.max(0, 20 * (1 - moonInterference));
  }

  // 3. Cloud clarity scaling factor: clouds physically block transparency
  const cloudFactor = Math.max(0.05, (100 - Math.min(100, cloudCoverPct)) / 100);

  // Base celestial potential (darkness + moon + base stellar visibility)
  const rawBase = darknessScore + moonScore + 25;
  const rawScore = Math.round(rawBase * cloudFactor);
  const score = Math.max(0, Math.min(100, rawScore));

  // Generate crisp one-line reason
  let reason = '';
  if (cloudCoverPct >= 70) {
    reason = `Overcast (${cloudCoverPct}% clouds) heavily limits visibility regardless of Bortle ${clampedBortle}.`;
  } else if (moonAltitudeDeg > 15 && moonIlluminationPct >= 65) {
    reason = `Bright ${moonIlluminationPct}% Moon washes out faint nebulae; ideal for bright planets and lunar terminator.`;
  } else if (clampedBortle <= 2 && cloudCoverPct <= 20) {
    reason = `Pristine Bortle ${clampedBortle} dark sky with crystal atmospheric clarity; Milky Way structure visible.`;
  } else if (clampedBortle <= 4 && cloudCoverPct <= 30) {
    reason = `Great rural-suburban Bortle ${clampedBortle} sky with low cloud interference.`;
  } else if (clampedBortle >= 7) {
    reason = `Urban light dome (Bortle ${clampedBortle}); naked-eye targets limited to bright planets, Moon, and ISS.`;
  } else {
    reason = `Balanced Bortle ${clampedBortle} rating with ${cloudCoverPct}% cloud cover.`;
  }

  return { score, reason };
}

export async function scoreAndRankLocations(
  userLat: number,
  userLon: number,
  radiusKm: number = 300,
  date: Date = new Date()
): Promise<ScoutLocation[]> {
  const cacheKey = `scout_${userLat.toFixed(2)}_${userLon.toFixed(2)}_${radiusKm}`;
  const cached = await getCachedScoutResults(cacheKey);

  // If offline and cached, return cached
  if (typeof navigator !== 'undefined' && !navigator.onLine && cached) {
    return cached;
  }

  const moon = computeMoonStatus(date, { lat: userLat, lon: userLon });
  const weather = await getWeather(userLat, userLon);

  const scoredSpots: ScoutLocation[] = [];

  // Estimate user's local Bortle from nearest spot
  let closestSpot = lightPollutionData.spots[0];
  let minD = Infinity;
  for (const s of lightPollutionData.spots) {
    const d = calculateDistanceKm(userLat, userLon, s.lat, s.lon);
    if (d < minD) {
      minD = d;
      closestSpot = s;
    }
  }

  const userBortle = minD < 20 ? closestSpot.bortle : 5;
  const userScoring = computeDarkSkyScore({
    bortle: userBortle,
    cloudCoverPct: weather.cloudCoverPct,
    moonIlluminationPct: moon.illuminationPct,
    moonAltitudeDeg: moon.altitudeDeg,
  });

  scoredSpots.push({
    id: 'current-spot',
    name: 'Your Current Spot',
    region: 'Local Proximity',
    lat: userLat,
    lon: userLon,
    distanceKm: 0,
    bortle: userBortle,
    artificialBrightnessMcd: userBortle * 0.5,
    cloudCoverPct: weather.cloudCoverPct,
    moonIlluminationPct: moon.illuminationPct,
    moonAltitudeDeg: moon.altitudeDeg,
    score: userScoring.score,
    reason: userScoring.reason,
    type: 'Observer Position'
  });

  // Evaluate candidate spots from catalog
  const candidateSpots = lightPollutionData.spots.map((s, idx) => {
    const dist = calculateDistanceKm(userLat, userLon, s.lat, s.lon);
    return { ...s, dist, spotId: `spot-${idx}` };
  });

  candidateSpots.sort((a, b) => a.dist - b.dist);
  const filtered = candidateSpots.filter((s) => s.dist <= radiusKm);
  const selection = filtered.length >= 3 ? filtered : candidateSpots.slice(0, 5);

  for (const spot of selection) {
    const spotScoring = computeDarkSkyScore({
      bortle: spot.bortle,
      cloudCoverPct: weather.cloudCoverPct,
      moonIlluminationPct: moon.illuminationPct,
      moonAltitudeDeg: moon.altitudeDeg,
    });

    scoredSpots.push({
      id: spot.spotId,
      name: spot.name,
      region: spot.region,
      lat: spot.lat,
      lon: spot.lon,
      distanceKm: spot.dist,
      bortle: spot.bortle,
      artificialBrightnessMcd: spot.artificialBrightnessMcd,
      cloudCoverPct: weather.cloudCoverPct,
      moonIlluminationPct: moon.illuminationPct,
      moonAltitudeDeg: moon.altitudeDeg,
      score: spotScoring.score,
      reason: spotScoring.reason,
      elevationM: spot.elevationM,
      type: spot.type,
      cachedAt: new Date().toISOString(),
    });
  }

  scoredSpots.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.distanceKm - b.distanceKm;
  });

  await cacheScoutResults(cacheKey, scoredSpots);
  return scoredSpots;
}
