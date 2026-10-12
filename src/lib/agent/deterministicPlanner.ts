import modesConfig from '../../config/modes.json';
import { PlanRequest, SkyEvent, SkyPlan } from '../../types/planner';
import { StargazingAgentTools } from './tools';
import { SkyPlanSchema } from './schemas';

export async function generateDeterministicPlan(
  request: PlanRequest,
  reasonForFallback?: string
): Promise<SkyPlan> {
  const tools = new StargazingAgentTools(request);
  const modeKey = request.mode in modesConfig.modes ? request.mode : modesConfig.defaultMode;
  const modeDef = (modesConfig.modes as any)[modeKey];

  const startTime = request.date || new Date();

  // 1. Fetch real grounded data via tools
  const [skyData, weather, scoutSpots] = await Promise.all([
    tools.get_sky_events(request.lat, request.lon, startTime.toISOString()),
    tools.get_weather(request.lat, request.lon),
    tools.score_locations(request.lat, request.lon, 100),
  ]);

  // Best location suggestion
  const bestSpot = scoutSpots.length > 0 ? scoutSpots[0] : null;
  const bestLocationSuggestion = bestSpot
    ? `${bestSpot.name} (${bestSpot.distanceKm} km away, Bortle ${bestSpot.bortle}, Score ${bestSpot.score}/100) - ${bestSpot.reason}`
    : 'Local dark park or unobstructed open clearing with low tree canopy.';

  // Calculate "Leave By" time (giving 15 minutes travel/settle time to adapt dark vision)
  const leaveByDate = new Date(startTime.getTime() - 15 * 60 * 1000);
  const leaveByTime = leaveByDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Gather candidate astronomical events
  const candidates: SkyEvent[] = [];

  // ISS passes take priority if they occur during or near session
  if (skyData.issPasses && skyData.issPasses.length > 0) {
    candidates.push(skyData.issPasses[0]);
  }

  // Moon event
  if (skyData.moonEvent) {
    candidates.push(skyData.moonEvent);
  }

  // Planets
  if (skyData.visiblePlanets && skyData.visiblePlanets.length > 0) {
    // Sort planets by visual magnitude (lower magnitude is brighter)
    const sortedPlanets = [...skyData.visiblePlanets].sort((a, b) => (a.magnitude ?? 5) - (b.magnitude ?? 5));
    candidates.push(...sortedPlanets);
  }

  // Meteor shower event if active
  if (skyData.activeMeteorShowers && skyData.activeMeteorShowers.length > 0) {
    const activeShower = skyData.activeMeteorShowers[0];
    const showerEventTime = new Date(startTime.getTime() + 15 * 60 * 1000);
    candidates.push({
      id: `shower-${activeShower.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: `${activeShower.name} Meteor Activity`,
      type: 'meteor_shower',
      timeFormatted: showerEventTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      timeIso: showerEventTime.toISOString(),
      altitudeDeg: 45,
      azimuthDeg: 60,
      directionCompass: 'ENE',
      spokenCue: `Keep your gaze wide toward the northeast near ${activeShower.radiant}. Catch sudden fast streaks from the ${activeShower.name}.`,
      description: activeShower.notes,
      highlights: [
        `Radiant: ${activeShower.radiant}`,
        `Expected Rate: ~${activeShower.zhr} meteors/hr`,
        `Viewing: Lie back and look broad-field with naked eyes`
      ]
    });
  }

  // Fallback star cluster / landmark if horizon is empty
  if (candidates.length === 0) {
    candidates.push({
      id: 'polaris-north-star',
      name: 'Polaris & Ursa Major (Big Dipper)',
      type: 'constellation',
      timeFormatted: startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      timeIso: startTime.toISOString(),
      altitudeDeg: Math.max(15, Math.round(request.lat)),
      azimuthDeg: 0,
      directionCompass: 'N',
      magnitude: 2.0,
      spokenCue: 'Turn due north. Locate the pointer stars of the Big Dipper drawing a line up to Polaris.',
      description: 'The celestial navigational anchor of northern hemisphere night skies.',
      highlights: [
        'Direction: True North',
        'Finding: Use the two outer cup stars of the Big Dipper',
        'Significance: Stays stationary as Earth rotates'
      ]
    });
  }

  // Respect mode's maxObjects limit
  const maxAllowed = modeDef.maxObjects || 3;
  const selectedEvents = candidates.slice(0, maxAllowed);

  // Stagger times across the available session minutes
  const intervalMinutes = Math.max(5, Math.floor(request.minutes / Math.max(1, selectedEvents.length)));
  selectedEvents.forEach((ev, idx) => {
    const eventTime = new Date(startTime.getTime() + idx * intervalMinutes * 60 * 1000);
    ev.timeFormatted = eventTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    ev.timeIso = eventTime.toISOString();

    // Adjust spoken cue based on vocabulary level
    if (modeDef.vocabularyLevel === 'kid-friendly') {
      ev.spokenCue = `Hey star explorer! ${ev.spokenCue} Notice how steady it glows without blinking!`;
    } else if (modeDef.vocabularyLevel === 'concise') {
      ev.spokenCue = `Target: ${ev.name}. ${ev.directionCompass}, ${ev.altitudeDeg} degrees.`;
    }
  });

  const activeShowerNames = (skyData.activeMeteorShowers || []).map((s: any) => s.name);

  // Create full structured plan
  const plan: SkyPlan = {
    planId: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    generatedAt: new Date().toISOString(),
    plannerModel: reasonForFallback
      ? `deterministic-astronomy-engine (${reasonForFallback})`
      : 'deterministic-astronomy-engine',
    mode: modeKey,
    durationMinutes: request.minutes,
    leaveByTime,
    bestLocationSuggestion,
    events: selectedEvents,
    nightSummary: `Targeting ${selectedEvents.length} celestial objects across ${request.minutes} minutes outdoor window under ${weather.conditionDescription} (${weather.cloudCoverPct}% clouds). Mode tailored for ${modeDef.name}.`,
    astronomyFactsGrounding: {
      moonPhase: skyData.moon.phaseName,
      moonIlluminationPct: skyData.moon.illuminationPct,
      cloudsPct: weather.cloudCoverPct,
      activeMeteorShowers: activeShowerNames,
    },
  };

  // Validate with zod to ensure schema compliance
  return SkyPlanSchema.parse(plan);
}
