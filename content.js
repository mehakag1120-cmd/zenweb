/**
 * ZenWeb Content Orchestrator (v2.2)
 * Human-crafted pixel-digital aesthetic inspired by books.baseten.com
 * Features:
 * 1. Sliding pixel matrix canvas (anti-aliased, DPR-scaled, GPU accelerated)
 * 2. Screen activity monitoring AI agent with explicit user permission dialog
 * 3. 15-minute randomized focus reset breaks (Dino Jump, Tetris, Whack-a-Dino)
 * 4. 30-minute water break hydration alerts with daily tracking
 * 5. Webpage data restructuring into scannable bullet cards with circular bold typography
 * 6. Bottom-left tactile digital dock
 */

(function () {
  'use strict';

  if (window.__ZENWEB_INITIALIZED__) return;
  window.__ZENWEB_INITIALIZED__ = true;

  class ZenWebContent {
    constructor() {
      this.settings = null;
      this.slidingPixelCanvas = null;
      this.slidingPixelCtx = null;
      this.pixelAnimId = null;
      this.pixels = [];
      this.gridDots = [];
      this.lastActivityTime = Date.now();
      this.lastScrollY = window.scrollY;
      this.scrollStuckStartTime = null;
      this.activityInterval = null;
      this.waterTimerInterval = null;
      this.restructuredCardsMap = new Map(); // originalElement -> cardElement
      this.isRestructured = false;

      // Expose globally for verification suites & extension calls
      window.__ZENWEB_CONTENT_INSTANCE__ = this;
      window.ZenWebContentInstance = this;

      this.init();
    }

    async init() {
      this.settings = await this.loadSettings();

      // 1. Mount Sliding Pixel Canvas
      this.mountSlidingPixelCanvas();

      // 2. Mount Bottom-Left Floating Control Dock
      this.mountFloatingDock();

      // 3. Prompt for Screen Activity Monitoring permission if not yet decided
      this.checkScreenMonitoringPermission();

      // 4. Apply Initial State
      if (this.settings.enabled !== false) {
        this.applyActiveState();
      } else {
        this.applyDisabledState();
      }

      // 5. Setup Screen Activity & Dwell Fatigue Monitoring
      this.setupActivityMonitor();

      // 6. Setup Hydration & Reset Interval Checkers
      this.setupTimers();

      // 7. Setup Chrome Runtime Message Listeners
      this.setupMessageListeners();
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

    /* ==========================================================================
       1. SLIDING PIXEL BACKGROUND CANVAS (books.baseten.com Aesthetic)
       ========================================================================== */

    mountSlidingPixelCanvas() {
      if (document.getElementById('zenweb-pixel-canvas')) return;

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
      const particleCount = Math.max(24, Math.floor(width / 45));

      // Palette strictly cohesive with Baseten Books (white/gray/black base with neon accents)
      const colors = ['#00FF66', '#FF007A', '#F4F6FB', '#00FF66'];

      for (let i = 0; i < particleCount; i++) {
        const size = Math.random() > 0.7 ? 5 : 3;
        this.pixels.push({
          x: Math.random() * width,
          y: Math.floor((Math.random() * height) / 36) * 36 + 18, // Snap to grid lane
          w: size,
          h: size,
          vx: 18 + Math.random() * 32, // Horizontal slide
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.18 + Math.random() * 0.35,
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
          this.renderSlidingPixels(dt);
        } else if (this.slidingPixelCtx && this.slidingPixelCanvas) {
          this.slidingPixelCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }

        this.pixelAnimId = requestAnimationFrame(loop);
      };

      this.pixelAnimId = requestAnimationFrame(loop);
    }

    renderSlidingPixels(dt) {
      if (!this.slidingPixelCtx || !this.slidingPixelCanvas) return;
      const ctx = this.slidingPixelCtx;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      // Discrete Matrix Dot Grid (Subtle, crisp technical publishing background)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
      const gridSize = 36;
      for (let x = 18; x < w; x += gridSize) {
        for (let y = 18; y < h; y += gridSize) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }

      // Sliding Pixels with Motion Trails
      this.pixels.forEach(p => {
        p.x += p.vx * dt;

        // Record trail positions
        p.trail.unshift({ x: p.x, y: p.y });
        if (p.trail.length > 4) p.trail.pop();

        // Wrap around screen boundaries
        if (p.x > w + 40) {
          p.x = -20;
          p.y = Math.floor((Math.random() * h) / gridSize) * gridSize + 18;
          p.trail = [];
        }

        // Draw Motion Trails
        p.trail.forEach((pos, idx) => {
          const trailAlpha = (p.alpha * (1 - (idx + 1) / (p.trail.length + 1))) * 0.6;
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
       2. SCREEN MONITORING PERMISSION REQUEST (EXPLICIT USER CONSENT)
       ========================================================================== */

    checkScreenMonitoringPermission() {
      // If already granted, nothing to show
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
            <div class="zw-agent-avatar">🤖</div>
            <div class="zw-permission-content">
              <h3>Allow Screen Activity Monitoring?</h3>
              <p>
                ZenWeb uses on-device pacing telemetry to detect cognitive fatigue and reading stalls. When you stay stuck on a section for several minutes, the agent offers a gentle 90-second focus reset.
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
        chrome.storage.sync.set({
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
        chrome.storage.sync.set({
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
       3. SCREEN ACTIVITY & COGNITIVE IDLE MONITOR
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

        // User hasn't scrolled significantly
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
          <div class="zw-idle-icon">🧠</div>
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
       4. 30-MINUTE WATER BREAK HYDRATION REMINDER
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
            <div class="zw-water-icon">💧</div>
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
          chrome.storage.sync.set({ lastWaterBreakTimestamp: now });
          this.triggerWaterBreakReminder();
        }
      }, 30000);
    }

    /* ==========================================================================
       5. WEBPAGE DATA RESTRUCTURING (BULLET CARDS & CIRCULAR BOLD FONTS)
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

      // Find substantial paragraph elements across broad selectors
      const selector = `
        article p, main p, [role="main"] p, .post p, .article-body p, 
        section p, .entry-content p, #content p, .markdown-body p, 
        div[class*="content"] p, div[class*="article"] p, div[class*="post"] p,
        body > p, div > p
      `.trim();

      const paragraphs = Array.from(document.querySelectorAll(selector));
      let blockIndex = 1;

      paragraphs.forEach((p) => {
        // Guard against ZenWeb internal elements, code blocks, navigation, etc.
        if (p.closest('#zenweb-root, [id^="zenweb-"], [class^="zw-"], pre, code, nav, footer, aside, header')) return;
        if (this.restructuredCardsMap.has(p)) return;

        const text = p.innerText?.trim() || '';
        // Only restructure paragraphs with real reading substance (>140 chars or >2 sentences)
        const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g);
        if (sentences && sentences.length >= 2 && text.length >= 130) {
          // Create the restructured replacement card
          const card = document.createElement('div');
          card.className = 'zw-restructured-card';

          let bulletHTML = '';
          sentences.forEach(s => {
            const cleanSentence = s.trim();
            if (cleanSentence.length > 12) {
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

          // Lossless swap: hide original p, insert card immediately after
          p.style.display = 'none';
          p.insertAdjacentElement('afterend', card);
          this.restructuredCardsMap.set(p, card);
        }
      });
    }

    removeDataRestructuring() {
      if (!this.isRestructured) return;
      this.isRestructured = false;

      const root = document.documentElement;
      root.removeAttribute('data-zenweb-theme');
      root.removeAttribute('data-zenweb-font');
      root.removeAttribute('data-zenweb-restructured');

      document.getElementById('zenweb-executive-card')?.remove();

      // Restore all original paragraph elements
      this.restructuredCardsMap.forEach((card, originalP) => {
        if (card && card.parentNode) {
          card.remove();
        }
        if (originalP) {
          originalP.style.display = '';
        }
      });
      this.restructuredCardsMap.clear();
    }

    injectExecutiveOverview() {
      if (document.getElementById('zenweb-executive-card')) return;

      const mainEl = document.querySelector('article, main, [role="main"], #content, .post, .article') || document.body;
      const cleanText = this.extractCleanText(mainEl);
      if (cleanText.split(/\s+/).length < 120) return;

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
            <span style="font-size:11px; color:#8f96a3;">High-visibility scannable mode</span>
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
       6. FLOATING DIGITAL DOCK WIDGET
       ========================================================================== */

    mountFloatingDock() {
      if (document.getElementById('zenweb-dock')) return;

      const dock = document.createElement('div');
      dock.id = 'zenweb-dock';
      dock.className = 'zw-floating-dock';
      dock.innerHTML = `
        <button class="zw-dock-btn" id="zw-dock-game" title="Launch 90s Focus Reset Game">
          <span>🎮</span>
          <span class="zw-dock-label">RESET</span>
        </button>
        <button class="zw-dock-btn" id="zw-dock-water" title="Log Hydration Break">
          <span>💧</span>
          <span class="zw-dock-label">WATER</span>
        </button>
        <button class="zw-dock-btn" id="zw-dock-restructure" title="Toggle Scannable Bullet Cards">
          <span>⚡</span>
          <span class="zw-dock-label">CARDS</span>
        </button>
        <button class="zw-dock-btn" id="zw-dock-agent" title="AI Screen Activity Monitor">
          <span>🤖</span>
          <span class="zw-dock-label" id="zw-dock-agent-label">AGENT</span>
        </button>
      `;

      document.body.appendChild(dock);

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

      if (this.settings.screenMonitoringPermission && this.settings.screenActivityMonitoring !== false) {
        agentBtn?.classList.add('zw-dock-active');
        if (agentLabel) agentLabel.textContent = 'ACTIVE';
      } else {
        agentBtn?.classList.remove('zw-dock-active');
        if (agentLabel) agentLabel.textContent = 'PAUSED';
      }
    }

    /* ==========================================================================
       7. STATE APPLICATION & REVERSION
       ========================================================================== */

    applyActiveState() {
      if (this.settings.dataRestructuring !== false) {
        this.applyDataRestructuring();
      }

      if (this.slidingPixelCanvas) {
        this.slidingPixelCanvas.style.display = 'block';
      }

      const dock = document.getElementById('zenweb-dock');
      if (dock) dock.style.display = 'flex';
    }

    applyDisabledState() {
      this.removeDataRestructuring();

      if (this.slidingPixelCanvas) {
        this.slidingPixelCanvas.style.display = 'none';
      }

      const dock = document.getElementById('zenweb-dock');
      if (dock) dock.style.display = 'none';

      document.getElementById('zenweb-idle-prompt')?.remove();
      document.getElementById('zenweb-water-modal')?.remove();
      document.getElementById('zenweb-game-modal')?.remove();
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
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('zw-fade-out');
        setTimeout(() => toast.remove(), 300);
      }, 3200);
    }

    setupMessageListeners() {
      chrome.runtime?.onMessage.addListener((msg, sender, sendResponse) => {
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
