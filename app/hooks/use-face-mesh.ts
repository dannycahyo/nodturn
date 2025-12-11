import { useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

export function useFaceMesh() {
  const [detector, setDetector] =
    useState<faceLandmarksDetection.FaceLandmarksDetector | null>(
      null,
    );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadModel() {
      try {
        // Set backend to WebGL for GPU acceleration
        await tf.setBackend('webgl');
        await tf.ready();

        const model =
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;

        // Use tfjs runtime instead of mediapipe for better stability
        const detectorConfig: faceLandmarksDetection.MediaPipeFaceMeshTfjsModelConfig =
          {
            runtime: 'tfjs',
            refineLandmarks: false,
            maxFaces: 1, // Only track one face for better performance
          };

        const faceDetector =
          await faceLandmarksDetection.createDetector(
            model,
            detectorConfig,
          );

        if (mounted) {
          setDetector(faceDetector);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load face mesh model:', err);
        if (mounted) {
          setError(
            'Failed to load face tracking model. Please refresh the page.',
          );
          setIsLoading(false);
        }
      }
    }
    loadModel();

    return () => {
      mounted = false;
      // Cleanup detector on unmount
      if (detector) {
        detector.dispose();
      }
    };
  }, []);

  return { detector, isLoading, error };
}
