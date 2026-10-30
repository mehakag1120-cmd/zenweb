# ZenWeb: Pixel-Digital Sensory AI Extension

> **Production-Grade Chrome Extension (Manifest V3) — Version 2.2**  
> Inspired by the aesthetic of **[books.baseten.com](https://books.baseten.com/)**: Crisp pixel-digital brutalism, sliding pixel matrix animations, cohesive white-grey-black palette with electric green (`#00FF66`) and cyber pink (`#FF007A`) accents.

ZenWeb transforms ordinary, chaotic webpages into calm, engaging, and dopamine-balanced digital environments.

---

## 🌟 Core Features

### 1. Sliding Pixel Background Matrix
- **Baseten Books Aesthetic**: High-refresh canvas rendering sliding pixel clusters across an anti-aliased digital matrix grid.
- **Retina Anti-Aliased**: Normalized to `window.devicePixelRatio` for razor-sharp rendering on 4K, Retina, and scaled displays.
- **Ambient & Lightweight**: Smooth `requestAnimationFrame` loop with low CPU/GPU footprint.

### 2. AI Screen Activity Monitor (With Explicit Consent)
- **User Permission Dialog**: Displays an explicit cyber-dialogue before monitoring reading activity.
- **100% On-Device & Private**: Zero screen recording or external network transmission.
- **Cognitive Stall Detection**: Gently tracks scroll velocity and dwell time. If the user stays stuck or fatigued on a section for several minutes, the agent offers a non-intrusive 90-second focus reset.

### 3. Three Controlled Mini-Games for 15-Minute Focus Resets
Every 15 minutes, ZenWeb provides a randomized **90-second focus reset break** (or launch manually anytime via popup or floating dock):
1. **Dino Jump**: Retro pixel T-Rex jumping over cacti with parabolic physics, jump dust particles, high score tracking, and instant respawn.
2. **Tetris Matrix**: 10×20 falling tetromino matrix with a cohesive palette, ghost piece landing projection, line-clearing animations, and on-screen touch/mouse controls.
3. **Whack-A-Dino**: 3×3 digital arcade pod grid featuring friendly green dinos, golden ultra dinos, and pink glitch dinos with combo multiplier streaks.
- **Hyperfixation Guard**: Hard-coded 90-second timer transitions into a 30-second guided breathing reset before returning the user to their work.

### 4. 30-Minute Water Break Reminder
- Built-in background alarm triggers a hydration check-in every 30 minutes.
- Features a daily water break tracker and Tibetan singing bowl harmonic chime via Web Audio API.

### 5. Webpage Data Restructuring (Bullet Cards & Circular Typography)
- Restructures dense, unbroken walls of text into scannable cards with bullet points and bold key phrases.
- Typography upgrade with circular bold fonts (`Plus Jakarta Sans` / `Chivo`).
- Top Executive Overview Briefing card summarizing core page takeaways via Chrome Built-in AI (Gemini Nano) or local statistical NLP.

---

## 📂 Architecture & File Tree

```
zenweb/
├── manifest.json         # Manifest V3 (alarms, storage, idle, sidePanel, scripting)
├── background.js         # Service worker: 15-min & 30-min timers, alarms, messaging hub
├── content.js            # Sliding pixel canvas, permission dialog, data restructuring, dock
├── game-engine.js        # Dino Jump, Tetris Matrix, Whack-A-Dino, 90s timer, breathing reset
├── audio-engine.js       # Procedural Web Audio API synthesizer (binaural, noise, singing bowl)
├── ai-engine.js          # On-device Gemini Nano API wrapper + local statistical NLP fallback
├── styles.css            # Pixel brutalist stylesheet, contrast engine, sliding canvas, animations
├── popup.html            # Extension dashboard UI (live countdown timers, controls)
├── popup.css             # Pixel brutalist popup styling
├── popup.js              # Two-way sync with storage, alarms, and active tab
├── sidepanel.html        # AI Reading Deck Side Panel
├── sidepanel.css         # Side panel styling
├── sidepanel.js          # Q&A copilot and page context extractor
├── demo.html             # Comprehensive interactive verification suite
└── icons/                # Extension icons (16px, 48px, 128px)
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
6. Open [demo.html](file:///c:/Users/TUFF/OneDrive/Desktop/zenweb/demo.html) directly in Chrome to interactively test all mini-games, water reminders, permission dialogs, and text restructuring!
