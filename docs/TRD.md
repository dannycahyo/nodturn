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
4.  **Processing (AI):** The `face-landmarks-detection` model tracks the user's head orientation (yaw, pitch, roll) in real-time.
5.  **Logic:** The "Gesture Engine" analyzes the head movement history. If a sharp "tilt" or "turn" is detected, it triggers a state change.
6.  **Output:** The state change updates the `pageNumber` in the PDF Viewer, instantly rendering the next or previous page.

### **3. Technology Stack**

| Category          | Technology          | Package Name                                  | Justification                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| :---------------- | :------------------ | :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Framework**     | React Router v7     | `react-router-dom`                            | V7 is chosen for its modern data loading APIs and route-centric design, perfect for managing the Library vs. Performance views.                                                                                                                                                                                                                                                                                                                         |
| **PDF Rendering** | React PDF           | `react-pdf`                                   | The standard for rendering PDFs in React. It uses `pdf.js` under the hood to render pages to `<canvas>`.                                                                                                                                                                                                                                                                                                                                                |
| **AI Core**       | TensorFlow.js       | `@tensorflow/tfjs`                            | Core ML library.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **AI Model**      | MediaPipe Face Mesh | `@tensorflow-models/face-landmarks-detection` | **Critical Selection:** We chose this over Pose Detection because: (1) Face Mesh provides reliable head orientation even when the musician's body is partially out of frame, (2) it works well in varying lighting conditions typical of performance settings, (3) while it provides 468 landmarks, we only use 3 key points (nose, ears) but benefit from the model's robustness and the ability to add facial expression triggers in future versions. |
| **Styling**       | Tailwind CSS        | `tailwindcss`                                 | Utility-first styling.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **UI Components** | Shadcn/ui           | `shadcn-ui`                                   | For accessible, high-quality UI elements (Sliders, Dialogs, Cards).                                                                                                                                                                                                                                                                                                                                                                                     |
| **State**         | Zustand             | `zustand`                                     | Lightweight state management for global settings (sensitivity, dark mode) and session state (current page, total pages).                                                                                                                                                                                                                                                                                                                                |
| **Storage**       | IDB-Keyval          | `idb-keyval`                                  | A promise-based wrapper for IndexedDB. LocalStorage is too small for storing PDF files; IndexedDB allows us to save the user's library locally.                                                                                                                                                                                                                                                                                                         |

### **4. Key Technical Components**

#### **4.1. The "Music Stand" (PDF Viewer)**

This is the central performance view (`routes/perform.tsx`).

- **PDF Worker:** To prevent UI freezing, `pdf.js` worker will be loaded from a CDN or a local static file.
- **Virtualization:** Since some music scores can be 50+ pages, rendering them all at once will crash the browser. We will render only the `currentPage`, `currentPage + 1` (for buffering), and `currentPage - 1`.
- **Two-Page View:** When enabled, the viewer renders `currentPage` and `currentPage + 1` side-by-side using CSS Grid (`grid-template-columns: 1fr 1fr`). Page turns advance by 2 pages at a time. The view automatically switches to single-page on screens narrower than 1024px.
- **Color Inversion filter:** For "Dark Mode," we will not change the PDF itself. Instead, we will apply a CSS filter to the canvas container: `filter: invert(1) hue-rotate(180deg);`. This turns black notes on white paper into white notes on black paper instantly.

#### **4.2. The Gesture Engine (Head Tracking)**

This logic runs inside a `useHeadTracking` custom hook.

- **Keypoints Used:** We don't need all 468 points. We track specific landmarks to determine orientation:
  - **Nose Tip:** Index 1
  - **Left Ear/Cheek:** Index 234
  - **Right Ear/Cheek:** Index 454
- **Gesture Algorithms:**
  - **Head Tilt (Roll):** Calculated by the angle of the line connecting the two ear/cheek points relative to the horizon.
    - **Angle Threshold:** `IF angle > +20 degrees` AND **Velocity Threshold:** `IF angular_velocity > 100 degrees/second` → Trigger **Next Page**.
    - **Angle Threshold:** `IF angle < -20 degrees` AND **Velocity Threshold:** `IF angular_velocity > 100 degrees/second` → Trigger **Previous Page**.
    - **Angular velocity** is calculated as: `(current_angle - previous_angle) / time_delta`
    - Both conditions must be met simultaneously to prevent false positives from natural body swaying.
  - **Head Turn (Yaw):** (Optional/Configurable) Calculated by the horizontal distance of the nose tip relative to the center of the cheeks.
- **Smoothing & Debouncing:**
  - **SMA (Simple Moving Average):** Raw AI data is jittery. We will average the last **2-3 frames** to smooth the movement while maintaining low latency.
  - **Latency Budget:** At 25-30 FPS detection rate (33-40ms per frame), with 2-3 frame smoothing (66-120ms), total detection latency stays well under the 200ms requirement.
  - **Cooldown:** After a page turn is triggered, the system enters a "LOCKED" state for 1500ms (configurable). A visual lock icon appears on screen.

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

- **Model Loading:** The MediaPipe Face Mesh model is large (\~10MB+). It should be loaded **once** when the app starts (or lazily when the user enters "Perform" mode) and stored in memory. A global loading context will manage this.
- **GPU Acceleration:** TensorFlow.js must be configured to use the WebGL backend (`tf.setBackend('webgl')`) to ensure the inference runs on the GPU, keeping the CPU free for rendering the PDF.
- **Frame Rate Throttling:** We will throttle the detection loop to **25-30 FPS** (33-40ms per frame). This provides responsive detection while staying well under the 200ms latency requirement, and reduces battery drain on laptops.

### **6. Error Handling**

- **"No Face Detected":** If the musician leans too far back or off-camera, the tracking status indicator turns Red. A discreet toast message says "Face lost - Check lighting."
- **PDF Corrupt:** If a PDF fails to parse, show a Shadcn `<Alert>` and allow the user to remove the file from the library.
- **Camera Permission:** If denied, the app defaults to "Manual Mode" (Arrow keys active) and disables the AI toggle switch in the UI.
