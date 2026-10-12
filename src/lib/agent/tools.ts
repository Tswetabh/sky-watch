import { getFullSkySnapshot } from '../astronomy';
import { computeIssPasses, formatIssPassEvent } from '../satellite';
import { getWeather } from '../weather';
import { scoreAndRankLocations } from '../scout';
import { PlanRequest } from '../../types/planner';

export interface UserContext {
  minutesAvailable: number;
  mode: string;
  lat: number;
  lon: number;
  locationName: string;
  sessionStartTime: string;
}

export class StargazingAgentTools {
  private userContext: UserContext;

  constructor(request: PlanRequest) {
    this.userContext = {
      minutesAvailable: request.minutes,
      mode: request.mode,
      lat: request.lat,
      lon: request.lon,
      locationName: request.locationName || 'Local Horizon',
      sessionStartTime: (request.date || new Date()).toISOString(),
    };
  }

  async get_user_context() {
    return this.userContext;
  }

  async get_sky_events(lat: number, lon: number, startIso: string, _endIso?: string) {
    const startTime = new Date(startIso || this.userContext.sessionStartTime);
    const observer = { lat, lon };

    // 1. Astronomy calculations via astronomy-engine
    const snapshot = getFullSkySnapshot(startTime, observer);

    // 2. ISS passes via satellite.js
    const issPasses = computeIssPasses(lat, lon, startTime, 3);
    const issEvents = issPasses.map(formatIssPassEvent);

    return {
      timestamp: startTime.toISOString(),
      moon: snapshot.moon,
      moonEvent: snapshot.moonEvent,
      visiblePlanets: snapshot.planets,
      activeMeteorShowers: snapshot.meteorShowers,
      issPasses: issEvents,
    };
  }

  async get_weather(lat: number, lon: number, hours: number = 6) {
    return await getWeather(lat, lon, hours);
  }

  async score_locations(lat: number, lon: number, radiusKm: number = 250) {
    const date = new Date(this.userContext.sessionStartTime);
    const spots = await scoreAndRankLocations(lat, lon, radiusKm, date);
    return spots.slice(0, 4); // Top 4 ranked dark spots
  }

  async executeTool(toolName: string, args: Record<string, any>) {
    switch (toolName) {
      case 'get_user_context':
        return await this.get_user_context();
      case 'get_sky_events':
        return await this.get_sky_events(
          args.lat ?? this.userContext.lat,
          args.lon ?? this.userContext.lon,
          args.start ?? this.userContext.sessionStartTime,
          args.end
        );
      case 'get_weather':
        return await this.get_weather(
          args.lat ?? this.userContext.lat,
          args.lon ?? this.userContext.lon,
          args.hours ?? 6
        );
      case 'score_locations':
        return await this.score_locations(
          args.lat ?? this.userContext.lat,
          args.lon ?? this.userContext.lon,
          args.radius_km ?? 250
        );
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
