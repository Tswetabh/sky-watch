import { z } from 'zod';

export const SkyEventTypeSchema = z.enum([
  'planet',
  'moon',
  'iss',
  'meteor_shower',
  'constellation',
]);

export const SkyEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: SkyEventTypeSchema,
  timeFormatted: z.string(),
  timeIso: z.string(),
  altitudeDeg: z.number(),
  azimuthDeg: z.number(),
  directionCompass: z.string(),
  magnitude: z.number().optional(),
  spokenCue: z.string().min(5),
  description: z.string(),
  highlights: z.array(z.string()),
});

export const AstronomyFactsGroundingSchema = z.object({
  moonPhase: z.string(),
  moonIlluminationPct: z.number(),
  cloudsPct: z.number(),
  activeMeteorShowers: z.array(z.string()),
});

export const SkyPlanSchema = z.object({
  planId: z.string(),
  generatedAt: z.string(),
  plannerModel: z.string(),
  mode: z.string(),
  durationMinutes: z.number(),
  leaveByTime: z.string(),
  bestLocationSuggestion: z.string(),
  events: z.array(SkyEventSchema).min(1),
  nightSummary: z.string().min(10),
  astronomyFactsGrounding: AstronomyFactsGroundingSchema,
});

export const ToolCallSchema = z.object({
  tool: z.enum([
    'get_sky_events',
    'get_weather',
    'score_locations',
    'get_user_context',
  ]),
  arguments: z.record(z.any()),
});

export const AgentStepResponseSchema = z.union([
  z.object({
    type: z.literal('tool_call'),
    tool: z.enum([
      'get_sky_events',
      'get_weather',
      'score_locations',
      'get_user_context',
    ]),
    arguments: z.record(z.any()),
  }),
  z.object({
    type: z.literal('final_plan'),
    plan: SkyPlanSchema,
  }),
]);

export type SkyPlanValidated = z.infer<typeof SkyPlanSchema>;
export type SkyEventValidated = z.infer<typeof SkyEventSchema>;
export type ToolCallValidated = z.infer<typeof ToolCallSchema>;
