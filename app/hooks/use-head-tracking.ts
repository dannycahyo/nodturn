import { useEffect, useRef, useReducer, useState } from 'react';
import type { PoseDetector, Pose } from '~/types/pose';
import { usePerformanceStore } from '~/stores/performance-store';
import { useSettingsStore } from '~/stores/settings-store';
import {
  calculateRollAngle,
  calculateAngularVelocity,
  SimpleMovingAverage
} from '~/utils/gesture-math';

const MIN_CONFIDENCE = 0.3;

interface TrackingState {
  lastAngle: number;
  lastTimestamp: number;
  smoothingFilter: SimpleMovingAverage;
  currentAngle: number;
}

type TrackingAction =
  | {
      type: 'UPDATE_ANGLE';
      payload: { angle: number; timestamp: number };
    }
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
        lastTimestamp: action.payload.timestamp,
        currentAngle: action.payload.angle
      };
    case 'RESET':
      state.smoothingFilter.reset();
      return {
        ...state,
        lastAngle: 0,
        lastTimestamp: 0,
        currentAngle: 0
      };
    default:
      return state;
  }
}

export function useHeadTracking(
  detector: PoseDetector | null,
  videoElement: HTMLVideoElement | null,
  enabled: boolean
) {
  const [state, dispatch] = useReducer(trackingReducer, {
    lastAngle: 0,
    lastTimestamp: 0,
    smoothingFilter: new SimpleMovingAverage(3),
    currentAngle: 0
  });

  const [poses, setPoses] = useState<Pose[]>([]);
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    nextPage,
    prevPage,
    gestureLocked,
    lockGesture,
    unlockGesture,
    setPoseDetected
  } = usePerformanceStore();

  const { gestureAngleThreshold, gestureVelocityThreshold, gestureCooldown } =
    useSettingsStore();

  useEffect(() => {
    console.log('[HeadTracking] Effect triggered', {
      detector: !!detector,
      videoElement: !!videoElement,
      enabled,
      videoReady: videoElement
        ? `${videoElement.videoWidth}x${videoElement.videoHeight}`
        : 'N/A'
    });

    if (!detector || !videoElement || !enabled) {
      setPoseDetected(false);
      setPoses([]);
      console.log('[HeadTracking] Conditions not met, stopping detection');
      return;
    }

    let animationId: number;
    let isDetecting = true;
    let frameCount = 0;

    console.log('[HeadTracking] Starting detection loop', {
      videoWidth: videoElement.videoWidth,
      videoHeight: videoElement.videoHeight,
      readyState: videoElement.readyState,
      paused: videoElement.paused,
      videoSrc: videoElement.src || 'stream',
      videoCurrentTime: videoElement.currentTime
    });

    const detect = async () => {
      if (!isDetecting) return;

      try {
        const detectedPoses = await detector.estimatePoses(videoElement, {
          flipHorizontal: false
        });
        setPoses(detectedPoses);

        frameCount++;
        if (frameCount % 30 === 0) {
          console.log('[HeadTracking] Detection running', {
            frameCount,
            posesDetected: detectedPoses.length,
            videoState: {
              width: videoElement.videoWidth,
              height: videoElement.videoHeight,
              readyState: videoElement.readyState,
              paused: videoElement.paused,
              currentTime: videoElement.currentTime
            },
            detectorWorking: detectedPoses !== undefined,
            firstPoseData:
              detectedPoses.length > 0
                ? {
                    keypointsCount: detectedPoses[0].keypoints.length,
                    score: detectedPoses[0].score
                  }
                : null
          });
        }

        if (detectedPoses.length === 0) {
          setPoseDetected(false);
          if (frameCount === 90) {
            console.warn(
              '[HeadTracking] ⚠️ No pose detected after 3 seconds. Troubleshooting tips:',
              {
                tips: [
                  'Move closer to camera',
                  'Ensure good lighting',
                  'Face camera directly',
                  'Check if upper body is visible in webcam preview'
                ]
              }
            );
          }
        } else {
          setPoseDetected(true);

          const keypoints = detectedPoses[0].keypoints;

          // Get ear positions (keypoints by name: 7 = left_ear, 8 = right_ear)
          const leftEar = keypoints.find((kp) => kp.name === 'left_ear');
          const rightEar = keypoints.find((kp) => kp.name === 'right_ear');

          // Check confidence and existence
          if (
            leftEar?.score &&
            leftEar.score > MIN_CONFIDENCE &&
            rightEar?.score &&
            rightEar.score > MIN_CONFIDENCE
          ) {
            const rawAngle = calculateRollAngle(leftEar, rightEar);
            const smoothedAngle = state.smoothingFilter.add(rawAngle);

            if (frameCount % 30 === 0) {
              console.log('[HeadTracking] Angle calculated', {
                rawAngle: rawAngle.toFixed(2),
                smoothedAngle: smoothedAngle.toFixed(2),
                leftEar,
                rightEar
              });
            }

            const now = Date.now();
            const timeDelta = now - state.lastTimestamp;

            if (state.lastTimestamp > 0 && timeDelta > 0) {
              const velocity = calculateAngularVelocity(
                smoothedAngle,
                state.lastAngle,
                timeDelta
              );

              if (frameCount % 30 === 0) {
                console.log('[HeadTracking] Gesture check', {
                  smoothedAngle: smoothedAngle.toFixed(2),
                  velocity: velocity.toFixed(2),
                  angleThreshold: gestureAngleThreshold,
                  velocityThreshold: gestureVelocityThreshold,
                  gestureLocked
                });
              }

              // Check for gesture trigger
              if (!gestureLocked) {
                const angleExceedsThreshold =
                  Math.abs(smoothedAngle) > gestureAngleThreshold;
                const velocityExceedsThreshold =
                  velocity > gestureVelocityThreshold;

                // Log attempt even if not triggered
                if (angleExceedsThreshold || velocityExceedsThreshold) {
                  console.log('[HeadTracking] Gesture attempt:', {
                    angle: smoothedAngle.toFixed(2),
                    angleOK: angleExceedsThreshold,
                    velocity: velocity.toFixed(2),
                    velocityOK: velocityExceedsThreshold,
                    bothOK: angleExceedsThreshold && velocityExceedsThreshold
                  });
                }

                if (angleExceedsThreshold && velocityExceedsThreshold) {
                  console.log('[HeadTracking] 🎯 GESTURE TRIGGERED!', {
                    angle: smoothedAngle.toFixed(2),
                    velocity: velocity.toFixed(2),
                    direction:
                      smoothedAngle > 0 ? 'RIGHT (next)' : 'LEFT (prev)'
                  });

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
        console.error('[HeadTracking] Pose detection error:', error);
        if (frameCount % 30 === 0) {
          console.error('[HeadTracking] Detector may have failed', {
            errorType: error instanceof Error ? error.name : typeof error,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            frameCount
          });
        }
      }

      // Target ~30 FPS (33ms per frame)
      animationId = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      console.log('[HeadTracking] Cleanup');
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
    setPoseDetected
    // Removed state.lastAngle, state.lastTimestamp, state.smoothingFilter
    // as they are internal state and shouldn't trigger re-runs
  ]);

  return { gestureLocked, poses, rollAngle: state.currentAngle };
}
