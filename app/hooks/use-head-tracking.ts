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
  smoothingFilter: SimpleMovingAverage;
  currentAngle: number;
  currentVelocity: number;
}

type TrackingAction =
  | {
      type: 'UPDATE_DISPLAY';
      payload: { angle: number; velocity: number };
    }
  | { type: 'RESET' };

function trackingReducer(
  state: TrackingState,
  action: TrackingAction
): TrackingState {
  switch (action.type) {
    case 'UPDATE_DISPLAY':
      return {
        ...state,
        currentAngle: action.payload.angle,
        currentVelocity: action.payload.velocity
      };
    case 'RESET':
      state.smoothingFilter.reset();
      return {
        ...state,
        currentAngle: 0,
        currentVelocity: 0
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
    smoothingFilter: new SimpleMovingAverage(3),
    currentAngle: 0,
    currentVelocity: 0
  });

  const [poses, setPoses] = useState<Pose[]>([]);
  const lastPageTurnRef = useRef<number>(0);
  const lastAngleRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);

  const { nextPage, prevPage, setPoseDetected } = usePerformanceStore();

  const { gestureAngleThreshold, gestureCooldown } = useSettingsStore();

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
            const timeDelta = now - lastTimestampRef.current;

            let velocity = 0;
            if (lastTimestampRef.current > 0 && timeDelta > 0) {
              velocity = calculateAngularVelocity(
                smoothedAngle,
                lastAngleRef.current,
                timeDelta
              );
            }

            if (frameCount % 30 === 0) {
              console.log('[HeadTracking] Gesture check', {
                smoothedAngle: smoothedAngle.toFixed(2),
                velocity: velocity.toFixed(2),
                angleThreshold: gestureAngleThreshold,
                lastTimestamp: lastTimestampRef.current,
                timeDelta
              });
            }

            // Check for gesture trigger - simple timestamp-based cooldown
            const angleExceedsThreshold =
              Math.abs(smoothedAngle) > gestureAngleThreshold;
            const timeSinceLastTurn = now - lastPageTurnRef.current;
            const canTurn = timeSinceLastTurn > gestureCooldown;

            if (angleExceedsThreshold && canTurn) {
              console.log('[HeadTracking] 🎯 GESTURE TRIGGERED!', {
                angle: smoothedAngle.toFixed(2),
                direction: smoothedAngle > 0 ? 'RIGHT (next)' : 'LEFT (prev)',
                timeSinceLastTurn
              });

              // Trigger page turn
              if (smoothedAngle > 0) {
                nextPage();
              } else {
                prevPage();
              }

              // Record timestamp
              lastPageTurnRef.current = now;
            }

            // Update refs for next iteration
            lastAngleRef.current = smoothedAngle;
            lastTimestampRef.current = now;

            // Update display values
            dispatch({
              type: 'UPDATE_DISPLAY',
              payload: { angle: smoothedAngle, velocity }
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
    };
  }, [
    detector,
    videoElement,
    enabled,
    gestureAngleThreshold,
    gestureCooldown,
    nextPage,
    prevPage,
    setPoseDetected
  ]);

  return {
    poses,
    rollAngle: state.currentAngle,
    velocity: state.currentVelocity
  };
}
