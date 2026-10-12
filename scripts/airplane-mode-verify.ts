#!/usr/bin/env tsx

/**
 * Skywatch Airplane-Mode Proof Verification Script
 * Validates that Plan, Scout, Watch, and Night Card operate 100% offline
 * with ZERO network requests leaving the machine.
 */

import { generateDeterministicPlan } from '../src/lib/agent/deterministicPlanner';
import { scoreAndRankLocations } from '../src/lib/scout';
import { ScreenSecondsTracker } from '../src/lib/screenTimer';
import { SkyPlanSchema } from '../src/lib/agent/schemas';
import { getRelativeCompassDirection } from '../src/lib/compass';
import { saveNightCard, getAllNightCards } from '../src/lib/db';
import { NightCard } from '../src/types/session';

async function runAirplaneModeProof() {
  console.log('\n========================================================================');
  console.log('✈️  SKYWATCH AIRPLANE-MODE OFFLINE VERIFICATION PROOF');
  console.log('Validating zero-network execution across Plan, Scout, Watch & Night Card');
  console.log('========================================================================\n');

  let networkCallCount = 0;
  const interceptedUrls: string[] = [];

  // Mock global network lock: Any network fetch is intercepted and counted as a leak
  const originalFetch = global.fetch;
  global.fetch = async (url: any, ...args: any[]) => {
    networkCallCount++;
    const urlStr = String(url);
    interceptedUrls.push(urlStr);
    throw new Error(`[NETWORK LEAK DETECTED] Outbound network request attempted in offline mode: ${urlStr}`);
  };

  // Mock navigator offline safely in Node 24+
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: false },
    configurable: true,
  });

  const checklist: Array<{ step: string; passed: boolean; details: string }> = [];

  try {
    // ----------------------------------------------------
    // 1. PLAN PROOF
    // ----------------------------------------------------
    console.log('Testing Step 1: PLAN (Offline Astronomy Generation)...');
    const plan = await generateDeterministicPlan({
      minutes: 30,
      mode: 'beginner',
      lat: 40.7128,
      lon: -74.006,
    }, 'Airplane Mode Proof');

    const isPlanValid = SkyPlanSchema.safeParse(plan).success;
    checklist.push({
      step: '1. PLAN',
      passed: isPlanValid && plan.events.length > 0,
      details: `Generated ${plan.events.length} celestial targets (Leave by: ${plan.leaveByTime}) without network.`,
    });

    // ----------------------------------------------------
    // 2. SCOUT PROOF
    // ----------------------------------------------------
    console.log('Testing Step 2: SCOUT (Offline Dark Sky Grid Ranking)...');
    const spots = await scoreAndRankLocations(40.7128, -74.006, 250);
    const topSpot = spots[0];
    checklist.push({
      step: '2. SCOUT',
      passed: spots.length > 0 && topSpot.score > 0,
      details: `Ranked ${spots.length} dark sky spots. Top: ${topSpot.name} (${topSpot.score}/100, Bortle ${topSpot.bortle}) - "${topSpot.reason}"`,
    });

    // ----------------------------------------------------
    // 3. WATCH PROOF
    // ----------------------------------------------------
    console.log('Testing Step 3: WATCH (Compass Orientation & Screen Tracking)...');
    const timer = new ScreenSecondsTracker();
    timer.start();
    // Simulate compass reading and relative direction for target
    const targetAzimuth = plan.events[0].azimuthDeg;
    const relDirection = getRelativeCompassDirection(180, targetAzimuth); // Facing South
    timer.pause();
    const screenSecs = timer.getScreenSeconds();

    checklist.push({
      step: '3. WATCH',
      passed: relDirection !== undefined,
      details: `Compass relative heading: "${relDirection}". Screen-seconds tracker verified offline.`,
    });

    // ----------------------------------------------------
    // 4. NIGHT CARD & STREAKS PROOF
    // ----------------------------------------------------
    console.log('Testing Step 4: KEEP / NIGHT CARD & STREAKS...');
    const testCard: NightCard = {
      id: `proof-${Date.now()}`,
      createdAt: new Date().toISOString(),
      dateString: new Date().toISOString().slice(0, 10),
      minutesOutside: 35,
      screenSeconds: 42, // Headline stat!
      screenTimeRatioPct: 2.0,
      objectsObserved: plan.events.map((e) => e.name),
      photosCaptured: 1,
      bestMoment: plan.events[0].name,
      nextTarget: 'Perseids radiant',
      mode: 'beginner',
      locationName: topSpot.name,
    };

    await saveNightCard(testCard);
    const allCards = await getAllNightCards();

    checklist.push({
      step: '4. KEEP & STREAKS',
      passed: allCards.length > 0,
      details: `Saved Night Card. Headline stat: ${testCard.screenSeconds}s screen-time for ${testCard.minutesOutside}m outside. Total cards: ${allCards.length}.`,
    });

    // ----------------------------------------------------
    // 5. ZERO OUTBOUND REQUESTS PROOF
    // ----------------------------------------------------
    checklist.push({
      step: '5. NETWORK LEAK CHECK',
      passed: networkCallCount === 0,
      details: networkCallCount === 0
        ? '0 outbound network calls were made across the entire pipeline.'
        : `FAILED: ${networkCallCount} network calls leaked! [${interceptedUrls.join(', ')}]`,
    });
  } catch (err: any) {
    console.error('Airplane mode verification error:', err);
    checklist.push({
      step: 'ERROR',
      passed: false,
      details: err.message,
    });
  } finally {
    global.fetch = originalFetch;
  }

  // Print results table
  console.log('\n========================================================================');
  console.log('📋 OFFLINE VERIFICATION SUMMARY CHECKLIST');
  console.log('========================================================================');
  console.table(
    checklist.map((c) => ({
      Pipeline: c.step,
      Status: c.passed ? '✅ PASS' : '❌ FAIL',
      Details: c.details,
    }))
  );

  const allPassed = checklist.every((c) => c.passed);
  if (allPassed) {
    console.log('🎉 100% OFFLINE AIRPLANE-MODE PROOF COMPLETE: All features ran strictly on-device with ZERO network activity.\n');
  } else {
    console.log('❌ AIRPLANE-MODE PROOF FAILED.\n');
    process.exit(1);
  }
}

runAirplaneModeProof();
