import React, { useState, useEffect } from 'react';
import { Users, MapPin, Clock, CheckCircle2, UserPlus, ShieldAlert } from 'lucide-react';
import mockCommunityData from '../data/communitySessions.json';

interface CommunitySession {
  id: string;
  title: string;
  organizer: string;
  locationName: string;
  lat: number;
  lon: number;
  distanceKm: number;
  startTime: string;
  durationMinutes: number;
  attendeesCount: number;
  mode: string;
  targetFocus: string;
  joined: boolean;
}

interface CommunityViewProps {
  isRedLight: boolean;
}

const STORAGE_KEY_COMMUNITY = 'skywatch_joined_sessions';

export const CommunityView: React.FC<CommunityViewProps> = ({ isRedLight }) => {
  const [sessions, setSessions] = useState<CommunitySession[]>([]);

  useEffect(() => {
    // Load joined state overrides from localStorage if present
    const saved = localStorage.getItem(STORAGE_KEY_COMMUNITY);
    const joinedIds = new Set<string>(saved ? JSON.parse(saved) : []);

    const loaded = mockCommunityData.sessions.map((s) => ({
      ...s,
      joined: joinedIds.has(s.id),
      attendeesCount: joinedIds.has(s.id) ? s.attendeesCount + 1 : s.attendeesCount,
    }));

    setSessions(loaded);
  }, []);

  const handleToggleJoin = (sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id === sessionId) {
          const nextJoined = !s.joined;
          return {
            ...s,
            joined: nextJoined,
            attendeesCount: nextJoined ? s.attendeesCount + 1 : s.attendeesCount - 1,
          };
        }
        return s;
      });

      const joinedIds = updated.filter((s) => s.joined).map((s) => s.id);
      localStorage.setItem(STORAGE_KEY_COMMUNITY, JSON.stringify(joinedIds));

      return updated;
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isRedLight
          ? 'bg-redlight-card border-redlight-border text-redlight-text'
          : 'bg-night-900/90 border-night-800 text-slate-100 shadow-xl'
      }`}>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-red-400 mb-1">
          <Users className="w-3.5 h-3.5 text-amber-400" />
          Community Circles
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Nearby Stargazing Gatherings
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
          One tap to RSVP and join local dark-sky meetups in parks and reserves. Pure outdoor coordination: no feeds, no algorithm, no chat.
        </p>

        {/* Clear README / Mock Notice */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-300 font-mono text-[11px] block">
              Mock Community API Dataset:
            </strong>
            <span>{mockCommunityData.notice}</span>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1 text-xs font-mono text-slate-400">
          <span>Active Field Sessions ({sessions.length})</span>
          <span>One-Tap RSVP</span>
        </div>

        {sessions.map((sess) => (
          <div
            key={sess.id}
            className={`p-4 rounded-xl border transition-all ${
              isRedLight
                ? 'bg-redlight-card border-redlight-border text-redlight-text'
                : sess.joined
                ? 'bg-night-900 border-emerald-600/70 shadow-lg shadow-emerald-950/20'
                : 'bg-night-900/80 border-night-800 text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <span className="text-[10px] font-mono uppercase text-red-400 font-bold block mb-0.5">
                  Organized by {sess.organizer}
                </span>
                <h3 className="font-bold text-base text-slate-100">
                  {sess.title}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-red-400" />
                  {sess.locationName} • {sess.distanceKm} km away
                </p>
              </div>

              {/* One-tap join CTA button */}
              <button
                type="button"
                onClick={() => handleToggleJoin(sess.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
                  sess.joined
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : isRedLight
                    ? 'bg-red-950 border border-red-800 text-red-300 hover:bg-red-900'
                    : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
                }`}
              >
                {sess.joined ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Attending</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Join Session</span>
                  </>
                )}
              </button>
            </div>

            {/* Target focus note */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 mb-3 text-xs text-slate-300">
              <strong className="text-amber-400 font-mono text-[10px] uppercase block mb-0.5">
                Session Focus:
              </strong>
              <span>{sess.targetFocus}</span>
            </div>

            {/* Footer metrics */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-red-400" />
                  {sess.durationMinutes} min watch
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-indigo-400" />
                  {sess.attendeesCount} stargazers
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 uppercase">
                {sess.mode} mode
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
