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
      this.aiHiddenNodes = new Set(); // nodes hidden by AI bento restructuring
      this.bentoMatrixEl = null;
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
      const gridSize = 50;

      // Generate fixed coordinate crosshairs (+)
      for (let x = 25; x < width; x += gridSize * 2) {
        for (let y = 25; y < height; y += gridSize * 2) {
          if (Math.random() > 0.45) {
            const isPink = Math.random() > 0.8;
            this.gridCrosshairs.push({
              x,
              y,
              color: isPink ? '#FF007A' : '#00FF66',
              alpha: 0.16 + Math.random() * 0.22,
              pulseSpeed: 1 + Math.random() * 2,
              phase: Math.random() * Math.PI * 2
            });
          }
        }
      }

      // Generate prominent, chunky sliding pixel packets (Baseten aesthetic)
      const particleCount = Math.max(22, Math.floor(width / 52));
      const colors = ['#00FF66', '#FF007A', '#F4F6FB', '#00FF66', '#38BDF8'];

      for (let i = 0; i < particleCount; i++) {
        // Diverse, clearly visible chunky sizes:
        // - Wide multi-byte data packets: 26-38px x 10-14px
        // - Medium chunky blocks: 16-24px x 8-11px
        // - Chunky square blocks: 12-16px x 12-16px
        const roll = Math.random();
        let w = 18;
        let h = 9;
        let styleType = 'medium';

        if (roll < 0.38) {
          w = 26 + Math.floor(Math.random() * 12); // 26-38px wide
          h = 10 + Math.floor(Math.random() * 4);  // 10-14px tall
          styleType = 'wide';
        } else if (roll < 0.72) {
          w = 16 + Math.floor(Math.random() * 8);  // 16-24px wide
          h = 8 + Math.floor(Math.random() * 3);   // 8-11px tall
          styleType = 'medium';
        } else {
          const sz = 12 + Math.floor(Math.random() * 4); // 12-16px square
          w = sz;
          h = sz;
          styleType = 'square';
        }

        this.pixels.push({
          x: Math.random() * width,
          y: Math.floor((Math.random() * height) / gridSize) * gridSize + 25 - (h / 2),
          w,
          h,
          styleType,
          vx: 30 + Math.random() * 45,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.38 + Math.random() * 0.45,
          trailSteps: 4 + Math.floor(Math.random() * 3) // 4 to 6 chunky trailing segments
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

      const gridSize = 50;

      // 1. Draw Crisp Technical Grid Dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
      for (let x = 25; x < w; x += gridSize) {
        for (let y = 25; y < h; y += gridSize) {
          ctx.fillRect(x - 1, y - 1, 2.5, 2.5);
        }
      }

      // 2. Draw Prominent Pulsing Coordinate Crosshairs (+)
      this.gridCrosshairs.forEach(ch => {
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.002 * ch.pulseSpeed + ch.phase);
        ctx.fillStyle = ch.color || '#00FF66';
        ctx.globalAlpha = ch.alpha * pulse;
        // Horizontal bar: 13px wide x 2px thick
        ctx.fillRect(ch.x - 6, ch.y - 1, 13, 2);
        // Vertical bar: 2px wide x 13px tall
        ctx.fillRect(ch.x - 1, ch.y - 6, 2, 13);
      });

      // 3. Draw Large Sliding Pixels & Chunky Segmented Trails
      this.pixels.forEach(p => {
        p.x += p.vx * dt;

        if (p.x > w + 120) {
          p.x = -80;
          p.y = Math.floor((Math.random() * h) / gridSize) * gridSize + 25 - (p.h / 2);
        }

        // Draw segmented trailing pixel dashes behind the lead head
        const stepSpacing = p.w * 0.65 + 6;
        for (let step = 1; step <= p.trailSteps; step++) {
          const trailX = p.x - step * stepSpacing;
          if (trailX > -50 && trailX < w + 50) {
            const decay = 1 - (step / (p.trailSteps + 1));
            const trailW = Math.max(5, Math.floor(p.w * decay));
            const trailH = Math.max(4, Math.floor(p.h * (0.4 + 0.6 * decay)));
            const trailY = p.y + (p.h - trailH) / 2;

            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha * decay * 0.6;
            ctx.fillRect(trailX, trailY, trailW, trailH);
          }
        }

        // Main Pixel Head with Soft Luminescent Glow
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;

        // Draw solid main head block
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // Bright inner core highlight for substantial blocks
        if (p.w >= 18) {
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = Math.min(1, p.alpha * 0.75);
          ctx.shadowBlur = 0;
          ctx.fillRect(p.x + 3, p.y + 2, Math.max(4, p.w - 6), Math.max(2, p.h - 4));
        }

        ctx.restore();
      });

      ctx.globalAlpha = 1;
    }

    /* ==========================================================================
       2. CONTRAST NORMALIZER & WHITE-ON-WHITE GUARDIAN ENGINE
       Neutralizes blinding white containers, inverts dark-on-dark text,
       darkens login and form inputs, and completely eliminates white-on-white text.
       ========================================================================== */

    applyContrastNormalization() {
      // 1. Universal Form Controls & Inputs Guardian (Eliminates white-on-white login fields)
      const formControls = document.querySelectorAll(`
        input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([class^="zw-"]),
        textarea:not([class^="zw-"]),
        select:not([class^="zw-"]),
        [contenteditable="true"]:not([class^="zw-"])
      `);

      formControls.forEach(el => {
        if (el.closest('#zenweb-root, [id^="zenweb-"], [class^="zw-"]')) return;
        if (!el.hasAttribute('data-zw-orig-style')) {
          el.setAttribute('data-zw-orig-style', el.getAttribute('style') || '');
        }
        el.style.setProperty('background-color', '#131420', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        el.style.setProperty('color', '#ffffff', 'important');
        el.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
        el.style.setProperty('border', '1.5px solid #272a3d', 'important');
        el.style.setProperty('caret-color', '#00FF66', 'important');
        this.normalizedStyleElements.add(el);
      });

      // 2. Buttons & Submit Controls Guardian
      const buttons = document.querySelectorAll(`
        button:not([class^="zw-"]),
        input[type="submit"]:not([class^="zw-"]),
        input[type="button"]:not([class^="zw-"]),
        [role="button"]:not([class^="zw-"])
      `);

      buttons.forEach(el => {
        if (el.closest('#zenweb-root, [id^="zenweb-"], [class^="zw-"]')) return;
        const comp = window.getComputedStyle(el);
        if (this.isBrightBackground(comp.backgroundColor)) {
          if (!el.hasAttribute('data-zw-orig-style')) {
            el.setAttribute('data-zw-orig-style', el.getAttribute('style') || '');
          }
          el.style.setProperty('background-color', '#161826', 'important');
          el.style.setProperty('color', '#00FF66', 'important');
          el.style.setProperty('-webkit-text-fill-color', '#00FF66', 'important');
          el.style.setProperty('border', '1.5px solid #00FF66', 'important');
          this.normalizedStyleElements.add(el);
        }
      });

      // 3. Traverse all visible text & container elements across the page
      const elements = document.querySelectorAll(`
        h1, h2, h3, h4, h5, h6, p, a, span, div, li, blockquote, dd, dt,
        header, footer, nav, aside, section, article, form, fieldset, figure,
        [class*="title"], [class*="heading"], [class*="headline"], [class*="story"], [class*="card"],
        [class*="content"], [class*="container"], [class*="box"], [class*="wrapper"], [class*="text"]
      `);

      elements.forEach(el => {
        // Skip ZenWeb internal UI elements and GitHub contribution calendar elements
        if (el.closest('#zenweb-root, [id^="zenweb-"], [class^="zw-"], .ContributionCalendar, .js-calendar-graph, .js-yearly-contributions, [data-level]')) return;

        // Skip elements already handled in formControls
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;

        const inlineStyle = el.getAttribute('style');
        if (inlineStyle && !el.hasAttribute('data-zw-orig-style')) {
          el.setAttribute('data-zw-orig-style', inlineStyle);
        }

        const comp = window.getComputedStyle(el);

        // Check if background is bright white or light grey (e.g. Times of India white box, ad boxes)
        if (comp.backgroundColor && this.isBrightBackground(comp.backgroundColor)) {
          el.style.setProperty('background-color', 'transparent', 'important');
          el.style.setProperty('background-image', 'none', 'important');
          this.normalizedStyleElements.add(el);
        }

        // Get effective background color that sits directly behind this element
        const effectiveBg = this.getEffectiveBackgroundColor(el);
        const isDarkBg = this.isDarkBackground(effectiveBg);
        const isBrightBg = this.isBrightBackground(effectiveBg);

        // Collision Check A: White-on-White text
        if (isBrightBg && this.isBrightText(comp.color)) {
          el.style.setProperty('background-color', '#12131c', 'important');
          el.style.setProperty('color', '#ffffff', 'important');
          el.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
          this.normalizedStyleElements.add(el);
        }

        // Collision Check B: Dark-on-Dark text (e.g. Times of India headline)
        else if (isDarkBg && this.isLowContrastTextOnDark(comp.color)) {
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

      // Style GitHub Contribution Calendar in rich hues of pink
      this.styleGitHubContributionGrid();

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

    styleGitHubContributionGrid() {
      // Find all contribution day cells across table and SVG modes
      const days = document.querySelectorAll(`
        td.ContributionCalendar-day, rect.ContributionCalendar-day, 
        .ContributionCalendar-grid [data-level], .ContributionCalendar-day
      `);

      if (days.length === 0) return;

      const pinkShades = {
        '0': { bg: '#171827', border: '#272a3e' },
        '1': { bg: '#5c183d', border: 'rgba(255, 0, 122, 0.45)' },
        '2': { bg: '#9e145e', border: 'rgba(255, 0, 122, 0.7)' },
        '3': { bg: '#d8006b', border: '#FF007A' },
        '4': { bg: '#FF007A', border: '#ff70b3' }
      };

      days.forEach(el => {
        const level = el.getAttribute('data-level') || '0';
        const shade = pinkShades[level] || pinkShades['0'];

        if (!el.hasAttribute('data-zw-orig-style') && el.getAttribute('style')) {
          el.setAttribute('data-zw-orig-style', el.getAttribute('style'));
        }

        el.style.setProperty('background-color', shade.bg, 'important');
        el.style.setProperty('fill', shade.bg, 'important');
        el.style.setProperty('border', `1px solid ${shade.border}`, 'important');
        el.style.setProperty('border-radius', '2px', 'important');
        this.normalizedStyleElements.add(el);
      });

      // Style the legend dots at the bottom right
      const legendItems = document.querySelectorAll('.ContributionCalendar-legend [data-level], ul.legend [data-level]');
      legendItems.forEach(item => {
        const level = item.getAttribute('data-level') || '0';
        const shade = pinkShades[level] || pinkShades['0'];
        if (!item.hasAttribute('data-zw-orig-style') && item.getAttribute('style')) {
          item.setAttribute('data-zw-orig-style', item.getAttribute('style'));
        }
        item.style.setProperty('background-color', shade.bg, 'important');
        item.style.setProperty('fill', shade.bg, 'important');
        item.style.setProperty('border', `1px solid ${shade.border}`, 'important');
        item.style.setProperty('border-radius', '2px', 'important');
        this.normalizedStyleElements.add(item);
      });
    }

    revertContrastNormalization() {
      if (this.domMutationObserver) {
        this.domMutationObserver.disconnect();
        this.domMutationObserver = null;
      }

      this.normalizedStyleElements.forEach(el => {
        if (el && el.isConnected) {
          if (el.hasAttribute('data-zw-orig-style')) {
            const orig = el.getAttribute('data-zw-orig-style');
            if (orig) {
              el.setAttribute('style', orig);
            } else {
              el.removeAttribute('style');
            }
            el.removeAttribute('data-zw-orig-style');
          } else {
            el.style.removeProperty('background-color');
            el.style.removeProperty('background-image');
            el.style.removeProperty('color');
            el.style.removeProperty('-webkit-text-fill-color');
            el.style.removeProperty('fill');
            el.style.removeProperty('border');
            el.style.removeProperty('border-radius');
            el.style.removeProperty('caret-color');
          }
        }
      });
      this.normalizedStyleElements.clear();
    }

    getEffectiveBackgroundColor(el) {
      let curr = el;
      while (curr && curr !== document && curr !== document.documentElement) {
        const bg = window.getComputedStyle(curr).backgroundColor;
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
          const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (m && (m[4] === undefined || parseFloat(m[4]) >= 0.15)) {
            return bg;
          }
        }
        curr = curr.parentElement;
      }
      return 'rgb(9, 10, 15)'; // Default ZenWeb cyber-dark canvas
    }

    isDarkBackground(colorStr) {
      if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return true;
      const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m) return true;
      if (m[4] !== undefined && parseFloat(m[4]) < 0.15) return true;
      const r = parseInt(m[1], 10);
      const g = parseInt(m[2], 10);
      const b = parseInt(m[3], 10);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum < 0.40;
    }

    isBrightBackground(colorStr) {
      if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return false;
      const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m) return false;
      if (m[4] !== undefined && parseFloat(m[4]) < 0.15) return false;
      const r = parseInt(m[1], 10);
      const g = parseInt(m[2], 10);
      const b = parseInt(m[3], 10);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum >= 0.55;
    }

    isLowContrastTextOnDark(colorStr) {
      if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return true;
      const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m) return false;
      if (m[4] !== undefined && parseFloat(m[4]) < 0.15) return true;
      const r = parseInt(m[1], 10);
      const g = parseInt(m[2], 10);
      const b = parseInt(m[3], 10);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum < 0.68; // Anything below 68% luminance has poor contrast on dark canvas
    }

    isBrightText(colorStr) {
      if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return false;
      const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m) return false;
      if (m[4] !== undefined && parseFloat(m[4]) < 0.15) return false;
      const r = parseInt(m[1], 10);
      const g = parseInt(m[2], 10);
      const b = parseInt(m[3], 10);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum >= 0.68;
    }

    isDarkColor(colorStr) {
      return this.isLowContrastTextOnDark(colorStr);
    }

    isBrightColor(colorStr) {
      return this.isBrightBackground(colorStr);
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

    /**
     * Splits paragraph text into granular, scannable bullet points
     * Breaks along sentence boundaries (.?!), semicolons (;), dashes (—), and coordinating conjunctions
     * @param {string} text
     * @returns {Array<string>}
     */
    splitIntoGranularBullets(text) {
      if (!text) return [];

      // Split on sentence terminals (.?!), semicolons (;), or long dashes (—, --)
      const primarySegments = text
        .split(/(?:[.?!]+[\s\n\r]+|[;][\s\n\r]+|(?:\s*[\u2014\u2013]|\s*--\s*))/g)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const bullets = [];

      primarySegments.forEach(seg => {
        // Clean leading bullet marks or numbers
        const clean = seg.replace(/^[•\-*#\d.]+\s*/, '').trim();
        if (clean.length < 12) return;

        // If a segment is long (> 18 words), split on conversational transition phrases
        const words = clean.split(/\s+/);
        if (words.length > 18) {
          const subChunks = clean.split(/,\s+(?:however|furthermore|moreover|meanwhile|specifically|in addition|consequently|therefore|which|whereas|while|especially)\b/i);
          if (subChunks.length > 1) {
            subChunks.forEach(chunk => {
              const subClean = chunk.trim();
              if (subClean.length >= 14) {
                bullets.push(subClean);
              }
            });
            return;
          }
        }

        bullets.push(clean);
      });

      return bullets.length > 0 ? bullets : [text.trim()];
    }

    /* ==========================================================================
       6. WEBPAGE DATA RESTRUCTURING & AI BENTO COGNITIVE RE-LAYOUT ENGINE
       ========================================================================== */

    detectPageArchetype() {
      // 1. Developer Profile / Showcase (GitHub, GitLab, Portfolio)
      if (document.querySelector('.vcard-names, [itemtype*="Person"], .user-profile-bio, .js-profile-editable-area') ||
          (window.location.hostname.includes('github.com') && document.querySelector('.js-pinned-items-reorder-list, .pinned-item-list-item'))) {
        return 'developer-profile';
      }
      // 2. Editorial / Long-form News / Blog (Times of India, Medium, Wikipedia, Substack)
      if (document.querySelector('article, [itemprop="articleBody"], .story-section, .article-body, .artText') ||
          document.querySelectorAll('article p, main p, div[class*="content"] p').length >= 3) {
        return 'editorial-article';
      }
      // 3. General Web Dashboard / Portal
      return 'general-dashboard';
    }

    applyDataRestructuring() {
      if (this.isRestructured) return;
      this.isRestructured = true;

      const root = document.documentElement;
      root.setAttribute('data-zenweb-theme', 'pixel-dark');
      root.setAttribute('data-zenweb-font', 'circular-digital');
      root.setAttribute('data-zenweb-restructured', 'true');

      const archetype = this.detectPageArchetype();
      if (archetype === 'developer-profile') {
        this.applyDeveloperProfileBentoRestructuring();
      } else {
        this.applyStandardCognitiveRestructuring(archetype);
      }
    }

    /* --------------------------------------------------------------------------
       A. Developer Profile Bento Transformation (Max Observability & Polish)
       -------------------------------------------------------------------------- */
    applyDeveloperProfileBentoRestructuring() {
      // 1. Locate and Cleanly Hide Native Redundant Containers (Overrides GitHub Primer !important)
      const sidebar = document.querySelector('.Layout-sidebar, [itemtype*="Person"], .user-profile-sticky-bar');
      const mainTarget = document.querySelector('.Layout-main, main, [role="main"]') || document.body;

      if (sidebar) {
        this.aiHiddenNodes.add(sidebar);
        sidebar.style.setProperty('display', 'none', 'important');
      }

      // Hide all occurrences of native pinned repository containers and headers
      const pinnedSelectors = `
        .js-pinned-items-reorder-container,
        [data-pinned-items-reorder-container],
        .pinned-items-container,
        ol.js-pinned-items-reorder-list,
        .pinned-item-list-item,
        h2.f4.mb-2,
        [class*="popular-repositories"],
        a[href*="/customize_pinned_items"]
      `;
      const redundantPinnedElements = document.querySelectorAll(pinnedSelectors);
      redundantPinnedElements.forEach(el => {
        const container = el.closest('.js-pinned-items-reorder-container, [data-pinned-items-reorder-container]') || el;
        this.aiHiddenNodes.add(container);
        container.style.setProperty('display', 'none', 'important');
      });

      // 2. Clean, De-duplicated Profile Attributes Extraction
      // A. Extract Pronouns first
      let pronouns = '';
      const pronounEl = document.querySelector('[itemprop="pronouns"], .user-profile-pronouns, [class*="pronoun"]');
      if (pronounEl) {
        pronouns = pronounEl.innerText.replace(/[()·•[\]]/g, '').trim();
      }

      // B. Extract pure GitHub Handle (e.g. "mehakag1120-cmd")
      let handle = '';
      const handleEl = document.querySelector('.vcard-username, [itemprop="additionalName"], .p-nickname, [class*="username"]');
      if (handleEl) {
        const rawHandle = handleEl.innerText.trim();
        const tokenMatch = rawHandle.match(/^[^\s·•/()]+/);
        handle = tokenMatch ? tokenMatch[0].replace(/^@/, '').trim() : '';
        if (!pronouns && rawHandle.includes('·')) {
          pronouns = rawHandle.split('·')[1].replace(/[()·•[\]]/g, '').trim();
        }
      }
      if (!handle) {
        handle = window.location.pathname.replace(/^\//, '').split('/')[0] || 'Developer';
      }

      // C. Extract pure Display Name (e.g. "meg")
      let name = '';
      const nameEl = document.querySelector('.vcard-fullname, [itemprop="name"], .p-name');
      if (nameEl) {
        name = nameEl.innerText.trim();
      } else {
        const vcardH1 = document.querySelector('h1.vcard-names');
        if (vcardH1) {
          const firstSpan = vcardH1.querySelector('span:first-child');
          if (firstSpan && !firstSpan.classList.contains('vcard-username')) {
            name = firstSpan.innerText.trim();
          }
        }
      }

      // De-duplicate: Ensure display name does not repeat handle or pronouns
      if (name) {
        if (handle) {
          name = name.replace(new RegExp('@?' + handle.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), '');
        }
        if (pronouns) {
          name = name.replace(new RegExp(pronouns.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), '');
        }
        name = name.replace(/^[·•\s\-_()]+|[·•\s\-_()]+$/g, '').trim();
      }

      // Normalize if name is empty or identical to handle
      if (name && name.toLowerCase() === handle.toLowerCase()) {
        name = '';
      }

      const avatarImg = document.querySelector('.avatar-user, [itemprop="image"], img.avatar, [class*="avatar"] img');
      const avatarSrc = avatarImg ? avatarImg.src : '';

      const bioEl = document.querySelector('.user-profile-bio, .p-note, [class*="user-bio"]');
      const bio = bioEl ? bioEl.innerText.trim() : '';

      const editBtn = document.querySelector('.js-profile-editable-edit-button, button[class*="edit-button"], [data-tab-item="overview"] ~ * button');
      const editBtnText = editBtn ? editBtn.innerText.trim() : 'Edit Profile';

      // 3. Extract Pinned Repositories / Showcase Items
      const repoItems = Array.from(document.querySelectorAll('ol.js-pinned-items-reorder-list li, .pinned-item-list-item, [data-repo]'));
      const projects = [];

      repoItems.forEach(item => {
        const titleEl = item.querySelector('.repo, span[title], a[href*="/"]');
        const title = titleEl ? titleEl.innerText.trim() : '';
        const linkEl = item.querySelector('a[href*="/"]');
        const href = linkEl ? linkEl.href : '#';
        const descEl = item.querySelector('.pinned-item-desc, p, [class*="desc"]');
        const description = descEl ? descEl.innerText.trim() : 'Public engineering repository.';
        const langEl = item.querySelector('[itemprop="programmingLanguage"], .repo-language-color + span, [class*="language"]');
        const language = langEl ? langEl.innerText.trim() : '';
        const langDot = item.querySelector('.repo-language-color');
        const langColor = langDot?.style?.backgroundColor || (language === 'TypeScript' ? '#3178c6' : (language === 'JavaScript' ? '#f1e05a' : '#00FF66'));
        const starEl = item.querySelector('a[href*="/stargazers"]');
        const stars = starEl ? starEl.innerText.trim() : '';

        if (title) {
          projects.push({ name: title, href, description, language, langColor, stars });
        }
      });

      // 4. Build Master Bento Matrix
      const matrix = document.createElement('div');
      matrix.id = 'zenweb-bento-matrix';
      matrix.className = 'zw-bento-matrix';

      // Header Telemetry Banner
      const bannerHTML = `
        <div class="zw-ai-architect-banner">
          <div class="zw-ai-architect-header">
            <div class="zw-ai-architect-left">
              <div class="zw-ai-pulse-dot"></div>
              <span class="zw-pixel-pill-green">● AI AGENT ACTIVE</span>
              <span class="zw-pixel-tag">[COGNITIVE RE-LAYOUT: BENTO OBSERVABILITY MATRIX]</span>
            </div>
            <div class="zw-ai-architect-right">
              <span class="zw-ai-archetype-pill">DEVELOPER SHOWCASE</span>
              <button class="zw-btn-pixel-revert" id="zw-bento-revert-btn" title="Revert to original native layout">[RESTORE NATIVE]</button>
            </div>
          </div>
          <div class="zw-ai-reasoning-box">
            <div class="zw-ai-reasoning-text">
              <strong>AI AGENT THOUGHT:</strong> Restructured page architecture into a balanced Bento Grid: unified profile identity hero, ${projects.length || 4} pinned project containers with live language telemetry, and decoupled redundant native containers.
            </div>
          </div>
        </div>
      `;

      // Intelligent Executive Briefing (Profile specific)
      const briefingTakeaways = window.ZenWebAI?.generateProfileBriefing({
        name, handle, pronouns, bio, projects
      }) || [
        `Profile Identity: ${name ? `${name} (@${handle})` : `@${handle}`}${pronouns ? ` [${pronouns}]` : ''} — Public Developer Portfolio & Engineering Showcase.`,
        `Bio & Focus: "${bio || 'Active developer'}" — Software architecture & web systems.`,
        `Featured Repositories: ${projects.length} open-source projects highlighted in high observability cards.`,
        `Bento Matrix Telemetry: Balanced 2-column grid applied with live language beacons.`,
        `Sensory Regulation: Calming sliding pixel ambient canvas active.`
      ];

      const briefingHTML = `
        <div class="zw-pixel-window zw-overview-window" style="margin: 0 !important;" id="zw-bento-briefing-window">
          <div class="zw-pixel-window-header">
            <div class="zw-header-left">
              <span class="zw-pixel-pill-pink">AI BRIEFING</span>
              <span class="zw-pixel-tag">EXECUTIVE CORE</span>
            </div>
            <div class="zw-header-right" style="display:flex; align-items:center; gap:8px;">
              <button class="zw-pixel-minimize" id="zw-briefing-minimize" title="Minimize briefing">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                  <path d="M5 12h14" stroke="#9499aa" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
              </button>
              <button class="zw-pixel-close" id="zw-briefing-close" title="Close briefing">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#9499aa" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="zw-overview-body" id="zw-bento-briefing-body">
            <div class="zw-overview-badge-row">
              <span class="zw-badge-accent-pink">CORE TAKEAWAYS</span>
              <span style="font-size:11px; color:#9499aa;">Developer Profile Overview (5 key takeaways)</span>
            </div>
            <ul class="zw-overview-bullets">
              ${briefingTakeaways.map((b, i) => `
                <li class="zw-overview-bullet-item">
                  <span class="zw-bullet-num">0${i + 1}</span>
                  <span>${this.escapeHTML(b)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      `;

      // Hero Identity Tile (Clean, Non-repetitive)
      const pronounBadge = pronouns ? `<span class="zw-hero-pronoun">${this.escapeHTML(pronouns)}</span>` : '';
      const bioHTML = bio ? `<div class="zw-hero-bio">“${this.escapeHTML(bio)}”</div>` : '';
      const avatarHTML = avatarSrc ? `<div class="zw-hero-avatar-frame"><img src="${this.escapeHTML(avatarSrc)}" alt="${this.escapeHTML(name || handle)}"/></div>` : '';

      const heroNameHTML = name ? `<span class="zw-hero-name">${this.escapeHTML(name)}</span>` : '';
      const heroHandleHTML = `<span class="zw-hero-handle">@${this.escapeHTML(handle)}</span>`;

      const heroHTML = `
        <div class="zw-bento-hero-tile">
          <div class="zw-hero-left">
            ${avatarHTML}
            <div class="zw-hero-meta">
              <div class="zw-hero-title-row">
                ${heroNameHTML}
                ${heroHandleHTML}
                ${pronounBadge}
              </div>
              ${bioHTML}
            </div>
          </div>
          <div class="zw-hero-actions">
            <button class="zw-btn-hero-action" id="zw-bento-action-btn">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>[${this.escapeHTML(editBtnText.toUpperCase())}]</span>
            </button>
            <span class="zw-pixel-pill-cyan">[${projects.length || '4'} REPOSITORIES]</span>
            <span class="zw-pixel-pill-green">[ONLINE]</span>
          </div>
        </div>
      `;

      // Project Showcase Bento Grid
      let projectCardsHTML = '';
      projects.forEach((proj, idx) => {
        const isPink = idx % 2 === 1;
        const blockNum = idx < 9 ? `0${idx + 1}` : `${idx + 1}`;
        projectCardsHTML += `
          <div class="zw-bento-card ${isPink ? 'zw-bento-card-pink' : ''}">
            <div>
              <div class="zw-bento-card-head">
                <span class="zw-pixel-tag">[PROJECT // ${blockNum}]</span>
                <span class="zw-pixel-pill-cyan">PUBLIC REPO</span>
              </div>
              <a class="zw-bento-card-title" href="${this.escapeHTML(proj.href)}" target="_blank" rel="noopener">
                ${this.escapeHTML(proj.name)}
              </a>
              <div class="zw-bento-card-desc">
                ${this.escapeHTML(proj.description)}
              </div>
            </div>
            <div class="zw-bento-card-footer">
              <div class="zw-lang-indicator">
                <span class="zw-lang-dot" style="background-color: ${proj.langColor}; color: ${proj.langColor};"></span>
                <span>${this.escapeHTML(proj.language || 'Code')}</span>
              </div>
              ${proj.stars ? `<span style="color:#00FF66;">★ ${this.escapeHTML(proj.stars)}</span>` : '<span style="color:#9499aa;">[STABLE]</span>'}
            </div>
          </div>
        `;
      });

      const gridHTML = `
        <div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px;">
            <span class="zw-pixel-tag">[FEATURED REPOSITORY MATRIX]</span>
            <span style="font-family:var(--zw-font-mono, monospace); font-size:11px; color:#9499aa;">BALANCED 2-COLUMN OBSERVABILITY</span>
          </div>
          <div class="zw-bento-grid">
            ${projectCardsHTML}
          </div>
        </div>
      `;

      matrix.innerHTML = bannerHTML + briefingHTML + heroHTML + gridHTML;

      // 5. Mount Bento Matrix
      if (mainTarget.firstChild) {
        mainTarget.insertBefore(matrix, mainTarget.firstChild);
      } else {
        mainTarget.appendChild(matrix);
      }
      this.bentoMatrixEl = matrix;

      // 6. Interactive Event Listeners
      matrix.querySelector('#zw-bento-revert-btn')?.addEventListener('click', () => {
        this.removeDataRestructuring();
        this.showToast("Native layout restored.");
      });

      matrix.querySelector('#zw-bento-action-btn')?.addEventListener('click', () => {
        if (editBtn) {
          editBtn.click();
        } else {
          this.showToast("Developer profile action triggered.");
        }
      });

      // Briefing Minimize/Close Handlers
      matrix.querySelector('#zw-briefing-minimize')?.addEventListener('click', () => {
        const body = matrix.querySelector('#zw-bento-briefing-body');
        const btn = matrix.querySelector('#zw-briefing-minimize');
        const window_ = matrix.querySelector('#zw-bento-briefing-window');
        if (body) {
          const isCollapsed = body.style.display === 'none';
          body.style.display = isCollapsed ? '' : 'none';
          if (window_) {
            window_.classList.toggle('zw-briefing-collapsed', !isCollapsed);
          }
          if (btn) {
            btn.innerHTML = isCollapsed
              ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M5 12h14" stroke="#9499aa" stroke-width="2.5" stroke-linecap="round"/></svg>'
              : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M12 5v14M5 12h14" stroke="#00FF66" stroke-width="2.5" stroke-linecap="round"/></svg>';
            btn.title = isCollapsed ? 'Minimize briefing' : 'Expand briefing';
          }
        }
      });

      matrix.querySelector('#zw-briefing-close')?.addEventListener('click', () => {
        const window_ = matrix.querySelector('#zw-bento-briefing-window');
        if (window_) {
          window_.style.display = 'none';
        }
      });
    }

    /* --------------------------------------------------------------------------
       B. Editorial & General Cognitive Restructuring
       -------------------------------------------------------------------------- */
    applyStandardCognitiveRestructuring(archetype = 'editorial-article') {
      // 1. Inject Executive Briefing Card at the top of main content
      this.injectExecutiveOverview();

      // 2. Inject AI Architect Banner for editorial awareness
      const mainEl = document.querySelector('article, main, [role="main"], #content, .post, .article, .story-section') || document.body;
      if (!document.getElementById('zenweb-ai-architect-banner')) {
        const banner = document.createElement('div');
        banner.id = 'zenweb-ai-architect-banner';
        banner.className = 'zw-ai-architect-banner';
        const archetypeLabel = archetype === 'editorial-article' ? 'EDITORIAL ARTICLE' : 'GENERAL DASHBOARD';
        banner.innerHTML = `
          <div class="zw-ai-architect-header">
            <div class="zw-ai-architect-left">
              <div class="zw-ai-pulse-dot"></div>
              <span class="zw-pixel-pill-green">● AI AGENT ACTIVE</span>
              <span class="zw-pixel-tag">[COGNITIVE RE-LAYOUT: SCANNABLE DECK]</span>
            </div>
            <div class="zw-ai-architect-right">
              <span class="zw-ai-archetype-pill">${archetypeLabel}</span>
              <button class="zw-btn-pixel-revert" id="zw-editorial-revert-btn" title="Revert to native text">[RESTORE NATIVE]</button>
            </div>
          </div>
          <div class="zw-ai-reasoning-box">
            <div class="zw-ai-reasoning-text">
              <strong>AI AGENT THOUGHT:</strong> Restructured dense prose into high-contrast scannable bullet blocks, silenced intrusive ads, and synthesized 5 key executive takeaways.
            </div>
          </div>
        `;

        if (mainEl.firstChild) {
          mainEl.insertBefore(banner, mainEl.firstChild);
        } else {
          mainEl.appendChild(banner);
        }

        banner.querySelector('#zw-editorial-revert-btn')?.addEventListener('click', () => {
          this.removeDataRestructuring();
          this.showToast("Native text restored.");
        });
      }

      // 3. Find substantial paragraph elements and restructure into granular cards
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
        if (text.length >= 50) {
          const bulletList = this.splitIntoGranularBullets(text);
          if (bulletList.length === 0) return;

          const card = document.createElement('div');
          card.className = 'zw-restructured-card';

          let bulletHTML = '';
          bulletList.forEach(s => {
            const cleanSentence = s.trim();
            if (cleanSentence.length > 5) {
              const parts = cleanSentence.split(' ');
              const leadCount = Math.min(4, Math.max(1, Math.floor(parts.length * 0.28)));
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
              <span class="zw-card-meta">${bulletList.length} KEY POINTS</span>
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

      // 1. Remove Bento Matrix & AI Banners
      if (this.bentoMatrixEl) {
        this.bentoMatrixEl.remove();
        this.bentoMatrixEl = null;
      }
      document.getElementById('zenweb-ai-architect-banner')?.remove();
      document.getElementById('zenweb-executive-card')?.remove();

      // 2. Unhide all native elements preserved in aiHiddenNodes
      this.aiHiddenNodes.forEach(node => {
        if (node && node.isConnected) {
          node.style.display = '';
        }
      });
      this.aiHiddenNodes.clear();

      // 3. Restore all original paragraph elements
      this.restructuredCardsMap.forEach((card, originalP) => {
        if (card && card.parentNode) {
          card.remove();
        }
        if (originalP && originalP.isConnected) {
          originalP.style.display = '';
        }
      });
      this.restructuredCardsMap.clear();

      this.updateDockState();
    }

    injectExecutiveOverview() {
      if (document.getElementById('zenweb-executive-card')) return;

      const mainEl = document.querySelector('article, main, [role="main"], #content, .post, .article, .story-section') || document.body;
      const cleanText = this.extractCleanText(mainEl);
      if (cleanText.split(/\s+/).length < 80) return;

      const card = document.createElement('div');
      card.id = 'zenweb-executive-card';
      card.className = 'zw-pixel-window zw-overview-window';
      card.innerHTML = `
        <div class="zw-pixel-window-header">
          <div class="zw-header-left">
            <span class="zw-pixel-pill-pink">AI BRIEFING</span>
            <span class="zw-pixel-tag">EXECUTIVE CORE</span>
          </div>
          <div class="zw-header-right" style="display:flex; align-items:center; gap:8px;">
            <button class="zw-pixel-minimize" id="zw-overview-minimize" title="Minimize briefing">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <path d="M5 12h14" stroke="#9499aa" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="zw-pixel-close" id="zw-overview-close" title="Close briefing">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#9499aa" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="zw-overview-body" id="zw-editorial-briefing-body">
          <div class="zw-overview-badge-row">
            <span class="zw-badge-accent-pink">CORE TAKEAWAYS</span>
            <span style="font-size:11px; color:#9499aa;">High-visibility scannable mode (5 key takeaways)</span>
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

      card.querySelector('#zw-overview-close').addEventListener('click', () => card.style.display = 'none');

      card.querySelector('#zw-overview-minimize')?.addEventListener('click', () => {
        const body = card.querySelector('#zw-editorial-briefing-body');
        const btn = card.querySelector('#zw-overview-minimize');
        if (body) {
          const isCollapsed = body.style.display === 'none';
          body.style.display = isCollapsed ? '' : 'none';
          card.classList.toggle('zw-briefing-collapsed', !isCollapsed);
          if (btn) {
            btn.innerHTML = isCollapsed
              ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M5 12h14" stroke="#9499aa" stroke-width="2.5" stroke-linecap="round"/></svg>'
              : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M12 5v14M5 12h14" stroke="#00FF66" stroke-width="2.5" stroke-linecap="round"/></svg>';
            btn.title = isCollapsed ? 'Minimize briefing' : 'Expand briefing';
          }
        }
      });

      if (window.ZenWebAI) {
        window.ZenWebAI.generate3BulletSummary(cleanText, 5).then(bullets => {
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

    /* ==========================================================================
       7. BESPOKE HARDWARE REMOTE PANEL (8-BIT PIXEL ICONS - RETRO CYBER DECK)
       ========================================================================== */

    getTogglePixelSVG(isOn) {
      if (isOn) {
        return `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" style="shape-rendering: crispEdges;">
            <!-- Outer Pixel Track Frame (Electric Green Glow) -->
            <rect x="3" y="6" width="18" height="12" fill="#0c2417" stroke="#00FF66" stroke-width="1.5"/>
            <!-- Left Active Fill -->
            <rect x="5" y="8" width="7" height="8" fill="#00FF66" fill-opacity="0.28"/>
            <!-- ON Bar '|' -->
            <rect x="7" y="10" width="2" height="4" fill="#00FF66"/>
            <!-- Pixel Slider Knob (Right) -->
            <rect x="12" y="5" width="8" height="14" fill="#00FF66"/>
            <rect x="14" y="7" width="4" height="10" fill="#FFFFFF"/>
            <rect x="15" y="9" width="2" height="6" fill="#00FF66"/>
          </svg>
        `;
      } else {
        return `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" style="shape-rendering: crispEdges;">
            <!-- Outer Pixel Track Frame (Muted Dark) -->
            <rect x="3" y="6" width="18" height="12" fill="#12131c" stroke="#3d4157" stroke-width="1.5"/>
            <!-- Right Dark Cavity -->
            <rect x="11" y="8" width="8" height="8" fill="#090a10"/>
            <!-- OFF Circle 'O' in right track -->
            <rect x="14" y="9" width="4" height="6" fill="#50546d"/>
            <rect x="15" y="10" width="2" height="4" fill="#090a10"/>
            <!-- Pixel Slider Knob (Left) -->
            <rect x="4" y="5" width="8" height="14" fill="#4a4d62"/>
            <rect x="5" y="7" width="4" height="10" fill="#6f748f"/>
            <rect x="6" y="9" width="2" height="6" fill="#2e3247"/>
          </svg>
        `;
      }
    }

    getVisionPixelSVG(isOn) {
      if (isOn) {
        return `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" style="shape-rendering: crispEdges;">
            <!-- Stepped Pixel Upper Eyelid Arc (Green) -->
            <rect x="8" y="5" width="8" height="2" fill="#00FF66"/>
            <rect x="5" y="7" width="3" height="2" fill="#00FF66"/>
            <rect x="16" y="7" width="3" height="2" fill="#00FF66"/>
            <rect x="2" y="9" width="3" height="2" fill="#00FF66"/>
            <rect x="19" y="9" width="3" height="2" fill="#00FF66"/>
            <!-- Stepped Pixel Lower Eyelid Arc -->
            <rect x="2" y="13" width="3" height="2" fill="#00FF66"/>
            <rect x="19" y="13" width="3" height="2" fill="#00FF66"/>
            <rect x="5" y="15" width="3" height="2" fill="#00FF66"/>
            <rect x="16" y="15" width="3" height="2" fill="#00FF66"/>
            <rect x="8" y="17" width="8" height="2" fill="#00FF66"/>
            <!-- Sclera Fill -->
            <rect x="5" y="9" width="14" height="6" fill="#00FF66" fill-opacity="0.14"/>
            <!-- Glowing Pixel Reticle / Iris (Center) -->
            <rect x="9" y="9" width="6" height="6" fill="#00FF66"/>
            <rect x="10" y="10" width="4" height="4" fill="#090a10"/>
            <rect x="11" y="11" width="2" height="2" fill="#FFFFFF"/>
            <!-- Active Cyber Radar Beams -->
            <rect x="11" y="2" width="2" height="2" fill="#00FF66"/>
            <rect x="11" y="20" width="2" height="2" fill="#00FF66"/>
            <rect x="6" y="3" width="2" height="1" fill="#FF007A"/>
            <rect x="16" y="3" width="2" height="1" fill="#FF007A"/>
          </svg>
        `;
      } else {
        return `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" style="shape-rendering: crispEdges;">
            <!-- Closed Eyelid Center Line -->
            <rect x="3" y="11" width="18" height="2" fill="#4a4d62"/>
            <!-- Stepped Curved Brow (dim) -->
            <rect x="6" y="9" width="12" height="1" fill="#2e3247"/>
            <!-- Downward Eyelashes -->
            <rect x="6" y="13" width="2" height="3" fill="#3d4157"/>
            <rect x="11" y="13" width="2" height="4" fill="#3d4157"/>
            <rect x="16" y="13" width="2" height="3" fill="#3d4157"/>
            <!-- Diagonal Pink Inactive Slash / Off Indicator -->
            <rect x="5" y="5" width="2" height="2" fill="#FF007A"/>
            <rect x="7" y="7" width="2" height="2" fill="#FF007A"/>
            <rect x="9" y="9" width="2" height="2" fill="#FF007A"/>
            <rect x="13" y="13" width="2" height="2" fill="#FF007A"/>
            <rect x="15" y="15" width="2" height="2" fill="#FF007A"/>
            <rect x="17" y="17" width="2" height="2" fill="#FF007A"/>
          </svg>
        `;
      }
    }

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

        <!-- 1. Pixel Game Console Icon (Title: GAMES) -->
        <button class="zw-dock-btn" id="zw-dock-game" title="Launch 90s Focus Reset Games">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" style="shape-rendering: crispEdges;">
            <!-- Outer Console Body -->
            <rect x="4" y="3" width="16" height="18" fill="#181a26" stroke="#2e3247" stroke-width="1"/>
            <rect x="5" y="2" width="14" height="1" fill="#3d425d"/>
            <!-- Screen Display with Pixel Sprite -->
            <rect x="6" y="5" width="12" height="7" fill="#090a10"/>
            <rect x="7" y="6" width="10" height="5" fill="#00FF66" fill-opacity="0.25"/>
            <rect x="7" y="6" width="2" height="1" fill="#FF007A"/>
            <rect x="11" y="7" width="2" height="2" fill="#00FF66"/>
            <rect x="13" y="8" width="2" height="2" fill="#00FF66"/>
            <!-- Pixel D-Pad on Left -->
            <rect x="7" y="14" width="2" height="5" fill="#00FF66"/>
            <rect x="5.5" y="15.5" width="5" height="2" fill="#00FF66"/>
            <rect x="7" y="15.5" width="2" height="2" fill="#00cc52"/>
            <!-- Pixel Action Buttons on Right -->
            <rect x="14" y="16.5" width="2.5" height="2.5" fill="#FF007A"/>
            <rect x="16.5" y="14" width="2.5" height="2.5" fill="#00FF66"/>
            <rect x="14" y="19" width="4" height="1" fill="#2e3247"/>
          </svg>
          <span class="zw-dock-label" id="zw-dock-game-label">GAMES</span>
        </button>

        <!-- 2. Pixel Waterdrop Icon (Title: WATER) -->
        <button class="zw-dock-btn" id="zw-dock-water" title="Log Hydration Break">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" style="shape-rendering: crispEdges;">
            <!-- Stepped Pixel Droplet Outer -->
            <rect x="11" y="2" width="2" height="2" fill="#38BDF8"/>
            <rect x="10" y="4" width="4" height="2" fill="#38BDF8"/>
            <rect x="9" y="6" width="6" height="2" fill="#38BDF8"/>
            <rect x="8" y="8" width="8" height="2" fill="#38BDF8"/>
            <rect x="7" y="10" width="10" height="2" fill="#38BDF8"/>
            <rect x="6" y="12" width="12" height="4" fill="#38BDF8"/>
            <rect x="7" y="16" width="10" height="3" fill="#38BDF8"/>
            <rect x="8" y="19" width="8" height="2" fill="#38BDF8"/>
            <rect x="10" y="21" width="4" height="1" fill="#38BDF8"/>
            <!-- Inner Deep Cyan Shadow -->
            <rect x="10" y="13" width="6" height="5" fill="#0284C7"/>
            <rect x="9" y="15" width="8" height="2" fill="#0284C7"/>
            <!-- Pixel White Glint -->
            <rect x="8" y="10" width="2" height="3" fill="#FFFFFF"/>
            <rect x="7" y="12" width="2" height="4" fill="#FFFFFF"/>
            <rect x="9" y="8" width="2" height="2" fill="#FFFFFF"/>
          </svg>
          <span class="zw-dock-label" id="zw-dock-water-label">WATER</span>
        </button>

        <!-- 3. Pixel On/Off Toggle (Title: ON / OFF) -->
        <button class="zw-dock-btn" id="zw-dock-restructure" title="Toggle Focus Restructuring">
          <span id="zw-dock-toggle-icon-wrap"></span>
          <span class="zw-dock-label" id="zw-dock-toggle-label">ON</span>
        </button>

        <!-- 4. Pixel Vision Icon (Indicates AI Monitoring ON / OFF) -->
        <button class="zw-dock-btn" id="zw-dock-agent" title="AI Vision Activity Monitor">
          <span id="zw-dock-vision-icon-wrap"></span>
          <span class="zw-dock-label" id="zw-dock-agent-label">VISION</span>
        </button>

        <!-- 5. Minimize / Expand Toggle -->
        <button class="zw-dock-btn-min" id="zw-dock-minimize" title="Minimize Dock">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
            <path d="M5 12h14" stroke="#9499aa" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </button>
      `;

      document.documentElement.appendChild(dock);

      const minBtn = dock.querySelector('#zw-dock-minimize');
      minBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dock.classList.toggle('zw-dock-collapsed');
        const isCollapsed = dock.classList.contains('zw-dock-collapsed');
        minBtn.title = isCollapsed ? "Expand Dock" : "Minimize Dock";
        minBtn.innerHTML = isCollapsed
          ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none"><path d="M12 5v14M5 12h14" stroke="#00FF66" stroke-width="2.5" stroke-linecap="round"/></svg>'
          : '<svg viewBox="0 0 24 24" width="12" height="12" fill="none"><path d="M5 12h14" stroke="#9499aa" stroke-width="2.5" stroke-linecap="round"/></svg>';
      });

      dock.querySelector('.zw-dock-brand-badge').addEventListener('click', () => {
        if (dock.classList.contains('zw-dock-collapsed')) {
          dock.classList.remove('zw-dock-collapsed');
          minBtn.title = "Minimize Dock";
          minBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none"><path d="M5 12h14" stroke="#9499aa" stroke-width="2.5" stroke-linecap="round"/></svg>';
        }
      });

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
          this.showToast("✓ ZenWeb Mode: ON");
        } else {
          this.removeDataRestructuring();
          this.showToast("ZenWeb Mode: OFF (Native page restored)");
        }
        this.updateDockState();
      });

      dock.querySelector('#zw-dock-agent').addEventListener('click', () => {
        if (this.settings.screenMonitoringPermission !== true) {
          this.checkScreenMonitoringPermission();
        } else {
          this.settings.screenActivityMonitoring = !this.settings.screenActivityMonitoring;
          chrome.storage?.sync?.set({ screenActivityMonitoring: this.settings.screenActivityMonitoring });
          this.updateDockState();
          this.showToast(this.settings.screenActivityMonitoring
            ? "✓ AI Vision Activity Monitor: ON"
            : "AI Vision Activity Monitor: OFF");
        }
      });

      this.updateDockState();
    }

    updateDockState() {
      const dock = document.getElementById('zenweb-dock');
      if (!dock) return;

      const toggleBtn = dock.querySelector('#zw-dock-restructure');
      const toggleLabel = dock.querySelector('#zw-dock-toggle-label');
      const toggleIconWrap = dock.querySelector('#zw-dock-toggle-icon-wrap');

      const agentBtn = dock.querySelector('#zw-dock-agent');
      const agentLabel = dock.querySelector('#zw-dock-agent-label');
      const visionIconWrap = dock.querySelector('#zw-dock-vision-icon-wrap');

      // 3. Update Pixel On/Off Toggle (Title: ON or OFF)
      const isRestructureOn = this.settings?.dataRestructuring !== false;
      if (toggleIconWrap) {
        toggleIconWrap.innerHTML = this.getTogglePixelSVG(isRestructureOn);
      }
      if (toggleLabel) {
        toggleLabel.textContent = isRestructureOn ? 'ON' : 'OFF';
      }
      if (isRestructureOn) {
        toggleBtn?.classList.add('zw-dock-active');
        toggleBtn?.setAttribute('title', 'Focus Restructuring: ON (Click to Turn OFF)');
      } else {
        toggleBtn?.classList.remove('zw-dock-active');
        toggleBtn?.setAttribute('title', 'Focus Restructuring: OFF (Click to Turn ON)');
      }

      // 4. Update Pixel Vision Icon (Indicates AI Monitoring ON or OFF)
      const isVisionActive = this.settings?.screenMonitoringPermission && this.settings?.screenActivityMonitoring !== false;
      if (visionIconWrap) {
        visionIconWrap.innerHTML = this.getVisionPixelSVG(isVisionActive);
      }
      if (agentLabel) {
        agentLabel.textContent = isVisionActive ? 'VISION' : 'OFF';
      }
      if (isVisionActive) {
        agentBtn?.classList.add('zw-dock-active');
        agentBtn?.setAttribute('title', 'AI Vision Monitor: ON (Click to Pause)');
      } else {
        agentBtn?.classList.remove('zw-dock-active');
        agentBtn?.setAttribute('title', 'AI Vision Monitor: OFF (Click to Enable)');
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
      clone.querySelectorAll(`
        script, style, noscript, nav, footer, aside,
        button, input, textarea, select, form,
        [role="button"], [role="dialog"], [role="tooltip"], [role="navigation"],
        [aria-hidden="true"], .sr-only, .visually-hidden, svg,
        .avatar-upload, .js-user-profile-bio-form, [data-hotkey],
        [id^="zenweb-"], [class^="zw-"]
      `).forEach(el => el.remove());
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
