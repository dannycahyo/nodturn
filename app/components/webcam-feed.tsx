import { useCallback } from 'react';
import Webcam from 'react-webcam';

interface WebcamFeedProps {
  onVideoReady: (videoElement: HTMLVideoElement | null) => void;
}

export function WebcamFeed({ onVideoReady }: WebcamFeedProps) {
  const webcamRef = useCallback(
    (node: Webcam | null) => {
      if (node?.video) {
        onVideoReady(node.video);
      } else {
        onVideoReady(null);
      }
    },
    [onVideoReady]
  );

  return (
    <Webcam
      ref={webcamRef}
      audio={false}
      screenshotFormat="image/jpeg"
      videoConstraints={{
        facingMode: 'user',
        width: 640,
        height: 480,
      }}
      style={{
        position: 'absolute',
        opacity: 0,
        pointerEvents: 'none',
        width: 1,
        height: 1,
      }}
    />
  );
}
