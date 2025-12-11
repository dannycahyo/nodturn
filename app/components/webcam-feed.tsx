import { useCallback, useRef } from 'react';
import Webcam from 'react-webcam';

interface WebcamFeedProps {
  onVideoReady: (videoElement: HTMLVideoElement | null) => void;
}

export function WebcamFeed({ onVideoReady }: WebcamFeedProps) {
  const webcamRef = useRef<Webcam>(null);

  const handleUserMedia = useCallback(() => {
    // Wait for stream to be ready before passing video element
    if (webcamRef.current?.video) {
      const video = webcamRef.current.video;
      // Ensure video has valid dimensions before passing to detector
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        onVideoReady(video);
      } else {
        // Wait for loadedmetadata event if dimensions not ready
        video.addEventListener('loadedmetadata', () => {
          onVideoReady(video);
        }, { once: true });
      }
    }
  }, [onVideoReady]);

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-background/95 backdrop-blur rounded-lg shadow-lg overflow-hidden border">
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
        />
      </div>
    </div>
  );
}
