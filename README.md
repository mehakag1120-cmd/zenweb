# ZenWeb: Neurodivergent Cognitive Design & Accessibility Extension

> **Production-Grade Chrome Extension (Manifest V3) — Version 2.0**  
> Specially designed for neurodivergent cognitive support (ADHD, Autism Spectrum Disorder, Dyslexia, and Sensory Processing Sensitivities).

ZenWeb transforms noisy, chaotic, and sensory-overloading websites into calm, predictable, scannable, and dopamine-balanced reading environments.

---

## 🌟 What's New in Version 2.0

- **21stdev.com-Inspired Bubbly Tactile UI**: Redesigned with spring physics, modern glassmorphism, glowing status orbs, and bubbly switches.
- **Cognitive Typography**: Integrated **Lexend** (scientifically developed for reading speed, visual ease, and dyslexia relief) and **Plus Jakarta Sans**.
- **Frosted Glass Reading Ruler**: True hardware-accelerated frosted glass (`backdrop-filter: blur(12px) brightness(0.72)`) that blurs distractions outside the focus lane while keeping active lines crystal clear.
- **Explicit Live Status Badges**: High-contrast, color-coded badges (`ON` in luminous emerald vs `OFF` in slate gray) across all toggle controls for instant state clarity.
- **Lossless Full-State Reversion**: Turning off ZenWeb or individual features instantly and completely restores original page styles, removing bionic bolding, chunking dividers, and color overrides.
- **Airtight Contrast Specificity Engine**: Solved dark theme unreadability by guaranteeing high-contrast warm cream text (`#f0f6fc`) against dark obsidian backgrounds (`#0d1117`), safely stripping conflicting hardcoded inline styles.

---

## 🌟 Key Features Overview

### 1. High-Specificity Style Transformation Engine
- **Muted Color Temperatures**: Three scientifically balanced palettes:
  - **Calm Pastel / Lavender**: Eliminates harsh blue-light spikes, softens luminance boundaries.
  - **Deep Focus Contrast**: Warm cream text (`#f0f6fc`) on deep obsidian background (`#0d1117`), mitigating photophobia and visual stress.
  - **Monochrome Sepia**: Warm amber tones reducing sensory friction.
- **Inline Style Normalizer & Restorer**: Automatically backs up and clears hardcoded inline colors on active themes, and restores them 100% losslessly upon deactivation.
- **Dynamic SPA MutationObserver**: Throttled with `requestAnimationFrame` to dynamically catch and restyle new nodes on single-page applications (YouTube, Reddit, X/Twitter, Medium).
- **Shadow DOM Piercer**: Recursively traverses open `shadowRoot` trees to enforce typography and color harmony inside web components.
- **Dyslexia-Optimized Typography**: Lexend, Atkinson Hyperlegible, and OpenDyslexic font stacks with forced line-height (1.75), letter-spacing (0.02em), and a strict 75-character max line width.

### 2. Cognitive Attention & Reading Accommodations
- **Frosted Glass Reading Ruler**: Follow-cursor focus lane with real-time height adjustment (60px–240px) that dims and blurs surrounding text to eliminate line-skipping.
- **Distraction Shield**: Automatically identifies and hides noisy ad containers, promotional modals, sticky banners, and recommendation sidebars.
- **Flashbang & Animation Suppressor**: Freezes jarring CSS keyframe animations, stops looping animated GIFs, pauses video autoplay, and renders a smooth startup veil preventing bright white flashbangs during page loads.
- **Lossless Bionic Reading Converter**: Algorithmically bolds the first 45% of words to create visual saccadic anchors without modifying underlying DOM semantics. Can be toggled on/off instantly without page reload.
- **Smart Chunking**: Dynamically breaks 5+ sentence walls of text into digestible 3-sentence blocks with subtle dividers.
- **Last-Read Anchor**: Automatically saves reading coordinates per URL and scrolls back with a gentle pulsing indicator on reload.

### 3. Web Audio API Procedural Soundscapes
Generates continuous, soothing ambient soundscapes entirely in code using native `AudioContext` (zero external MP3 files or network downloads):
- **Brownian Noise**: 1/f² low-frequency acoustic warmth that suppresses distracting ambient phonemes and ADHD neural chatter.
- **Calm Rain**: Modulated pink noise stream with resonant droplet bursts and wind sweep simulation.
- **432Hz Binaural Beats**: Dual-oscillator stereo routing (432Hz left / 438Hz right) generating a 6Hz theta wave for flow state and deep focus.
- **Zen Singing Bowl Chime**: Harmonically synthesized bell chime with exponential decay to signal micro-break transitions.

### 4. Built-in Local AI Co-Pilot (Gemini Nano on-device)
- **Instant 3-Bullet Summary Card**: Automatically mounts a high-impact overview card at the top of long-form articles.
- **Selection Plain-English Simplifier**: Rewrites highlighted bureaucratic jargon into conversational sentences (CEFR A2-B1).
- **Tone Neutralizer**: Automatically identifies sensationalist, clickbait, and panic-inducing phrasing and converts it into calm, objective statements.
- **Contextual AI Chat Side Panel**: Interactive side panel to query, dissect, and extract action items from the active tab.
- **100% Offline & Private**: Utilizes Chrome Built-in AI (`window.ai.summarizer`, `window.ai.languageModel`) with instant heuristic statistical NLP fallbacks.

### 5. Controlled Micro-Gaming Suite & Hyperfixation Guard
- **5 Canvas Micro-Games (60-120 FPS Retina-scaled)**:
  1. *Zen Fluid Flow*: Calming pastel particles with cursor gravity and orbital fluid mechanics.
  2. *Rhythm Pulse*: Harmonic circular wave sync for vagal nerve regulation.
  3. *Zen Block Stacker*: Soothing kinetic block balancing.
  4. *Pattern Flow*: Calming four-tone melodic memory recall.
  5. *Micro Flow Glide*: Minimalist runner gliding over serene rolling sine waves.
- **Strict Hard Timer (90s / 180s)**: Canvas locks immediately upon countdown expiration.
- **30-Second Guided Breathing Reset**: Transitions automatically into Box Breathing (4s Inhale, 4s Hold, 4s Exhale, 4s Hold) with an animated visual orb.
- **15-Minute Cooling Lockout**: Prevents dopamine-seeking loops and ADHD hyperfixation traps. Stored persistently across sessions.

---

## 📂 Architecture & File Tree

```
zenweb/
├── manifest.json         # Manifest V3 configuration with sidePanel, storage, idle
├── background.js         # Service worker, context menus, side panel controller, messaging
├── content.js            # DOM engine, MutationObserver, frosted ruler, bionic text, activity monitor
├── ai-engine.js          # Gemini Nano API wrappers + heuristic NLP fallbacks
├── game-engine.js        # Canvas micro-gaming suite, hyperfixation lockout, box breathing
├── audio-engine.js       # Web Audio API procedural sound synthesizer
├── styles.css            # High-specificity CSS reset, themes, frosted glass, animations, HUD overlays
├── popup.html            # Extension dashboard UI (Bubbly 21stdev-inspired)
├── popup.css             # Sensory-friendly popup styling with spring micro-interactions
├── popup.js              # Popup logic and two-way storage synchronization
├── sidepanel.html        # AI Reading Companion Side Panel
├── sidepanel.css         # Side panel styling
├── sidepanel.js          # Side panel chat and active tab context extractor
├── demo.html             # Comprehensive interactive verification suite
└── icons/                # High-DPI extension icons (16px, 48px, 128px)
```

---

## 🚀 How to Install & Test in Google Chrome

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in the address bar.
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click the **Load unpacked** button in the top left.
5. Select this project folder:
   ```
   c:\Users\TUFF\OneDrive\Desktop\zenweb
   ```
6. The **ZenWeb** extension will now appear in your extensions toolbar!
7. Pin ZenWeb to your toolbar for quick access.
8. Open `demo.html` in Chrome to test all features:
   - Click the extension icon to toggle themes, frosted reading ruler, and soundscapes.
   - Highlight any text in the article to view the **Simplify** and **Calm Tone** floating tooltips.
   - Launch the 90-second **Zen Fluid** micro-break and observe the automatic transition into guided Box Breathing.
   - Open the **AI Chat Side Panel** and click "⚡ 3-Bullet Core" to analyze the page.
