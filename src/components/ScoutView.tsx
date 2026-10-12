import React, { useEffect, useState } from 'react';
import { Compass, Info, MapPin, Cloud, Moon, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ScoutLocation } from '../types/scout';
import { scoreAndRankLocations } from '../lib/scout';
import lightPollutionGridData from '../data/lightPollutionGrid.json';

interface ScoutViewProps {
  userCoords: { lat: number; lon: number; name: string };
  onSelectLocationForPlan: (loc: ScoutLocation) => void;
  isRedLight: boolean;
}

export const ScoutView: React.FC<ScoutViewProps> = ({
  userCoords,
  onSelectLocationForPlan,
  isRedLight,
}) => {
  const [spots, setSpots] = useState<ScoutLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [radiusKm, setRadiusKm] = useState<number>(300);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [showDataSourceInfo, setShowDataSourceInfo] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    scoreAndRankLocations(userCoords.lat, userCoords.lon, radiusKm)
      .then((res) => {
        if (isMounted) {
          setSpots(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Scout scoring error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userCoords.lat, userCoords.lon, radiusKm]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isRedLight
          ? 'bg-redlight-card border-redlight-border text-redlight-text'
          : 'bg-night-900/90 border-night-800 text-slate-100 shadow-xl'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-red-400">
            <Compass className="w-3.5 h-3.5 text-red-400" />
            Dark Sky Scout
          </div>
          <button
            onClick={() => setShowDataSourceInfo(!showDataSourceInfo)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono underline"
          >
            <Info className="w-3.5 h-3.5" />
            Data Source & Limits
          </button>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">
          Dark Sky Ranking & Scouting
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
          Combines offline Bortle light-pollution atlas data, live or cached cloud cover, and Moon sky-wash into a verified 0–100 stargazing score. Fully cached for zero-signal field operation.
        </p>

        {/* Data Source & Limits Banner */}
        {showDataSourceInfo && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Dataset Provenance & Physical Limits
            </div>
            <p>
              <strong className="text-slate-200">Data Source:</strong> {lightPollutionGridData.dataSource}
            </p>
            <p>
              <strong className="text-slate-200">Physical Limits:</strong> {lightPollutionGridData.limits}
            </p>
          </div>
        )}

        {/* Search Radius Slider */}
        <div className="mt-5 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300">
              Search Radius from Observer
            </span>
            <span className="font-mono text-red-400 font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-900">
              {radiusKm} km
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="1200"
            step="50"
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full accent-red-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Spots List */}
      {loading ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Computing Dark Sky scores and moon interference...</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1 text-xs font-mono text-slate-400">
            <span>Ranked Stargazing Locations ({spots.length} evaluated)</span>
            <span>Sorted by Score / Distance</span>
          </div>

          {spots.map((spot, idx) => {
            const isSelected = selectedSpotId === spot.id;
            const scoreColor =
              spot.score >= 80
                ? 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40'
                : spot.score >= 60
                ? 'text-amber-400 border-amber-500/50 bg-amber-950/40'
                : 'text-red-400 border-red-500/50 bg-red-950/40';

            return (
              <div
                key={spot.id}
                className={`p-4 rounded-xl border transition-all ${
                  isRedLight
                    ? 'bg-redlight-card border-redlight-border text-redlight-text'
                    : isSelected
                    ? 'bg-night-900 border-red-600 ring-1 ring-red-500'
                    : 'bg-night-900/80 border-night-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-start gap-3">
                    {/* Rank pill */}
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 shrink-0 mt-0.5">
                      #{idx + 1}
                    </span>

                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-1.5">
                        {spot.name}
                        {spot.distanceKm === 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                            Current GPS
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-red-400" />
                        {spot.region} • {spot.distanceKm > 0 ? `${spot.distanceKm} km away` : 'At observer spot'}
                      </p>
                    </div>
                  </div>

                  {/* Score badge (out of 100) */}
                  <div className={`px-3 py-1.5 rounded-xl border text-center shrink-0 ${scoreColor}`}>
                    <span className="text-xl font-extrabold font-mono block leading-none">
                      {spot.score}
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-wider block mt-0.5 opacity-80">
                      / 100
                    </span>
                  </div>
                </div>

                {/* One-line reason as required by prompt */}
                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 mb-3">
                  <span className="text-[10px] font-mono uppercase text-red-400 block mb-0.5">
                    Dark Sky Scout Evaluation
                  </span>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    "{spot.reason}"
                  </p>
                </div>

                {/* Metrics Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                      Bortle {spot.bortle} (Class {spot.bortle <= 2 ? 'Dark' : spot.bortle <= 4 ? 'Rural' : 'Suburban/Urban'})
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-sky-300">
                      <Cloud className="w-3 h-3" />
                      {spot.cloudCoverPct}% Clouds
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300">
                      <Moon className="w-3 h-3" />
                      {spot.moonIlluminationPct}% Moon
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSpotId(spot.id);
                      onSelectLocationForPlan(spot);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-red-600 hover:text-white border border-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Plan Here</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
