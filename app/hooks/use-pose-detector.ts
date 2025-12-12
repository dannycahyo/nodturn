import { useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

export function usePoseDetector() {
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadModel() {
      try {
        console.log('[PoseDetector] Starting model load...');
        // Set backend to WebGL for GPU acceleration
        await tf.setBackend('webgl');
        console.log('[PoseDetector] TensorFlow backend set to webgl');
        await tf.ready();
        console.log('[PoseDetector] TensorFlow ready');

        const model = poseDetection.SupportedModels.MoveNet;

        // Use MoveNet Lightning (fastest variant for real-time)
        const detectorConfig: poseDetection.MoveNetModelConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        };

        console.log(
          '[PoseDetector] Creating detector with config:',
          detectorConfig
        );
        const poseDetector = await poseDetection.createDetector(
          model,
          detectorConfig
        );

        // Test detector immediately after creation
        console.log('[PoseDetector] Testing detector...', {
          detectorType: typeof poseDetector,
          hasEstimateMethod: typeof poseDetector.estimatePoses === 'function'
        });
        console.log('[PoseDetector] Detector created successfully');

        if (mounted) {
          setDetector(poseDetector);
          setIsLoading(false);
          console.log('[PoseDetector] ✅ Model loaded and ready');
        }
      } catch (err) {
        console.error(
          '[PoseDetector] ❌ Failed to load pose detection model:',
          err
        );
        if (mounted) {
          setError(
            'Failed to load pose tracking model. Please refresh the page.'
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
