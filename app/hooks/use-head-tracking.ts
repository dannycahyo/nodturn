import { useEffect, useRef, useReducer, useState } from 'react';
import type { PoseDetector, Pose } from '~/types/pose';
import { usePerformanceStore } from '~/stores/performance-store';
import { useSettingsStore } from '~/stores/settings-store';
import {
  calculateRollAngle,
  calculateAngularVelocity,
  SimpleMovingAverage,
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
  action: TrackingAction,
): TrackingState {
  switch (action.type) {
    case 'UPDATE_DISPLAY':
      return {
        ...state,
        currentAngle: action.payload.angle,
        currentVelocity: action.payload.velocity,
      };
    case 'RESET':
      state.smoothingFilter.reset();
      return {
        ...state,
        currentAngle: 0,
        currentVelocity: 0,
      };
    default:
      return state;
  }
}

export function useHeadTracking(
  detector: PoseDetector | null,
  videoElement: HTMLVideoElement | null,
  enabled: boolean,
) {
  const [state, dispatch] = useReducer(trackingReducer, {
    smoothingFilter: new SimpleMovingAverage(5),
    currentAngle: 0,
    currentVelocity: 0,
  });

  const [poses, setPoses] = useState<Pose[]>([]);
  const lastPageTurnRef = useRef<number>(0);
  const lastAngleRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const thresholdExceededAtRef = useRef<number>(0);
  const pendingDirectionRef = useRef<'left' | 'right' | null>(null);
  const neutralAngleRef = useRef<number | null>(null);
  const neutralCalibrationFrames = useRef<number[]>([]);

  const { nextPage, prevPage, setPoseDetected } =
    usePerformanceStore();

  const {
    gestureAngleThreshold,
    gestureCooldown,
    gestureHoldDuration,
  } = useSettingsStore();

  useEffect(() => {
    console.log('[HeadTracking] Effect triggered', {
      detector: !!detector,
      videoElement: !!videoElement,
      enabled,
      videoReady: videoElement
        ? `${videoElement.videoWidth}x${videoElement.videoHeight}`
        : 'N/A',
    });

    if (!detector || !videoElement || !enabled) {
      setPoseDetected(false);
      setPoses([]);
      console.log(
        '[HeadTracking] Conditions not met, stopping detection',
      );
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
      videoCurrentTime: videoElement.currentTime,
    });

    const detect = async () => {
      if (!isDetecting) return;

      try {
        const detectedPoses = await detector.estimatePoses(
          videoElement,
          {
            flipHorizontal: false,
          },
        );
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
              currentTime: videoElement.currentTime,
            },
            detectorWorking: detectedPoses !== undefined,
            firstPoseData:
              detectedPoses.length > 0
                ? {
                    keypointsCount: detectedPoses[0].keypoints.length,
                    score: detectedPoses[0].score,
                  }
                : null,
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
                  'Check if upper body is visible in webcam preview',
                ],
              },
            );
          }
        } else {
          setPoseDetected(true);

          const keypoints = detectedPoses[0].keypoints;

          // Get ear positions (keypoints by name: 7 = left_ear, 8 = right_ear)
          const leftEar = keypoints.find(
            (kp) => kp.name === 'left_ear',
          );
          const rightEar = keypoints.find(
            (kp) => kp.name === 'right_ear',
          );

          // Check confidence and existence
          if (
            leftEar?.score &&
            leftEar.score > MIN_CONFIDENCE &&
            rightEar?.score &&
            rightEar.score > MIN_CONFIDENCE
          ) {
            const rawAngle = calculateRollAngle(leftEar, rightEar);
            const smoothedAngle = state.smoothingFilter.add(rawAngle);

            // Calibrate neutral angle using first 30 frames
            if (neutralAngleRef.current === null) {
              neutralCalibrationFrames.current.push(smoothedAngle);

              if (neutralCalibrationFrames.current.length >= 30) {
                // Calculate average of calibration frames
                const sum = neutralCalibrationFrames.current.reduce(
                  (a, b) => a + b,
                  0,
                );
                neutralAngleRef.current =
                  sum / neutralCalibrationFrames.current.length;
                console.log(
                  '[HeadTracking] Neutral angle calibrated:',
                  {
                    neutralAngle: neutralAngleRef.current.toFixed(2),
                    samples: neutralCalibrationFrames.current.length,
                  },
                );
              }
            }

            if (frameCount % 30 === 0) {
              console.log('[HeadTracking] Angle calculated', {
                rawAngle: rawAngle.toFixed(2),
                smoothedAngle: smoothedAngle.toFixed(2),
                neutralAngle:
                  neutralAngleRef.current?.toFixed(2) ||
                  'calibrating',
                leftEar,
                rightEar,
              });
            }

            const now = Date.now();
            const timeDelta = now - lastTimestampRef.current;

            let velocity = 0;
            if (lastTimestampRef.current > 0 && timeDelta > 0) {
              velocity = calculateAngularVelocity(
                smoothedAngle,
                lastAngleRef.current,
                timeDelta,
              );
            }

            if (frameCount % 30 === 0) {
              console.log('[HeadTracking] Gesture check', {
                smoothedAngle: smoothedAngle.toFixed(2),
                velocity: velocity.toFixed(2),
                angleThreshold: gestureAngleThreshold,
                lastTimestamp: lastTimestampRef.current,
                timeDelta,
              });
            }

            // Check for sustained gesture trigger (only after calibration)
            if (neutralAngleRef.current !== null) {
              // Calculate deviation from neutral (accounting for -180/180 wraparound)
              const calculateAngularDeviation = (
                current: number,
                neutral: number,
              ): number => {
                let diff = current - neutral;
                // Normalize to [-180, 180]
                while (diff > 180) diff -= 360;
                while (diff < -180) diff += 360;
                return diff;
              };

              const deviation = calculateAngularDeviation(
                smoothedAngle,
                neutralAngleRef.current,
              );
              const absDeviation = Math.abs(deviation);

              // Add dead zone: small movements near neutral don't count
              // This allows natural micro-movements while reading without triggering
              const DEAD_ZONE = 15; // degrees - ignore movements within this range
              const isInDeadZone = absDeviation <= DEAD_ZONE;

              const angleExceedsThreshold =
                absDeviation > gestureAngleThreshold;
              const currentDirection =
                deviation > 0 ? 'right' : 'left';

              if (frameCount % 30 === 0) {
                console.log('[HeadTracking] Gesture check', {
                  smoothedAngle: smoothedAngle.toFixed(2),
                  neutralAngle: neutralAngleRef.current.toFixed(2),
                  deviation: deviation.toFixed(2),
                  absDeviation: absDeviation.toFixed(2),
                  threshold: gestureAngleThreshold,
                  deadZone: DEAD_ZONE,
                  isInDeadZone,
                  exceeds: angleExceedsThreshold,
                });
              }

              // Reset pending gesture if user returns to dead zone
              if (isInDeadZone) {
                thresholdExceededAtRef.current = 0;
                pendingDirectionRef.current = null;
              }

              if (angleExceedsThreshold) {
                // Check if same direction or new direction
                if (
                  pendingDirectionRef.current === currentDirection
                ) {
                  // Same direction - check if held long enough
                  const holdTime =
                    now - thresholdExceededAtRef.current;
                  const timeSinceLastTurn =
                    now - lastPageTurnRef.current;

                  if (
                    holdTime >= gestureHoldDuration &&
                    timeSinceLastTurn > gestureCooldown
                  ) {
                    console.log(
                      '[HeadTracking] 🎯 SUSTAINED GESTURE TRIGGERED!',
                      {
                        angle: smoothedAngle.toFixed(2),
                        direction: currentDirection,
                        holdTime,
                        timeSinceLastTurn,
                      },
                    );

                    // Trigger page turn
                    if (currentDirection === 'right') {
                      nextPage();
                    } else {
                      prevPage();
                    }

                    // Reset and record
                    lastPageTurnRef.current = now;
                    thresholdExceededAtRef.current = 0;
                    pendingDirectionRef.current = null;
                  }
                  // else: still holding, wait for full duration
                } else {
                  // New direction - restart timer
                  thresholdExceededAtRef.current = now;
                  pendingDirectionRef.current = currentDirection;
                }
              } else {
                // Below threshold - reset pending state
                thresholdExceededAtRef.current = 0;
                pendingDirectionRef.current = null;
              }
            }

            // Update refs for next iteration
            lastAngleRef.current = smoothedAngle;
            lastTimestampRef.current = now;

            // Update display values
            dispatch({
              type: 'UPDATE_DISPLAY',
              payload: { angle: smoothedAngle, velocity },
            });
          }
        }
      } catch (error) {
        console.error('[HeadTracking] Pose detection error:', error);
        if (frameCount % 30 === 0) {
          console.error('[HeadTracking] Detector may have failed', {
            errorType:
              error instanceof Error ? error.name : typeof error,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            frameCount,
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
    gestureHoldDuration,
    nextPage,
    prevPage,
    setPoseDetected,
    state.smoothingFilter,
  ]);

  return {
    poses,
    rollAngle: state.currentAngle,
    velocity: state.currentVelocity,
  };
}
