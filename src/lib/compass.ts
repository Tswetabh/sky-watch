export function getRelativeCompassDirection(userHeadingDeg: number | null, targetAzimuthDeg: number): string {
  if (userHeadingDeg === null || isNaN(userHeadingDeg)) {
    return ''; // Heading unavailable, fallback to cardinal direction
  }

  const diff = ((targetAzimuthDeg - userHeadingDeg + 360) % 360);

  if (diff >= 345 || diff <= 15) {
    return 'straight ahead';
  } else if (diff > 15 && diff <= 60) {
    return 'slightly to your right';
  } else if (diff > 60 && diff <= 120) {
    return 'to your right';
  } else if (diff > 120 && diff <= 165) {
    return 'behind you to your right';
  } else if (diff > 165 && diff <= 195) {
    return 'directly behind you';
  } else if (diff > 195 && diff <= 240) {
    return 'behind you to your left';
  } else if (diff > 240 && diff <= 300) {
    return 'to your left';
  } else {
    return 'slightly to your left';
  }
}

export function subscribeToDeviceOrientation(
  onHeading: (heading: number | null) => void
): () => void {
  if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
    onHeading(null);
    return () => {};
  }

  const handler = (event: DeviceOrientationEvent) => {
    let heading: number | null = null;
    // iOS Safari exposes webkitCompassHeading directly (degrees relative to magnetic north)
    if ((event as any).webkitCompassHeading !== undefined) {
      heading = (event as any).webkitCompassHeading;
    } else if (event.alpha !== null) {
      // Android / generic device orientation
      heading = (360 - event.alpha) % 360;
    }

    if (heading !== null && !isNaN(heading)) {
      onHeading(Math.round(heading));
    }
  };

  window.addEventListener('deviceorientation', handler, true);
  return () => {
    window.removeEventListener('deviceorientation', handler, true);
  };
}
