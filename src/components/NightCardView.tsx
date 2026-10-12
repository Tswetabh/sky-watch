import React, { useEffect, useState } from 'react';
import { BookOpen, Share2, Compass, CheckCircle2, Trophy, ArrowRight } from 'lucide-react';
import { NightCard } from '../types/session';
import { getAllNightCards, saveNightCard } from '../lib/db';

interface NightCardViewProps {
  currentCard: NightCard | null;
  isRedLight: boolean;
  onNavigateToPlan?: () => void;
}

export const NightCardView: React.FC<NightCardViewProps> = ({
  currentCard,
  isRedLight,
  onNavigateToPlan,
}) => {
  const [cards, setCards] = useState<NightCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<NightCard | null>(currentCard);
  const [sharedNotice, setSharedNotice] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    getAllNightCards().then((all) => {
      if (isMounted) {
        setCards(all);
        if (!selectedCard && all.length > 0) {
          setSelectedCard(all[0]);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentCard) {
      setSelectedCard(currentCard);
      saveNightCard(currentCard).then(() => {
        getAllNightCards().then(setCards);
      });
    }
  }, [currentCard]);

  const handleShare = (card: NightCard) => {
    const text = `🔭 Skywatch Night Card: ${card.minutesOutside} min outside under dark skies with ONLY ${card.screenSeconds} screen-seconds! Observed ${card.objectsObserved.join(', ')}. #TouchGrass #DEVChallenge`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setSharedNotice(true);
      setTimeout(() => setSharedNotice(false), 2500);
    }
  };

  const activeCard = selectedCard || currentCard;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isRedLight
          ? 'bg-redlight-card border-redlight-border text-redlight-text'
          : 'bg-night-900/90 border-night-800 text-slate-100 shadow-xl'
      }`}>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-red-400 mb-1">
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          Keep: Night Cards
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Your Touch Grass Night Cards
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
          The point of Skywatch: maximum time looking up under open skies, minimum time looking at glass. Screen-seconds is the headline stat.
        </p>
      </div>

      {/* Main Night Card Display */}
      {activeCard ? (
        <div className="space-y-4 animate-fade-in">
          <div className={`relative overflow-hidden p-6 rounded-3xl border shadow-2xl transition-all ${
            isRedLight
              ? 'bg-gradient-to-b from-red-950/70 via-black to-red-950/90 border-red-700/80 text-red-200'
              : 'bg-gradient-to-b from-slate-900 via-night-950 to-indigo-950/60 border-indigo-900/60 text-slate-100'
          }`}>
            {/* Background watermark icon */}
            <Compass className="absolute -right-8 -bottom-8 w-48 h-48 opacity-5 text-red-500 pointer-events-none" />

            {/* Top row */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-red-400 block font-bold">
                  Official Night Card
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(activeCard.createdAt).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {' • '}
                  {activeCard.locationName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleShare(activeCard)}
                className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono flex items-center gap-1.5 text-slate-300 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-red-400" />
                <span>{sharedNotice ? 'Copied!' : 'Share Card'}</span>
              </button>
            </div>

            {/* THE HEADLINE STAT: SCREEN-SECONDS */}
            <div className="p-6 rounded-2xl bg-black/60 border border-red-900/60 text-center mb-6 shadow-inner">
              <span className="text-xs sm:text-sm font-mono uppercase tracking-widest text-red-400 font-bold block mb-1">
                ⭐ HEADLINE STAT: FOREGROUND SCREEN TIME ⭐
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                  {activeCard.screenSeconds}
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-red-300 self-end mb-2">
                  SECONDS
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-2">
                Screen was on for just{' '}
                <strong className="text-red-400">{activeCard.screenTimeRatioPct.toFixed(1)}%</strong> of your{' '}
                <strong className="text-slate-100">{activeCard.minutesOutside} minutes</strong> outside under the stars.
              </p>
            </div>

            {/* Core Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 text-center">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                  Minutes Outside
                </span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {activeCard.minutesOutside} min
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                  Targets Seen
                </span>
                <span className="text-lg font-bold font-mono text-amber-300">
                  {activeCard.objectsObserved.length}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                  Photos Captured
                </span>
                <span className="text-lg font-bold font-mono text-sky-300">
                  {activeCard.photosCaptured}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                  Mode
                </span>
                <span className="text-xs font-bold font-mono text-slate-300 uppercase truncate block">
                  {activeCard.mode}
                </span>
              </div>
            </div>

            {/* Best Moment & Next Target */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-2.5">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 block font-mono uppercase text-[10px]">
                    Best Stargazing Moment:
                  </strong>
                  <span className="text-slate-200">{activeCard.bestMoment}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-2.5">
                <ArrowRight className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sky-300 block font-mono uppercase text-[10px]">
                    Next Target for Tomorrow Night:
                  </strong>
                  <span className="text-slate-200">{activeCard.nextTarget}</span>
                </div>
              </div>

              {/* Observed objects list */}
              <div className="pt-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Objects Verified in Field:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeCard.objectsObserved.map((obj, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 space-y-3">
          <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
          <h3 className="font-bold text-slate-300">No Night Cards Logged Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Complete a Watch session under the open sky to automatically generate your first Night Card with measured screen-seconds.
          </p>
          {onNavigateToPlan && (
            <button
              onClick={onNavigateToPlan}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white shadow-lg shadow-red-600/30"
            >
              Plan Your First Session
            </button>
          )}
        </div>
      )}

      {/* History of Past Night Cards */}
      {cards.length > 1 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 px-1">
            Stored Night Cards History ({cards.length} sessions logged)
          </h4>
          <div className="space-y-2">
            {cards.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCard(c)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedCard?.id === c.id
                    ? 'bg-red-950/60 border-red-700 text-red-200'
                    : 'bg-night-900/60 border-night-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="font-bold text-sm block text-slate-100">
                    {c.minutesOutside} min outside • {c.locationName}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {c.dateString} • {c.objectsObserved.join(', ')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold font-mono text-red-400 block">
                    {c.screenSeconds}s
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    screen-time
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
