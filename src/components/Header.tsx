import React, { useState } from 'react';
import { Eye, Settings, Compass, Sparkles } from 'lucide-react';
import { OfflineBadge } from './OfflineBadge';
import { getModelConfig, setRuntimeModel, resetRuntimeModel } from '../config/env';

interface HeaderProps {
  isRedLight: boolean;
  onToggleRedLight: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isRedLight, onToggleRedLight }) => {
  const [modelCfg, setModelCfg] = useState(getModelConfig());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputModel, setInputModel] = useState(modelCfg.model);

  const handleSaveModel = () => {
    if (inputModel.trim()) {
      setRuntimeModel(inputModel.trim());
      setModelCfg(getModelConfig());
      setIsSettingsOpen(false);
    }
  };

  const handleResetDefault = () => {
    resetRuntimeModel();
    const def = getModelConfig();
    setInputModel(def.model);
    setModelCfg(def);
    setIsSettingsOpen(false);
  };

  return (
    <>
      <header className={`sticky top-0 z-40 border-b px-4 py-3 transition-colors ${
        isRedLight
          ? 'bg-redlight-bg/95 border-redlight-border text-redlight-text backdrop-blur-md'
          : 'bg-night-950/95 border-night-800 text-slate-100 backdrop-blur-md'
      }`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg border flex items-center justify-center ${
              isRedLight
                ? 'bg-red-950/60 border-red-800/80 text-red-400'
                : 'bg-indigo-950/60 border-indigo-700/60 text-indigo-400'
            }`}>
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-base sm:text-lg">Skywatch</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
                  isRedLight
                    ? 'bg-red-950 text-red-400 border border-red-800/60'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                }`}>
                  Touch Grass
                </span>
              </div>
              <p className={`text-[10px] font-mono ${isRedLight ? 'text-red-400/80' : 'text-slate-400'}`}>
                Offline-First Stargazing PWA
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <OfflineBadge />

            {/* Model Badge */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono border transition-all ${
                isRedLight
                  ? 'border-red-900 bg-red-950/60 text-red-300 hover:border-red-700'
                  : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
              }`}
              title="Click to configure local LLM model"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{modelCfg.model}</span>
            </button>

            {/* Red Light Filter Toggle */}
            <button
              onClick={onToggleRedLight}
              className={`p-2 rounded-lg border transition-all ${
                isRedLight
                  ? 'bg-red-700 border-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={isRedLight ? 'Disable Red-Light Filter' : 'Enable Red-Light Night Vision Mode'}
              aria-label="Night vision mode toggle"
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Settings Mobile Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`sm:hidden p-2 rounded-lg border ${
                isRedLight ? 'border-red-900 text-red-400' : 'border-slate-800 text-slate-400'
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Model Swapper Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl ${
            isRedLight
              ? 'bg-redlight-card border-redlight-border text-redlight-text'
              : 'bg-night-900 border-night-800 text-slate-100'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Local LLM Planner Config
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Skywatch connects to your local Ollama instance without external cloud telemetry. Swapping the model here dynamically changes the planner agent.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Ollama Endpoint
                </label>
                <input
                  type="text"
                  disabled
                  value={modelCfg.ollamaHost}
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                  Model Tag (e.g. gemma3:4b, gemma:2b, llama3.2:3b)
                </label>
                <input
                  type="text"
                  value={inputModel}
                  onChange={(e) => setInputModel(e.target.value)}
                  placeholder="gemma3:4b"
                  className="w-full text-sm font-mono px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {['gemma3:4b', 'gemma:2b', 'gemma:7b', 'llama3.2:3b'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setInputModel(m)}
                    className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300"
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Reset Default
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveModel}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30"
                  >
                    Save Model
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
