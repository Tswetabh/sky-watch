import React, { useEffect, useState } from 'react';
import { Flame, Trophy, Award, Clock, Eye, Sparkles, CheckCircle2 } from 'lucide-react';
import { NightCard } from '../types/session';
import { getAllNightCards } from '../lib/db';

interface StreaksViewProps {
  isRedLight: boolean;
}

export const StreaksView: React.FC<StreaksViewProps> = ({ isRedLight }) => {
  const [cards, setCards] = useState<NightCard[]>([]);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [totalMinutesOutside, setTotalMinutesOutside] = useState<number>(0);
  const [totalScreenSeconds, setTotalScreenSeconds] = useState<number>(0);
  const [totalObjectsCount, setTotalObjectsCount] = useState<number>(0);

  useEffect(() => {
    getAllNightCards().then((allCards) => {
      setCards(allCards);

      // 1. Calculate Totals
      let minutes = 0;
      let screenSecs = 0;
      const allObjects = new Set<string>();

      allCards.forEach((c) => {
        minutes += c.minutesOutside;
        screenSecs += c.screenSeconds;
        c.objectsObserved.forEach((obj) => allObjects.add(obj));
      });

      setTotalMinutesOutside(minutes);
      setTotalScreenSeconds(screenSecs);
      setTotalObjectsCount(allObjects.size);

      // 2. Calculate Consecutive Night Streak
      const streak = calculateConsecutiveStreak(allCards);
      setStreakDays(streak);
    });
  }, []);

  function calculateConsecutiveStreak(allCards: NightCard[]): number {
    if (allCards.length === 0) return 0;

    // Get unique dates sorted in descending order
    const dates = Array.from(new Set(allCards.map((c) => c.dateString))).sort().reverse();
    if (dates.length === 0) return 0;

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // If the latest logged card is neither today nor yesterday, streak is broken
    if (dates[0] !== today && dates[0] !== yesterday) {
      return 0;
    }

    let streak = 1;
    let curr = new Date(dates[0]);

    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) {
        streak++;
        curr = prev;
      } else {
        break;
      }
    }

    return streak;
  }

  const milestones = [
    {
      id: 'first-night',
      title: 'Lawn Star',
      desc: 'Logged 1st outdoor night card',
      achieved: cards.length >= 1,
    },
    {
      id: 'low-screen',
      title: 'Rhodopsin Master',
      desc: 'Finished a session with under 60 screen-seconds',
      achieved: cards.some((c) => c.screenSeconds <= 60),
    },
    {
      id: 'streak-3',
      title: 'Night Owl Streak',
      desc: 'Achieved 3 consecutive nights outside',
      achieved: streakDays >= 3,
    },
    {
      id: 'multi-target',
      title: 'Celestial Scout',
      desc: 'Observed 5 or more distinct astronomical objects',
      achieved: totalObjectsCount >= 5,
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isRedLight
          ? 'bg-redlight-card border-redlight-border text-redlight-text'
          : 'bg-night-900/90 border-night-800 text-slate-100 shadow-xl'
      }`}>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-red-400 mb-1">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          Touch Grass Streaks & Totals
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Outdoor Stargazing Consistency
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
          Derived purely from your offline Night Cards stored in IndexedDB. Real night-sky consistency without social feeds or leaderboards.
        </p>

        {/* Big Streak Metric Banner */}
        <div className="mt-5 p-6 rounded-2xl bg-black/60 border border-orange-950/80 text-center relative overflow-hidden shadow-inner">
          <Flame className="absolute -left-6 -bottom-6 w-32 h-32 opacity-10 text-orange-500 pointer-events-none" />

          <span className="text-xs font-mono uppercase tracking-widest text-orange-400 font-bold block mb-1">
            Current Consecutive Nights Outside
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]">
              {streakDays}
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-orange-300 self-end mb-2">
              NIGHTS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {streakDays > 0
              ? 'Your consecutive stargazing streak is active!'
              : 'Step outside tonight to spark a new consecutive streak.'}
          </p>
        </div>

        {/* Totals Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <Clock className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
            <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400 block">
              {totalMinutesOutside}m
            </span>
            <span className="text-[10px] font-mono uppercase text-slate-400">
              Total Outside
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <Eye className="w-4 h-4 mx-auto text-red-400 mb-1" />
            <span className="text-lg sm:text-xl font-bold font-mono text-red-400 block">
              {totalScreenSeconds}s
            </span>
            <span className="text-[10px] font-mono uppercase text-slate-400">
              Total Screen-Time
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <Sparkles className="w-4 h-4 mx-auto text-amber-300 mb-1" />
            <span className="text-lg sm:text-xl font-bold font-mono text-amber-300 block">
              {totalObjectsCount}
            </span>
            <span className="text-[10px] font-mono uppercase text-slate-400">
              Unique Targets
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <Trophy className="w-4 h-4 mx-auto text-indigo-400 mb-1" />
            <span className="text-lg sm:text-xl font-bold font-mono text-indigo-400 block">
              {cards.length}
            </span>
            <span className="text-[10px] font-mono uppercase text-slate-400">
              Logged Cards
            </span>
          </div>
        </div>
      </div>

      {/* Badges / Milestones */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 px-1">
          Touch Grass Milestones
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {milestones.map((m) => (
            <div
              key={m.id}
              className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${
                m.achieved
                  ? 'bg-slate-900/90 border-amber-600/60 shadow-lg shadow-amber-950/20'
                  : 'bg-night-900/40 border-night-850 opacity-60'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${
                m.achieved ? 'bg-amber-950 border border-amber-700 text-amber-400' : 'bg-slate-950 text-slate-600'
              }`}>
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h5 className="font-bold text-sm text-slate-100">{m.title}</h5>
                  {m.achieved && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-400">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
