import { cacheWeather, getCachedWeather } from './db';

export interface WeatherData {
  cloudCoverPct: number;
  visibilityKm: number;
  temperatureC: number;
  conditionDescription: string;
  isCached: boolean;
  isOfflineFallback: boolean;
  fetchedAt: string;
}

export async function getWeather(lat: number, lon: number, _hours: number = 6): Promise<WeatherData> {
  const cacheKey = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;

  // 1. Check offline flag or cached data first
  const cached = await getCachedWeather(cacheKey);

  // If navigator is explicitly offline, return cached or fallback immediately without network attempt
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (cached) {
      return {
        ...cached,
        isCached: true,
        isOfflineFallback: false,
      };
    }
    return getOfflineSynthesizedWeather();
  }

  // 2. Try fetching from Open-Meteo with 3-second timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=cloud_cover,visibility,temperature_2m&forecast_days=1&timezone=auto`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const currentHour = new Date().getHours();
      const cloudCover = data.hourly?.cloud_cover?.[currentHour] ?? 15;
      const visibilityM = data.hourly?.visibility?.[currentHour] ?? 25000;
      const tempC = data.hourly?.temperature_2m?.[currentHour] ?? 14;

      const weatherResult: WeatherData = {
        cloudCoverPct: Math.round(cloudCover),
        visibilityKm: Math.round(visibilityM / 1000),
        temperatureC: Math.round(tempC),
        conditionDescription: cloudCover < 20 ? 'Clear dark sky' : cloudCover < 60 ? 'Scattered clouds' : 'Heavy overcast',
        isCached: false,
        isOfflineFallback: false,
        fetchedAt: new Date().toISOString(),
      };

      // Cache for offline resilience
      await cacheWeather(cacheKey, weatherResult);
      return weatherResult;
    }
  } catch {
    // Network failure, timeout, or airplane mode
  }

  // 3. Fallback to cached if available
  if (cached) {
    return {
      ...cached,
      isCached: true,
      isOfflineFallback: false,
    };
  }

  // 4. Fallback to safe offline estimate
  return getOfflineSynthesizedWeather();
}

function getOfflineSynthesizedWeather(): WeatherData {
  return {
    cloudCoverPct: 18,
    visibilityKm: 30,
    temperatureC: 15,
    conditionDescription: 'Clear / favorable offline estimate',
    isCached: false,
    isOfflineFallback: true,
    fetchedAt: new Date().toISOString(),
  };
}
