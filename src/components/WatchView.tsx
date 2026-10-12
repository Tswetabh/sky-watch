import React, { useEffect, useState, useRef } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Compass, Square, Play, Clock, Eye } from 'lucide-react';
import { SkyPlan, SkyEvent } from '../types/planner';
import { sessionScreenTracker } from '../lib/screenTimer';
import { networkGuard } from '../lib/networkGuard';
import { speechService } from '../lib/speech/browserSpeech';
import { subscribeToDeviceOrientation, getRelativeCompassDirection } from '../lib/compass';

interface WatchViewProps {
  plan: SkyPlan | null;
  onEndSession: (sessionData: {
    minutesOutside: number;
    screenSeconds: number;
    observedObjects: string[];
    bestMoment: string;
    nextTarget: string;
    plan: SkyPlan;
  }) => void;
}

export const WatchView: React.FC<WatchViewProps> = ({ plan, onEndSession }) => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [sessionStartEpoch, setSessionStartEpoch] = useState<number | null>(null);
  const [screenSeconds, setScreenSeconds] = useState<number>(0);
  const [elapsedOutsideSeconds, setElapsedOutsideSeconds] = useState<number>(0);
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(0);
  const [lastSpokenText, setLastSpokenText] = useState<string>('Skywatch quiet mode active. I will speak cues when targets approach.');
  const [isTtsMuted, setIsTtsMuted] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micDeniedNotice, setMicDeniedNotice] = useState<boolean>(false);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [observedIds, setObservedIds] = useState<Set<string>>(new Set());

  // Timers and orientation subscriptions
  const unsubscribeOrientationRef = useRef<(() => void) | null>(null);

  // Screen seconds subscriber
  useEffect(() => {
    return sessionScreenTracker.subscribe((secs) => {
      setScreenSeconds(secs);
    });
  }, []);

  // Outside time ticker
  useEffect(() => {
    let interval: any = null;
    if (isActive && sessionStartEpoch) {
      interval = setInterval(() => {
        setElapsedOutsideSeconds(Math.floor((Date.now() - sessionStartEpoch) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, sessionStartEpoch]);

  const currentEvent: SkyEvent | undefined = plan?.events[currentEventIndex];

  // Start Session
  const handleStartSession = () => {
    const startEpoch = Date.now();
    setSessionStartEpoch(startEpoch);
    setIsActive(true);
    setCurrentEventIndex(0);
    setObservedIds(new Set());

    // 1. Start real screen-seconds tracker
    sessionScreenTracker.reset();
    sessionScreenTracker.start();

    // 2. Start session network guard to ensure zero outbound leaks
    networkGuard.startSessionGuard();

    // 3. Subscribe to DeviceOrientation compass heading
    unsubscribeOrientationRef.current = subscribeToDeviceOrientation((heading) => {
      setDeviceHeading(heading);
    });

    // 4. Initial spoken greeting (quiet & concise)
    const welcome = `Session started. Screen can stay in your pocket. I will call out targets as they approach.`;
    setLastSpokenText(welcome);
    if (!isTtsMuted) {
      speechService.speak(welcome);
    }

    // 5. Start listening for voice commands if available
    const started = speechService.startListening({
      onResult: (transcript) => handleVoiceCommand(transcript),
      onError: (err) => {
        if (err.includes('denied') || err.includes('not-allowed')) {
          setMicDeniedNotice(true);
        }
      },
      onListeningChange: (listening) => setIsListening(listening),
    });

    if (!started) {
      setMicDeniedNotice(true);
    }
  };

  // End Session
  const handleEndSession = () => {
    sessionScreenTracker.pause();
    networkGuard.stopSessionGuard();
    speechService.stopListening();
    speechService.stopSpeaking();

    if (unsubscribeOrientationRef.current) {
      unsubscribeOrientationRef.current();
      unsubscribeOrientationRef.current = null;
    }

    const finalScreenSecs = sessionScreenTracker.getScreenSeconds();
    const finalOutsideMins = Math.max(1, Math.round(elapsedOutsideSeconds / 60));

    const observedNames = plan
      ? plan.events.filter((e) => observedIds.has(e.id)).map((e) => e.name)
      : ['Night Sky Exploration'];

    const bestMoment = observedNames.length > 0 ? observedNames[0] : (currentEvent?.name || 'Milky Way Dark Adaptation');
    const nextTarget = plan?.events[currentEventIndex + 1]?.name || 'Deep Sky Binocular Targets';

    setIsActive(false);

    onEndSession({
      minutesOutside: finalOutsideMins,
      screenSeconds: finalScreenSecs,
      observedObjects: observedNames.length > 0 ? observedNames : [currentEvent?.name || 'Stargazing'],
      bestMoment,
      nextTarget,
      plan: plan!,
    });
  };

  // Handle Spoken / Voice Commands
  const handleVoiceCommand = (rawText: string) => {
    const text = rawText.toLowerCase().trim();
    if (!currentEvent) return;

    if (text.includes("what's that") || text.includes('what is that') || text.includes('look at')) {
      speakCurrentTarget();
    } else if (text.includes("what's next") || text.includes('what next') || text.includes('next')) {
      advanceNextTarget();
    } else if (text.includes('how long') || text.includes('time') || text.includes('timer')) {
      speakTimeStatus();
    } else if (text.includes('tell me about') || text.includes('about this') || text.includes('story') || text.includes('lore')) {
      speakTargetDetails();
    }
  };

  // Speak Current Target with relative left/right heading cues
  const speakCurrentTarget = () => {
    if (!currentEvent) return;
    const relDir = getRelativeCompassDirection(deviceHeading, currentEvent.azimuthDeg);
    const directionCue = relDir ? `Look ${relDir}.` : `Look ${currentEvent.directionCompass}.`;

    const altDesc =
      currentEvent.altitudeDeg < 25
        ? 'low on the horizon'
        : currentEvent.altitudeDeg < 55
        ? 'about halfway up the sky'
        : 'high overhead near zenith';

    const text = `Current target: ${currentEvent.name}. ${directionCue} It is ${altDesc} at ${currentEvent.altitudeDeg} degrees.`;
    setLastSpokenText(text);
    if (!isTtsMuted) speechService.speak(text);

    // Mark observed
    setObservedIds((prev) => new Set(prev).add(currentEvent.id));
  };

  // Advance Next Target
  const advanceNextTarget = () => {
    if (!plan || plan.events.length === 0) return;
    const nextIdx = (currentEventIndex + 1) % plan.events.length;
    setCurrentEventIndex(nextIdx);
    const nextEv = plan.events[nextIdx];

    const relDir = getRelativeCompassDirection(deviceHeading, nextEv.azimuthDeg);
    const directionCue = relDir ? `Turn ${relDir}.` : `Look ${nextEv.directionCompass}.`;

    const text = `Next target: ${nextEv.name}. ${directionCue} ${nextEv.spokenCue}`;
    setLastSpokenText(text);
    if (!isTtsMuted) speechService.speak(text);

    setObservedIds((prev) => new Set(prev).add(nextEv.id));
  };

  // Speak Time Status
  const speakTimeStatus = () => {
    const mins = Math.max(1, Math.floor(elapsedOutsideSeconds / 60));
    const targetCount = plan?.events.length || 0;
    const observedCount = observedIds.size;

    const text = `You have been outside under dark skies for ${mins} minutes with ${screenSeconds} seconds of screen time. Observed ${observedCount} of ${targetCount} targets.`;
    setLastSpokenText(text);
    if (!isTtsMuted) speechService.speak(text);
  };

  // Speak Target Details
  const speakTargetDetails = () => {
    if (!currentEvent) return;
    const text = `${currentEvent.name}: ${currentEvent.description}. ${currentEvent.highlights.join('. ')}`;
    setLastSpokenText(text);
    if (!isTtsMuted) speechService.speak(text);
  };

  // Relative direction text for UI
  const relativeDirection = currentEvent
    ? getRelativeCompassDirection(deviceHeading, currentEvent.azimuthDeg)
    : '';

  return (
    <div className="min-h-[85vh] flex flex-col justify-between p-4 bg-redlight-bg text-redlight-text select-none pb-24">
      {/* Top Status Bar: Headless & Night Vision Friendly */}
      <div className="flex items-center justify-between border-b border-red-950 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-red-500">
            {isActive ? 'RED-LIGHT ACTIVE SESSION' : 'READY TO WATCH'}
          </span>
        </div>

        {/* Mute and Mic indicators */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTtsMuted(!isTtsMuted)}
            className="p-2 rounded-lg bg-red-950/60 border border-red-900/80 text-red-400 hover:text-red-200"
            title={isTtsMuted ? 'Unmute Voice Cues' : 'Mute Voice Cues'}
          >
            {isTtsMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <div
            className={`p-2 rounded-lg border flex items-center justify-center ${
              isListening
                ? 'bg-red-950 border-red-600 text-red-400 animate-pulse'
                : 'bg-red-950/40 border-red-950 text-red-800'
            }`}
            title={isListening ? 'Voice commands listening' : 'Voice command listening idle'}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Screen Time Headline (Dim Red for Dark Vision) */}
      <div className="my-auto py-6 text-center space-y-4">
        {isActive ? (
          <>
            {/* Compass Bearing & Current Celestial Target */}
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-red-600">
                Target {currentEventIndex + 1} of {plan?.events.length || 1}
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-red-100">
                {currentEvent ? currentEvent.name : 'Stargazing'}
              </h1>
              <p className="text-base text-red-400 font-mono flex items-center justify-center gap-1.5 mt-1">
                <Compass className="w-4 h-4 text-red-500" />
                <span>
                  {relativeDirection
                    ? `${relativeDirection.toUpperCase()} (${currentEvent?.directionCompass})`
                    : currentEvent?.directionCompass || 'Looking Up'}
                </span>
                <span>•</span>
                <span>{currentEvent?.altitudeDeg}° Altitude</span>
              </p>
            </div>

            {/* Spoken Cue Box */}
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-red-950/40 border border-red-900/60 text-left">
              <span className="text-[10px] font-mono uppercase text-red-500 block mb-1">
                Spoken Guidance Cue
              </span>
              <p className="text-sm text-red-200 leading-relaxed font-serif">
                "{lastSpokenText}"
              </p>
            </div>

            {/* Screen Seconds Display: Headline Stat */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/30 border border-red-950 text-xs font-mono text-red-500">
                <Eye className="w-3.5 h-3.5" />
                <span>Foreground Screen Time:</span>
                <strong className="text-red-300 font-bold">{screenSeconds}s</strong>
                <span className="text-red-700">|</span>
                <Clock className="w-3.5 h-3.5" />
                <span>Outside:</span>
                <strong className="text-red-300 font-bold">
                  {Math.floor(elapsedOutsideSeconds / 60)}m {elapsedOutsideSeconds % 60}s
                </strong>
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-950 border border-red-700 flex items-center justify-center mx-auto text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
              <Eye className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-red-200">
              Preserve Night Vision
            </h1>
            <p className="text-xs sm:text-sm text-red-400/90 leading-relaxed">
              When started, this screen will dim to pure red-light. Put your phone in your pocket. The app stays completely quiet and speaks cues only when celestial events occur.
            </p>
            {plan && (
              <p className="text-xs font-mono text-red-500 bg-red-950/40 p-2.5 rounded-xl border border-red-900/60">
                Loaded: {plan.events.length} targets across {plan.durationMinutes} min ({plan.mode} mode)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Voice Card Fallbacks / Quick One-Thumb Tap Controls */}
      {isActive && (
        <div className="space-y-3 max-w-md mx-auto w-full">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={speakCurrentTarget}
              className="py-3 px-3 rounded-xl bg-red-950/60 border border-red-800 text-xs font-bold text-red-200 hover:bg-red-900 active:scale-95 transition-all"
            >
              "What's that?"
            </button>
            <button
              type="button"
              onClick={advanceNextTarget}
              className="py-3 px-3 rounded-xl bg-red-950/60 border border-red-800 text-xs font-bold text-red-200 hover:bg-red-900 active:scale-95 transition-all"
            >
              "What's next?"
            </button>
            <button
              type="button"
              onClick={speakTimeStatus}
              className="py-3 px-3 rounded-xl bg-red-950/60 border border-red-800 text-xs font-bold text-red-200 hover:bg-red-900 active:scale-95 transition-all"
            >
              "How long?"
            </button>
            <button
              type="button"
              onClick={speakTargetDetails}
              className="py-3 px-3 rounded-xl bg-red-950/60 border border-red-800 text-xs font-bold text-red-200 hover:bg-red-900 active:scale-95 transition-all"
            >
              "Tell me about this"
            </button>
          </div>

          {micDeniedNotice && (
            <p className="text-[11px] font-mono text-red-500/80 text-center">
              * Mic unavailable/denied. The 4 buttons above provide one-tap voice responses.
            </p>
          )}
        </div>
      )}

      {/* The One Big Tap Target (Mobile-first, Thumb-friendly) */}
      <div className="pt-4 max-w-md mx-auto w-full">
        {!isActive ? (
          <button
            type="button"
            onClick={handleStartSession}
            className="w-full py-5 px-6 rounded-2xl font-black text-lg bg-red-600 hover:bg-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.6)] flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>START STARGAZING SESSION</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEndSession}
            className="w-full py-4 px-6 rounded-2xl font-bold text-base bg-red-950/90 border-2 border-red-600 text-red-200 hover:bg-red-900/80 shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
          >
            <Square className="w-5 h-5 fill-current" />
            <span>FINISH & GENERATE NIGHT CARD</span>
          </button>
        )}
      </div>
    </div>
  );
};
