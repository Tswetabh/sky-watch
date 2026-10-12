import React, { useState } from 'react';
import { Camera, Upload, Send, ShieldCheck, AlertTriangle, Compass, Moon } from 'lucide-react';
import { answerPhotoQuery, GroundedAnalysisResult } from '../lib/captureAsk';

interface CaptureAskViewProps {
  userCoords: { lat: number; lon: number; name: string };
  isRedLight: boolean;
  onPhotoSaved?: (dataUrl: string) => void;
}

export const CaptureAskView: React.FC<CaptureAskViewProps> = ({
  userCoords,
  isRedLight,
  onPhotoSaved,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [question, setQuestion] = useState<string>('Did I capture a meteor streak, a satellite, or an aircraft?');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<GroundedAnalysisResult | null>(null);
  const [captureTime, setCaptureTime] = useState<string>(new Date().toISOString().slice(0, 16));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setPhotoUrl(url);
        if (onPhotoSaved) onPhotoSaved(url);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setIsAnalyzing(true);

    try {
      const date = new Date(captureTime || Date.now());
      const res = await answerPhotoQuery({
        photoDataUrl: photoUrl || '',
        question,
        capturedAt: date,
        lat: userCoords.lat,
        lon: userCoords.lon,
      });
      setResult(res);
    } catch (err) {
      console.error('Capture ask error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sampleQuestions = [
    'Did I capture a meteor streak, a satellite, or an aircraft?',
    'Is that steady bright beacon near the horizon Jupiter or Venus?',
    'What is the current Moon phase and terminator detail in this sky?',
    'Are there any active meteor showers tonight that could cause this flash?',
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
          <Camera className="w-3.5 h-3.5 text-amber-400" />
          Capture & Grounded Ask
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Ground Your Sky Captures
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
          Upload an outdoor night photo and ask a question. Grounded strictly in your capture time, coordinates, and real offline ephemeris data.
        </p>

        {/* Upload & Photo Preview */}
        <div className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <label className={`w-full sm:w-1/2 h-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
              isRedLight
                ? 'border-red-900 bg-red-950/30 hover:border-red-700 text-red-400'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400'
            }`}>
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Captured Night Sky"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="text-center p-4 space-y-2">
                  <Upload className="w-7 h-7 mx-auto text-red-400" />
                  <p className="text-xs font-medium text-slate-300">
                    Snap or Select Night Photo
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    PNG, JPG, or WebP
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Metadata Fields */}
            <div className="w-full sm:w-1/2 space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                  Capture Timestamp
                </label>
                <input
                  type="datetime-local"
                  value={captureTime}
                  onChange={(e) => setCaptureTime(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                  Observer Coordinates
                </label>
                <div className="text-xs font-mono px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                  {userCoords.name} ({userCoords.lat.toFixed(2)}°, {userCoords.lon.toFixed(2)}°)
                </div>
              </div>
            </div>
          </div>

          {/* Question Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Ask Skywatch about what you captured:
            </label>
            <textarea
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Is that bright object near the horizon Jupiter?"
              className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-red-500 resize-none"
            />

            {/* Quick Sample Questions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sampleQuestions.map((sq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuestion(sq)}
                  className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  "{sq}"
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            disabled={isAnalyzing}
            onClick={handleAsk}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              isAnalyzing
                ? 'bg-red-950 text-red-400 border border-red-800 cursor-wait'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/30'
            }`}
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                <span>Evaluating Ephemeris & Grounded Astronomy...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Ground & Analyze Query</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grounded Result Display */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          <div className={`p-5 rounded-2xl border ${
            isRedLight
              ? 'bg-redlight-card border-redlight-border text-redlight-text'
              : 'bg-night-900/90 border-night-800 text-slate-100 shadow-xl'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Grounded Astronomical Verification
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                Text Model Grounding
              </span>
            </div>

            {/* Answer Content */}
            <div className="p-4 rounded-xl bg-black/50 border border-slate-800/80 mb-4">
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-serif">
                {result.answer}
              </p>
            </div>

            {/* Plausibility Warning / Proof */}
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-start gap-2.5 mb-4 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 font-mono uppercase text-[10px]">
                  Scientific Plausibility Note:
                </strong>
                <span>{result.plausibilityNote}</span>
              </div>
            </div>

            {/* Ground Truth Facts Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase text-slate-400 block">
                Calculated Ephemeris Snapshot at Capture Time:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Moon: {result.groundedFacts.moonPhaseAndIllumination}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>ISS Pass: {result.groundedFacts.issPassActive ? 'Active Overhead' : 'No Active Pass'}</span>
                </div>
              </div>

              {result.groundedFacts.visiblePlanets.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
                  <strong className="text-slate-400">Visible Planets: </strong>
                  {result.groundedFacts.visiblePlanets.join('; ')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
