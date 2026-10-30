/**
 * ZenWeb Content Orchestrator (v2.3)
 * Inspired by books.baseten.com: Pixel-brutalist digital aesthetic,
 * sliding pixel matrix animations, universal contrast specificity engine,
 * bespoke SVG hardware remote deck (no emojis), and 100% lossless toggle teardown.
 */

(function () {
  'use strict';

  if (window.__ZENWEB_INITIALIZED__) {
    // If re-injected, re-sync with storage
    window.__ZENWEB_CONTENT_INSTANCE__?.syncWithStorage();
    return;
  }
  window.__ZENWEB_INITIALIZED__ = true;

  class ZenWebContent {
    constructor() {
      this.settings = null;
      this.slidingPixelCanvas = null;
      this.slidingPixelCtx = null;
      this.pixelAnimId = null;
      this.pixels = [];
      this.gridCrosshairs = [];
      this.lastActivityTime = Date.now();
      this.lastScrollY = window.scrollY;
      this.scrollStuckStartTime = null;
      this.activityInterval = null;
      this.waterTimerInterval = null;
      this.restructuredCardsMap = new Map(); // originalElement -> cardElement
      this.normalizedStyleElements = new Set(); // elements modified by contrast normalizer
      this.domMutationObserver = null;
      this.isRestructured = false;

      // Expose globally for verification suites & extension calls
      window.__ZENWEB_CONTENT_INSTANCE__ = this;
      window.ZenWebContentInstance = this;

      this.init();
    }

    async init() {
      this.settings = await this.loadSettings();

      // 1. Setup Chrome Storage Sync Listener (across all open tabs)
      this.setupStorageListener();

      // 2. Setup Chrome Runtime Message Listeners
      this.setupMessageListeners();

      // 3. Apply Initial State
      if (this.settings.enabled !== false) {
        this.applyActiveState();
      } else {
        this.applyDisabledState();
      }

      // 4. Setup Screen Activity & Dwell Fatigue Monitoring
      this.setupActivityMonitor();

      // 5. Setup Hydration & Reset Interval Checkers
      this.setupTimers();
    }

    /* ==========================================================================
       STORAGE & CONFIGURATION
       ========================================================================== */

    async loadSettings() {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.get(null, (items) => {
            resolve(items || {});
          });
        } else {
          resolve({});
        }
      });
    }

    setupStorageListener() {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'sync') {
            const updated = {};
            for (const [key, val] of Object.entries(changes)) {
              updated[key] = val.newValue;
            }
            this.settings = { ...this.settings, ...updated };

            if (this.settings.enabled === false) {
              this.applyDisabledState();
            } else {
              this.applyActiveState();
            }
            this.updateDockState();
          }
        });
      }
    }

    async syncWithStorage() {
      this.settings = await this.loadSettings();
      if (this.settings.enabled !== false) {
        this.applyActiveState();
      } else {
        this.applyDisabledState();
      }
      this.updateDockState();
    }

    /* ==========================================================================
       1. SLIDING PIXEL BACKGROUND CANVAS (BASETEN.COM AESTHETIC)
       ========================================================================== */

    mountSlidingPixelCanvas() {
      if (document.getElementById('zenweb-pixel-canvas')) {
        this.slidingPixelCanvas = document.getElementById('zenweb-pixel-canvas');
        this.slidingPixelCtx = this.slidingPixelCanvas.getContext('2d', { alpha: true });
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.id = 'zenweb-pixel-canvas';
      canvas.className = 'zw-pixel-background';
      document.documentElement.appendChild(canvas);

      this.slidingPixelCanvas = canvas;
      this.slidingPixelCtx = canvas.getContext('2d', { alpha: true });

      const handleResize = () => {
        if (!this.slidingPixelCanvas) return;
        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.slidingPixelCanvas.width = width * dpr;
        this.slidingPixelCanvas.height = height * dpr;
        this.slidingPixelCanvas.style.width = `${width}px`;
        this.slidingPixelCanvas.style.height = `${height}px`;

        if (this.slidingPixelCtx) {
          this.slidingPixelCtx.resetTransform?.();
          this.slidingPixelCtx.scale(dpr, dpr);
        }

        this.initPixelParticles(width, height);
      };

      window.addEventListener('resize', handleResize, { passive: true });
      handleResize();
      this.startPixelAnimation();
    }

    initPixelParticles(width, height) {
      this.pixels = [];
      this.gridCrosshairs = [];
      const gridSize = 40;

      // Generate fixed coordinate crosshairs
      for (let x = 20; x < width; x += gridSize * 2) {
        for (let y = 20; y < height; y += gridSize * 2) {
          if (Math.random() > 0.4) {
            this.gridCrosshairs.push({
              x,
              y,
              alpha: 0.12 + Math.random() * 0.18,
              pulseSpeed: 1 + Math.random() * 2,
              phase: Math.random() * Math.PI * 2
            });
          }
        }
      }

      // Generate sliding pixel packets
      const particleCount = Math.max(28, Math.floor(width / 38));
      const colors = ['#00FF66', '#FF007A', '#F4F6FB', '#00FF66'];

      for (let i = 0; i < particleCount; i++) {
        const isWide = Math.random() > 0.6;
        this.pixels.push({
          x: Math.random() * width,
          y: Math.floor((Math.random() * height) / gridSize) * gridSize + 20,
          w: isWide ? 6 : 4,
          h: 4,
          vx: 24 + Math.random() * 38,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.25 + Math.random() * 0.45,
          trail: []
        });
      }
    }

    startPixelAnimation() {
      if (this.pixelAnimId) cancelAnimationFrame(this.pixelAnimId);

      let lastTime = performance.now();
      const loop = (timestamp) => {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        if (this.settings?.enabled && this.settings?.slidingPixels !== false) {
          this.renderSlidingPixels(dt, timestamp);
        } else if (this.slidingPixelCtx && this.slidingPixelCanvas) {
          this.slidingPixelCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }

        this.pixelAnimId = requestAnimationFrame(loop);
      };

      this.pixelAnimId = requestAnimationFrame(loop);
    }

    renderSlidingPixels(dt, now) {
      if (!this.slidingPixelCtx || !this.slidingPixelCanvas) return;
      const ctx = this.slidingPixelCtx;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw Subtle Technical Grid Dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      const gridSize = 40;
      for (let x = 20; x < w; x += gridSize) {
        for (let y = 20; y < h; y += gridSize) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }

      // 2. Draw Pulsing Coordinate Crosshairs (+)
      this.gridCrosshairs.forEach(ch => {
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.002 * ch.pulseSpeed + ch.phase);
        ctx.fillStyle = '#00FF66';
        ctx.globalAlpha = ch.alpha * pulse;
        // Horizontal bar
        ctx.fillRect(ch.x - 3, ch.y, 7, 1);
        // Vertical bar
        ctx.fillRect(ch.x, ch.y - 3, 1, 7);
      });

      // 3. Draw Sliding Pixels & Motion Trails
      this.pixels.forEach(p => {
        p.x += p.vx * dt;

        p.trail.unshift({ x: p.x, y: p.y });
        if (p.trail.length > 5) p.trail.pop();

        if (p.x > w + 40) {
          p.x = -20;
          p.y = Math.floor((Math.random() * h) / gridSize) * gridSize + 20;
          p.trail = [];
        }

        // Draw phosphor motion trail
        p.trail.forEach((pos, idx) => {
          const trailAlpha = (p.alpha * (1 - (idx + 1) / (p.trail.length + 1))) * 0.55;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, trailAlpha);
          ctx.fillRect(pos.x - idx * (p.w + 2), pos.y, p.w, p.h);
        });

        // Main Pixel Head
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.w, p.h);
      });

      ctx.globalAlpha = 1;
    }

    /* ==========================================================================
       2. CONTRAST NORMALIZER ENGINE (DOM LEVEL HIGH-SPECIFICITY INVERSION)
       ========================================================================== */

    applyContrastNormalization() {
      // Traverse visible content elements and neutralize dark-on-dark or white boxes
      const elements = document.querySelectorAll(`
        h1, h2, h3, h4, h5, h6, p, a, span, div, li, blockquote, dd, dt,
        [class*="title"], [class*="heading"], [class*="headline"], [class*="story"], [class*="card"]
      `);

      elements.forEach(el => {
        // Skip ZenWeb internal UI elements
        if (el.closest('#zenweb-root, [id^="zenweb-"], [class^="zw-"]')) return;

        const inlineStyle = el.getAttribute('style');
        if (inlineStyle && !el.hasAttribute('data-zw-orig-style')) {
          el.setAttribute('data-zw-orig-style', inlineStyle);
        }

        // Check computed colors
        const comp = window.getComputedStyle(el);

        // If background is blinding white, convert to transparent or dark card surface
        if (comp.backgroundColor && this.isBrightColor(comp.backgroundColor)) {
          el.style.setProperty('background-color', 'transparent', 'important');
          this.normalizedStyleElements.add(el);
        }

        // If text color is dark on dark, force to bright white or green
        if (comp.color && this.isDarkColor(comp.color)) {
          if (el.tagName === 'A' || el.closest('a')) {
            el.style.setProperty('color', '#00FF66', 'important');
            el.style.setProperty('-webkit-text-fill-color', '#00FF66', 'important');
          } else if (/^H[1-6]$/.test(el.tagName) || el.className?.toString().match(/title|heading|headline/i)) {
            el.style.setProperty('color', '#ffffff', 'important');
            el.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
          } else {
            el.style.setProperty('color', '#f4f6fb', 'important');
            el.style.setProperty('-webkit-text-fill-color', '#f4f6fb', 'important');
          }
          this.normalizedStyleElements.add(el);
        }
      });

      // Setup MutationObserver for dynamic SPA content loading (e.g. Times of India, Reddit, Twitter)
      if (!this.domMutationObserver) {
        let throttleTimer = null;
        this.domMutationObserver = new MutationObserver(() => {
          if (throttleTimer) return;
          throttleTimer = setTimeout(() => {
            throttleTimer = null;
            if (this.settings?.enabled !== false) {
              this.applyContrastNormalization();
              if (this.settings?.dataRestructuring !== false) {
                this.applyDataRestructuring();
              }
            }
          }, 350);
        });

        this.domMutationObserver.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    }

    revertContrastNormalization() {
      if (this.domMutationObserver) {
        this.domMutationObserver.disconnect();
        this.domMutationObserver = null;
      }

      this.normalizedStyleElements.forEach(el => {
        if (el && el.isConnected) {
          if (el.hasAttribute('data-zw-orig-style')) {
            el.setAttribute('style', el.getAttribute('data-zw-orig-style'));
            el.removeAttribute('data-zw-orig-style');
          } else {
            el.style.removeProperty('background-color');
            el.style.removeProperty('color');
            el.style.removeProperty('-webkit-text-fill-color');
          }
        }
      });
      this.normalizedStyleElements.clear();
    }

    isDarkColor(colorStr) {
      // Parses rgb(r, g, b) or rgba and determines luminance
      const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return false;
      const r = parseInt(m[1], 10);
      const g = parseInt(m[2], 10);
      const b = parseInt(m[3], 10);
      // Relative luminance calculation
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum < 0.38; // Under 38% brightness is dark-on-dark
    }

    isBrightColor(colorStr) {
      const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return false;
      const r = parseInt(m[1], 10);
      const g = parseInt(m[2], 10);
      const b = parseInt(m[3], 10);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum > 0.70; // Above 70% brightness is a blinding white box
    }

    /* ==========================================================================
       3. SCREEN MONITORING PERMISSION REQUEST (EXPLICIT USER CONSENT)
       ========================================================================== */

    checkScreenMonitoringPermission() {
      if (this.settings.screenMonitoringPermission === true) return;
      if (document.getElementById('zenweb-permission-dialog')) return;

      const dialog = document.createElement('div');
      dialog.id = 'zenweb-permission-dialog';
      dialog.className = 'zw-dialog-backdrop';
      dialog.innerHTML = `
        <div class="zw-pixel-window zw-permission-card">
          <div class="zw-pixel-window-header">
            <div class="zw-header-left">
              <span class="zw-pixel-pill-green">CONSENT REQUIRED</span>
              <span class="zw-pixel-tag">AI SCREEN MONITOR</span>
            </div>
            <button class="zw-pixel-close" id="zw-permission-close" title="Close dialog">✕</button>
          </div>
          <div class="zw-permission-body">
            <div class="zw-agent-avatar">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
                <rect x="3" y="6" width="18" height="12" rx="3" stroke="#00FF66" stroke-width="2" fill="rgba(0, 255, 102, 0.12)"/>
                <path d="M7 12h10" stroke="#00FF66" stroke-width="2.5" stroke-linecap="round"/>
                <circle cx="12" cy="12" r="2.5" fill="#FF007A"/>
                <path d="M12 2v4M12 18v4" stroke="#00FF66" stroke-width="2"/>
              </svg>
            </div>
            <div class="zw-permission-content">
              <h3>Allow Screen Activity Monitoring?</h3>
              <p>
                ZenWeb uses on-device telemetry to detect cognitive fatigue and reading stalls. When you stay stuck on a section for several minutes, the agent offers a gentle 90-second focus reset.
              </p>
              <div class="zw-permission-specs">
                <div class="zw-spec-item">
                  <span class="zw-bullet-green">■</span>
                  <span><strong>100% On-Device & Private:</strong> Zero screen recordings or server telemetry.</span>
                </div>
                <div class="zw-spec-item">
                  <span class="zw-bullet-pink">■</span>
                  <span><strong>Fatigue Detection:</strong> Suggests refreshing breaks when reading momentum slows.</span>
                </div>
                <div class="zw-spec-item">
                  <span class="zw-bullet-white">■</span>
                  <span><strong>Scheduled Rhythm:</strong> 15-minute micro-resets & 30-minute water reminders.</span>
                </div>
              </div>
            </div>
          </div>
          <div class="zw-permission-actions">
            <button class="zw-btn-pixel-primary" id="zw-grant-permission-btn">
              [✓ ALLOW SCREEN MONITORING]
            </button>
            <button class="zw-btn-pixel-secondary" id="zw-deny-permission-btn">
              [✕ DECLINE / PAUSE]
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const grantBtn = dialog.querySelector('#zw-grant-permission-btn');
      const denyBtn = dialog.querySelector('#zw-deny-permission-btn');
      const closeBtn = dialog.querySelector('#zw-permission-close');

      const handleGrant = () => {
        this.settings.screenMonitoringPermission = true;
        this.settings.screenActivityMonitoring = true;
        chrome.storage?.sync?.set({
          screenMonitoringPermission: true,
          screenActivityMonitoring: true
        });
        dialog.remove();
        this.showToast("✓ AI Screen Activity Monitor Enabled!");
        this.updateDockState();
      };

      const handleDeny = () => {
        this.settings.screenMonitoringPermission = false;
        this.settings.screenActivityMonitoring = false;
        chrome.storage?.sync?.set({
          screenMonitoringPermission: false,
          screenActivityMonitoring: false
        });
        dialog.remove();
        this.showToast("Screen monitor paused. You can enable it anytime in the popup.");
        this.updateDockState();
      };

      grantBtn.addEventListener('click', handleGrant);
      denyBtn.addEventListener('click', handleDeny);
      closeBtn.addEventListener('click', handleDeny);
    }

    /* ==========================================================================
       4. SCREEN ACTIVITY & COGNITIVE IDLE MONITOR
       ========================================================================== */

    setupActivityMonitor() {
      const resetActivity = () => {
        this.lastActivityTime = Date.now();
      };

      ['pointermove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, resetActivity, { passive: true });
      });

      if (this.activityInterval) clearInterval(this.activityInterval);
      this.activityInterval = setInterval(() => {
        if (!this.settings?.enabled) return;
        if (this.settings.screenMonitoringPermission !== true) return;
        if (this.settings.screenActivityMonitoring === false) return;

        const currentY = window.scrollY;
        const scrollDelta = Math.abs(currentY - this.lastScrollY);
        const idleThresholdMs = (this.settings.idleThresholdMinutes || 3) * 60 * 1000;

        if (scrollDelta < 40) {
          if (!this.scrollStuckStartTime) {
            this.scrollStuckStartTime = Date.now();
          } else {
            const dwellDuration = Date.now() - this.scrollStuckStartTime;
            if (dwellDuration >= idleThresholdMs) {
              this.showIdleAlert();
              this.scrollStuckStartTime = Date.now() + 600000; // Snooze 10 minutes
            }
          }
        } else {
          this.lastScrollY = currentY;
          this.scrollStuckStartTime = Date.now();
        }
      }, 10000);
    }

    showIdleAlert() {
      if (document.getElementById('zenweb-idle-prompt')) return;

      const prompt = document.createElement('div');
      prompt.id = 'zenweb-idle-prompt';
      prompt.className = 'zw-pixel-window zw-idle-toast';
      prompt.innerHTML = `
        <div class="zw-pixel-window-header">
          <div class="zw-header-left">
            <span class="zw-pixel-pill-pink">FATIGUE PAUSE</span>
            <span class="zw-pixel-tag">IDLE DETECTED</span>
          </div>
          <button class="zw-pixel-close" id="zw-idle-close">✕</button>
        </div>
        <div class="zw-idle-body">
          <div class="zw-idle-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
              <rect x="3" y="6" width="18" height="12" rx="3" stroke="#FF007A" stroke-width="2" fill="rgba(255, 0, 122, 0.1)"/>
              <circle cx="8" cy="12" r="1.5" fill="#FF007A"/>
              <circle cx="16" cy="12" r="1.5" fill="#FF007A"/>
              <path d="M10 15h4" stroke="#FF007A" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="zw-idle-text">
            <strong>Reading Momentum Stalled</strong>
            <p>You've lingered on this section for several minutes without scrolling. Ready for a quick 90-second focus reset?</p>
          </div>
        </div>
        <div class="zw-idle-actions">
          <button class="zw-btn-pixel-primary" id="zw-idle-game-btn">[🎮 90s RESET]</button>
          <button class="zw-btn-pixel-secondary" id="zw-idle-water-btn">[💧 WATER BREAK]</button>
          <button class="zw-btn-pixel-ghost" id="zw-idle-keep-reading">[RESUME]</button>
        </div>
      `;

      document.body.appendChild(prompt);

      prompt.querySelector('#zw-idle-close').addEventListener('click', () => prompt.remove());
      prompt.querySelector('#zw-idle-keep-reading').addEventListener('click', () => prompt.remove());

      prompt.querySelector('#zw-idle-game-btn').addEventListener('click', () => {
        prompt.remove();
        if (window.ZenWebGames) window.ZenWebGames.launchGame('random', 90);
      });

      prompt.querySelector('#zw-idle-water-btn').addEventListener('click', () => {
        prompt.remove();
        this.triggerWaterBreakReminder();
      });
    }

    /* ==========================================================================
       5. 30-MINUTE WATER BREAK HYDRATION REMINDER
       ========================================================================== */

    triggerWaterBreakReminder() {
      if (document.getElementById('zenweb-water-modal')) return;

      const modal = document.createElement('div');
      modal.id = 'zenweb-water-modal';
      modal.className = 'zw-dialog-backdrop';
      modal.innerHTML = `
        <div class="zw-pixel-window zw-water-card">
          <div class="zw-pixel-window-header">
            <div class="zw-header-left">
              <span class="zw-pixel-pill-cyan">HYDRATION PROTOCOL</span>
              <span class="zw-pixel-tag">30-MIN CHECK-IN</span>
            </div>
            <button class="zw-pixel-close" id="zw-water-close">✕</button>
          </div>
          <div class="zw-water-body">
            <div class="zw-water-icon">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none">
                <path d="M12 3L6 11a7 7 0 1012 0L12 3z" stroke="#38BDF8" stroke-width="2" fill="rgba(56, 189, 248, 0.15)"/>
                <path d="M8 13h8M9 16h6" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="zw-water-text">
              <h3>Time for a Water Break</h3>
              <p>
                You've been immersed in reading for 30 minutes. A quick glass of water restores cerebral blood flow and sharpens analytical concentration.
              </p>
            </div>
          </div>
          <div class="zw-water-actions">
            <button class="zw-btn-pixel-primary" id="zw-logged-water-btn">
              [✓ I DRANK WATER]
            </button>
            <button class="zw-btn-pixel-secondary" id="zw-snooze-water-btn">
              [SNOOZE 5 MIN]
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('#zw-water-close').addEventListener('click', () => modal.remove());

      modal.querySelector('#zw-logged-water-btn').addEventListener('click', () => {
        chrome.runtime?.sendMessage({ type: 'LOG_WATER_BREAK' }, (res) => {
          const count = res?.count || 1;
          this.showToast(`💧 Great job! Total water breaks logged today: ${count}`);
        });
        if (window.ZenWebAudio) window.ZenWebAudio.playZenChime();
        modal.remove();
      });

      modal.querySelector('#zw-snooze-water-btn').addEventListener('click', () => {
        modal.remove();
        this.showToast("Water reminder snoozed for 5 minutes.");
      });
    }

    setupTimers() {
      if (this.waterTimerInterval) clearInterval(this.waterTimerInterval);
      this.waterTimerInterval = setInterval(() => {
        if (!this.settings?.enabled) return;
        const now = Date.now();
        const lastWater = this.settings.lastWaterBreakTimestamp || now;
        const intervalMs = (this.settings.waterReminderIntervalMinutes || 30) * 60 * 1000;

        if (now - lastWater >= intervalMs) {
          this.settings.lastWaterBreakTimestamp = now;
          chrome.storage?.sync?.set({ lastWaterBreakTimestamp: now });
          this.triggerWaterBreakReminder();
        }
      }, 30000);
    }

    /* ==========================================================================
       6. WEBPAGE DATA RESTRUCTURING (BULLET CARDS & CIRCULAR BOLD FONTS)
       ========================================================================== */

    applyDataRestructuring() {
      if (this.isRestructured) return;
      this.isRestructured = true;

      const root = document.documentElement;
      root.setAttribute('data-zenweb-theme', 'pixel-dark');
      root.setAttribute('data-zenweb-font', 'circular-digital');
      root.setAttribute('data-zenweb-restructured', 'true');

      // Inject Executive Briefing Card at the top of main content
      this.injectExecutiveOverview();

      // Find substantial paragraph elements and news story summaries across broad selectors
      const selector = `
        article p, main p, [role="main"] p, .post p, .article-body p, 
        section p, .entry-content p, #content p, .markdown-body p, 
        div[class*="content"] p, div[class*="article"] p, div[class*="story"] p,
        body > p, div > p, [data-articlebody] p, .artText p
      `.trim();

      const paragraphs = Array.from(document.querySelectorAll(selector));
      let blockIndex = 1;

      paragraphs.forEach((p) => {
        if (p.closest('#zenweb-root, [id^="zenweb-"], [class^="zw-"], pre, code, nav, footer, aside, header')) return;
        if (this.restructuredCardsMap.has(p)) return;

        const text = p.innerText?.trim() || '';
        // Restructure any paragraph with at least 65 characters of real reading text
        if (text.length >= 65) {
          const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || [text];

          const card = document.createElement('div');
          card.className = 'zw-restructured-card';

          let bulletHTML = '';
          sentences.forEach(s => {
            const cleanSentence = s.trim();
            if (cleanSentence.length > 10) {
              const parts = cleanSentence.split(' ');
              const leadCount = Math.min(3, Math.max(1, Math.floor(parts.length * 0.25)));
              const lead = parts.slice(0, leadCount).join(' ');
              const tail = parts.slice(leadCount).join(' ');

              bulletHTML += `
                <li class="zw-bullet-item">
                  <span class="zw-bullet-marker">■</span>
                  <span class="zw-bullet-text"><strong>${this.escapeHTML(lead)}</strong> ${this.escapeHTML(tail)}</span>
                </li>
              `;
            }
          });

          const blockNum = blockIndex < 10 ? `0${blockIndex}` : `${blockIndex}`;
          blockIndex++;

          card.innerHTML = `
            <div class="zw-card-pill-row">
              <span class="zw-pixel-tag">[BLOCK // ${blockNum}]</span>
              <span class="zw-card-meta">${sentences.length} KEY POINTS</span>
            </div>
            <ul class="zw-bullet-list">
              ${bulletHTML}
            </ul>
          `;

          // Lossless swap
          p.style.display = 'none';
          p.insertAdjacentElement('afterend', card);
          this.restructuredCardsMap.set(p, card);
        }
      });
    }

    removeDataRestructuring() {
      this.isRestructured = false;

      const root = document.documentElement;
      root.removeAttribute('data-zenweb-restructured');

      document.getElementById('zenweb-executive-card')?.remove();

      // Restore all original paragraph elements
      this.restructuredCardsMap.forEach((card, originalP) => {
        if (card && card.parentNode) {
          card.remove();
        }
        if (originalP && originalP.isConnected) {
          originalP.style.display = '';
        }
      });
      this.restructuredCardsMap.clear();
    }

    injectExecutiveOverview() {
      if (document.getElementById('zenweb-executive-card')) return;

      const mainEl = document.querySelector('article, main, [role="main"], #content, .post, .article, .story-section') || document.body;
      const cleanText = this.extractCleanText(mainEl);
      if (cleanText.split(/\s+/).length < 100) return;

      const card = document.createElement('div');
      card.id = 'zenweb-executive-card';
      card.className = 'zw-pixel-window zw-overview-window';
      card.innerHTML = `
        <div class="zw-pixel-window-header">
          <div class="zw-header-left">
            <span class="zw-pixel-pill-pink">AI BRIEFING</span>
            <span class="zw-pixel-tag">EXECUTIVE CORE</span>
          </div>
          <button class="zw-pixel-close" id="zw-overview-close">✕</button>
        </div>
        <div class="zw-overview-body">
          <div class="zw-overview-badge-row">
            <span class="zw-badge-accent-pink">CORE TAKEAWAYS</span>
            <span style="font-size:11px; color:#9499aa;">High-visibility scannable mode</span>
          </div>
          <ul class="zw-overview-bullets" id="zw-overview-list">
            <li class="zw-overview-bullet-loading">Synthesizing key digital takeaways...</li>
          </ul>
        </div>
      `;

      if (mainEl.firstChild) {
        mainEl.insertBefore(card, mainEl.firstChild);
      } else {
        mainEl.appendChild(card);
      }

      card.querySelector('#zw-overview-close').addEventListener('click', () => card.remove());

      if (window.ZenWebAI) {
        window.ZenWebAI.generate3BulletSummary(cleanText).then(bullets => {
          const list = card.querySelector('#zw-overview-list');
          if (list) {
            list.innerHTML = bullets.map((b, i) => `
              <li class="zw-overview-bullet-item">
                <span class="zw-bullet-num">0${i + 1}</span>
                <span>${this.escapeHTML(b)}</span>
              </li>
            `).join('');
          }
        });
      }
    }

    /* ==========================================================================
       7. BESPOKE HARDWARE REMOTE PANEL (BOTTOM-LEFT CYBER DECK - NO EMOJIS)
       ========================================================================== */

    mountFloatingDock() {
      if (document.getElementById('zenweb-dock')) return;

      const dock = document.createElement('div');
      dock.id = 'zenweb-dock';
      dock.className = 'zw-floating-dock';
      dock.innerHTML = `
        <div class="zw-dock-brand-badge" title="ZenWeb Cyber-Deck">
          <span class="zw-dock-led"></span>
          <span class="zw-dock-brand-text">ZEN</span>
        </div>

        <!-- 1. Reset / Gamepad Icon -->
        <button class="zw-dock-btn" id="zw-dock-game" title="Launch 90s Focus Reset Game">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <rect x="2" y="6" width="20" height="12" rx="3" stroke="#00FF66" stroke-width="1.8" fill="rgba(0, 255, 102, 0.08)"/>
            <path d="M6 12h4M8 10v4" stroke="#00FF66" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="15" cy="11" r="1.3" fill="#FF007A"/>
            <circle cx="18" cy="13" r="1.3" fill="#00FF66"/>
          </svg>
          <span class="zw-dock-label">RESET</span>
        </button>

        <!-- 2. Water / Hydration Droplet Icon -->
        <button class="zw-dock-btn" id="zw-dock-water" title="Log Hydration Break">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M12 3L6 11a7 7 0 1012 0L12 3z" stroke="#38BDF8" stroke-width="1.8" fill="rgba(56, 189, 248, 0.1)"/>
            <path d="M8 13h8M9 16h6" stroke="#38BDF8" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="zw-dock-label">WATER</span>
        </button>

        <!-- 3. Cards / Bullet Deck Icon -->
        <button class="zw-dock-btn" id="zw-dock-restructure" title="Toggle Scannable Bullet Cards">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <rect x="3" y="4" width="18" height="6.5" rx="1.5" stroke="#FF007A" stroke-width="1.6" fill="rgba(255, 0, 122, 0.1)"/>
            <rect x="3" y="13.5" width="18" height="6.5" rx="1.5" stroke="#00FF66" stroke-width="1.6" fill="rgba(0, 255, 102, 0.1)"/>
            <circle cx="6" cy="7.2" r="1" fill="#FF007A"/>
            <circle cx="6" cy="16.7" r="1" fill="#00FF66"/>
            <path d="M9.5 7.2h8.5M9.5 16.7h8.5" stroke="#f4f6fb" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="zw-dock-label">CARDS</span>
        </button>

        <!-- 4. Agent / Neural Visor Icon -->
        <button class="zw-dock-btn" id="zw-dock-agent" title="AI Screen Activity Monitor">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <rect x="3" y="6" width="18" height="12" rx="3" stroke="#00FF66" stroke-width="1.8" fill="rgba(0, 255, 102, 0.08)"/>
            <path d="M6 12h12" stroke="#00FF66" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="12" r="2.2" fill="#FF007A"/>
            <path d="M12 2v4M12 18v4" stroke="#00FF66" stroke-width="1.8"/>
          </svg>
          <span class="zw-dock-label" id="zw-dock-agent-label">AGENT</span>
        </button>
      `;

      document.documentElement.appendChild(dock);

      dock.querySelector('#zw-dock-game').addEventListener('click', () => {
        if (window.ZenWebGames) window.ZenWebGames.launchGame('random', 90);
      });

      dock.querySelector('#zw-dock-water').addEventListener('click', () => {
        this.triggerWaterBreakReminder();
      });

      dock.querySelector('#zw-dock-restructure').addEventListener('click', () => {
        this.settings.dataRestructuring = !this.settings.dataRestructuring;
        chrome.storage?.sync?.set({ dataRestructuring: this.settings.dataRestructuring });
        if (this.settings.dataRestructuring) {
          this.applyDataRestructuring();
          this.showToast("✓ Webpage restructured into scannable bullet cards!");
        } else {
          this.removeDataRestructuring();
          this.showToast("Original webpage text restored.");
        }
      });

      dock.querySelector('#zw-dock-agent').addEventListener('click', () => {
        if (this.settings.screenMonitoringPermission !== true) {
          this.checkScreenMonitoringPermission();
        } else {
          this.settings.screenActivityMonitoring = !this.settings.screenActivityMonitoring;
          chrome.storage?.sync?.set({ screenActivityMonitoring: this.settings.screenActivityMonitoring });
          this.updateDockState();
          this.showToast(this.settings.screenActivityMonitoring
            ? "✓ AI Screen Activity Monitor: ACTIVE"
            : "AI Screen Activity Monitor: PAUSED");
        }
      });

      this.updateDockState();
    }

    updateDockState() {
      const dock = document.getElementById('zenweb-dock');
      if (!dock) return;

      const agentBtn = dock.querySelector('#zw-dock-agent');
      const agentLabel = dock.querySelector('#zw-dock-agent-label');
      const restructureBtn = dock.querySelector('#zw-dock-restructure');

      if (this.settings.screenMonitoringPermission && this.settings.screenActivityMonitoring !== false) {
        agentBtn?.classList.add('zw-dock-active');
        if (agentLabel) agentLabel.textContent = 'ACTIVE';
      } else {
        agentBtn?.classList.remove('zw-dock-active');
        if (agentLabel) agentLabel.textContent = 'PAUSED';
      }

      if (this.settings.dataRestructuring !== false) {
        restructureBtn?.classList.add('zw-dock-active');
      } else {
        restructureBtn?.classList.remove('zw-dock-active');
      }
    }

    /* ==========================================================================
       8. COMPLETE APPLICATION & UNCOMPROMISING TEARDOWN
       ========================================================================== */

    applyActiveState() {
      const root = document.documentElement;
      root.setAttribute('data-zenweb-theme', 'pixel-dark');
      root.setAttribute('data-zenweb-font', 'circular-digital');

      // 1. Mount Sliding Pixel Canvas
      this.mountSlidingPixelCanvas();
      if (this.slidingPixelCanvas) {
        this.slidingPixelCanvas.style.display = 'block';
      }

      // 2. Mount Hardware Remote Dock
      this.mountFloatingDock();
      const dock = document.getElementById('zenweb-dock');
      if (dock) dock.style.display = 'flex';

      // 3. Apply DOM Contrast Normalization (Forces all text to POP!)
      this.applyContrastNormalization();

      // 4. Apply Data Restructuring Cards
      if (this.settings.dataRestructuring !== false) {
        this.applyDataRestructuring();
      }

      this.updateDockState();
    }

    applyDisabledState() {
      const root = document.documentElement;
      root.removeAttribute('data-zenweb-theme');
      root.removeAttribute('data-zenweb-font');
      root.removeAttribute('data-zenweb-restructured');

      // 1. Remove Data Restructuring & Restore original text
      this.removeDataRestructuring();

      // 2. Revert all normalized styles
      this.revertContrastNormalization();

      // 3. Hide / Teardown Sliding Pixel Canvas
      if (this.slidingPixelCanvas) {
        this.slidingPixelCanvas.remove();
        this.slidingPixelCanvas = null;
        this.slidingPixelCtx = null;
      }
      if (this.pixelAnimId) {
        cancelAnimationFrame(this.pixelAnimId);
        this.pixelAnimId = null;
      }

      // 4. Remove Remote Dock completely
      document.getElementById('zenweb-dock')?.remove();

      // 5. Remove ALL modals, prompts, dialogs, toasts
      [
        'zenweb-permission-dialog',
        'zenweb-idle-prompt',
        'zenweb-water-modal',
        'zenweb-game-modal',
        'zenweb-breathing-modal',
        'zenweb-lockout-modal',
        'zenweb-toast',
        'zenweb-executive-card'
      ].forEach(id => {
        document.getElementById(id)?.remove();
      });

      // Remove any leftover .zw-restructured-card elements
      document.querySelectorAll('.zw-restructured-card').forEach(el => el.remove());
    }

    /* ==========================================================================
       UTILITIES & MESSAGING
       ========================================================================== */

    extractCleanText(container = document.body) {
      const clone = container.cloneNode(true);
      clone.querySelectorAll('script, style, noscript, nav, footer, aside, [id^="zenweb-"], [class^="zw-"]').forEach(el => el.remove());
      return clone.innerText.replace(/\s+/g, ' ').trim();
    }

    escapeHTML(str) {
      if (!str) return '';
      return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag));
    }

    showToast(msg) {
      const existing = document.getElementById('zenweb-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.id = 'zenweb-toast';
      toast.className = 'zw-toast-pill';
      toast.textContent = msg;
      document.documentElement.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('zw-fade-out');
        setTimeout(() => toast.remove(), 300);
      }, 3200);
    }

    setupMessageListeners() {
      chrome.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
        switch (msg.type) {
          case 'UPDATE_SETTINGS':
            this.settings = { ...this.settings, ...msg.settings };
            if (this.settings.enabled === false) {
              this.applyDisabledState();
            } else {
              this.applyActiveState();
            }
            this.updateDockState();
            sendResponse({ success: true });
            break;

          case 'TRIGGER_MINIGAME_BREAK':
            if (window.ZenWebGames) {
              window.ZenWebGames.launchGame(msg.game || 'random', msg.duration || 90);
            }
            sendResponse({ success: true });
            break;

          case 'TRIGGER_WATER_REMINDER':
            this.triggerWaterBreakReminder();
            sendResponse({ success: true });
            break;

          case 'REQUEST_PERMISSION_DIALOG':
            this.settings.screenMonitoringPermission = false;
            this.checkScreenMonitoringPermission();
            sendResponse({ success: true });
            break;

          case 'TOGGLE_RESTRUCTURE':
            this.settings.dataRestructuring = !this.settings.dataRestructuring;
            chrome.storage?.sync?.set({ dataRestructuring: this.settings.dataRestructuring });
            if (this.settings.dataRestructuring) {
              this.applyDataRestructuring();
            } else {
              this.removeDataRestructuring();
            }
            sendResponse({ success: true, active: this.settings.dataRestructuring });
            break;

          case 'EXTRACT_PAGE_CONTENT':
            sendResponse({
              content: this.extractCleanText(),
              title: document.title,
              url: location.href
            });
            break;
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ZenWebContent());
  } else {
    new ZenWebContent();
  }
})();
