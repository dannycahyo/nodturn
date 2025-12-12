import { useCallback, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import type { Pose } from '~/types/pose';

const MIN_CONFIDENCE = 0.3;

interface WebcamFeedProps {
  onVideoReady: (videoElement: HTMLVideoElement | null) => void;
  poses?: Pose[];
  rollAngle?: number;
  threshold?: number;
  velocity?: number;
  velocityThreshold?: number;
}

export function WebcamFeed({
  onVideoReady,
  poses = [],
  rollAngle = 0,
  threshold = 20,
  velocity = 0,
  velocityThreshold = 30
}: WebcamFeedProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleUserMedia = useCallback(() => {
    console.log('[WebcamFeed] onUserMedia callback triggered');
    // Wait for stream to be ready before passing video element
    if (webcamRef.current?.video) {
      const video = webcamRef.current.video;
      console.log('[WebcamFeed] Video element found', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState
      });
      // Ensure video has valid dimensions before passing to detector
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        console.log('[WebcamFeed] Video ready immediately, calling onVideoReady');
        onVideoReady(video);
      } else {
        console.log('[WebcamFeed] Video dimensions not ready, waiting for loadedmetadata');
        // Wait for loadedmetadata event if dimensions not ready
        video.addEventListener('loadedmetadata', () => {
          console.log('[WebcamFeed] loadedmetadata event fired', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight
          });
          onVideoReady(video);
        }, { once: true });
      }
    } else {
      console.log('[WebcamFeed] No video element in webcamRef');
    }
  }, [onVideoReady]);

  // Draw keypoints and angle indicator continuously
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;

    if (!canvas || !video) {
      console.log('[WebcamFeed] Canvas or video not ready', { canvas: !!canvas, video: !!video });
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('[WebcamFeed] Failed to get canvas context');
      return;
    }

    console.log('[WebcamFeed] Canvas setup complete', {
      canvasSize: { width: canvas.width, height: canvas.height },
      videoSize: { width: video.videoWidth, height: video.videoHeight }
    });

    let animationId: number;
    let isDrawing = true;
    let frameCount = 0;

    const draw = () => {
      if (!isDrawing) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      frameCount++;
      if (frameCount % 30 === 0) {
        console.log('[WebcamFeed] Drawing frame', {
          posesCount: poses.length,
          rollAngle,
          threshold
        });
      }

      if (poses.length === 0) {
        // Draw "No pose detected" message
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.fillRect(10, 10, 160, 40);
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = 'white';
        ctx.fillText('No pose detected', 20, 35);

        animationId = requestAnimationFrame(draw);
        return;
      }

      const pose = poses[0];
      const keypoints = pose.keypoints;

      // Get scale factors
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;

      // Get keypoints by name
      const leftEar = keypoints.find(kp => kp.name === 'left_ear');
      const rightEar = keypoints.find(kp => kp.name === 'right_ear');
      const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
      const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');

      // Helper: Get color based on confidence score
      const getColor = (score?: number): string => {
        if (!score) return '#ef4444'; // red
        if (score > 0.5) return '#22c55e'; // green
        if (score > 0.3) return '#eab308'; // yellow
        return '#ef4444'; // red
      };

      // Helper: Draw keypoint
      const drawPoint = (point: { x: number; y: number; score?: number }, radius: number = 6) => {
        const x = canvas.width - (point.x * scaleX);
        const y = point.y * scaleY;
        const color = getColor(point.score);

        // Pulsing outer circle
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Main circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      };

      // Helper: Draw connection between two keypoints
      const drawConnection = (kp1?: { x: number; y: number; score?: number }, kp2?: { x: number; y: number; score?: number }) => {
        if (!kp1?.score || !kp2?.score || kp1.score < MIN_CONFIDENCE || kp2.score < MIN_CONFIDENCE) {
          return;
        }

        const x1 = canvas.width - (kp1.x * scaleX);
        const y1 = kp1.y * scaleY;
        const x2 = canvas.width - (kp2.x * scaleX);
        const y2 = kp2.y * scaleY;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#3b82f6'; // blue
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      };

      // Draw skeleton connections
      drawConnection(leftEar, rightEar); // Ear-to-ear
      drawConnection(leftShoulder, rightShoulder); // Shoulder-to-shoulder
      drawConnection(leftEar, leftShoulder); // Left ear to left shoulder
      drawConnection(rightEar, rightShoulder); // Right ear to right shoulder

      // Draw keypoints
      if (leftEar?.score && leftEar.score > MIN_CONFIDENCE) {
        drawPoint(leftEar, 8);
      }
      if (rightEar?.score && rightEar.score > MIN_CONFIDENCE) {
        drawPoint(rightEar, 8);
      }
      if (leftShoulder?.score && leftShoulder.score > MIN_CONFIDENCE) {
        drawPoint(leftShoulder, 7);
      }
      if (rightShoulder?.score && rightShoulder.score > MIN_CONFIDENCE) {
        drawPoint(rightShoulder, 7);
      }

      // Only draw angle indicator if ears are detected with good confidence
      if (leftEar?.score && leftEar.score > MIN_CONFIDENCE && rightEar?.score && rightEar.score > MIN_CONFIDENCE) {
        if (frameCount % 30 === 0) {
          console.log('[WebcamFeed] Drawing keypoints', { leftEar, rightEar, scaleX, scaleY });
        }

        // Draw simplified angle-based indicator
        const absAngle = Math.abs(rollAngle);
        const angleOK = absAngle > threshold;
        const direction = rollAngle > 0 ? '→ NEXT' : '← PREV';

        // Box with angle info
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(10, 10, 200, 110);

        // Angle value (large and prominent)
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = angleOK ? '#22c55e' : '#f59e0b';
        ctx.fillText(`${rollAngle.toFixed(1)}°`, 20, 40);

        // Threshold requirement
        ctx.font = '14px monospace';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText(`Need: ${threshold}°`, 20, 60);

        // Direction indicator - show when ready
        if (angleOK) {
          ctx.font = 'bold 24px monospace';
          ctx.fillStyle = '#22c55e';
          ctx.fillText(direction, 20, 90);
        } else {
          // Show hint
          ctx.font = '14px monospace';
          ctx.fillStyle = '#ef4444';
          ctx.fillText('Tilt your head!', 20, 90);
        }

        // Visual progress bar
        const barWidth = 170;
        const barHeight = 10;
        const barX = 20;
        const barY = 95;

        // Background bar
        ctx.fillStyle = '#374151';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Progress bar
        const angleProgress = Math.min(absAngle / threshold, 1.0);
        ctx.fillStyle = angleOK ? '#22c55e' : '#f59e0b';
        ctx.fillRect(barX, barY, barWidth * angleProgress, barHeight);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      isDrawing = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [poses, rollAngle, threshold]);

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-background/95 backdrop-blur rounded-lg shadow-lg overflow-hidden border relative">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: 'user',
            width: 640,
            height: 480,
          }}
          onUserMedia={handleUserMedia}
          className="w-48 h-36 object-cover"
          mirrored
        />
        <canvas
          ref={canvasRef}
          width={192}
          height={144}
          className="absolute inset-0 w-48 h-36 pointer-events-none"
        />
      </div>
    </div>
  );
}
