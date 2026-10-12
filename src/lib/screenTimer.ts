export type ScreenTimerCallback = (screenSeconds: number) => void;

export class ScreenSecondsTracker {
  private isRunning: boolean = false;
  private accumulatedMs: number = 0;
  private lastActiveTimestamp: number | null = null;
  private intervalId: any = null;
  private listeners: Set<ScreenTimerCallback> = new Set();
  private boundVisibilityHandler: () => void;

  constructor() {
    this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastActiveTimestamp = Date.now();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }

    this.startTick();
  }

  public pause(): void {
    if (!this.isRunning) return;
    this.updateAccumulated();
    this.isRunning = false;
    this.stopTick();

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
    }
  }

  public reset(): void {
    this.pause();
    this.accumulatedMs = 0;
    this.lastActiveTimestamp = null;
    this.notify();
  }

  public getScreenSeconds(): number {
    let totalMs = this.accumulatedMs;
    if (this.isRunning && this.isDocumentVisible() && this.lastActiveTimestamp !== null) {
      totalMs += (Date.now() - this.lastActiveTimestamp);
    }
    return Math.floor(totalMs / 1000);
  }

  public subscribe(cb: ScreenTimerCallback): () => void {
    this.listeners.add(cb);
    cb(this.getScreenSeconds());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private handleVisibilityChange(): void {
    if (!this.isRunning) return;

    if (this.isDocumentVisible()) {
      // Screen turned back on / app came to foreground
      this.lastActiveTimestamp = Date.now();
      this.startTick();
    } else {
      // Screen turned off or user put app in pocket (app hidden)
      this.updateAccumulated();
      this.lastActiveTimestamp = null;
      this.stopTick();
    }
    this.notify();
  }

  private isDocumentVisible(): boolean {
    if (typeof document === 'undefined') return true;
    return document.visibilityState === 'visible';
  }

  private updateAccumulated(): void {
    if (this.lastActiveTimestamp !== null) {
      const delta = Date.now() - this.lastActiveTimestamp;
      if (delta > 0) {
        this.accumulatedMs += delta;
      }
      this.lastActiveTimestamp = null;
    }
  }

  private startTick(): void {
    this.stopTick();
    this.intervalId = setInterval(() => {
      if (this.isRunning && this.isDocumentVisible()) {
        this.notify();
      }
    }, 500);
  }

  private stopTick(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private notify(): void {
    const secs = this.getScreenSeconds();
    this.listeners.forEach((cb) => cb(secs));
  }
}

// Default shared instance
export const sessionScreenTracker = new ScreenSecondsTracker();
