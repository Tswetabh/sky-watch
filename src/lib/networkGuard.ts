export interface NetworkState {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  outboundRequestsDuringSession: string[];
}

class NetworkGuardManager {
  private isSimulatedOffline: boolean = false;
  private outboundRequestsDuringSession: string[] = [];
  private isSessionActive: boolean = false;
  private originalFetch: typeof window.fetch | null = null;
  private listeners: Set<(state: NetworkState) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.notify());
      window.addEventListener('offline', () => this.notify());
    }
  }

  public isEffectivelyOffline(): boolean {
    if (this.isSimulatedOffline) return true;
    if (typeof navigator !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  }

  public setSimulatedAirplaneMode(enabled: boolean): void {
    this.isSimulatedOffline = enabled;
    this.notify();
  }

  public startSessionGuard(): void {
    this.isSessionActive = true;
    this.outboundRequestsDuringSession = [];

    if (typeof window !== 'undefined' && !this.originalFetch) {
      this.originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        // Check if URL is local / internal (e.g. data:, blob:, or relative)
        const isExternal = /^https?:\/\//i.test(url) && !url.includes(window.location.host);
        if (isExternal && this.isSessionActive) {
          this.outboundRequestsDuringSession.push(url);
          console.warn(`[NetworkGuard] Outbound network call detected during stargazing session: ${url}`);
        }
        return this.originalFetch!(...args);
      };
    }
  }

  public stopSessionGuard(): string[] {
    this.isSessionActive = false;
    if (typeof window !== 'undefined' && this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }
    return [...this.outboundRequestsDuringSession];
  }

  public getOutboundRequestCount(): number {
    return this.outboundRequestsDuringSession.length;
  }

  public subscribe(cb: (state: NetworkState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  public getState(): NetworkState {
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSimulatedOffline: this.isSimulatedOffline,
      outboundRequestsDuringSession: [...this.outboundRequestsDuringSession],
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }
}

export const networkGuard = new NetworkGuardManager();
