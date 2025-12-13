Here is the Technical Requirement Document (TRD) for **ScoreFlow**, tailored to the tech stack and specific musician-focused features.

---

### **Technical Requirement Document (TRD): ScoreFlow**

**Version:** 1.0
**Date:** December 11, 2025
**Related PRD:** 1.0

### **1. Introduction**

This document defines the technical architecture, technology stack, and implementation details for **ScoreFlow**. The application is a client-side Single Page Application (SPA) designed to render PDF sheet music and control page navigation using real-time computer vision (specifically Face Landmark Detection) to enable hands-free operation for musicians.

### **2. System Architecture**

The application follows a modular, client-side architecture. No backend server is required for the core functionality; all PDF parsing and AI inference happen locally in the user's browser.

**Data Flow:**

1.  **Input (File):** User drags a PDF file into the application.
2.  **Processing (PDF):** The PDF is parsed and rendered into high-quality HTML5 Canvas elements.
3.  **Input (Video):** The webcam feeds video frames to the TensorFlow.js engine.
4.  **Processing (AI):** The `pose-detection` model tracks the user's head orientation.
5.  **Logic:** The "Gesture Engine" analyzes the head movement history. If a sharp "tilt" or "turn" is detected, it triggers a state change.
6.  **Output:** The state change updates the `pageNumber` in the PDF Viewer, instantly rendering the next or previous page.

### **3. Technology Stack**

| Category          | Technology        | Package Name                        | Justification                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| :---------------- | :---------------- | :---------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**     | React Router v7   | `react-router-dom`                  | V7 is chosen for its modern data loading APIs and route-centric design, perfect for managing the Library vs. Performance views.                                                                                                                                                                                                                                                                                                                                 |
| **PDF Rendering** | React PDF         | `react-pdf`                         | The standard for rendering PDFs in React. It uses `pdf.js` under the hood to render pages to `<canvas>`.                                                                                                                                                                                                                                                                                                                                                        |
| **AI Core**       | TensorFlow.js     | `@tensorflow/tfjs`                  | Core ML library.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **AI Model**      | MoveNet Lightning | `@tensorflow-models/pose-detection` | **Critical Selection:** We chose MoveNet SinglePose Lightning because: (1) It's optimized for real-time performance on single-person scenarios, which is perfect for solo musicians, (2) provides reliable upper body tracking including ear positions for head tilt detection, (3) lightweight model (~12MB) loads quickly and runs efficiently at 30 FPS on standard hardware, (4) works well in varying lighting conditions typical of performance settings. |
| **Styling**       | Tailwind CSS      | `tailwindcss`                       | Utility-first styling.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **UI Components** | Shadcn/ui         | `shadcn-ui`                         | For accessible, high-quality UI elements (Sliders, Dialogs, Cards).                                                                                                                                                                                                                                                                                                                                                                                             |
| **State**         | Zustand           | `zustand`                           | Lightweight state management for global settings (sensitivity, dark mode) and session state (current page, total pages).                                                                                                                                                                                                                                                                                                                                        |
| **Storage**       | IDB-Keyval        | `idb-keyval`                        | A promise-based wrapper for IndexedDB. LocalStorage is too small for storing PDF files; IndexedDB allows us to save the user's library locally.                                                                                                                                                                                                                                                                                                                 |

### **4. Key Technical Components**

#### **4.1. The "Music Stand" (PDF Viewer)**

This is the central performance view (`routes/perform.tsx`).

- **PDF Worker:** To prevent UI freezing, `pdf.js` worker will be loaded from a CDN or a local static file.
- **Virtualization:** Since some music scores can be 50+ pages, rendering them all at once will crash the browser. We will render only the `currentPage`, `currentPage + 1` (for buffering), and `currentPage - 1`.
- **Two-Page View:** When enabled, the viewer renders `currentPage` and `currentPage + 1` side-by-side using CSS Grid (`grid-template-columns: 1fr 1fr`). Page turns advance by 2 pages at a time. The view automatically switches to single-page on screens narrower than 1024px.
- **Color Inversion filter:** For "Dark Mode," we will not change the PDF itself. Instead, we will apply a CSS filter to the canvas container: `filter: invert(1) hue-rotate(180deg);`. This turns black notes on white paper into white notes on black paper instantly.

#### **4.2. The Gesture Engine (Head Tracking)**

This logic runs inside a `useHeadTracking` custom hook.

- **Keypoints Used:** MoveNet provides 17 body keypoints. We track specific landmarks to determine head orientation:
  - **Left Ear:** keypoint name 'left_ear' (index 3)
  - **Right Ear:** keypoint name 'right_ear' (index 4)
  - **Minimum Confidence:** 0.3 threshold for reliable detection
- **Gesture Algorithms:**
  - **Head Tilt (Roll):** Calculated by the angle of the line connecting the two ear points relative to the horizon.
    - **Neutral Calibration:** First 30 frames (1 second) establish the user's neutral head position
    - **Dead Zone:** ±15° around neutral to ignore natural micro-movements while reading
    - **Angle Threshold:** Deviation > 45° from neutral position (configurable)
    - **Sustained Hold:** User must maintain the tilt for 800ms before triggering (configurable)
    - **Velocity Threshold:** Minimum 30°/sec movement speed (configurable, reduced to allow deliberate slow tilts)
    - **Direction Logic:** Right tilt (positive angle) = **Previous Page**, Left tilt (negative angle) = **Next Page** (intentionally reversed for ergonomic reasons)
    - **Angular velocity** is calculated as: `abs(current_angle - previous_angle) / time_delta_in_seconds`
  - **Head Turn (Yaw):** (Optional/Configurable) Calculated by the horizontal distance of the nose tip relative to the center of the cheeks.
- **Smoothing & Debouncing:**
  - **SMA (Simple Moving Average):** Raw AI data is jittery. We average the last **5 frames** to smooth the movement while maintaining low latency.
  - **Latency Budget:** At 30 FPS detection rate (~33ms per frame), with 5-frame smoothing (~165ms) plus 800ms sustained hold requirement, intentional gestures are detected reliably while accidental movements are filtered out.
  - **Cooldown:** After a page turn is triggered, the system enters a "LOCKED" state for 1500ms (configurable). During cooldown, no new gestures are processed.
  - **Hold Duration:** The tilt must be sustained for 800ms (configurable) to trigger a page turn, preventing false positives from quick head movements or body swaying during performance.

#### **4.3. Visual Metronome**

A non-intrusive timing aid displayed during performance (`routes/perform.tsx`).

- **UI Element:** A small circular indicator (16-24px diameter) positioned in a corner of the screen.
- **Animation:** Pulsing opacity animation (0.3 → 1.0 → 0.3) timed to the BPM set by the user.
- **Implementation:** CSS animation with `animation-duration` calculated as `60000ms / BPM`.
- **Controls:**
  - BPM selector (30-240 range) via Shadcn slider component
  - Toggle on/off switch
  - Position selector (4 corners) to avoid obscuring music
- **State:** BPM and enabled state stored in Zustand global store, persisted to localStorage.

#### **4.4. Library Management (IndexedDB)**

- When a user drops a PDF, it is not uploaded to a cloud.
- The file `Blob` is stored directly in the browser's **IndexedDB** using `idb-keyval`.
- Metadata (Title, Composer, Page Count) is extracted and stored alongside the blob.
- This ensures the user's sheet music is available offline and persists between sessions.

### **5. Performance & Optimization**

- **Model Loading:** The MoveNet Lightning model (~12MB) is loaded once when entering "Perform" mode using the `usePoseDetector` hook. The detector is initialized and stored in memory for the session, then properly disposed on unmount to prevent memory leaks.
- **GPU Acceleration:** TensorFlow.js is configured to use the WebGL backend (`tf.setBackend('webgl')`) to ensure the inference runs on the GPU, keeping the CPU free for rendering the PDF.
- **Frame Rate:** The detection loop runs via `requestAnimationFrame`, achieving approximately **30 FPS** (~33ms per frame). Combined with 5-frame smoothing and sustained hold detection, this provides reliable gesture recognition while minimizing battery drain.

### **6. Error Handling**

- **"No Pose Detected":** If the musician moves out of frame, the tracking status indicator shows no pose detected. After 3 seconds (90 frames) without detection, troubleshooting tips are logged to console including: move closer to camera, ensure good lighting, face camera directly, check if upper body is visible.
- **PDF Corrupt:** If a PDF fails to parse, an error message is displayed with specific guidance based on error type (worker failed, invalid PDF, etc.), and the user can remove the file from the library.
- **Camera Permission:** If denied, gesture tracking cannot be enabled. Manual keyboard controls (arrow keys, page up/down) remain available as fallback.
