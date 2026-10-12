import { describe, it, expect } from 'vitest';
import { computeDarkSkyScore, calculateDistanceKm } from '../lib/scout';

describe('Dark Sky Scout Scoring Function', () => {
  it('gives high score to pristine Bortle 1 skies with clear clouds and no moon', () => {
    const result = computeDarkSkyScore({
      bortle: 1,
      cloudCoverPct: 0,
      moonIlluminationPct: 0,
      moonAltitudeDeg: -20, // Moon below horizon
    });

    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.reason).toContain('Pristine Bortle 1 dark sky');
  });

  it('heavily penalizes heavy overcast weather regardless of Bortle score', () => {
    const result = computeDarkSkyScore({
      bortle: 2,
      cloudCoverPct: 90,
      moonIlluminationPct: 10,
      moonAltitudeDeg: -10,
    });

    expect(result.score).toBeLessThan(55);
    expect(result.reason).toContain('Overcast (90% clouds) heavily limits visibility');
  });

  it('penalizes bright Moon when Moon is high in the sky', () => {
    const clearNoMoon = computeDarkSkyScore({
      bortle: 3,
      cloudCoverPct: 10,
      moonIlluminationPct: 0,
      moonAltitudeDeg: -10,
    });

    const clearFullMoonHigh = computeDarkSkyScore({
      bortle: 3,
      cloudCoverPct: 10,
      moonIlluminationPct: 100,
      moonAltitudeDeg: 60, // High in sky
    });

    expect(clearFullMoonHigh.score).toBeLessThan(clearNoMoon.score);
    expect(clearFullMoonHigh.reason).toContain('Moon washes out faint nebulae');
  });

  it('recognizes urban light pollution in Bortle 8 or 9', () => {
    const result = computeDarkSkyScore({
      bortle: 8,
      cloudCoverPct: 10,
      moonIlluminationPct: 20,
      moonAltitudeDeg: -10,
    });

    expect(result.score).toBeLessThan(50);
    expect(result.reason).toContain('Urban light dome (Bortle 8)');
  });

  it('calculates geographic distance accurately', () => {
    // Distance between NYC (40.7128, -74.0060) and Cherry Springs (41.6631, -77.8236) is ~330 km
    const dist = calculateDistanceKm(40.7128, -74.0060, 41.6631, -77.8236);
    expect(dist).toBeGreaterThan(310);
    expect(dist).toBeLessThan(350);
  });
});
