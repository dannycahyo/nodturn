import { useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

export function usePoseDetector() {
  const [detector, setDetector] =
    useState<poseDetection.PoseDetector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadModel() {
      try {
        // Set backend to WebGL for GPU acceleration
        await tf.setBackend('webgl');
        await tf.ready();

        const model = poseDetection.SupportedModels.MoveNet;

        // Use MoveNet Lightning (fastest variant for real-time)
        const detectorConfig: poseDetection.MoveNetModelConfig = {
          modelType:
            poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        };

        const poseDetector = await poseDetection.createDetector(
          model,
          detectorConfig,
        );

        if (mounted) {
          setDetector(poseDetector);
          setIsLoading(false);
        }
      } catch (err) {
        console.error(
          '[PoseDetector] ❌ Failed to load pose detection model:',
          err,
        );
        if (mounted) {
          setError(
            'Failed to load pose tracking model. Please refresh the page.',
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
