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

| Feature ID | Feature Name                  | Description                                                                                                                                                                                                                                                                                                                 |
| :--------- | :---------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FE-01**  | **PDF Sheet Music Import**    | Users can drag and drop PDF files from their local device into the library. The app parses and renders these files ready for display.                                                                                                                                                                                       |
| **FE-02**  | **The "Music Stand" Viewer**  | A dedicated view for performance. It displays the sheet music in full height. It must support **Single Page** and **Two-Page** (side-by-side) view modes.                                                                                                                                                                   |
| **FE-03**  | **Head Tilt Gesture**         | _Critical for pianists._ A quick, intentional **Head Tilt (Right)** turns the page forward, and **Head Tilt (Left)** turns it back. The gesture requires both sufficient angle (>20°) and velocity (>100°/sec) to prevent false triggers from natural swaying. This allows page turns even when both hands are on the keys. |
| **FE-05**  | **Visual Metronome**          | A simple, silent pulsing visual indicator (a flashing dot or border) to help the musician keep time without an audio click track.                                                                                                                                                                                           |
| **FE-05**  | **Gesture "Lock" / Cooldown** | To prevent accidental double-turns, the gesture recognition locks for 1.5 seconds after a successful turn. A visual icon indicates when the "sensor" is ready again.                                                                                                                                                        |
| **FE-06**  | **Invert Colors (Dark Mode)** | A toggle to invert the colors of the PDF (black background, white notes). This reduces eye strain and stage glare.                                                                                                                                                                                                          |

---

### **5. User Flow**

1.  **Library Access:** The user opens NodTurn and sees their "Gig Bag" (Library).
2.  **Import:** The user clicks "Add Music" and uploads _Beethoven_Sonata_No14.pdf_.
3.  **Setup:** The user clicks the file to open the "Music Stand" view.
4.  **Calibration:** A brief modal appears: "Choose your trigger." The user selects **"Head Tilt"** (since they are playing piano). The webcam turns on, and a small indicator shows the tracking status of their nose/head position.
5.  **Performance:** The user places their laptop/tablet on the piano music rest. They begin playing.
6.  **Page Turn:** As they reach the bottom of measure 12, they quickly tilt their head to the right. The visual indicator flashes green, and the page flips instantly to the next page.
7.  **End:** The performance finishes. The user presses `Esc` to return to the library.

---

### **6. Technical Considerations (Constraint Checklist)**

- **Latency:** Page turns must happen in under 200ms from the moment the gesture is completed. This includes detection time, smoothing, and rendering.
- **False Positives:** The system must strictly differentiate between a musician "rocking out" to the music and a specific "turn page" command. The gesture detection requires both:
  - **Angle threshold:** Minimum 20° head tilt from neutral position
  - **Velocity threshold:** Minimum 100°/sec movement speed to ensure intentionality
  - **Cooldown period:** 1.5 seconds between accepted gestures
- **PDF Rendering:** Large PDFs can be slow. We must use an efficient canvas-based renderer (like `react-pdf`) to ensure no lag during turns.

---

### **7. Future Scope (Post-MVP)**

- **Setlists:** Grouping multiple PDFs into an ordered list for a full concert performance.
- **Annotations:** Allowing users to use a stylus or mouse to draw markings (e.g., fingering, dynamics) on the score.
- **Audio-Triggered Turning:** Using the microphone to "listen" to the music and automatically turn the page when it recognizes the notes at the end of the page (Score Following). _This is technically complex but the "holy grail" of features._
