import { getFullSkySnapshot } from './astronomy';
import { computeIssPasses } from './satellite';
import { getModelConfig } from '../config/env';

export interface GroundedAnalysisResult {
  answer: string;
  isVisionCapable: boolean;
  groundedFacts: {
    captureTime: string;
    visiblePlanets: string[];
    moonPhaseAndIllumination: string;
    issPassActive: boolean;
    activeMeteorShowers: string[];
  };
  plausibilityNote: string;
}

export async function answerPhotoQuery(params: {
  photoDataUrl: string;
  question: string;
  capturedAt: Date;
  lat: number;
  lon: number;
}): Promise<GroundedAnalysisResult> {
  const { question, capturedAt, lat, lon } = params;
  const modelConfig = getModelConfig();

  // 1. Compute ground-truth astronomy snapshot for the exact capture instant
  const sky = getFullSkySnapshot(capturedAt, { lat, lon });
  const issPasses = computeIssPasses(lat, lon, new Date(capturedAt.getTime() - 15 * 60 * 1000), 1);

  // Check if an ISS pass coincided with capture time
  const matchingIssPass = issPasses.find((p) => {
    return capturedAt >= p.riseTime && capturedAt <= p.setTime;
  });

  const visiblePlanetSummaries = sky.planets.map(
    (p) => `${p.name} at ${p.altitudeDeg}° ${p.directionCompass} (mag ${p.magnitude})`
  );

  const activeShowerSummaries = sky.meteorShowers.map(
    (s) => `${s.name} (ZHR ~${s.zhr}, radiant near ${s.radiant})`
  );

  const isVisionCapable = false; // gemma3:4b text planner; honest disclaimer required

  // 2. Formulate grounded response based on the question and sky math
  const qLower = question.toLowerCase();

  let answerText = '';
  let plausibilityNote = '';

  if (qLower.includes('meteor') || qLower.includes('shooting star') || qLower.includes('streak')) {
    if (matchingIssPass) {
      answerText = `Astronomical data shows the International Space Station (ISS) was actively passing your sky at this exact moment, peaking at ${matchingIssPass.maxElevationDeg}° in the ${matchingIssPass.culminationCompass}. A straight, smooth, non-blinking streak is consistent with an ISS exposure.`;
      plausibilityNote = 'Plausible ISS pass. Note that meteor trails typically show a tapered ionization burst, while satellites leave an even streak.';
    } else if (activeShowerSummaries.length > 0) {
      answerText = `The ${activeShowerSummaries.join(', ')} shower is currently active. If the streak points back toward the shower's radiant and appeared as a swift flash or ion trail, a meteor is plausible.`;
      plausibilityNote = 'Plausible meteor event aligned with seasonal shower, but camera lens flare, aircraft beacon, or low-orbit satellite cannot be ruled out without multi-frame spectrometry.';
    } else {
      answerText = `No major ISS passes or high-rate meteor showers were occurring at this exact time. A streak is most likely an uncataloged satellite pass (e.g. Starlink train) or an aircraft navigational strobe.`;
      plausibilityNote = 'Meteors are sporadic (~2-4/hour on normal nights), but a satellite or high-altitude aircraft is statistically more probable.';
    }
  } else if (qLower.includes('jupiter') || qLower.includes('planet') || qLower.includes('bright') || qLower.includes('star')) {
    if (visiblePlanetSummaries.length > 0) {
      answerText = `At this time and location, the following bright planets were visible above your horizon: ${visiblePlanetSummaries.join('; ')}. If your photo points toward one of these bearings, that steady bright point is almost certainly that planet.`;
      plausibilityNote = `Planets shine with a steady, unblinking light compared to twinkling distant stars due to their measurable disk size.`;
    } else {
      answerText = `No major bright planets (Venus, Jupiter, Saturn, Mars) were above the 5° horizon line at ${capturedAt.toLocaleTimeString()}. The brightest object in that direction is likely a first-magnitude navigational star (e.g. Vega, Arcturus, Sirius, or Polaris).`;
      plausibilityNote = 'Check your direction of capture against true cardinal bearings.';
    }
  } else if (qLower.includes('moon') || qLower.includes('craters')) {
    answerText = `The Moon was in ${sky.moon.phaseName} phase (${sky.moon.illuminationPct}% illuminated) at ${sky.moon.altitudeDeg}° ${sky.moon.directionCompass}. The shadow contrast along the lunar terminator line reveals crater rims in high relief.`;
    plausibilityNote = `Lunar phase and position confirmed by offline ephemeris.`;
  } else {
    answerText = `Based on your exact coordinates (${lat.toFixed(2)}°, ${lon.toFixed(2)}°) and time (${capturedAt.toLocaleTimeString()}), visible celestial objects included: ${visiblePlanetSummaries.length > 0 ? visiblePlanetSummaries.join(', ') : 'no bright planets above 5°'}; Moon in ${sky.moon.phaseName} (${sky.moon.illuminationPct}%); active showers: ${activeShowerSummaries.length > 0 ? activeShowerSummaries.join(', ') : 'none currently peaking'}.`;
    plausibilityNote = 'Ground-truth astronomical calculation from astronomy-engine and SGP4 orbit propagator.';
  }

  // Prepend honesty disclaimer regarding vision capability
  const honestDisclaimer = `[Offline Grounding Mode: ${modelConfig.model} (Text)] Local Gemma model is running in text-only mode and does not perform pixel computer vision. This analysis is strictly grounded in offline mathematical ephemeris for your time and coordinates.\n\n`;

  return {
    answer: honestDisclaimer + answerText,
    isVisionCapable,
    groundedFacts: {
      captureTime: capturedAt.toLocaleString(),
      visiblePlanets: visiblePlanetSummaries,
      moonPhaseAndIllumination: `${sky.moon.phaseName} (${sky.moon.illuminationPct}%)`,
      issPassActive: Boolean(matchingIssPass),
      activeMeteorShowers: activeShowerSummaries,
    },
    plausibilityNote,
  };
}
