import React, { useState } from 'react';
import { Clock, MapPin, Sparkles, AlertCircle, Play, ArrowRight, ShieldCheck, Compass, Cloud, Moon } from 'lucide-react';
import modesConfig from '../config/modes.json';
import { PlanRequest, SkyPlan } from '../types/planner';
import { generateSkyPlanWithGemma } from '../lib/agent/gemmaClient';
import { cachePlan } from '../lib/db';

import { generateDeterministicPlan } from '../lib/agent/deterministicPlanner';

interface PlanViewProps {
  onStartWatchSession: (plan: SkyPlan) => void;
  isRedLight: boolean;
  userCoords: { lat: number; lon: number; name: string };
  onCoordsChange: (coords: { lat: number; lon: number; name: string }) => void;
}

export const PlanView: React.FC<PlanViewProps> = ({
  onStartWatchSession,
  isRedLight,
  userCoords,
  onCoordsChange,
}) => {
  const [minutes, setMinutes] = useState<number>(30);
  const [selectedMode, setSelectedMode] = useState<string>('beginner');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [plan, setPlan] = useState<SkyPlan | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const modeEntries = Object.entries(modesConfig.modes);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorNotice(null);

    const safeLat = typeof userCoords?.lat === 'number' && !isNaN(userCoords.lat) ? userCoords.lat : 40.7128;
    const safeLon = typeof userCoords?.lon === 'number' && !isNaN(userCoords.lon) ? userCoords.lon : -74.0060;

    const request: PlanRequest = {
      minutes,
      mode: selectedMode,
      lat: safeLat,
      lon: safeLon,
      locationName: userCoords?.name || 'Local Horizon',
      date: new Date(),
    };

    try {
      const generated = await generateSkyPlanWithGemma(request);
      setPlan(generated);
      try {
        await cachePlan(generated);
      } catch {
        // Cache warning ignored
      }
    } catch (err: any) {
      console.warn('Gemma plan generation exception, running deterministic fallback:', err);
      try {
        const fallback = await generateDeterministicPlan(request, 'Offline Astronomical Engine');
        setPlan(fallback);
      } catch (fallbackErr: any) {
        setErrorNotice(fallbackErr?.message || 'Plan generation failed.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Header */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isRedLight
          ? 'bg-redlight-card border-redlight-border text-redlight-text'
          : 'bg-night-900/90 border-night-800 text-slate-100 shadow-xl'
      }`}>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-red-400 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Offline-First AI Planner
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Plan Your Night Sky Session
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
          Open-weight Gemma orchestrates offline orbital math and weather tools to calculate exact naked-eye targets. Zero hallucinated astronomy facts.
        </p>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* Minutes Available */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-red-400" />
                Available Minutes Outside
              </span>
              <span className="font-mono text-red-400 font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-900">
                {minutes} min
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-1.5">
              {[15, 20, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                    minutes === m
                      ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                      : isRedLight
                      ? 'bg-red-950/40 text-red-300 border-red-900/80 hover:bg-red-950'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>

            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-full accent-red-500 cursor-pointer"
            />
          </div>

          {/* Observer Coordinates / Location */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                Observer Coordinates
              </span>
              <span className="font-mono text-xs text-slate-400">
                {userCoords.lat.toFixed(2)}°, {userCoords.lon.toFixed(2)}°
              </span>
            </div>

            <div className="flex gap-1.5">
              {[
                { name: 'New York', lat: 40.71, lon: -74.00 },
                { name: 'Dark Park', lat: 41.66, lon: -77.82 },
                { name: 'London', lat: 51.50, lon: -0.12 },
              ].map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => onCoordsChange(c)}
                  className={`flex-1 py-1.5 px-1 rounded-lg text-xs truncate border transition-all ${
                    userCoords.name === c.name
                      ? 'bg-slate-800 text-white border-slate-600'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={userCoords.name}
              onChange={(e) => onCoordsChange({ ...userCoords, name: e.target.value })}
              placeholder="Location name (e.g. Backyard, Pine Hill)"
              className="w-full text-xs px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Mode Selector */}
        <div className="mt-5 space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Select Planner Mode (Defined in modes.json)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {modeEntries.map(([key, mode]: [string, any]) => {
              const isSelected = selectedMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedMode(key)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-red-950/80 border-red-600 text-white ring-1 ring-red-500 shadow-lg shadow-red-950/50'
                      : isRedLight
                      ? 'bg-red-950/20 border-red-950 text-red-400 hover:border-red-900'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-200">{mode.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {mode.maxObjects} targets
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {mode.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5">
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              isGenerating
                ? 'bg-red-950 text-red-400 border border-red-800 cursor-wait'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/30 active:scale-[0.99]'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                <span>Orchestrating Astronomy Tools & Gemma...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Timed Sky Plan</span>
              </>
            )}
          </button>
        </div>

        {errorNotice && (
          <div className="mt-3 p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorNotice}</span>
          </div>
        )}
      </div>

      {/* Generated Plan Display */}
      {plan && (
        <div className="space-y-4 animate-fade-in">
          {/* Plan Header Card */}
          <div className={`p-5 rounded-2xl border ${
            isRedLight
              ? 'bg-redlight-card border-redlight-border text-redlight-text'
              : 'bg-night-900/90 border-night-800 text-slate-100 shadow-xl'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-red-400">
                  Timed Observation Schedule
                </span>
                <h3 className="text-lg font-bold">Tonight's Plan ({plan.durationMinutes} min)</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  {plan.plannerModel}
                </span>
              </div>
            </div>

            {/* Tactical leave by & location banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/60">
                <span className="text-[11px] font-mono uppercase text-red-400 block mb-0.5">
                  Leave By Time (Adapts Night Vision)
                </span>
                <span className="text-xl font-extrabold font-mono text-red-200">
                  {plan.leaveByTime}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] font-mono uppercase text-slate-400 block mb-0.5">
                  Best Dark Sky Spot Suggestion
                </span>
                <span className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                  {plan.bestLocationSuggestion}
                </span>
              </div>
            </div>

            {/* Summary */}
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {plan.nightSummary}
            </p>

            {/* Grounding facts pill row */}
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                <Moon className="w-3.5 h-3.5 text-amber-300" />
                {plan.astronomyFactsGrounding.moonPhase} ({plan.astronomyFactsGrounding.moonIlluminationPct}%)
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                <Cloud className="w-3.5 h-3.5 text-sky-300" />
                {plan.astronomyFactsGrounding.cloudsPct}% Clouds
              </span>
              {plan.astronomyFactsGrounding.activeMeteorShowers.length > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  {plan.astronomyFactsGrounding.activeMeteorShowers.join(', ')}
                </span>
              )}
            </div>
          </div>

          {/* Timed Sky Events List */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 px-1">
              Timed Observation Hit List ({plan.events.length} targets)
            </h4>

            {plan.events.map((event, idx) => (
              <div
                key={event.id || idx}
                className={`p-4 rounded-xl border transition-all ${
                  isRedLight
                    ? 'bg-redlight-card border-redlight-border text-redlight-text'
                    : 'bg-night-900/80 border-night-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-950 border border-red-800 text-red-300">
                      {event.timeFormatted}
                    </span>
                    <h5 className="font-bold text-sm sm:text-base text-slate-100">
                      {event.name}
                    </h5>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 flex items-center gap-1">
                    <Compass className="w-3 h-3 text-red-400" />
                    {event.directionCompass} ({event.altitudeDeg}°)
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/60 mb-2.5">
                  <span className="text-[10px] font-mono uppercase text-red-400 block mb-0.5">
                    Spoken Voice Cue
                  </span>
                  <p className="text-xs text-red-200 italic">
                    "{event.spokenCue}"
                  </p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-2">
                  {event.description}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {event.highlights.map((h, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/80 text-slate-400 border border-slate-800"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Launch Watch Session CTA */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onStartWatchSession(plan)}
              className="w-full py-4 px-6 rounded-2xl font-bold text-base bg-red-600 hover:bg-red-500 text-white shadow-2xl shadow-red-600/40 flex items-center justify-center gap-3 transition-transform active:scale-[0.99]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Launch Watch Session with this Plan</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
