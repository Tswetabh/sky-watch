import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { networkGuard } from '../lib/networkGuard';
import { getFullSkySnapshot } from '../lib/astronomy';
import { computeIssPasses } from '../lib/satellite';

describe('Offline Session Network Integrity', () => {
  beforeEach(() => {
    // Provide a mock window and fetch environment if running in node
    if (typeof (global as any).window === 'undefined') {
      (global as any).window = { location: { host: 'localhost:5173' } };
    }
    if (typeof (global as any).window.fetch === 'undefined') {
      (global as any).window.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    }
  });

  afterEach(() => {
    networkGuard.stopSessionGuard();
  });

  it('ensures zero outbound network requests occur during local astronomy watch calculation', () => {
    networkGuard.startSessionGuard();

    // Perform full offline astronomy calculations during watch session
    const loc = { lat: 40.7128, lon: -74.0060 };
    const date = new Date();

    const snapshot = getFullSkySnapshot(date, loc);
    const passes = computeIssPasses(loc.lat, loc.lon, date, 2);

    expect(snapshot.moon).toBeDefined();
    expect(passes).toBeDefined();

    // Verify ZERO external network calls were made
    const leakCount = networkGuard.getOutboundRequestCount();
    expect(leakCount).toBe(0);
  });

  it('fails if any external request attempts to leave the device during a session', async () => {
    networkGuard.startSessionGuard();

    // Simulate an unauthorized external outbound call during active session
    await window.fetch('https://telemetry.external-analytics.com/event', { method: 'POST' });

    const leaks = networkGuard.stopSessionGuard();
    expect(leaks.length).toBeGreaterThan(0);
    expect(leaks[0]).toContain('telemetry.external-analytics.com');
  });
});
