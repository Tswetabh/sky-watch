import React from 'react';
import { Compass, Telescope, Eye, Camera, BookOpen, Users, Flame } from 'lucide-react';

export type NavTab = 'plan' | 'scout' | 'watch' | 'capture' | 'keep' | 'community' | 'streaks';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isRedLight: boolean;
  isSessionActive: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  isRedLight,
  isSessionActive,
}) => {
  const tabs: Array<{ id: NavTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'plan', label: 'Plan', icon: Telescope },
    { id: 'scout', label: 'Scout', icon: Compass },
    { id: 'watch', label: isSessionActive ? 'Active' : 'Watch', icon: Eye },
    { id: 'capture', label: 'Capture', icon: Camera },
    { id: 'keep', label: 'Keep', icon: BookOpen },
    { id: 'community', label: 'Circles', icon: Users },
    { id: 'streaks', label: 'Streaks', icon: Flame },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-lg px-2 py-1.5 transition-colors ${
      isRedLight
        ? 'bg-redlight-bg/95 border-redlight-border text-redlight-text'
        : 'bg-night-950/95 border-night-800 text-slate-300'
    }`}>
      <div className="max-w-2xl mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isWatch = tab.id === 'watch';

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative ${
                isWatch
                  ? isActive
                    ? 'text-red-500 font-bold scale-105'
                    : 'text-red-400 font-semibold hover:text-red-300'
                  : isActive
                  ? isRedLight
                    ? 'text-red-300 font-semibold'
                    : 'text-white font-semibold'
                  : isRedLight
                  ? 'text-red-900 hover:text-red-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-all ${
                isWatch
                  ? isSessionActive
                    ? 'bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.7)]'
                    : 'bg-red-950/80 border border-red-700/60 text-red-400'
                  : isActive
                  ? isRedLight
                    ? 'bg-red-950 border border-red-900'
                    : 'bg-slate-800 border border-slate-700 text-slate-100'
                  : 'bg-transparent'
              }`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {tab.label}
              </span>
              {isActive && (
                <span className={`absolute -bottom-1 w-1.5 h-1.5 rounded-full ${
                  isRedLight ? 'bg-red-500' : 'bg-indigo-400'
                }`} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
