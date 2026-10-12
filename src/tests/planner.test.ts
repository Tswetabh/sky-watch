import { describe, it, expect } from 'vitest';
import { SkyPlanSchema, SkyEventSchema } from '../lib/agent/schemas';
import { generateDeterministicPlan } from '../lib/agent/deterministicPlanner';

describe('Planner and Schema Validation', () => {
  it('validates a valid SkyPlan schema correctly', () => {
    const validPlan = {
      planId: 'plan-12345',
      generatedAt: new Date().toISOString(),
      plannerModel: 'gemma3:4b',
      mode: 'beginner',
      durationMinutes: 30,
      leaveByTime: '8:15 PM',
      bestLocationSuggestion: 'Local park clearing with Bortle 4 rating',
      events: [
        {
          id: 'planet-jupiter',
          name: 'Jupiter',
          type: 'planet' as const,
          timeFormatted: '8:40 PM',
          timeIso: new Date().toISOString(),
          altitudeDeg: 42,
          azimuthDeg: 120,
          directionCompass: 'SE',
          magnitude: -2.5,
          spokenCue: 'Look southeast, about halfway up. Jupiter shines brilliant steady white.',
          description: 'Largest gas giant in our solar system.',
          highlights: ['Steady light', 'Great Red Spot visible in scopes'],
        },
      ],
      nightSummary: 'Clear skies with brilliant Jupiter apparitions.',
      astronomyFactsGrounding: {
        moonPhase: 'Waxing Crescent',
        moonIlluminationPct: 22,
        cloudsPct: 10,
        activeMeteorShowers: ['Orionids'],
      },
    };

    const result = SkyPlanSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it('rejects invalid plan when events array is empty or fields are missing', () => {
    const invalidPlan = {
      planId: 'plan-123',
      // Missing required fields
      events: [],
    };

    const result = SkyPlanSchema.safeParse(invalidPlan);
    expect(result.success).toBe(false);
  });

  it('generates a fully valid offline deterministic plan for beginner mode', async () => {
    const plan = await generateDeterministicPlan({
      minutes: 30,
      mode: 'beginner',
      lat: 40.7128,
      lon: -74.0060,
      date: new Date('2024-10-15T20:00:00Z'),
    });

    expect(plan.planId).toBeDefined();
    expect(plan.mode).toBe('beginner');
    expect(plan.events.length).toBeGreaterThan(0);
    expect(plan.leaveByTime).toBeDefined();
    expect(plan.bestLocationSuggestion).toBeDefined();

    // Verify all events adhere to schema
    for (const ev of plan.events) {
      const parsedEv = SkyEventSchema.safeParse(ev);
      expect(parsedEv.success).toBe(true);
      expect(ev.spokenCue.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('respects short-session mode object limits (20 min)', async () => {
    const plan = await generateDeterministicPlan({
      minutes: 20,
      mode: 'short-session',
      lat: 51.5074,
      lon: -0.1278,
      date: new Date('2024-10-15T21:00:00Z'),
    });

    expect(plan.durationMinutes).toBe(20);
    expect(plan.events.length).toBeLessThanOrEqual(2);
  });
});
