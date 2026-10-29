/**
 * ZenWeb Content Orchestrator (v2.0)
 * Comprehensive DOM transformer, Shadow DOM traverser, MutationObserver engine,
 * Frosted Glass Reading Ruler, Lossless Bionic Reading, Smart Chunking, and Activity Monitor.
 */

(function () {
  'use strict';

  // Prevent duplicate instances
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
      this.bionicNodesCache = new Map(); // For lossless toggling
      this.chunkedNodesCache = new Map();
      this.modifiedStyleNodes = new Set();
      this.mousePos = { x: 0, y: window.innerHeight / 2 };

      this.init();
    }

    async init() {
      // 1. Anti-Flashbang Veil
      this.mountFlashbangVeil();

      // 2. Load Settings from chrome.storage.sync
      this.settings = await this.loadSettings();

      // 3. Mount UI Overlays (Ruler, Tooltip, Floating Pill)
      this.mountReadingRuler();
      this.mountSelectionTooltip();
      this.mountFloatingPill();

      // 4. Apply State based on settings.enabled
      if (this.settings.enabled !== false) {
        this.applyActiveState();
      } else {
        this.applyDisabledState();
      }

      // 5. Dynamic SPA MutationObserver
      this.setupMutationEngine();

      // 6. Activity & Fatigue Monitor
      this.setupActivityMonitor();

      // 7. Listen for Extension Runtime Messages
      this.setupMessageListeners();

      // 8. Dismiss Anti-Flashbang Veil
      setTimeout(() => this.dismissFlashbangVeil(), 200);
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
       FULL STATE TOGGLE (100% Lossless On / Off Behavior)
       ========================================================================== */

    applyActiveState() {
      const root = document.documentElement;

      // Theme
      if (this.settings.theme && this.settings.theme !== 'none') {
        root.setAttribute('data-zenweb-theme', this.settings.theme);
      } else {
        root.removeAttribute('data-zenweb-theme');
      }

      // Typography & Shields
      root.setAttribute('data-zenweb-font', this.settings.fontFamily || 'lexend');
      root.setAttribute('data-zenweb-shield', this.settings.distractionShield ? 'true' : 'false');
      root.setAttribute('data-zenweb-suppress-anim', this.settings.animationSuppressor ? 'true' : 'false');
      root.setAttribute('data-zenweb-max-width', this.settings.maxLineLength ? 'true' : 'false');
      root.style.setProperty('--zw-line-height', this.settings.lineSpacing || '1.75');

      // Inline styles normalization
      this.normalizeInlineStyles(document.body);

      // Shadow DOM piercer
      this.pierceShadowRoots(document.documentElement);

      // Ruler visibility
      this.updateRulerVisibility();

      // Bionic Reading
      if (this.settings.bionicReading) {
        this.enableBionicReading();
      } else {
        this.disableBionicReading();
      }

      // Smart Chunking
      if (this.settings.smartChunking) {
        this.applySmartChunking();
      } else {
        this.removeSmartChunking();
      }

      // Last-Read Anchor
      if (this.settings.lastReadAnchor) {
        this.initLastReadAnchor();
      }

      // AI Summary Card
      if (this.settings.aiSummaryCard) {
        setTimeout(() => this.injectAISummaryCard(), 600);
      } else {
        document.getElementById('zenweb-ai-summary-card')?.remove();
      }

      // Floating pill active state
      if (this.floatingPillEl) {
        this.floatingPillEl.classList.remove('zw-disabled');
      }
    }

    applyDisabledState() {
      const root = document.documentElement;

      // 1. Remove all root theme attributes
      root.removeAttribute('data-zenweb-theme');
      root.removeAttribute('data-zenweb-font');
      root.removeAttribute('data-zenweb-shield');
      root.removeAttribute('data-zenweb-suppress-anim');
      root.removeAttribute('data-zenweb-max-width');
      root.style.removeProperty('--zw-line-height');

      // 2. Hide and deactivate Reading Ruler completely
      this.hideRuler();

      // 3. Losslessly restore Bionic Reading text
      this.disableBionicReading();

      // 4. Losslessly restore Chunked Paragraphs
      this.removeSmartChunking();

      // 5. Restore original inline styles
      this.restoreNormalizedStyles();

      // 6. Remove injected UI cards & prompts
      document.getElementById('zenweb-ai-summary-card')?.remove();
      document.getElementById('zenweb-fatigue-prompt')?.remove();
      document.querySelector('.zw-ai-inline-result')?.remove();

      if (this.tooltipEl) {
        this.tooltipEl.classList.remove('zw-visible');
      }

      // 7. Dim floating pill
      if (this.floatingPillEl) {
        this.floatingPillEl.classList.add('zw-disabled');
      }

      // 8. Stop ambient sound if playing
      if (window.ZenWebAudio && window.ZenWebAudio.isPlaying) {
        window.ZenWebAudio.stop();
      }
    }

    /* ==========================================================================
       ANTI-FLASHBANG VEIL
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
        veil.classList.add('zw-fade-out');
        setTimeout(() => veil.remove(), 400);
      }
    }

    /* ==========================================================================
       INLINE STYLE NORMALIZATION & LOSSLESS RESTORATION
       ========================================================================== */

    normalizeInlineStyles(container) {
      if (!container || !this.settings.enabled) return;

      const elements = container.querySelectorAll('article, p, span, div, h1, h2, h3, h4, h5, h6, li, a');
      elements.forEach(el => {
        if (el.closest('#zenweb-root, [id^="zenweb-"], [class^="zw-"]')) return;

        const inlineBg = el.style.backgroundColor || el.style.background;
        const inlineColor = el.style.color;

        if (inlineColor) {
          if (!el.dataset.zwOrigColor) {
            el.dataset.zwOrigColor = inlineColor;
            this.modifiedStyleNodes.add(el);
          }
          el.style.color = '';
        }

        if (inlineBg && !inlineBg.includes('url')) {
          if (!el.dataset.zwOrigBg) {
            el.dataset.zwOrigBg = inlineBg;
            this.modifiedStyleNodes.add(el);
          }
          el.style.backgroundColor = '';
          el.style.background = '';
        }
      });
    }

    restoreNormalizedStyles() {
      this.modifiedStyleNodes.forEach(el => {
        if (el && el.parentNode) {
          if (el.dataset.zwOrigColor) {
            el.style.color = el.dataset.zwOrigColor;
            delete el.dataset.zwOrigColor;
          }
          if (el.dataset.zwOrigBg) {
            el.style.backgroundColor = el.dataset.zwOrigBg;
            delete el.dataset.zwOrigBg;
          }
        }
      });
      this.modifiedStyleNodes.clear();
    }

    /* ==========================================================================
       SHADOW DOM PIERCER
       ========================================================================== */

    pierceShadowRoots(node) {
      if (!node) return;

      if (node.shadowRoot) {
        const shadow = node.shadowRoot;
        if (!shadow.querySelector('#zenweb-shadow-styles')) {
          const styleEl = document.createElement('style');
          styleEl.id = 'zenweb-shadow-styles';
          styleEl.textContent = `
            :host {
              font-family: var(--zw-font-stack, 'Lexend', sans-serif) !important;
              color: var(--zw-text, inherit) !important;
            }
            p, span, div, h1, h2, h3, li, a {
              color: var(--zw-text, inherit) !important;
              line-height: var(--zw-line-height, 1.75) !important;
              letter-spacing: 0.02em !important;
            }
          `;
          shadow.appendChild(styleEl);
        }
        this.pierceShadowRoots(shadow);
      }

      const children = node.children || [];
      for (let i = 0; i < children.length; i++) {
        this.pierceShadowRoots(children[i]);
      }
    }

    /* ==========================================================================
       DYNAMIC SPA MUTATION OBSERVER
       ========================================================================== */

    setupMutationEngine() {
      let isThrottled = false;

      this.observer = new MutationObserver((mutations) => {
        if (!this.settings || !this.settings.enabled) return;

        if (!isThrottled) {
          isThrottled = true;
          requestAnimationFrame(() => {
            for (const mutation of mutations) {
              for (const addedNode of mutation.addedNodes) {
                if (addedNode.nodeType === Node.ELEMENT_NODE) {
                  if (!addedNode.closest('#zenweb-root, [id^="zenweb-"], [class^="zw-"]')) {
                    this.normalizeInlineStyles(addedNode);
                    this.pierceShadowRoots(addedNode);

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
       FROSTED GLASS READING RULER (FIXED TOGGLE & BLURRED BOUNDARIES)
       ========================================================================== */

    mountReadingRuler() {
      let ruler = document.getElementById('zenweb-ruler-overlay');
      if (!ruler) {
        ruler = document.createElement('div');
        ruler.id = 'zenweb-ruler-overlay';
        ruler.innerHTML = `
          <div class="zw-ruler-curtain-top" id="zw-ruler-curtain-top"></div>
          <div class="zw-ruler-aperture" id="zw-ruler-aperture"></div>
          <div class="zw-ruler-curtain-bottom" id="zw-ruler-curtain-bottom"></div>
        `;
        document.body.appendChild(ruler);
      }
      this.rulerEl = ruler;
      this.updateRulerVisibility();

      // Fluid 60-120fps tracking using requestAnimationFrame
      let ticking = false;
      window.addEventListener('pointermove', (e) => {
        this.mousePos.x = e.clientX;
        this.mousePos.y = e.clientY;

        if (!ticking && this.settings.enabled && this.settings.readingRuler) {
          requestAnimationFrame(() => {
            this.renderRulerPosition(this.mousePos.y);
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }

    renderRulerPosition(cursorY) {
      if (!this.rulerEl || !this.settings.enabled || !this.settings.readingRuler) return;

      const height = this.settings.rulerHeight || 120;
      const half = height / 2;
      const topCurtainHeight = Math.max(0, cursorY - half);
      const apertureTop = topCurtainHeight;
      const bottomCurtainTop = cursorY + half;

      const curtainTop = this.rulerEl.querySelector('#zw-ruler-curtain-top');
      const aperture = this.rulerEl.querySelector('#zw-ruler-aperture');
      const curtainBottom = this.rulerEl.querySelector('#zw-ruler-curtain-bottom');

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
        this.rulerEl.classList.add('zw-active');
        this.renderRulerPosition(this.mousePos.y);
      } else {
        this.hideRuler();
      }
    }

    hideRuler() {
      if (this.rulerEl) {
        this.rulerEl.classList.remove('zw-active');
      }
    }

    /* ==========================================================================
       LOSSLESS BIONIC READING CONVERTER
       ========================================================================== */

    enableBionicReading() {
      const paragraphs = document.querySelectorAll('article p, main p, .entry-content p, p');
      paragraphs.forEach(p => {
        if (p.closest('#zenweb-root, [id^="zenweb-"], [class^="zw-"], pre, code, table, form')) return;
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
      const parts = html.split(/(<[^>]+>)/g);
      return parts.map(part => {
        if (part.startsWith('<') && part.endsWith('>')) return part;
        return part.replace(/(\b[a-zA-Z0-9']+\b)/g, (word) => {
          if (word.length <= 1) return word;
          const leadLen = Math.ceil(word.length * 0.45);
          const lead = word.slice(0, leadLen);
          const tail = word.slice(leadLen);
          return `<b class="zw-bionic-lead">${lead}</b><span class="zw-bionic-tail">${tail}</span>`;
        });
      }).join('');
    }

    /* ==========================================================================
       LOSSLESS SMART CHUNKING
       ========================================================================== */

    applySmartChunking() {
      const paragraphs = document.querySelectorAll('article p, main p, .entry-content p');
      paragraphs.forEach(p => {
        if (p.closest('#zenweb-root, [id^="zenweb-"], [class^="zw-"], pre, code')) return;
        if (this.chunkedNodesCache.has(p)) return;

        const text = p.innerText || '';
        const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g);
        if (sentences && sentences.length > 5) {
          this.chunkedNodesCache.set(p, p.innerHTML);

          let newHTML = '';
          for (let i = 0; i < sentences.length; i += 3) {
            const chunk = sentences.slice(i, i + 3).join('');
            newHTML += `<span class="zw-chunk-block">${chunk}</span>`;
            if (i + 3 < sentences.length) {
              newHTML += `<div class="zw-chunk-divider"></div>`;
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
       LAST-READ ANCHOR
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

      if (para && !para.closest('#zenweb-root, [id^="zenweb-"], [class^="zw-"]')) {
        para.classList.add('zw-last-read-anchor');
        setTimeout(() => {
          para.classList.remove('zw-last-read-anchor');
        }, 4500);
      }
    }

    /* ==========================================================================
       AI 3-BULLET EXECUTIVE SUMMARY CARD
       ========================================================================== */

    async injectAISummaryCard() {
      if (document.getElementById('zenweb-ai-summary-card')) return;

      const mainEl = document.querySelector('article, [role="main"], main') || document.body;
      const pageText = this.extractCleanText(mainEl);

      if (pageText.split(/\s+/).length < 220) return;

      const card = document.createElement('div');
      card.id = 'zenweb-ai-summary-card';
      card.className = 'zw-ai-summary-card';
      card.innerHTML = `
        <div class="zw-ai-summary-header">
          <div class="zw-ai-summary-title">
            <span>⚡</span>
            <span>ZenWeb 3-Bullet Executive Overview</span>
            <span class="zw-ai-summary-badge">ADHD Scannable</span>
          </div>
          <button class="zw-ai-summary-close" id="zw-summary-close-btn" title="Dismiss">✕</button>
        </div>
        <div id="zw-summary-loading" style="font-size: 14px; color: var(--zw-text-muted); display: flex; align-items: center; gap: 8px;">
          <span>🧠 Synthesizing key takeaways...</span>
        </div>
        <ul class="zw-ai-summary-list" id="zw-summary-list" style="display: none;"></ul>
      `;

      if (mainEl.firstChild) {
        mainEl.insertBefore(card, mainEl.firstChild);
      } else {
        mainEl.appendChild(card);
      }

      card.querySelector('#zw-summary-close-btn').addEventListener('click', () => {
        card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = () => card.remove();
      });

      if (window.ZenWebAI) {
        const bullets = await window.ZenWebAI.generate3BulletSummary(pageText);
        const list = card.querySelector('#zw-summary-list');
        const loading = card.querySelector('#zw-summary-loading');

        if (list && loading) {
          loading.style.display = 'none';
          list.style.display = 'flex';
          list.innerHTML = bullets.map((b, i) => `
            <li class="zw-ai-summary-item">
              <span class="zw-ai-summary-bullet">${i + 1}</span>
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
        <button class="zw-tooltip-btn" id="zw-btn-simplify">
          <span>💡</span><span>Simplify</span>
        </button>
        <button class="zw-tooltip-btn" id="zw-btn-neutralize">
          <span>🕊️</span><span>Calm Tone</span>
        </button>
        <button class="zw-tooltip-btn" id="zw-btn-speak">
          <span>🔊</span><span>Listen</span>
        </button>
      `;
      document.body.appendChild(tooltip);
      this.tooltipEl = tooltip;

      document.addEventListener('selectionchange', () => {
        if (!this.settings || !this.settings.enabled) {
          this.tooltipEl.classList.remove('zw-visible');
          return;
        }

        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : '';

        if (!text || text.length < 5 || sel.isCollapsed) {
          this.tooltipEl.classList.remove('zw-visible');
          return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          this.tooltipEl.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
          this.tooltipEl.style.top = `${rect.top + window.scrollY}px`;
          this.tooltipEl.classList.add('zw-visible');
        }
      });

      tooltip.querySelector('#zw-btn-simplify').addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = window.getSelection()?.toString().trim();
        if (!text) return;
        const result = await window.ZenWebAI.simplifyText(text);
        this.renderInlineResult("Plain-English Rewrite", result);
        this.tooltipEl.classList.remove('zw-visible');
      });

      tooltip.querySelector('#zw-btn-neutralize').addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = window.getSelection()?.toString().trim();
        if (!text) return;
        const result = await window.ZenWebAI.neutralizeTone(text);
        this.renderInlineResult("Emotionally Neutralized Tone", result);
        this.tooltipEl.classList.remove('zw-visible');
      });

      tooltip.querySelector('#zw-btn-speak').addEventListener('click', (e) => {
        e.stopPropagation();
        const text = window.getSelection()?.toString().trim();
        if (!text) return;
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(text);
          utter.rate = 1.0;
          window.speechSynthesis.speak(utter);
        }
        this.tooltipEl.classList.remove('zw-visible');
      });
    }

    renderInlineResult(title, text) {
      const existing = document.querySelector('.zw-ai-inline-result');
      if (existing) existing.remove();

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const rect = sel.getRangeAt(0).getBoundingClientRect();

      const resultBox = document.createElement('div');
      resultBox.className = 'zw-ai-inline-result';
      resultBox.style.left = `${rect.left + window.scrollX}px`;
      resultBox.style.top = `${rect.bottom + window.scrollY + 8}px`;

      resultBox.innerHTML = `
        <div class="zw-ai-inline-result-header">
          <span>${title}</span>
          <button style="all:initial; cursor:pointer; font-size:16px; color:inherit;" id="zw-close-inline-res">✕</button>
        </div>
        <div class="zw-ai-inline-result-content">${text}</div>
        <div style="font-size: 11px; color: var(--zw-text-muted);">ZenWeb Privacy-First AI</div>
      `;

      document.body.appendChild(resultBox);
      resultBox.querySelector('#zw-close-inline-res').addEventListener('click', () => resultBox.remove());

      const onOutClick = (e) => {
        if (!resultBox.contains(e.target)) {
          resultBox.remove();
          document.removeEventListener('pointerdown', onOutClick);
        }
      };
      setTimeout(() => document.addEventListener('pointerdown', onOutClick), 100);
    }

    /* ==========================================================================
       ACTIVITY & FATIGUE DWELL MONITOR
       ========================================================================== */

    setupActivityMonitor() {
      const resetActivity = () => {
        this.lastActivityTime = Date.now();
      };

      ['pointermove', 'keydown', 'click'].forEach(evt => {
        window.addEventListener(evt, resetActivity, { passive: true });
      });

      this.fatigueTimerInterval = setInterval(() => {
        if (!this.settings || !this.settings.enabled || !this.settings.fatigueDetection) return;

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
              this.scrollStuckStartTime = Date.now() + 600000; // Snooze 10m
            }
          }
        } else {
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
        <div class="zw-fatigue-title">
          <span>🧠</span>
          <span>Gentle Focus Check-In</span>
        </div>
        <div class="zw-fatigue-body">
          You've been hovering on this paragraph for a few minutes. Cognitive fatigue or executive freeze happens! Would you like a 90-second sensory reset?
        </div>
        <div class="zw-fatigue-actions">
          <button class="zw-btn-primary" id="zw-fatigue-play-btn">90s Reset</button>
          <button class="zw-btn-secondary" id="zw-fatigue-breathe-btn">Box Breath</button>
          <button class="zw-btn-secondary" id="zw-fatigue-dismiss-btn">Still Reading</button>
        </div>
      `;

      document.body.appendChild(prompt);

      prompt.querySelector('#zw-fatigue-play-btn').addEventListener('click', () => {
        prompt.remove();
        if (window.ZenWebGames) window.ZenWebGames.launchGame('fluid', 90);
      });

      prompt.querySelector('#zw-fatigue-breathe-btn').addEventListener('click', () => {
        prompt.remove();
        if (window.ZenWebGames) window.ZenWebGames.startBreathingTransition();
      });

      prompt.querySelector('#zw-fatigue-dismiss-btn').addEventListener('click', () => {
        prompt.remove();
      });
    }

    /* ==========================================================================
       BUBBLY FLOATING QUICK-ACCESS PILL
       ========================================================================== */

    mountFloatingPill() {
      if (document.getElementById('zenweb-floating-pill')) return;

      const pill = document.createElement('div');
      pill.id = 'zenweb-floating-pill';
      pill.innerHTML = `
        <button class="zw-pill-btn" id="zw-pill-audio" title="Toggle Ambient Audio">
          <span>🎧</span>
          <span class="zw-pill-tooltip">Focus Noise</span>
        </button>
        <button class="zw-pill-btn" id="zw-pill-ruler" title="Toggle Frosted Ruler">
          <span>📏</span>
          <span class="zw-pill-tooltip">Frosted Ruler</span>
        </button>
        <button class="zw-pill-btn" id="zw-pill-bionic" title="Toggle Bionic Reading">
          <span>📖</span>
          <span class="zw-pill-tooltip">Bionic Text</span>
        </button>
        <button class="zw-pill-btn" id="zw-pill-game" title="Take 90s Focus Break">
          <span>🎮</span>
          <span class="zw-pill-tooltip">90s Reset</span>
        </button>
        <button class="zw-pill-btn" id="zw-pill-sidepanel" title="AI Co-Pilot Panel">
          <span>✨</span>
          <span class="zw-pill-tooltip">AI Co-Pilot</span>
        </button>
      `;

      document.body.appendChild(pill);
      this.floatingPillEl = pill;

      // Audio toggle
      const audioBtn = pill.querySelector('#zw-pill-audio');
      audioBtn.addEventListener('click', () => {
        if (!window.ZenWebAudio) return;
        if (window.ZenWebAudio.isPlaying) {
          window.ZenWebAudio.stop();
          audioBtn.classList.remove('zw-active');
        } else {
          window.ZenWebAudio.start(this.settings.soundEngine?.type || 'brown');
          audioBtn.classList.add('zw-active');
        }
      });

      // Ruler toggle
      const rulerBtn = pill.querySelector('#zw-pill-ruler');
      rulerBtn.addEventListener('click', () => {
        this.settings.readingRuler = !this.settings.readingRuler;
        rulerBtn.classList.toggle('zw-active', this.settings.readingRuler);
        this.updateRulerVisibility();
        chrome.storage?.sync?.set({ readingRuler: this.settings.readingRuler });
      });

      // Bionic toggle
      const bionicBtn = pill.querySelector('#zw-pill-bionic');
      bionicBtn.addEventListener('click', () => {
        this.settings.bionicReading = !this.settings.bionicReading;
        bionicBtn.classList.toggle('zw-active', this.settings.bionicReading);
        if (this.settings.bionicReading) {
          this.enableBionicReading();
        } else {
          this.disableBionicReading();
        }
        chrome.storage?.sync?.set({ bionicReading: this.settings.bionicReading });
      });

      // Game launcher
      pill.querySelector('#zw-pill-game').addEventListener('click', () => {
        if (window.ZenWebGames) window.ZenWebGames.launchGame('fluid', 90);
      });

      // Side panel
      pill.querySelector('#zw-pill-sidepanel').addEventListener('click', () => {
        chrome.runtime?.sendMessage({ type: 'OPEN_SIDE_PANEL' });
      });
    }

    /* ==========================================================================
       UTILITIES & TEXT EXTRACTION
       ========================================================================== */

    extractCleanText(container = document.body) {
      const clone = container.cloneNode(true);
      clone.querySelectorAll('script, style, noscript, nav, footer, aside, [id^="zenweb-"], [class^="zw-"]').forEach(el => el.remove());
      return clone.innerText.replace(/\s+/g, ' ').trim();
    }

    /* ==========================================================================
       RUNTIME MESSAGING DISPATCHER
       ========================================================================== */

    setupMessageListeners() {
      chrome.runtime?.onMessage.addListener((msg, sender, sendResponse) => {
        switch (msg.type) {
          case 'UPDATE_SETTINGS':
            this.settings = { ...this.settings, ...msg.settings };

            // Full State Dispatch
            if (this.settings.enabled === false) {
              this.applyDisabledState();
            } else {
              this.applyActiveState();
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

  // Self-mount on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ZenWebContent());
  } else {
    new ZenWebContent();
  }
})();
