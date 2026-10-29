/**
 * ZenWeb Micro-Gaming Suite & Dopamine Protection Engine
 * 60-120 FPS Canvas rendering with DPR normalization.
 * Enforces strict hard-coded timers (90s/180s) and a 15-minute cooling period
 * to prevent ADHD hyperfixation traps, followed by a 30s box-breathing reset.
 */

class ZenWebGameEngine {
  constructor() {
    this.modalEl = null;
    this.canvasEl = null;
    this.ctx = null;
    this.animFrameId = null;
    this.currentGame = null;
    this.timeRemaining = 90; // Default 90 seconds
    this.timerInterval = null;
    this.isInputLocked = false;
    this.coolingPeriodMs = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Checks if user is currently locked out by the 15-minute cooling guard
   */
  async checkLockout() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['gameLockUntil'], (res) => {
          const lockUntil = res.gameLockUntil || 0;
          const now = Date.now();
          if (now < lockUntil) {
            resolve({ locked: true, remainingMs: lockUntil - now });
          } else {
            resolve({ locked: false, remainingMs: 0 });
          }
        });
      } else {
        const lockUntil = parseInt(localStorage.getItem('zenweb_gameLockUntil') || '0', 10);
        const now = Date.now();
        if (now < lockUntil) {
          resolve({ locked: true, remainingMs: lockUntil - now });
        } else {
          resolve({ locked: false, remainingMs: 0 });
        }
      }
    });
  }

  /**
   * Records game completion and locks further play for 15 minutes
   */
  async setLockout() {
    const lockUntil = Date.now() + this.coolingPeriodMs;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ gameLockUntil: lockUntil });
    }
    localStorage.setItem('zenweb_gameLockUntil', lockUntil.toString());
  }

  /**
   * Resets lockout for testing / manual override
   */
  async clearLockout() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ gameLockUntil: 0 });
    }
    localStorage.setItem('zenweb_gameLockUntil', '0');
  }

  /**
   * Launches a selected micro-game inside an isolated GPU-accelerated overlay
   * @param {'fluid' | 'pulse' | 'stack' | 'pattern' | 'runner'} gameType
   * @param {number} durationSeconds 90 or 180
   */
  async launchGame(gameType = 'fluid', durationSeconds = 90) {
    const status = await this.checkLockout();
    if (status.locked) {
      this.renderLockoutModal(status.remainingMs);
      return;
    }

    this.timeRemaining = durationSeconds;
    this.isInputLocked = false;
    this.renderGameModal(gameType);
    this.initCanvas(gameType);
    this.startCountdown();
  }

  /**
   * Renders Lockout Notification if user attempts to play before 15m cooling completes
   */
  renderLockoutModal(remainingMs) {
    this.closeAllModals();

    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);

    const modal = document.createElement('div');
    modal.id = 'zenweb-lockout-modal';
    modal.innerHTML = `
      <div class="zw-lockout-card">
        <div class="zw-lockout-icon">🛡️</div>
        <div class="zw-lockout-title">Dopamine Protection Active</div>
        <div class="zw-lockout-desc">
          Micro-breaks are designed to refresh your cognitive focus, not trigger dopamine rabbit holes or hyperfixation.
        </div>
        <div class="zw-lockout-time-left" id="zw-lockout-timer">${mins}m ${secs < 10 ? '0' : ''}${secs}s remaining</div>
        <div class="zw-lockout-desc" style="font-size: 13px;">
          Take a sip of water, stretch your shoulders, or try a 30-second breathing exercise.
        </div>
        <div style="display:flex; gap: 10px; margin-top: 10px;">
          <button class="zw-btn-primary" id="zw-lockout-breathe-btn">Guided Breathing</button>
          <button class="zw-btn-secondary" id="zw-lockout-close-btn">Return to Reading</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#zw-lockout-close-btn').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#zw-lockout-breathe-btn').addEventListener('click', () => {
      modal.remove();
      this.startBreathingTransition();
    });

    // Real-time countdown on lockout modal
    const interval = setInterval(() => {
      const el = document.getElementById('zw-lockout-timer');
      if (!el) {
        clearInterval(interval);
        return;
      }
      remainingMs -= 1000;
      if (remainingMs <= 0) {
        clearInterval(interval);
        modal.remove();
      } else {
        const m = Math.floor(remainingMs / 60000);
        const s = Math.floor((remainingMs % 60000) / 1000);
        el.textContent = `${m}m ${s < 10 ? '0' : ''}${s}s remaining`;
      }
    }, 1000);
  }

  /**
   * Injects the Game viewport modal
   */
  renderGameModal(gameType) {
    this.closeAllModals();

    const titles = {
      fluid: 'Zen Fluid Flow (Sensory Calm)',
      pulse: 'Rhythm Pulse (Vagal Sync)',
      stack: 'Zen Block Stacker (Kinetic Focus)',
      pattern: 'Harmonic Flow (Pattern Memory)',
      runner: 'Micro Flow Glide (Minimalist Flow)'
    };

    const modal = document.createElement('div');
    modal.id = 'zenweb-game-modal';
    modal.innerHTML = `
      <div class="zw-game-container">
        <div class="zw-game-hud">
          <div class="zw-game-title-group">
            <span style="font-size: 18px;">✨</span>
            <span class="zw-game-title">${titles[gameType] || 'Focus Reset Micro-Game'}</span>
          </div>
          <div class="zw-game-timer-pill">
            <div class="zw-game-timer-circle"></div>
            <span id="zw-game-countdown">${this.timeRemaining}s</span>
          </div>
        </div>

        <div class="zw-game-canvas-wrapper">
          <canvas id="zenweb-game-canvas"></canvas>
        </div>

        <div class="zw-game-footer">
          <span>🧠 Hard-limited to protect attention. Transition resets automatically at 0s.</span>
          <button class="zw-game-close-btn" id="zw-game-quit-btn">End Break Early</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    modal.querySelector('#zw-game-quit-btn').addEventListener('click', () => {
      this.terminateGame(false);
    });
  }

  /**
   * Initializes High-FPS Canvas with Device Pixel Ratio (Retina) scaling
   */
  initCanvas(gameType) {
    this.canvasEl = document.getElementById('zenweb-game-canvas');
    if (!this.canvasEl) return;

    this.ctx = this.canvasEl.getContext('2d');
    const rect = this.canvasEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvasEl.width = rect.width * dpr;
    this.canvasEl.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Instantiate chosen game engine
    switch (gameType) {
      case 'fluid':
        this.currentGame = new ZenFluidGame(this.canvasEl, this.ctx, width, height);
        break;
      case 'pulse':
        this.currentGame = new RhythmPulseGame(this.canvasEl, this.ctx, width, height);
        break;
      case 'stack':
        this.currentGame = new ZenStackerGame(this.canvasEl, this.ctx, width, height);
        break;
      case 'pattern':
        this.currentGame = new PatternFlowGame(this.canvasEl, this.ctx, width, height);
        break;
      case 'runner':
        this.currentGame = new MicroGlideGame(this.canvasEl, this.ctx, width, height);
        break;
      default:
        this.currentGame = new ZenFluidGame(this.canvasEl, this.ctx, width, height);
    }

    // High-FPS render loop with delta timing
    let lastTime = performance.now();
    const loop = (timestamp) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
      lastTime = timestamp;

      if (this.currentGame && !this.isInputLocked) {
        this.currentGame.update(dt);
        this.currentGame.render();
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Strict countdown timer
   */
  startCountdown() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.timeRemaining--;

      const countEl = document.getElementById('zw-game-countdown');
      if (countEl) {
        countEl.textContent = `${this.timeRemaining}s`;
        if (this.timeRemaining <= 10) {
          countEl.style.color = '#ff5252';
        }
      }

      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        this.terminateGame(true);
      }
    }, 1000);
  }

  /**
   * Game Termination Workflow:
   * 1. Hard input lock
   * 2. WAAPI fade out
   * 3. Tibetan Singing Bowl Chime
   * 4. 30-Second Guided Breathing Reset
   * 5. Set 15m cooling lockout
   */
  async terminateGame(naturalFinish = true) {
    if (this.isInputLocked) return;
    this.isInputLocked = true;

    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.currentGame && this.currentGame.destroy) {
      this.currentGame.destroy();
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    // Set 15-minute hyperfixation guard lockout
    await this.setLockout();

    // Play gentle chime
    if (window.ZenWebAudio) {
      window.ZenWebAudio.playZenChime();
    }

    // Fade out game modal using WAAPI
    if (this.modalEl) {
      const fade = this.modalEl.animate(
        [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.97)' }],
        { duration: 400, fill: 'forwards', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
      fade.onfinish = () => {
        this.closeAllModals();
        if (naturalFinish) {
          this.startBreathingTransition();
        }
      };
    } else if (naturalFinish) {
      this.startBreathingTransition();
    }
  }

  /**
   * 30-Second Guided Box Breathing Reset (4s Inhale, 4s Hold, 4s Exhale, 4s Hold)
   */
  startBreathingTransition() {
    this.closeAllModals();

    const breathingModal = document.createElement('div');
    breathingModal.id = 'zenweb-breathing-modal';
    breathingModal.innerHTML = `
      <div style="max-width: 480px; display: flex; flex-direction: column; align-items: center;">
        <div style="font-size: 13px; font-weight: 700; color: #b388ff; letter-spacing: 0.1em; text-transform: uppercase;">
          Cognitive Re-centering
        </div>
        <div class="zw-breathing-phase-text" id="zw-breath-phase">Inhale Gently...</div>
        <div class="zw-breathing-subtext">
          Sync your breath with the expanding orb to ground your nervous system before returning.
        </div>

        <div class="zw-breathing-circle-container">
          <div class="zw-breathing-outer-ring"></div>
          <div class="zw-breathing-orb zw-breathing-anim-box" id="zw-breath-orb">
            <span id="zw-breath-seconds">4s</span>
          </div>
        </div>

        <div class="zw-breathing-countdown">
          Returning to article in <span id="zw-breath-total-countdown">30</span>s
        </div>
        <button class="zw-game-close-btn" id="zw-breath-skip-btn" style="margin-top: 24px;">Skip Directly to Work</button>
      </div>
    `;

    document.body.appendChild(breathingModal);

    let remainingTotal = 30;
    const phaseText = breathingModal.querySelector('#zw-breath-phase');
    const breathSecs = breathingModal.querySelector('#zw-breath-seconds');
    const totalCount = breathingModal.querySelector('#zw-breath-total-countdown');

    const phases = [
      { text: 'Inhale Slowly...', duration: 4 },
      { text: 'Hold Softly...', duration: 4 },
      { text: 'Exhale Completely...', duration: 4 },
      { text: 'Rest & Hold...', duration: 4 }
    ];

    let phaseIndex = 0;
    let phaseTimeLeft = phases[0].duration;

    const interval = setInterval(() => {
      remainingTotal--;
      phaseTimeLeft--;

      if (totalCount) totalCount.textContent = remainingTotal.toString();
      if (breathSecs) breathSecs.textContent = `${phaseTimeLeft}s`;

      if (phaseTimeLeft <= 0) {
        phaseIndex = (phaseIndex + 1) % phases.length;
        phaseTimeLeft = phases[phaseIndex].duration;
        if (phaseText) phaseText.textContent = phases[phaseIndex].text;
      }

      if (remainingTotal <= 0) {
        clearInterval(interval);
        this.finishReset(breathingModal);
      }
    }, 1000);

    breathingModal.querySelector('#zw-breath-skip-btn').addEventListener('click', () => {
      clearInterval(interval);
      this.finishReset(breathingModal);
    });
  }

  finishReset(modal) {
    if (modal) {
      modal.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = () => {
        modal.remove();
        this.showToast("Focus renewed. Welcome back to your flow!");
      };
    }
  }

  showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
      background: #7c4dff; color: #fff; padding: 10px 24px; border-radius: 20px;
      font-size: 14px; font-weight: 600; z-index: 2147483647; box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      font-family: -apple-system, sans-serif;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).onfinish = () => toast.remove();
    }, 3200);
  }

  closeAllModals() {
    ['zenweb-game-modal', 'zenweb-breathing-modal', 'zenweb-lockout-modal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }
}

/* ==========================================================================
   MICRO-GAMES (FAST 60-120 FPS HIGH VARIETY ENGINES)
   ========================================================================== */

/**
 * Game 1: Zen Fluid Particles
 * Soothing orbital flow field where soft pastel particles follow gentle cursor gravity
 */
class ZenFluidGame {
  constructor(canvas, ctx, width, height) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.particles = [];
    this.mouse = { x: width / 2, y: height / 2, active: false };

    for (let i = 0; i < 160; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        radius: 2.5 + Math.random() * 3.5,
        hue: 240 + Math.random() * 60, // Lavender to soft cyan
        baseAlpha: 0.4 + Math.random() * 0.4
      });
    }

    this.onMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.active = true;
    };
    this.onLeave = () => { this.mouse.active = false; };

    this.canvas.addEventListener('mousemove', this.onMove);
    this.canvas.addEventListener('mouseleave', this.onLeave);
  }

  update(dt) {
    const targetX = this.mouse.active ? this.mouse.x : this.width / 2;
    const targetY = this.mouse.active ? this.mouse.y : this.height / 2;

    this.particles.forEach(p => {
      const dx = targetX - p.x;
      const dy = targetY - p.y;
      const dist = Math.hypot(dx, dy) || 1;

      // Gentle orbital & gravitational pull
      const force = Math.min(180, 4500 / (dist + 40));
      const angle = Math.atan2(dy, dx);

      // Tangential velocity for gentle swirl
      p.vx += Math.cos(angle) * force * dt - Math.sin(angle) * 35 * dt;
      p.vy += Math.sin(angle) * force * dt + Math.cos(angle) * 35 * dt;

      // Damping
      p.vx *= 0.96;
      p.vy *= 0.96;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Soft bounce on borders
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > this.width) { p.x = this.width; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > this.height) { p.y = this.height; p.vy *= -1; }
    });
  }

  render() {
    this.ctx.fillStyle = 'rgba(16, 20, 29, 0.25)'; // Smooth trails
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.baseAlpha})`;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = `hsla(${p.hue}, 80%, 70%, 0.5)`;
      this.ctx.fill();
    });
    this.ctx.shadowBlur = 0;
  }

  destroy() {
    this.canvas.removeEventListener('mousemove', this.onMove);
    this.canvas.removeEventListener('mouseleave', this.onLeave);
  }
}

/**
 * Game 2: Rhythm Pulse
 * Vagal nerve resonance tap game with harmonically expanding concentric rings
 */
class RhythmPulseGame {
  constructor(canvas, ctx, width, height) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.rings = [];
    this.targetRadius = 75;
    this.currentRadius = 0;
    this.score = 0;
    this.feedback = "Tap / Click in rhythm with the wave";

    this.onTap = () => {
      const diff = Math.abs(this.currentRadius - this.targetRadius);
      if (diff < 14) {
        this.score += 10;
        this.feedback = "Harmonic Sync ✨";
        this.createRipples(this.width / 2, this.height / 2, '#00e676');
      } else {
        this.feedback = "Gently adjust rhythm...";
      }
    };

    this.canvas.addEventListener('pointerdown', this.onTap);
  }

  createRipples(x, y, color) {
    this.rings.push({ x, y, r: 10, alpha: 1, color });
  }

  update(dt) {
    this.currentRadius = (this.currentRadius + 60 * dt) % 150;

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.r += 90 * dt;
      ring.alpha -= 1.2 * dt;
      if (ring.alpha <= 0) this.rings.splice(i, 1);
    }
  }

  render() {
    this.ctx.fillStyle = '#10141d';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;

    // Target guide circle
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, this.targetRadius, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(124, 77, 255, 0.4)';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([6, 6]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Expanding user wave
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, this.currentRadius, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#64b5f6';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    // Secondary ripple waves
    this.rings.forEach(r => {
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      this.ctx.strokeStyle = r.color;
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = Math.max(0, r.alpha);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    });

    // Instructions
    this.ctx.font = '15px sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.feedback, cx, this.height - 40);
    this.ctx.font = '13px sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText(`Harmony Score: ${this.score}`, cx, 40);
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.onTap);
  }
}

/**
 * Game 3: Zen Block Stacker
 * Soothing pastel block-stacking physics
 */
class ZenStackerGame {
  constructor(canvas, ctx, width, height) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.blockHeight = 26;
    this.baseWidth = 180;
    this.blocks = [{ x: (width - 180) / 2, y: height - 50, w: 180 }];
    this.currentX = 0;
    this.direction = 1;
    this.speed = 130;
    this.score = 0;

    this.onDrop = () => {
      const topBlock = this.blocks[this.blocks.length - 1];
      const prevX = topBlock.x;
      const prevW = topBlock.w;
      const diff = this.currentX - prevX;

      if (Math.abs(diff) > prevW) {
        // Tower collapsed, reset gently without punishment
        this.blocks = [{ x: (this.width - 180) / 2, y: this.height - 50, w: 180 }];
        this.score = 0;
        return;
      }

      // Slice block
      const newW = prevW - Math.abs(diff);
      const newX = diff > 0 ? this.currentX : prevX;

      this.score++;
      this.blocks.push({
        x: newX,
        y: topBlock.y - this.blockHeight,
        w: newW
      });

      // Shift tower down if it grows near the top
      if (this.blocks.length > 8) {
        this.blocks.forEach(b => { b.y += this.blockHeight; });
      }
    };

    this.canvas.addEventListener('pointerdown', this.onDrop);
  }

  update(dt) {
    const topBlock = this.blocks[this.blocks.length - 1];
    this.currentX += this.direction * this.speed * dt;
    if (this.currentX < 20 || this.currentX + topBlock.w > this.width - 20) {
      this.direction *= -1;
    }
  }

  render() {
    this.ctx.fillStyle = '#10141d';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Render stacked blocks
    this.blocks.forEach((b, idx) => {
      const hue = (idx * 28 + 200) % 360;
      this.ctx.fillStyle = `hsl(${hue}, 70%, 65%)`;
      this.ctx.fillRect(b.x, b.y, b.w, this.blockHeight - 2);
    });

    // Render moving active block
    const topBlock = this.blocks[this.blocks.length - 1];
    const hue = (this.blocks.length * 28 + 200) % 360;
    this.ctx.fillStyle = `hsl(${hue}, 80%, 70%)`;
    this.ctx.fillRect(this.currentX, topBlock.y - this.blockHeight, topBlock.w, this.blockHeight - 2);

    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Zen Stacks: ${this.score}  (Tap to Drop)`, this.width / 2, 40);
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.onDrop);
  }
}

/**
 * Game 4: Pattern Flow (Harmonic Memory)
 * 4 soft glowing pads that play gentle visual sequences
 */
class PatternFlowGame {
  constructor(canvas, ctx, width, height) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.pads = [
      { id: 0, x: width / 2 - 80, y: height / 2 - 80, size: 70, color: '#7c4dff', active: false },
      { id: 1, x: width / 2 + 10, y: height / 2 - 80, size: 70, color: '#64b5f6', active: false },
      { id: 2, x: width / 2 - 80, y: height / 2 + 10, size: 70, color: '#00e676', active: false },
      { id: 3, x: width / 2 + 10, y: height / 2 + 10, size: 70, color: '#ffca28', active: false }
    ];
    this.sequence = [0, 1, 3];
    this.userStep = 0;
    this.statusText = "Watch the pattern...";
    this.playSequence();

    this.onTap = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      this.pads.forEach((pad) => {
        if (mx >= pad.x && mx <= pad.x + pad.size && my >= pad.y && my <= pad.y + pad.size) {
          pad.active = true;
          setTimeout(() => { pad.active = false; }, 200);

          if (pad.id === this.sequence[this.userStep]) {
            this.userStep++;
            if (this.userStep >= this.sequence.length) {
              this.statusText = "Excellent! Flowing next...";
              this.sequence.push(Math.floor(Math.random() * 4));
              this.userStep = 0;
              setTimeout(() => this.playSequence(), 800);
            }
          } else {
            this.statusText = "Gentle retry...";
            this.userStep = 0;
            setTimeout(() => this.playSequence(), 1000);
          }
        }
      });
    };

    this.canvas.addEventListener('pointerdown', this.onTap);
  }

  playSequence() {
    this.statusText = "Watch carefully...";
    this.sequence.forEach((padIdx, i) => {
      setTimeout(() => {
        if (this.pads[padIdx]) {
          this.pads[padIdx].active = true;
          setTimeout(() => { this.pads[padIdx].active = false; }, 350);
        }
        if (i === this.sequence.length - 1) {
          setTimeout(() => { this.statusText = "Your turn: Repeat the flow"; }, 400);
        }
      }, (i + 1) * 600);
    });
  }

  update() {}

  render() {
    this.ctx.fillStyle = '#10141d';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.pads.forEach(p => {
      this.ctx.fillStyle = p.active ? '#ffffff' : p.color;
      this.ctx.beginPath();
      this.ctx.roundRect(p.x, p.y, p.size, p.size, 12);
      this.ctx.fill();
    });

    this.ctx.font = '15px sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.statusText, this.width / 2, 40);
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.onTap);
  }
}

/**
 * Game 5: Micro Flow Runner
 * Gentle minimalist glider sailing over rolling sine waves
 */
class MicroGlideGame {
  constructor(canvas, ctx, width, height) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.birdY = height / 2;
    this.birdVy = 0;
    this.gravity = 350;
    this.lift = -200;
    this.offset = 0;

    this.onTap = () => {
      this.birdVy = this.lift;
    };

    this.canvas.addEventListener('pointerdown', this.onTap);
  }

  update(dt) {
    this.birdVy += this.gravity * dt;
    this.birdY += this.birdVy * dt;
    this.offset += 80 * dt;

    if (this.birdY > this.height - 30) {
      this.birdY = this.height - 30;
      this.birdVy = 0;
    }
    if (this.birdY < 20) {
      this.birdY = 20;
      this.birdVy = 0;
    }
  }

  render() {
    this.ctx.fillStyle = '#10141d';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Rolling serene landscape
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    for (let x = 0; x <= this.width; x += 10) {
      const y = this.height - 45 + Math.sin((x + this.offset) * 0.02) * 20;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.width, this.height);
    this.ctx.fillStyle = '#1e2838';
    this.ctx.fill();

    // Soft glowing glider
    this.ctx.beginPath();
    this.ctx.arc(80, this.birdY, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = '#64b5f6';
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = '#64b5f6';
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText("Tap to Glide Softly", this.width / 2, 40);
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.onTap);
  }
}

// Global attachment
if (typeof window !== 'undefined') {
  window.ZenWebGames = new ZenWebGameEngine();
}
