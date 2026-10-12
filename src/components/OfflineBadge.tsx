import React, { useEffect, useState } from 'react';
import { Wifi, Plane } from 'lucide-react';
import { networkGuard, NetworkState } from '../lib/networkGuard';

export const OfflineBadge: React.FC = () => {
  const [state, setState] = useState<NetworkState>(networkGuard.getState());

  useEffect(() => {
    return networkGuard.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  const isOffline = !state.isOnline || state.isSimulatedOffline;

  const toggleSimulatedOffline = () => {
    networkGuard.setSimulatedAirplaneMode(!state.isSimulatedOffline);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleSimulatedOffline}
        title={isOffline ? 'Offline mode active (Click to toggle)' : 'Online (Click to simulate Airplane mode)'}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
          isOffline
            ? 'bg-amber-950/80 text-amber-300 border border-amber-600/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
            : 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/40'
        }`}
      >
        {isOffline ? (
          <>
            <Plane className="w-3.5 h-3.5 text-amber-400 rotate-[-45deg]" />
            <span className="font-mono uppercase tracking-wide">
              {state.isSimulatedOffline ? 'Simulated Airplane' : 'Offline / Field'}
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono uppercase tracking-wide">Connected</span>
          </>
        )}
      </button>
    </div>
  );
};
