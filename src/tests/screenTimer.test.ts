import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScreenSecondsTracker } from '../lib/screenTimer';

describe('Screen Seconds Tracker', () => {
  let tracker: ScreenSecondsTracker;

  beforeEach(() => {
    vi.useFakeTimers();
    tracker = new ScreenSecondsTracker();
  });

  it('accumulates screen seconds while running and visible', () => {
    tracker.start();

    // Advance 5 seconds
    vi.advanceTimersByTime(5000);

    const seconds = tracker.getScreenSeconds();
    expect(seconds).toBe(5);

    tracker.pause();
  });

  it('stops accumulating seconds when paused', () => {
    tracker.start();
    vi.advanceTimersByTime(3000);
    tracker.pause();

    vi.advanceTimersByTime(4000); // Should NOT add while paused

    expect(tracker.getScreenSeconds()).toBe(3);
  });

  it('resumes accumulation seamlessly after pause', () => {
    tracker.start();
    vi.advanceTimersByTime(4000);
    tracker.pause();

    vi.advanceTimersByTime(2000);
    tracker.start();
    vi.advanceTimersByTime(3000);

    expect(tracker.getScreenSeconds()).toBe(7);
    tracker.pause();
  });

  it('resets counter back to zero', () => {
    tracker.start();
    vi.advanceTimersByTime(10000);
    tracker.reset();

    expect(tracker.getScreenSeconds()).toBe(0);
  });
});
