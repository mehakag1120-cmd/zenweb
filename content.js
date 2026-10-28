/**
 * ZenWeb Content Orchestrator
 * Comprehensive DOM transformer, Shadow DOM traverser, MutationObserver engine,
 * Bionic Reading converter, Reading Ruler, Smart Chunking, and Fatigue Monitor.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__ZENWEB_INITIALIZED__) return;
  window.__ZENWEB_INITIALIZED__ = true;

  class ZenWebContent {
    constructor() {
      this.settings = null;
      this.observer = null;
      this.rulerEl = null;
      this.tooltipEl = null;
      this.floatingPillEl = null;
      this.fatiguePromptEl = null;
      this.lastScrollY = window.scrollY;
      this.lastActivityTime = Date.now();
      this.scrollStuckStartTime = null;
      this.fatigueTimerInterval = null;
      this.bionicNodesCache = new Map(); // For clean toggling
      this.chunkedNodesCache = new Map();
      this.mousePos = { x: 0, y: 0 };

      this.init();
    }

    async init() {
      // 1. Anti-Flashbang Veil
      this.mountFlashbangVeil();

      // 2. Load Settings from chrome.storage.sync
      this.settings = await this.loadSettings();

      // 3. Apply Visual Themes and Specificity Engine
      this.applyThemeAndStyles();

      // 4. Mount DOM Overlays (Reading Ruler, Selection Tooltip, Floating Pill)
      this.mountReadingRuler();
      this.mountSelectionTooltip();
      this.mountFloatingPill();

      // 5. Initialize Bionic Reading, Smart Chunking, and Last-Read Anchor
      if (this.settings.bionicReading) this.enableBionicReading();
      if (this.settings.smartChunking) this.applySmartChunking();
      if (this.settings.lastReadAnchor) this.initLastReadAnchor();

      // 6. Mount AI Summary Card if article is detected
      if (this.settings.aiSummaryCard) {
        setTimeout(() => this.injectAISummaryCard(), 800);
      }

      // 7. Setup Dynamic SPA MutationObserver & Shadow DOM traversal
      this.setupMutationEngine();

      // 8. Setup Activity & Fatigue Dwell Monitor
      this.setupActivityMonitor();

      // 9. Listen for Runtime Extension Messages
      this.setupMessageListeners();

      // 10. Fade out anti-flashbang veil smoothly
      setTimeout(() => this.dismissFlashbangVeil(), 250);
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
       ANTI-FLASHBANG VEIL (Eliminates blinding white flashes during navigation)
       ========================================================================== */

    mountFlashbangVeil() {
      if (document.getElementById('zenweb-flashbang-veil')) return;
      const veil = document.createElement('div');
      veil.id = 'zenweb-flashbang-veil';
      document.documentElement.appendChild(veil);
    }

    dismissFlashbangVeil() {
      const veil = document.getElementById('zenweb-flashbang-veil');
      if (veil) {
        veil.classList.add('ff-fade-out');
        setTimeout(() => veil.remove(), 450);
      }
    }

    /* ==========================================================================
       SPECIFICITY OVERRIDE & THEME INJECTION
       ========================================================================== */

    applyThemeAndStyles() {
      const root = document.documentElement;

      if (!this.settings.enabled) {
        root.removeAttribute('data-zenweb-theme');
        root.removeAttribute('data-zenweb-font');
        root.removeAttribute('data-zenweb-shield');
        root.removeAttribute('data-zenweb-suppress-anim');
        root.removeAttribute('data-zenweb-max-width');
        return;
      }

      // Theme attribute
      if (this.settings.theme && this.settings.theme !== 'none') {
        root.setAttribute('data-zenweb-theme', this.settings.theme);
      } else {
        root.removeAttribute('data-zenweb-theme');
      }

      // Typography
      root.setAttribute('data-zenweb-font', this.settings.fontFamily || 'atkinson');
      root.setAttribute('data-zenweb-shield', this.settings.distractionShield ? 'true' : 'false');
      root.setAttribute('data-zenweb-suppress-anim', this.settings.animationSuppressor ? 'true' : 'false');
      root.setAttribute('data-zenweb-max-width', this.settings.maxLineLength ? 'true' : 'false');

      // CSS custom property overrides
      root.style.setProperty('--ff-line-height', this.settings.lineSpacing || '1.75');

      // Strip aggressive inline colors without disrupting layout grids
      this.normalizeInlineStyles(document.body);

      // Pierce open Shadow DOM trees
      this.pierceShadowRoots(document.documentElement);
    }

    /**
     * Safely clears jarring inline styles (background-color, color, font-size)
     * while preserving grid, flex, display, width, and position layout properties.
     */
    normalizeInlineStyles(container) {
      if (!container || !this.settings.enabled) return;

      const elements = container.querySelectorAll('article, p, span, div, h1, h2, h3, h4, h5, h6, li, a');
      elements.forEach(el => {
        // Skip ZenWeb's own UI elements
        if (el.closest('#zenweb-root, [id^="zenweb-"]')) return;

        const inlineBg = el.style.backgroundColor || el.style.background;
        const inlineColor = el.style.color;

        // If author forced black background or glaring neon colors
        if (inlineBg && !inlineBg.includes('url')) {
          el.style.backgroundColor = '';
          el.style.background = '';
        }
        if (inlineColor) {
          el.style.color = '';
        }
      });
    }

    /**
     * Recursive Shadow DOM Traverser
     * Injects scoped styles into isolated shadowRoot components
     */
    pierceShadowRoots(node) {
      if (!node) return;

      if (node.shadowRoot) {
        const shadow = node.shadowRoot;
        if (!shadow.querySelector('#zenweb-shadow-styles')) {
          const styleEl = document.createElement('style');
          styleEl.id = 'zenweb-shadow-styles';
          styleEl.textContent = `
            :host {
              font-family: var(--ff-font-stack, 'Atkinson Hyperlegible', sans-serif) !important;
              color: var(--ff-text, inherit) !important;
            }
            p, span, div, h1, h2, h3 {
              line-height: var(--ff-line-height, 1.7) !important;
              letter-spacing: 0.02em !important;
            }
          `;
          shadow.appendChild(styleEl);
        }
        this.pierceShadowRoots(shadow);
      }

      // Traverse children
      const children = node.children || [];
      for (let i = 0; i < children.length; i++) {
        this.pierceShadowRoots(children[i]);
      }
    }

    /**
     * Dynamic SPA Support: Throttled MutationObserver with requestAnimationFrame
     */
    setupMutationEngine() {
      let isThrottled = false;

      this.observer = new MutationObserver((mutations) => {
        if (!this.settings.enabled) return;

        if (!isThrottled) {
          isThrottled = true;
          requestAnimationFrame(() => {
            for (const mutation of mutations) {
              for (const addedNode of mutation.addedNodes) {
                if (addedNode.nodeType === Node.ELEMENT_NODE) {
                  if (!addedNode.closest('#zenweb-root, [id^="zenweb-"]')) {
                    this.normalizeInlineStyles(addedNode);
                    this.pierceShadowRoots(addedNode);

                    // Pause autoplay videos dynamically inserted
                    if (this.settings.animationSuppressor) {
                      const videos = addedNode.querySelectorAll('video[autoplay]');
                      videos.forEach(v => {
                        try { v.pause(); v.muted = true; } catch(e){}
                      });
                    }
                  }
                }
              }
            }
            isThrottled = false;
          });
        }
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    /* ==========================================================================
       READING RULER / LINE FOCUS (GPU-Accelerated WAAPI Follow-Cursor Lane)
       ========================================================================== */

    mountReadingRuler() {
      let ruler = document.getElementById('zenweb-ruler-overlay');
      if (!ruler) {
        ruler = document.createElement('div');
        ruler.id = 'zenweb-ruler-overlay';
        ruler.innerHTML = `
          <div class="ff-ruler-curtain-top" id="ff-ruler-curtain-top"></div>
          <div class="ff-ruler-aperture" id="ff-ruler-aperture"></div>
          <div class="ff-ruler-curtain-bottom" id="ff-ruler-curtain-bottom"></div>
        `;
        document.body.appendChild(ruler);
      }
      this.rulerEl = ruler;
      this.updateRulerVisibility();

      // Smooth 60-120fps tracking using requestAnimationFrame and translate3d
      let ticking = false;
      window.addEventListener('pointermove', (e) => {
        this.mousePos.x = e.clientX;
        this.mousePos.y = e.clientY;

        if (!ticking && this.settings.readingRuler) {
          requestAnimationFrame(() => {
            this.renderRulerPosition(this.mousePos.y);
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }

    renderRulerPosition(cursorY) {
      if (!this.rulerEl) return;
      const height = this.settings.rulerHeight || 120;
      const half = height / 2;
      const topCurtainHeight = Math.max(0, cursorY - half);
      const apertureTop = topCurtainHeight;
      const bottomCurtainTop = cursorY + half;

      const curtainTop = this.rulerEl.querySelector('#ff-ruler-curtain-top');
      const aperture = this.rulerEl.querySelector('#ff-ruler-aperture');
      const curtainBottom = this.rulerEl.querySelector('#ff-ruler-curtain-bottom');

      if (curtainTop && aperture && curtainBottom) {
        curtainTop.style.height = `${topCurtainHeight}px`;
        aperture.style.top = `${apertureTop}px`;
        aperture.style.height = `${height}px`;
        curtainBottom.style.top = `${bottomCurtainTop}px`;
        curtainBottom.style.height = `calc(100vh - ${bottomCurtainTop}px)`;
      }
    }

    updateRulerVisibility() {
      if (!this.rulerEl) return;
      if (this.settings.enabled && this.settings.readingRuler) {
        this.rulerEl.style.display = 'block';
        document.documentElement.style.setProperty('--ff-ruler-dim', this.settings.rulerDimOpacity || 0.65);
      } else {
        this.rulerEl.style.display = 'none';
      }
    }

    /* ==========================================================================
       BIONIC READING CONVERTER (Visual Anchor Leads)
       ========================================================================== */

    enableBionicReading() {
      const paragraphs = document.querySelectorAll('article p, main p, .entry-content p, p');
      paragraphs.forEach(p => {
        // Skip ZenWeb elements, headers, code, inputs
        if (p.closest('#zenweb-root, [id^="zenweb-"], pre, code, table, form')) return;
        if (this.bionicNodesCache.has(p)) return;

        this.bionicNodesCache.set(p, p.innerHTML);
        p.innerHTML = this.convertTextToBionicHTML(p.innerHTML);
      });
    }

    disableBionicReading() {
      this.bionicNodesCache.forEach((originalHTML, el) => {
        if (el && el.parentNode) {
          el.innerHTML = originalHTML;
        }
      });
      this.bionicNodesCache.clear();
    }

    convertTextToBionicHTML(html) {
      // Split by HTML tags to safely bold text nodes without mangling tag attributes
      const parts = html.split(/(<[^>]+>)/g);
      return parts.map(part => {
        if (part.startsWith('<') && part.endsWith('>')) {
          return part; // Return HTML tag intact
        }
        return part.replace(/(\b[a-zA-Z0-9']+\b)/g, (word) => {
          if (word.length <= 1) return word;
          const leadLen = Math.ceil(word.length * 0.45); // Bold initial 45%
          const lead = word.slice(0, leadLen);
          const tail = word.slice(leadLen);
          return `<b class="ff-bionic-lead">${lead}</b><span class="ff-bionic-tail">${tail}</span>`;
        });
      }).join('');
    }

    /* ==========================================================================
       SMART CHUNKING (Digestible 2-3 sentence sub-blocks)
       ========================================================================== */

    applySmartChunking() {
      const paragraphs = document.querySelectorAll('article p, main p, .entry-content p');
      paragraphs.forEach(p => {
        if (p.closest('#zenweb-root, [id^="zenweb-"], pre, code')) return;
        if (this.chunkedNodesCache.has(p)) return;

        const text = p.innerText || '';
        // Count sentences
        const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g);
        if (sentences && sentences.length > 5) {
          this.chunkedNodesCache.set(p, p.innerHTML);

          let newHTML = '';
          for (let i = 0; i < sentences.length; i += 3) {
            const chunk = sentences.slice(i, i + 3).join('');
            newHTML += `<span class="ff-chunk-block">${chunk}</span>`;
            if (i + 3 < sentences.length) {
              newHTML += `<div class="ff-chunk-divider"></div>`;
            }
          }
          p.innerHTML = newHTML;
        }
      });
    }

    removeSmartChunking() {
      this.chunkedNodesCache.forEach((orig, el) => {
        if (el && el.parentNode) el.innerHTML = orig;
      });
      this.chunkedNodesCache.clear();
    }

    /* ==========================================================================
       LAST-READ ANCHOR (Page Scroll Memory & Paragraph Bookmark)
       ========================================================================== */

    initLastReadAnchor() {
      const pageKey = 'zenweb_anchor_' + location.href.split('#')[0];
      const savedY = parseInt(sessionStorage.getItem(pageKey) || '0', 10);

      if (savedY > 300) {
        setTimeout(() => {
          window.scrollTo({ top: savedY, behavior: 'smooth' });
          this.highlightVisibleParagraph();
        }, 350);
      }

      // Record scroll position
      let scrollTimer = null;
      window.addEventListener('scroll', () => {
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          sessionStorage.setItem(pageKey, window.scrollY.toString());
        }, 500);
      }, { passive: true });
    }

    highlightVisibleParagraph() {
      const centerY = window.innerHeight * 0.4;
      const elements = document.elementsFromPoint(window.innerWidth / 2, centerY);
      const para = elements.find(el => el.tagName === 'P' || el.tagName === 'ARTICLE');

      if (para && !para.closest('#zenweb-root, [id^="zenweb-"]')) {
        para.classList.add('ff-last-read-anchor');
        setTimeout(() => {
          para.classList.remove('ff-last-read-anchor');
        }, 5000);
      }
    }

    /* ==========================================================================
       AI 3-BULLET EXECUTIVE SUMMARY CARD
       ========================================================================== */

    async injectAISummaryCard() {
      if (document.getElementById('zenweb-ai-summary-card')) return;

      const mainEl = document.querySelector('article, [role="main"], main') || document.body;
      const pageText = this.extractCleanText(mainEl);

      // Only show card for articles with substance (>300 words)
      if (pageText.split(/\s+/).length < 250) return;

      const card = document.createElement('div');
      card.id = 'zenweb-ai-summary-card';
      card.className = 'ff-ai-summary-card';
      card.innerHTML = `
        <div class="ff-ai-summary-header">
          <div class="ff-ai-summary-title">
            <span>⚡</span>
            <span>ZenWeb 3-Bullet Executive Overview</span>
            <span class="ff-ai-summary-badge">ADHD Clarity</span>
          </div>
          <button class="ff-ai-summary-close" id="ff-summary-close-btn" title="Dismiss Summary">✕</button>
        </div>
        <div id="ff-summary-loading" style="font-size: 14px; color: var(--ff-text-muted); display: flex; align-items: center; gap: 8px;">
          <span>🧠 Synthesizing key insights...</span>
        </div>
        <ul class="ff-ai-summary-list" id="ff-summary-list" style="display: none;"></ul>
      `;

      // Insert at the top of the main reading container
      if (mainEl.firstChild) {
        mainEl.insertBefore(card, mainEl.firstChild);
      } else {
        mainEl.appendChild(card);
      }

      card.querySelector('#ff-summary-close-btn').addEventListener('click', () => {
        card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = () => card.remove();
      });

      // Generate 3 bullets via AI engine
      if (window.ZenWebAI) {
        const bullets = await window.ZenWebAI.generate3BulletSummary(pageText);
        const list = card.querySelector('#ff-summary-list');
        const loading = card.querySelector('#ff-summary-loading');

        if (list && loading) {
          loading.style.display = 'none';
          list.style.display = 'flex';
          list.innerHTML = bullets.map((b, i) => `
            <li class="ff-ai-summary-item">
              <span class="ff-ai-summary-bullet">${i + 1}</span>
              <span>${b}</span>
            </li>
          `).join('');
        }
      }
    }

    /* ==========================================================================
       PLAIN-ENGLISH & TONE NEUTRALIZER FLOATING TOOLTIP
       ========================================================================== */

    mountSelectionTooltip() {
      if (document.getElementById('zenweb-selection-tooltip')) return;

      const tooltip = document.createElement('div');
      tooltip.id = 'zenweb-selection-tooltip';
      tooltip.innerHTML = `
        <button class="ff-tooltip-btn" id="ff-btn-simplify">
          <span>💡</span><span>Simplify</span>
        </button>
        <button class="ff-tooltip-btn" id="ff-btn-neutralize">
          <span>🕊️</span><span>Calm Tone</span>
        </button>
        <button class="ff-tooltip-btn" id="ff-btn-speak">
          <span>🔊</span><span>Listen</span>
        </button>
      `;
      document.body.appendChild(tooltip);
      this.tooltipEl = tooltip;

      // Handle selection change
      document.addEventListener('selectionchange', () => {
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : '';

        if (!text || text.length < 5 || sel.isCollapsed) {
          this.tooltipEl.classList.remove('ff-visible');
          return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          this.tooltipEl.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
          this.tooltipEl.style.top = `${rect.top + window.scrollY}px`;
          this.tooltipEl.classList.add('ff-visible');
        }
      });

      // Tooltip actions
      tooltip.querySelector('#ff-btn-simplify').addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = window.getSelection()?.toString().trim();
        if (!text) return;
        const result = await window.ZenWebAI.simplifyText(text);
        this.renderInlineResult("Plain-English Rewrite", result);
        this.tooltipEl.classList.remove('ff-visible');
      });

      tooltip.querySelector('#ff-btn-neutralize').addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = window.getSelection()?.toString().trim();
        if (!text) return;
        const result = await window.ZenWebAI.neutralizeTone(text);
        this.renderInlineResult("Emotionally Neutralized Tone", result);
        this.tooltipEl.classList.remove('ff-visible');
      });

      tooltip.querySelector('#ff-btn-speak').addEventListener('click', (e) => {
        e.stopPropagation();
        const text = window.getSelection()?.toString().trim();
        if (!text) return;
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(text);
          utter.rate = 1.0;
          utter.pitch = 1.0;
          window.speechSynthesis.speak(utter);
        }
        this.tooltipEl.classList.remove('ff-visible');
      });
    }

    renderInlineResult(title, text) {
      const existing = document.querySelector('.ff-ai-inline-result');
      if (existing) existing.remove();

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const rect = sel.getRangeAt(0).getBoundingClientRect();

      const resultBox = document.createElement('div');
      resultBox.className = 'ff-ai-inline-result';
      resultBox.style.left = `${rect.left + window.scrollX}px`;
      resultBox.style.top = `${rect.bottom + window.scrollY + 8}px`;

      resultBox.innerHTML = `
        <div class="ff-ai-inline-result-header">
          <span>${title}</span>
          <button style="all:initial; cursor:pointer; font-size:16px; color:inherit;" id="ff-close-inline-res">✕</button>
        </div>
        <div class="ff-ai-inline-result-content">${text}</div>
        <div style="font-size: 11px; color: var(--ff-text-muted);">ZenWeb Privacy-First AI</div>
      `;

      document.body.appendChild(resultBox);
      resultBox.querySelector('#ff-close-inline-res').addEventListener('click', () => resultBox.remove());

      // Auto dismiss on outside click
      const onOutClick = (e) => {
        if (!resultBox.contains(e.target)) {
          resultBox.remove();
          document.removeEventListener('pointerdown', onOutClick);
        }
      };
      setTimeout(() => document.addEventListener('pointerdown', onOutClick), 100);
    }

    /* ==========================================================================
       ACTIVITY & FATIGUE DWELL MONITOR (ADHD/AUTISTIC FREEZE DETECTION)
       ========================================================================== */

    setupActivityMonitor() {
      const resetActivity = () => {
        this.lastActivityTime = Date.now();
      };

      ['pointermove', 'keydown', 'click'].forEach(evt => {
        window.addEventListener(evt, resetActivity, { passive: true });
      });

      // Scroll Dwell Monitor: If user remains within +/- 40px of same scroll position for > 4 mins
      this.fatigueTimerInterval = setInterval(() => {
        if (!this.settings.fatigueDetection) return;

        const currentY = window.scrollY;
        const delta = Math.abs(currentY - this.lastScrollY);

        if (delta < 50) {
          if (!this.scrollStuckStartTime) {
            this.scrollStuckStartTime = Date.now();
          } else {
            const stuckDurationMs = Date.now() - this.scrollStuckStartTime;
            const thresholdMs = (this.settings.fatigueThresholdMinutes || 4) * 60 * 1000;

            if (stuckDurationMs >= thresholdMs) {
              this.showFatiguePrompt();
              this.scrollStuckStartTime = Date.now() + 600000; // Snooze 10 mins after prompt
            }
          }
        } else {
          // User progressed reading
          this.lastScrollY = currentY;
          this.scrollStuckStartTime = Date.now();
        }
      }, 10000);
    }

    showFatiguePrompt() {
      if (document.getElementById('zenweb-fatigue-prompt')) return;

      const prompt = document.createElement('div');
      prompt.id = 'zenweb-fatigue-prompt';
      prompt.innerHTML = `
        <div class="ff-fatigue-title">
          <span>🧠</span>
          <span>Gentle Cognitive Check-In</span>
        </div>
        <div class="ff-fatigue-body">
          You've been lingering on this section for a few minutes. Cognitive fatigue or executive freeze is normal! Would you like a 90-second sensory reset?
        </div>
        <div class="ff-fatigue-actions">
          <button class="ff-fatigue-btn-primary" id="ff-fatigue-play-btn">90s Focus Reset</button>
          <button class="ff-fatigue-btn-secondary" id="ff-fatigue-breathe-btn">Box Breathing</button>
          <button class="ff-fatigue-btn-secondary" id="ff-fatigue-dismiss-btn">Still Reading</button>
        </div>
      `;

      document.body.appendChild(prompt);

      prompt.querySelector('#ff-fatigue-play-btn').addEventListener('click', () => {
        prompt.remove();
        if (window.ZenWebGames) {
          window.ZenWebGames.launchGame('fluid', 90);
        }
      });

      prompt.querySelector('#ff-fatigue-breathe-btn').addEventListener('click', () => {
        prompt.remove();
        if (window.ZenWebGames) {
          window.ZenWebGames.startBreathingTransition();
        }
      });

      prompt.querySelector('#ff-fatigue-dismiss-btn').addEventListener('click', () => {
        prompt.remove();
      });
    }

    /* ==========================================================================
       FLOATING QUICK-ACCESS FOCUS PILL
       ========================================================================== */

    mountFloatingPill() {
      if (document.getElementById('zenweb-floating-pill')) return;

      const pill = document.createElement('div');
      pill.id = 'zenweb-floating-pill';
      pill.innerHTML = `
        <button class="ff-pill-btn" id="ff-pill-audio" title="Ambient Focus Sound">
          <span>🎧</span>
          <span class="ff-pill-tooltip">Focus Noise</span>
        </button>
        <button class="ff-pill-btn" id="ff-pill-ruler" title="Reading Ruler">
          <span>📏</span>
          <span class="ff-pill-tooltip">Reading Ruler</span>
        </button>
        <button class="ff-pill-btn" id="ff-pill-bionic" title="Bionic Reading">
          <span>📖</span>
          <span class="ff-pill-tooltip">Bionic Text</span>
        </button>
        <button class="ff-pill-btn" id="ff-pill-game" title="Micro Focus Break">
          <span>🎮</span>
          <span class="ff-pill-tooltip">90s Break</span>
        </button>
        <button class="ff-pill-btn" id="ff-pill-sidepanel" title="AI Assistant">
          <span>✨</span>
          <span class="ff-pill-tooltip">AI Co-Pilot</span>
        </button>
      `;

      document.body.appendChild(pill);
      this.floatingPillEl = pill;

      // Audio toggle
      const audioBtn = pill.querySelector('#ff-pill-audio');
      audioBtn.addEventListener('click', () => {
        if (!window.ZenWebAudio) return;
        if (window.ZenWebAudio.isPlaying) {
          window.ZenWebAudio.stop();
          audioBtn.classList.remove('ff-active');
        } else {
          window.ZenWebAudio.start(this.settings.soundEngine?.type || 'brown');
          audioBtn.classList.add('ff-active');
        }
      });

      // Ruler toggle
      const rulerBtn = pill.querySelector('#ff-pill-ruler');
      rulerBtn.addEventListener('click', () => {
        this.settings.readingRuler = !this.settings.readingRuler;
        rulerBtn.classList.toggle('ff-active', this.settings.readingRuler);
        this.updateRulerVisibility();
        chrome.storage?.sync?.set({ readingRuler: this.settings.readingRuler });
      });

      // Bionic toggle
      const bionicBtn = pill.querySelector('#ff-pill-bionic');
      bionicBtn.addEventListener('click', () => {
        this.settings.bionicReading = !this.settings.bionicReading;
        bionicBtn.classList.toggle('ff-active', this.settings.bionicReading);
        if (this.settings.bionicReading) {
          this.enableBionicReading();
        } else {
          this.disableBionicReading();
        }
        chrome.storage?.sync?.set({ bionicReading: this.settings.bionicReading });
      });

      // Micro Break Game launcher
      pill.querySelector('#ff-pill-game').addEventListener('click', () => {
        if (window.ZenWebGames) {
          window.ZenWebGames.launchGame('fluid', 90);
        }
      });

      // AI Side Panel opener
      pill.querySelector('#ff-pill-sidepanel').addEventListener('click', () => {
        chrome.runtime?.sendMessage({ type: 'OPEN_SIDE_PANEL' });
      });
    }

    /* ==========================================================================
       UTILITIES & TEXT EXTRACTION
       ========================================================================== */

    extractCleanText(container = document.body) {
      const clone = container.cloneNode(true);
      // Remove unwanted elements
      clone.querySelectorAll('script, style, noscript, nav, footer, aside, [id^="zenweb-"]').forEach(el => el.remove());
      return clone.innerText.replace(/\s+/g, ' ').trim();
    }

    /* ==========================================================================
       MESSAGING DISPATCHER
       ========================================================================== */

    setupMessageListeners() {
      chrome.runtime?.onMessage.addListener((msg, sender, sendResponse) => {
        switch (msg.type) {
          case 'UPDATE_SETTINGS':
            this.settings = { ...this.settings, ...msg.settings };
            this.applyThemeAndStyles();
            this.updateRulerVisibility();
            if (msg.settings.bionicReading !== undefined) {
              msg.settings.bionicReading ? this.enableBionicReading() : this.disableBionicReading();
            }
            if (msg.settings.smartChunking !== undefined) {
              msg.settings.smartChunking ? this.applySmartChunking() : this.removeSmartChunking();
            }
            sendResponse({ success: true });
            break;

          case 'LAUNCH_MICRO_BREAK':
            if (window.ZenWebGames) {
              window.ZenWebGames.launchGame(msg.gameType || 'fluid', msg.duration || 90);
            }
            sendResponse({ success: true });
            break;

          case 'TRIGGER_SELECTION_ACTION':
            if (msg.action === 'simplify') {
              window.ZenWebAI.simplifyText(msg.selectionText).then(res => {
                this.renderInlineResult("Plain-English Rewrite", res);
              });
            } else if (msg.action === 'neutralize') {
              window.ZenWebAI.neutralizeTone(msg.selectionText).then(res => {
                this.renderInlineResult("Emotionally Neutralized Statement", res);
              });
            }
            sendResponse({ success: true });
            break;

          case 'EXTRACT_PAGE_CONTENT':
            sendResponse({
              content: this.extractCleanText(),
              title: document.title,
              url: location.href
            });
            break;

          case 'PLAY_AMBIENT_AUDIO':
            if (window.ZenWebAudio) {
              window.ZenWebAudio.start(msg.audioType);
              if (msg.volume !== undefined) window.ZenWebAudio.setVolume(msg.volume);
            }
            sendResponse({ success: true });
            break;

          case 'STOP_AMBIENT_AUDIO':
            if (window.ZenWebAudio) {
              window.ZenWebAudio.stop();
            }
            sendResponse({ success: true });
            break;
        }
      });
    }
  }

  // Initialize ZenWeb on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ZenWebContent());
  } else {
    new ZenWebContent();
  }
})();
