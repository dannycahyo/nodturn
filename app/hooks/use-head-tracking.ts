import { useEffect, useRef, useReducer } from 'react';
import type { FaceLandmarksDetector } from '@tensorflow-models/face-landmarks-detection';
import { usePerformanceStore } from '~/stores/performance-store';
import { useSettingsStore } from '~/stores/settings-store';
import {
  calculateRollAngle,
  calculateAngularVelocity,
  SimpleMovingAverage
} from '~/utils/gesture-math';

interface TrackingState {
  lastAngle: number;
  lastTimestamp: number;
  smoothingFilter: SimpleMovingAverage;
}

type TrackingAction =
  | { type: 'UPDATE_ANGLE'; payload: { angle: number; timestamp: number } }
  | { type: 'RESET' };

function trackingReducer(
  state: TrackingState,
  action: TrackingAction
): TrackingState {
  switch (action.type) {
    case 'UPDATE_ANGLE':
      return {
        ...state,
        lastAngle: action.payload.angle,
        lastTimestamp: action.payload.timestamp
      };
    case 'RESET':
      state.smoothingFilter.reset();
      return {
        ...state,
        lastAngle: 0,
        lastTimestamp: 0
      };
    default:
      return state;
  }
}

export function useHeadTracking(
  detector: FaceLandmarksDetector | null,
  videoElement: HTMLVideoElement | null,
  enabled: boolean
) {
  const [state, dispatch] = useReducer(trackingReducer, {
    lastAngle: 0,
    lastTimestamp: 0,
    smoothingFilter: new SimpleMovingAverage(3)
  });

  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    nextPage,
    prevPage,
    gestureLocked,
    lockGesture,
    unlockGesture,
    setFaceDetected
  } = usePerformanceStore();

  const { gestureAngleThreshold, gestureVelocityThreshold, gestureCooldown } =
    useSettingsStore();

  useEffect(() => {
    if (!detector || !videoElement || !enabled) {
      setFaceDetected(false);
      return;
    }

    let animationId: number;
    let isDetecting = true;

    const detect = async () => {
      if (!isDetecting) return;

      try {
        const faces = await detector.estimateFaces(videoElement);

        if (faces.length === 0) {
          setFaceDetected(false);
        } else {
          setFaceDetected(true);

          const keypoints = faces[0].keypoints;

          // Get ear positions (landmarks 234 = left ear, 454 = right ear)
          const leftEar = keypoints[234];
          const rightEar = keypoints[454];

          if (leftEar && rightEar) {
            const rawAngle = calculateRollAngle(leftEar, rightEar);
            const smoothedAngle = state.smoothingFilter.add(rawAngle);

            const now = Date.now();
            const timeDelta = now - state.lastTimestamp;

            if (state.lastTimestamp > 0 && timeDelta > 0) {
              const velocity = calculateAngularVelocity(
                smoothedAngle,
                state.lastAngle,
                timeDelta
              );

              // Check for gesture trigger
              if (!gestureLocked) {
                const angleExceedsThreshold =
                  Math.abs(smoothedAngle) > gestureAngleThreshold;
                const velocityExceedsThreshold =
                  velocity > gestureVelocityThreshold;

                if (angleExceedsThreshold && velocityExceedsThreshold) {
                  // Trigger page turn
                  if (smoothedAngle > 0) {
                    nextPage();
                  } else {
                    prevPage();
                  }

                  // Lock gesture and set cooldown
                  lockGesture();
                  if (lockTimeoutRef.current) {
                    clearTimeout(lockTimeoutRef.current);
                  }
                  lockTimeoutRef.current = setTimeout(() => {
                    unlockGesture();
                  }, gestureCooldown);
                }
              }
            }

            dispatch({
              type: 'UPDATE_ANGLE',
              payload: { angle: smoothedAngle, timestamp: now }
            });
          }
        }
      } catch (error) {
        console.error('Face detection error:', error);
      }

      // Target ~30 FPS (33ms per frame)
      animationId = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      isDetecting = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
    };
  }, [
    detector,
    videoElement,
    enabled,
    gestureLocked,
    gestureAngleThreshold,
    gestureVelocityThreshold,
    gestureCooldown,
    lockGesture,
    unlockGesture,
    nextPage,
    prevPage,
    setFaceDetected,
    state.lastAngle,
    state.lastTimestamp,
    state.smoothingFilter
  ]);

  return { gestureLocked };
}
