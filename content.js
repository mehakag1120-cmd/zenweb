/**
 * ZenWeb Content Orchestrator (v2.1)
 * Screen Activity Monitoring AI Agent (with explicit user permission),
 * 15-minute randomized focus reset mini-games, 30-minute water break reminders,
 * Webpage Data Restructuring (scannable bullet cards, circular bold fonts),
 * and Sliding Pixel Background Canvas inspired by books.baseten.com.
 */

(function () {
  'use strict';

  if (window.__ZENWEB_INITIALIZED__) return;
  window.__ZENWEB_INITIALIZED__ = true;

  class ZenWebContent {
    constructor() {
      this.settings = null;
      this.observer = null;
      this.slidingPixelCanvas = null;
      this.slidingPixelCtx = null;
      this.pixelAnimId = null;
      this.pixels = [];
      this.lastActivityTime = Date.now();
      this.lastScrollY = window.scrollY;
      this.scrollStuckStartTime = null;
      this.activityInterval = null;
      this.waterTimerInterval = null;
      this.modifiedNodesCache = new Map();
      this.restructuredCardsCache = new Map();
      window.__ZENWEB_CONTENT_INSTANCE__ = this;

      this.init();
    }

    async init() {
      this.settings = await this.loadSettings();

      // 1. Mount Sliding Pixel Canvas (Inspired by books.baseten.com)
      this.mountSlidingPixelCanvas();

      // 2. Mount Floating Action Dock
      this.mountFloatingDock();

      // 3. Check Screen Monitoring Permission Dialog
      this.checkScreenMonitoringPermission();

      // 4. Apply State
      if (this.settings.enabled !== false) {
        this.applyActiveState();
      } else {
        this.applyDisabledState();
      }

      // 5. Setup Screen Activity Monitoring
      this.setupActivityMonitor();

      // 6. Setup Local Water & Focus Timers
      this.setupTimers();

      // 7. Setup Runtime Message Listeners
      this.setupMessageListeners();
    }

    /* ==========================================================================
       STORAGE & CONFIGURATION
       ========================================================================== */

    async loadSettings() {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.get(null, (items) => resolve(items || {}));
        } else {
          resolve({});
        }
      });
    }

    /* ==========================================================================
       1. SLIDING PIXEL BACKGROUND CANVAS (books.baseten.com aesthetic)
       ========================================================================== */

    mountSlidingPixelCanvas() {
      if (document.getElementById('zenweb-pixel-canvas')) return;

      const canvas = document.createElement('canvas');
      canvas.id = 'zenweb-pixel-canvas';
      canvas.className = 'zw-pixel-background';
      document.body.appendChild(canvas);

      this.slidingPixelCanvas = canvas;
      this.slidingPixelCtx = canvas.getContext('2d');

      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', resize);
      resize();

      // Generate initial sliding pixel nodes
      this.pixels = [];
      const count = 35;
      for (let i = 0; i < count; i++) {
        this.pixels.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          w: Math.random() > 0.6 ? 6 : 4,
          h: Math.random() > 0.6 ? 6 : 4,
          vx: 8 + Math.random() * 18, // Smooth horizontal slide
          vy: (Math.random() - 0.5) * 6,
          color: Math.random() > 0.3 ? '#00FF66' : '#FF007A',
          alpha: 0.15 + Math.random() * 0.35
        });
      }

      this.startPixelAnimation();
    }

    startPixelAnimation() {
      if (this.pixelAnimId) cancelAnimationFrame(this.pixelAnimId);

      let lastTime = performance.now();
      const loop = (timestamp) => {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        if (this.settings?.enabled && this.settings?.slidingPixels !== false) {
          this.renderSlidingPixels(dt);
        } else if (this.slidingPixelCtx) {
          this.slidingPixelCtx.clearRect(0, 0, this.slidingPixelCanvas.width, this.slidingPixelCanvas.height);
        }

        this.pixelAnimId = requestAnimationFrame(loop);
      };

      this.pixelAnimId = requestAnimationFrame(loop);
    }

    renderSlidingPixels(dt) {
      if (!this.slidingPixelCtx || !this.slidingPixelCanvas) return;
      const ctx = this.slidingPixelCtx;
      const w = this.slidingPixelCanvas.width;
      const h = this.slidingPixelCanvas.height;

      ctx.clearRect(0, 0, w, h);

      // Subtle matrix dot grid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        for (let y = 0; y < h; y += gridSize) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }

      // Sliding pixels with anti-aliased trails
      this.pixels.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.x > w + 20) p.x = -20;
        if (p.y > h + 20) p.y = -20;
        if (p.y < -20) p.y = h + 20;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // Motion trail dot
        ctx.globalAlpha = p.alpha * 0.4;
        ctx.fillRect(p.x - p.w * 1.5, p.y, p.w, p.h);
      });

      ctx.globalAlpha = 1;
    }

    /* ==========================================================================
       2. SCREEN MONITORING PERMISSION REQUEST (EXPLICIT USER CONSENT)
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
            <span class="zw-pixel-tag">[SYSTEM PROTOCOL // PERMISSION]</span>
            <span class="zw-pixel-status-green">AWAITING_CONSENT</span>
          </div>
          <div class="zw-permission-body">
            <div class="zw-agent-avatar">🤖</div>
            <div class="zw-permission-content">
              <h3>Enable AI Screen Activity Monitor?</h3>
              <p>
                To protect your focus and prevent executive freeze, ZenWeb's AI Agent monitors your reading pace and idle dwell time on this tab.
              </p>
              <ul class="zw-permission-list">
                <li><span class="zw-bullet-pink">■</span> <strong>100% On-Device & Private:</strong> Zero screen recording or data transmission.</li>
                <li><span class="zw-bullet-green">■</span> <strong>Idle Stall Detection:</strong> Offers gentle resets when reading momentum stops.</li>
                <li><span class="zw-bullet-green">■</span> <strong>Automated Rhythm:</strong> 15-min focus breaks & 30-min water alerts.</li>
              </ul>
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

      dialog.querySelector('#zw-grant-permission-btn').addEventListener('click', () => {
        this.settings.screenMonitoringPermission = true;
        chrome.storage.sync.set({ screenMonitoringPermission: true });
        dialog.remove();
        this.showToast("✓ AI Screen Activity Monitor Enabled!");
        this.updateDockState();
      });

      dialog.querySelector('#zw-deny-permission-btn').addEventListener('click', () => {
        this.settings.screenMonitoringPermission = false;
        chrome.storage.sync.set({ screenMonitoringPermission: false });
        dialog.remove();
        this.showToast("Screen monitor paused. You can enable it anytime in the popup.");
        this.updateDockState();
      });
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

      // Periodically check if user has stalled on screen
      if (this.activityInterval) clearInterval(this.activityInterval);
      this.activityInterval = setInterval(() => {
        if (!this.settings?.enabled) return;
        if (this.settings.screenMonitoringPermission !== true) return;
        if (this.settings.screenActivityMonitoring === false) return;

        const currentY = window.scrollY;
        const delta = Math.abs(currentY - this.lastScrollY);
        const idleThresholdMs = (this.settings.idleThresholdMinutes || 3) * 60 * 1000;

        // If stationary on screen
        if (delta < 50) {
          if (!this.scrollStuckStartTime) {
            this.scrollStuckStartTime = Date.now();
          } else {
            const dwellDuration = Date.now() - this.scrollStuckStartTime;
            if (dwellDuration >= idleThresholdMs) {
              this.showIdleAlert();
              this.scrollStuckStartTime = Date.now() + 600000; // Snooze 10 mins
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
          <span class="zw-pixel-tag">[AI AGENT // IDLE DETECTED]</span>
          <span class="zw-pixel-close" id="zw-idle-close">✕</span>
        </div>
        <div class="zw-idle-body">
          <div style="font-size: 28px;">🧠</div>
          <div>
            <strong>Cognitive Pause Detected</strong>
            <p>You've been lingering on this section for several minutes. Ready for a quick focus reset break?</p>
          </div>
        </div>
        <div class="zw-idle-actions">
          <button class="zw-btn-pixel-primary" id="zw-idle-game-btn">[🎮 90s FOCUS RESET]</button>
          <button class="zw-btn-pixel-secondary" id="zw-idle-water-btn">[💧 DRINK WATER]</button>
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
       4. 30-MINUTE WATER BREAK REMINDER
       ========================================================================== */

    triggerWaterBreakReminder() {
      if (document.getElementById('zenweb-water-modal')) return;

      const modal = document.createElement('div');
      modal.id = 'zenweb-water-modal';
      modal.className = 'zw-dialog-backdrop';
      modal.innerHTML = `
        <div class="zw-pixel-window zw-water-card">
          <div class="zw-pixel-window-header">
            <span class="zw-pixel-tag">[HYDRATION PROTOCOL // 30-MIN]</span>
            <span class="zw-pixel-status-green">ALERT_ACTIVE</span>
          </div>
          <div class="zw-water-body">
            <div class="zw-water-icon">💧</div>
            <div class="zw-water-text">
              <h3>Hydration Check-In</h3>
              <p>
                You've been focused for 30 minutes! Drinking water boosts oxygen flow to the prefrontal cortex and resets mental clarity.
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

      modal.querySelector('#zw-logged-water-btn').addEventListener('click', () => {
        chrome.runtime?.sendMessage({ type: 'LOG_WATER_BREAK' }, (res) => {
          this.showToast(`💧 Awesome! Total water breaks logged today: ${res?.count || 1}`);
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
      // Local fallback in case background alarm is delayed
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
      const root = document.documentElement;
      root.setAttribute('data-zenweb-theme', 'pixel-dark');
      root.setAttribute('data-zenweb-font', 'circular-digital');
      root.setAttribute('data-zenweb-restructured', 'true');

      // Top Executive Briefing Card
      this.injectExecutiveOverview();

      // Restructure dense paragraphs into scannable cards with bullet points
      const paragraphs = document.querySelectorAll('article p, main p, .content p, [role="main"] p');
      paragraphs.forEach((p, idx) => {
        if (p.closest('#zenweb-root, [id^="zenweb-"], [class^="zw-"], pre, code, nav, footer')) return;
        if (this.restructuredCardsCache.has(p)) return;

        const text = p.innerText?.trim() || '';
        // Only restructure paragraphs with substance (>200 chars or >3 sentences)
        const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g);
        if (sentences && sentences.length >= 3 && text.length > 180) {
          this.restructuredCardsCache.set(p, p.innerHTML);

          let bulletHTML = '';
          sentences.forEach(s => {
            const cleanSentence = s.trim();
            if (cleanSentence.length > 15) {
              // Highlight initial words
              const parts = cleanSentence.split(' ');
              const lead = parts.slice(0, 3).join(' ');
              const tail = parts.slice(3).join(' ');
              bulletHTML += `
                <li class="zw-bullet-item">
                  <span class="zw-bullet-marker">■</span>
                  <span class="zw-bullet-text"><strong>${lead}</strong> ${tail}</span>
                </li>
              `;
            }
          });

          p.innerHTML = `
            <div class="zw-restructured-card">
              <div class="zw-card-pill-row">
                <span class="zw-pixel-tag">[BLOCK // 0${(idx % 9) + 1}]</span>
                <span class="zw-card-meta">${sentences.length} SCANNABLE POINTS</span>
              </div>
              <ul class="zw-bullet-list">
                ${bulletHTML}
              </ul>
            </div>
          `;
        }
      });
    }

    removeDataRestructuring() {
      const root = document.documentElement;
      root.removeAttribute('data-zenweb-theme');
      root.removeAttribute('data-zenweb-font');
      root.removeAttribute('data-zenweb-restructured');

      document.getElementById('zenweb-executive-card')?.remove();

      this.restructuredCardsCache.forEach((origHTML, el) => {
        if (el && el.parentNode) {
          el.innerHTML = origHTML;
        }
      });
      this.restructuredCardsCache.clear();
    }

    injectExecutiveOverview() {
      if (document.getElementById('zenweb-executive-card')) return;

      const mainEl = document.querySelector('article, main, [role="main"]') || document.body;
      const cleanText = this.extractCleanText(mainEl);
      if (cleanText.split(/\s+/).length < 200) return;

      const card = document.createElement('div');
      card.id = 'zenweb-executive-card';
      card.className = 'zw-pixel-window zw-overview-window';
      card.innerHTML = `
        <div class="zw-pixel-window-header">
          <div class="zw-overview-header-left">
            <span class="zw-pixel-tag">[AI BRIEFING // EXECUTIVE OVERVIEW]</span>
            <span class="zw-pixel-status-green">RESTRUCTURED</span>
          </div>
          <span class="zw-pixel-close" id="zw-overview-close">✕</span>
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
                <span>${b}</span>
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
        <button class="zw-dock-btn" id="zw-dock-game" title="Take 90s Focus Reset Game">
          <span>🎮</span>
          <span class="zw-dock-label">RESET</span>
        </button>
        <button class="zw-dock-btn" id="zw-dock-water" title="Hydration Check-in">
          <span>💧</span>
          <span class="zw-dock-label">WATER</span>
        </button>
        <button class="zw-dock-btn" id="zw-dock-restructure" title="Toggle Bullet Restructuring">
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
        chrome.storage.sync.set({ dataRestructuring: this.settings.dataRestructuring });
        if (this.settings.dataRestructuring) {
          this.applyDataRestructuring();
          this.showToast("✓ Webpage data restructured into scannable bullet cards!");
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
          chrome.storage.sync.set({ screenActivityMonitoring: this.settings.screenActivityMonitoring });
          this.updateDockState();
          this.showToast(this.settings.screenActivityMonitoring
            ? "AI Screen Activity Monitor: ACTIVE"
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
      }, 3500);
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
            chrome.storage.sync.set({ dataRestructuring: this.settings.dataRestructuring });
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
