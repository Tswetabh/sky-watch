import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { PlanView } from './components/PlanView';
import { ScoutView } from './components/ScoutView';
import { WatchView } from './components/WatchView';
import { CaptureAskView } from './components/CaptureAskView';
import { NightCardView } from './components/NightCardView';
import { CommunityView } from './components/CommunityView';
import { StreaksView } from './components/StreaksView';
import { SkyPlan } from './types/planner';
import { NightCard } from './types/session';
import { getLatestCachedPlan, saveNightCard } from './lib/db';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('plan');
  const [isRedLight, setIsRedLight] = useState<boolean>(false);
  const [activePlan, setActivePlan] = useState<SkyPlan | null>(null);
  const [latestNightCard, setLatestNightCard] = useState<NightCard | null>(null);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);

  // Observer coordinates with GPS fallback
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number; name: string }>({
    lat: 40.7128,
    lon: -74.0060,
    name: 'New York Observer',
  });

  // Attempt GPS on mount (with graceful fallback)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            name: 'Local GPS Position',
          });
        },
        (_err) => {
          // Keep default coordinates quietly
        },
        { timeout: 4000 }
      );
    }

    // Load any existing cached plan from IndexedDB
    getLatestCachedPlan().then((plan) => {
      if (plan) setActivePlan(plan);
    });
  }, []);

  // Update theme class on HTML element when red light is toggled
  useEffect(() => {
    if (isRedLight || activeTab === 'watch') {
      document.documentElement.classList.add('red-light-theme');
    } else {
      document.documentElement.classList.remove('red-light-theme');
    }
  }, [isRedLight, activeTab]);

  const handleStartWatchSession = (plan: SkyPlan) => {
    setActivePlan(plan);
    setActiveTab('watch');
  };

  const handleEndSession = async (sessionData: {
    minutesOutside: number;
    screenSeconds: number;
    observedObjects: string[];
    bestMoment: string;
    nextTarget: string;
    plan: SkyPlan;
  }) => {
    setIsSessionActive(false);

    const totalSessionSeconds = Math.max(1, sessionData.minutesOutside * 60);
    const screenTimeRatioPct = Math.min(100, (sessionData.screenSeconds / totalSessionSeconds) * 100);

    const dateStr = new Date().toISOString().slice(0, 10);
    const newCard: NightCard = {
      id: `night-${Date.now()}`,
      createdAt: new Date().toISOString(),
      dateString: dateStr,
      minutesOutside: sessionData.minutesOutside,
      screenSeconds: sessionData.screenSeconds,
      screenTimeRatioPct,
      objectsObserved: sessionData.observedObjects,
      photosCaptured: 0,
      bestMoment: sessionData.bestMoment,
      nextTarget: sessionData.nextTarget,
      mode: sessionData.plan.mode,
      locationName: userCoords.name,
    };

    await saveNightCard(newCard);
    setLatestNightCard(newCard);
    setActiveTab('keep');
  };

  return (
    <div className={`min-h-screen transition-colors ${
      isRedLight || activeTab === 'watch' ? 'bg-redlight-bg text-redlight-text' : 'bg-night-950 text-slate-100'
    }`}>
      {/* Persistent App Header */}
      <Header
        isRedLight={isRedLight || activeTab === 'watch'}
        onToggleRedLight={() => setIsRedLight(!isRedLight)}
      />

      {/* Main Content View Container */}
      <main className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6">
        {activeTab === 'plan' && (
          <PlanView
            onStartWatchSession={handleStartWatchSession}
            isRedLight={isRedLight}
            userCoords={userCoords}
            onCoordsChange={setUserCoords}
          />
        )}

        {activeTab === 'scout' && (
          <ScoutView
            userCoords={userCoords}
            isRedLight={isRedLight}
            onSelectLocationForPlan={(loc) => {
              setUserCoords({ lat: loc.lat, lon: loc.lon, name: loc.name });
              setActiveTab('plan');
            }}
          />
        )}

        {activeTab === 'watch' && (
          <WatchView
            plan={activePlan}
            onEndSession={handleEndSession}
          />
        )}

        {activeTab === 'capture' && (
          <CaptureAskView
            userCoords={userCoords}
            isRedLight={isRedLight}
          />
        )}

        {activeTab === 'keep' && (
          <NightCardView
            currentCard={latestNightCard}
            isRedLight={isRedLight}
            onNavigateToPlan={() => setActiveTab('plan')}
          />
        )}

        {activeTab === 'community' && (
          <CommunityView
            isRedLight={isRedLight}
          />
        )}

        {activeTab === 'streaks' && (
          <StreaksView
            isRedLight={isRedLight}
          />
        )}
      </main>

      {/* Thumb-friendly Mobile Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isRedLight={isRedLight || activeTab === 'watch'}
        isSessionActive={isSessionActive}
      />
    </div>
  );
}
