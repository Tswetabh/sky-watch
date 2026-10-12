import modesConfig from '../../config/modes.json';
import { getModelConfig } from '../../config/env';
import { PlanRequest, SkyPlan } from '../../types/planner';
import { StargazingAgentTools } from './tools';
import { SkyPlanSchema } from './schemas';
import { generateDeterministicPlan } from './deterministicPlanner';

export async function generateSkyPlanWithGemma(request: PlanRequest): Promise<SkyPlan> {
  const modelConfig = getModelConfig();
  const tools = new StargazingAgentTools(request);
  const modeKey = request.mode in modesConfig.modes ? request.mode : modesConfig.defaultMode;
  const modeDef = (modesConfig.modes as any)[modeKey];

  // If browser is offline, skip network request and run deterministic planner immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return generateDeterministicPlan(request, 'Device in Airplane / Offline mode');
  }

  // Pre-fetch tools or allow agent loop
  const systemPrompt = `You are Skywatch's astronomy orchestrator running model "${modelConfig.model}".
${modeDef.systemPrompt}

You orchestrate tools that return computed astronomical data. DO NOT invent planets, meteor showers, or ISS passes.
Available tools:
1. get_user_context(): returns time available, mode, lat, lon
2. get_sky_events(lat, lon, start, end): returns computed planets, Moon status, meteor showers, ISS passes
3. get_weather(lat, lon, hours): returns cloud cover and visibility
4. score_locations(lat, lon, radius_km): returns Dark Sky Scout spots

To call a tool, respond ONLY with JSON:
{"type": "tool_call", "tool": "<tool_name>", "arguments": { ... }}

When all tools are done, output the final structured plan strictly matching this JSON:
{
  "type": "final_plan",
  "plan": {
    "planId": "plan-<id>",
    "generatedAt": "<iso>",
    "plannerModel": "${modelConfig.model}",
    "mode": "${modeKey}",
    "durationMinutes": ${request.minutes},
    "leaveByTime": "<e.g. 8:15 PM>",
    "bestLocationSuggestion": "<dark spot and reason>",
    "events": [
      {
        "id": "<id>",
        "name": "<name>",
        "type": "planet"|"moon"|"iss"|"meteor_shower"|"constellation",
        "timeFormatted": "<e.g. 8:30 PM>",
        "timeIso": "<iso>",
        "altitudeDeg": <number>,
        "azimuthDeg": <number>,
        "directionCompass": "<NW/SE...>",
        "spokenCue": "<vivid spoken instructions for voice guide>",
        "description": "<one-two sentences>",
        "highlights": ["<fact 1>", "<fact 2>"]
      }
    ],
    "nightSummary": "<night summary>",
    "astronomyFactsGrounding": {
      "moonPhase": "<phase>",
      "moonIlluminationPct": <0-100>,
      "cloudsPct": <0-100>,
      "activeMeteorShowers": ["<name>"]
    }
  }
}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), modelConfig.timeoutMs);

    // Initial message history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Create a ${request.minutes}-minute stargazing plan for lat: ${request.lat}, lon: ${request.lon} in mode "${modeKey}". First call get_sky_events, get_weather, and score_locations, then synthesize the final plan.`
      }
    ];

    let iterations = 0;
    const maxIterations = 4;

    while (iterations < maxIterations) {
      iterations++;

      const res = await fetch(`${modelConfig.ollamaHost}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelConfig.model,
          messages,
          stream: false,
          format: 'json',
          options: {
            temperature: modelConfig.temperature,
          }
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        clearTimeout(timeoutId);
        return await generateDeterministicPlan(request, `Ollama HTTP ${res.status}`);
      }

      const data = await res.json();
      const content = data.message?.content || '';

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        clearTimeout(timeoutId);
        return await generateDeterministicPlan(request, 'Model returned non-JSON response');
      }

      // Check if model called a tool
      if (parsed.type === 'tool_call' && parsed.tool) {
        const toolResult = await tools.executeTool(parsed.tool, parsed.arguments || {});
        messages.push({ role: 'assistant', content });
        messages.push({
          role: 'user',
          content: `Tool result for ${parsed.tool}:\n${JSON.stringify(toolResult)}`
        });
        continue;
      }

      // Check if model returned final plan
      const planToValidate = parsed.type === 'final_plan' && parsed.plan ? parsed.plan : parsed;
      const parseResult = SkyPlanSchema.safeParse(planToValidate);

      clearTimeout(timeoutId);

      if (parseResult.success) {
        return parseResult.data;
      } else {
        console.warn('Gemma plan schema validation error:', parseResult.error);
        return await generateDeterministicPlan(request, 'Model output schema validation mismatch');
      }
    }

    clearTimeout(timeoutId);
    return await generateDeterministicPlan(request, 'Model iteration limit reached');
  } catch (err: any) {
    const errorMsg = err.name === 'AbortError' ? 'Ollama request timed out' : 'Ollama not running or unreachable';
    return await generateDeterministicPlan(request, errorMsg);
  }
}
