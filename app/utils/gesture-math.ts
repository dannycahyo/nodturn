/**
 * Calculate the roll angle (head tilt) from ear positions
 * Returns angle in degrees (positive = right tilt, negative = left tilt)
 */
export function calculateRollAngle(
  leftEar: { x: number; y: number },
  rightEar: { x: number; y: number }
): number {
  const deltaX = rightEar.x - leftEar.x;
  const deltaY = rightEar.y - leftEar.y;

  // atan2 returns angle in radians, convert to degrees
  const angleRad = Math.atan2(deltaY, deltaX);
  const angleDeg = (angleRad * 180) / Math.PI;

  // Normalize to -180 to 180 range
  return angleDeg;
}

/**
 * Calculate angular velocity (degrees per second)
 */
export function calculateAngularVelocity(
  currentAngle: number,
  previousAngle: number,
  timeDelta: number
): number {
  if (timeDelta === 0) return 0;

  // Handle angle wrap-around (crossing -180/180 boundary)
  let angleDiff = currentAngle - previousAngle;
  if (angleDiff > 180) angleDiff -= 360;
  if (angleDiff < -180) angleDiff += 360;

  // timeDelta is in milliseconds, convert to seconds
  return Math.abs(angleDiff) / (timeDelta / 1000);
}

/**
 * Simple Moving Average for smoothing jittery data
 */
export class SimpleMovingAverage {
  private values: number[] = [];
  private maxSize: number;

  constructor(windowSize: number = 3) {
    this.maxSize = windowSize;
  }

  add(value: number): number {
    this.values.push(value);
    if (this.values.length > this.maxSize) {
      this.values.shift();
    }
    return this.getAverage();
  }

  getAverage(): number {
    if (this.values.length === 0) return 0;
    const sum = this.values.reduce((acc, val) => acc + val, 0);
    return sum / this.values.length;
  }

  reset(): void {
    this.values = [];
  }
}
