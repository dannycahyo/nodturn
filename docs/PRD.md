### **Product Requirement Document (PRD): NodTurn 🎼**

**Version:** 1.0
**Date:** December 11, 2025
**Author:** Danny Dwi Cahyono

---

### **1. Introduction & Vision**

**NodTurn** is a specialized, browser-based sheet music reader designed for musicians. It utilizes computer vision to enable hands-free page turning, allowing performers to focus entirely on their instrument without losing their flow to flip a physical page or swipe a screen.

**The Vision:** To eliminate the "page-turn gap" in musical performance. Whether practicing at home or performing on stage, NodTurn provides the utility of a Bluetooth pedal without the hardware, using the webcam to detect subtle, intentional gestures that seamlessly advance the music.

---

### **2. Target Audience**

- **Pianists & Keyboardists:** Musicians whose hands are constantly occupied and cannot spare a hand to turn a page.
- **Guitarists & String Players:** Performers holding instruments who find it disruptive to let go of the neck or bow to swipe a tablet.
- **Wind Instrumentalists:** Musicians who often have brief rests but need to maintain instrument posture.
- **Music Students:** Learners who need to practice uninterrupted repetitions of long pieces.

---

### **3. User Goals & Problems**

| User Goal                                                   | Problem Solved                                                                                                                                  |
| :---------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| "I need to keep playing without stopping to turn the page." | **Problem:** Turning a physical page or swiping a tablet requires removing a hand from the instrument, breaking the musical phrasing and tempo. |
| "I don't want to buy expensive Bluetooth pedals."           | **Problem:** Bluetooth page-turner pedals (like PageFlip) are expensive ($100+) and are just another piece of gear to carry and charge.         |
| "I have all my music in PDF format."                        | **Problem:** Physical binders are heavy and disorganized. Musicians need a digital way to organize and read their existing PDF library.         |
| "I play on dark stages."                                    | **Problem:** Standard white PDF backgrounds can be blinding in low-light environments.                                                          |

---

### **4. Features & Scope (Minimum Viable Product - MVP)**

The MVP focuses on the core utility: **Loading Music** and **Hands-Free Control.**

| Feature ID | Feature Name                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| :--------- | :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FE-01**  | **PDF Sheet Music Import**    | Users can drag and drop PDF files from their local device into the library. The app parses and renders these files ready for display.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **FE-02**  | **The "Music Stand" Viewer**  | A dedicated view for performance. It displays the sheet music in full height. It must support **Single Page** and **Two-Page** (side-by-side) view modes.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **FE-03**  | **Head Tilt Gesture**         | _Critical for pianists._ A deliberate, sustained **Head Tilt** triggers page turns. The system first calibrates to your natural head position (30 frames), then detects intentional tilts. **Right tilt** turns to the **previous page**, and **left tilt** advances to the **next page** (reversed for ergonomic reasons). The gesture requires: (1) angle deviation >45° from neutral, (2) sustained hold for 800ms, (3) minimum 30°/sec velocity, and (4) a 15° dead zone ignores natural micro-movements. This prevents false triggers from body swaying while allowing reliable hands-free control. |
| **FE-05**  | **Visual Metronome**          | A simple, silent pulsing visual indicator (a flashing dot or border) to help the musician keep time without an audio click track.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **FE-05**  | **Gesture "Lock" / Cooldown** | To prevent accidental double-turns, the gesture recognition locks for 1.5 seconds after a successful turn. A visual icon indicates when the "sensor" is ready again.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **FE-06**  | **Invert Colors (Dark Mode)** | A toggle to invert the colors of the PDF (black background, white notes). This reduces eye strain and stage glare.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

---

### **5. User Flow**

1.  **Library Access:** The user opens NodTurn and sees their "Gig Bag" (Library).
2.  **Import:** The user clicks "Add Music" and uploads _Beethoven_Sonata_No14.pdf_.
3.  **Setup:** The user clicks the file to open the "Music Stand" view.
4.  **Enable Tracking:** The user toggles on gesture control. The webcam activates and begins automatic calibration.
5.  **Calibration:** The system silently calibrates to the user's neutral head position over the first second (30 frames). A pose detection indicator shows tracking status.
6.  **Performance:** The user places their laptop/tablet on the piano music rest and begins playing.
7.  **Page Turn:** As they reach the bottom of a page, they deliberately tilt their head left and hold for ~1 second. The page smoothly advances to the next page.
8.  **End:** The performance finishes. The user presses `Esc` or uses the navigation controls to return to the library.

---

### **6. Technical Considerations (Constraint Checklist)**

- **Latency:** The system provides responsive page turns through a multi-stage detection pipeline: ~33ms per frame at 30 FPS, 5-frame smoothing (~165ms), plus 800ms sustained hold verification ensures intentional gestures while filtering false positives.
- **False Positives:** The system strictly differentiates between natural movement and intentional commands through multiple safeguards:
  - **Neutral Calibration:** First 30 frames establish baseline head position
  - **Dead Zone:** ±15° around neutral ignores natural micro-movements
  - **Angle threshold:** Minimum 45° deviation from neutral position (configurable)
  - **Sustained Hold:** Must maintain tilt for 800ms before triggering (configurable)
  - **Velocity threshold:** Minimum 30°/sec ensures deliberate movement (configurable)
  - **Cooldown period:** 1.5 seconds between accepted gestures prevents double-triggers
- **PDF Rendering:** Large PDFs are handled efficiently using `react-pdf` with canvas-based rendering. Pages are virtualized (current, next, and previous only) to prevent memory issues with lengthy scores.

---

### **7. Future Scope (Post-MVP)**

- **Setlists:** Grouping multiple PDFs into an ordered list for a full concert performance.
- **Annotations:** Allowing users to use a stylus or mouse to draw markings (e.g., fingering, dynamics) on the score.
- **Audio-Triggered Turning:** Using the microphone to "listen" to the music and automatically turn the page when it recognizes the notes at the end of the page (Score Following). _This is technically complex but the "holy grail" of features._
