/**
 * ZenWeb Micro-Gaming Suite (v2.4)
 * High-performance (60-120 FPS) Canvas gaming engine inspired by books.baseten.com.
 * Features 3 randomized mini-games for 15-minute focus resets:
 * 1. Dino Jump: Wide runway, accelerated speed & cactus obstacle cluster difficulty ramp.
 * 2. Tetris Matrix: 10x20 matrix, level progression, drop speed acceleration & ghost piece.
 * 3. Whack-A-Dino: Wide centered 3x3 digital terminal grid, multi-spawns & reaction time frenzy.
 * Wide expansive viewport (up to 1060px) and gradual difficulty increase over time.
 */

class ZenWebGameEngine {
  constructor() {
    this.modalEl = null;
    this.canvasEl = null;
    this.ctx = null;
    this.animFrameId = null;
    this.currentGame = null;
    this.timeRemaining = 90;
    this.timerInterval = null;
    this.isInputLocked = false;
    this.boundGlobalKey = null;
  }

  /**
   * Randomly selects one of the three mini-games
   */
  getRandomGameType() {
    const games = ['dino', 'tetris', 'whack'];
    return games[Math.floor(Math.random() * games.length)];
  }

  /**
   * Launches a mini-game overlay
   * @param {'random' | 'dino' | 'tetris' | 'whack'} gameType
   * @param {number} durationSeconds
   */
  launchGame(gameType = 'random', durationSeconds = 90) {
    this.closeAllModals();

    const selected = (gameType === 'random' || !gameType)
      ? this.getRandomGameType()
      : gameType;

    this.timeRemaining = durationSeconds || 90;
    this.isInputLocked = false;
    this.renderGameModal(selected);
    this.initCanvas(selected);
    this.startCountdown();

    // Global Escape key handler to return to reading cleanly
    this.boundGlobalKey = (e) => {
      if (e.key === 'Escape') {
        this.terminateGame(false);
      }
    };
    window.addEventListener('keydown', this.boundGlobalKey);
  }

  renderGameModal(gameType) {
    const titles = {
      dino: 'DINO JUMP // KINETIC FOCUS',
      tetris: 'TETRIS MATRIX // SPATIAL RESET',
      whack: 'WHACK-A-DINO // REACTION BURST'
    };

    const hints = {
      dino: 'Press [SPACE], [UP ARROW], or [CLICK] to jump. Speed & cacti ramp up over time!',
      tetris: '[ARROWS] Move/Rotate | [DOWN] Soft Drop | [SPACE] Hard Drop | Speed accelerates with Level!',
      whack: '[CLICK] green & golden dinos! Avoid pink glitch dinos. Multiple dinos appear as frenzy rises!'
    };

    const modal = document.createElement('div');
    modal.id = 'zenweb-game-modal';
    modal.className = 'zw-game-backdrop';
    modal.innerHTML = `
      <div class="zw-game-window">
        <!-- Header -->
        <div class="zw-game-header">
          <div class="zw-game-title-group">
            <span class="zw-pixel-pill">[RESET PROTOCOL]</span>
            <span class="zw-game-title">${titles[gameType] || 'FOCUS MINI-GAME'}</span>
          </div>
          <div class="zw-game-header-right">
            <div class="zw-game-clock">
              <span class="zw-clock-dot"></span>
              <span id="zw-game-timer-display">${this.timeRemaining}s</span>
            </div>
            <button class="zw-pixel-close" id="zw-game-close-x" title="Return to reading (Esc)">✕</button>
          </div>
        </div>

        <!-- Canvas Container -->
        <div class="zw-game-canvas-box">
          <canvas id="zenweb-game-canvas"></canvas>
        </div>

        <!-- On-Screen Controls for Tetris -->
        ${gameType === 'tetris' ? `
          <div class="zw-tetris-touch-bar">
            <button class="zw-btn-touch" id="zw-t-left">◀ LEFT</button>
            <button class="zw-btn-touch zw-btn-touch-primary" id="zw-t-rot">▲ ROTATE</button>
            <button class="zw-btn-touch" id="zw-t-down">▼ SOFT</button>
            <button class="zw-btn-touch" id="zw-t-right">▶ RIGHT</button>
            <button class="zw-btn-touch zw-btn-touch-pink" id="zw-t-drop">⤓ DROP</button>
          </div>
        ` : ''}

        <!-- Footer -->
        <div class="zw-game-footer">
          <div class="zw-game-hint">
            <span class="zw-badge-hint">CONTROLS</span>
            <span>${hints[gameType]}</span>
          </div>
          <button class="zw-btn-game-quit" id="zw-game-close-btn">[RESUME READING]</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(modal);
    this.modalEl = modal;

    modal.querySelector('#zw-game-close-btn').addEventListener('click', () => {
      this.terminateGame(false);
    });

    modal.querySelector('#zw-game-close-x').addEventListener('click', () => {
      this.terminateGame(false);
    });
  }

  initCanvas(gameType) {
    this.canvasEl = document.getElementById('zenweb-game-canvas');
    if (!this.canvasEl) return;

    this.ctx = this.canvasEl.getContext('2d', { alpha: false });
    const dpr = window.devicePixelRatio || 1;

    const container = this.modalEl?.querySelector('.zw-game-canvas-box');
    const containerWidth = container ? container.clientWidth : 0;

    // Provide a wide, expansive playing field (targeting 940px–1020px width, 480px–500px height)
    const cssWidth = Math.max(780, Math.min(1020, (containerWidth > 200 ? containerWidth : window.innerWidth - 80)));
    const cssHeight = Math.min(500, Math.max(460, window.innerHeight - 240));

    this.canvasEl.style.width = `${cssWidth}px`;
    this.canvasEl.style.height = `${cssHeight}px`;
    this.canvasEl.width = cssWidth * dpr;
    this.canvasEl.height = cssHeight * dpr;

    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    // Instantiate chosen game with wide layout
    switch (gameType) {
      case 'dino':
        this.currentGame = new DinoJumpGame(this.canvasEl, this.ctx, cssWidth, cssHeight);
        break;
      case 'tetris':
        this.currentGame = new TetrisGame(this.canvasEl, this.ctx, cssWidth, cssHeight);
        this.bindTetrisTouchControls();
        break;
      case 'whack':
        this.currentGame = new WhackADinoGame(this.canvasEl, this.ctx, cssWidth, cssHeight);
        break;
      default:
        this.currentGame = new DinoJumpGame(this.canvasEl, this.ctx, cssWidth, cssHeight);
    }

    // High-FPS delta loop
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

  bindTetrisTouchControls() {
    if (!this.modalEl) return;
    const bind = (id, fn) => {
      const btn = this.modalEl.querySelector(id);
      if (btn) {
        const handler = (e) => {
          e.preventDefault();
          if (this.currentGame && !this.isInputLocked) fn();
        };
        btn.addEventListener('pointerdown', handler);
      }
    };

    bind('#zw-t-left', () => this.currentGame.move(-1, 0));
    bind('#zw-t-right', () => this.currentGame.move(1, 0));
    bind('#zw-t-rot', () => this.currentGame.rotate());
    bind('#zw-t-down', () => this.currentGame.move(0, 1));
    bind('#zw-t-drop', () => this.currentGame.hardDrop());
  }

  startCountdown() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.timeRemaining--;

      const display = document.getElementById('zw-game-timer-display');
      if (display) {
        display.textContent = `${this.timeRemaining}s`;
        if (this.timeRemaining <= 10) {
          display.style.color = '#FF007A';
        }
      }

      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        this.terminateGame(true);
      }
    }, 1000);
  }

  terminateGame(naturalFinish = true) {
    if (this.isInputLocked) return;
    this.isInputLocked = true;

    if (this.boundGlobalKey) {
      window.removeEventListener('keydown', this.boundGlobalKey);
      this.boundGlobalKey = null;
    }

    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.currentGame?.destroy) this.currentGame.destroy();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    // Audio chime
    if (window.ZenWebAudio) window.ZenWebAudio.playZenChime();

    // Reset background 15-min break timer
    chrome.runtime?.sendMessage?.({ type: 'RESET_BREAK_TIMER' });

    if (this.modalEl) {
      this.modalEl.classList.add('zw-fade-out');
      setTimeout(() => {
        this.closeAllModals();
        if (naturalFinish) {
          this.startBreathingTransition();
        }
      }, 300);
    } else if (naturalFinish) {
      this.startBreathingTransition();
    }
  }

  startBreathingTransition() {
    this.closeAllModals();

    const modal = document.createElement('div');
    modal.id = 'zenweb-breathing-modal';
    modal.className = 'zw-game-backdrop';
    modal.innerHTML = `
      <div class="zw-game-window" style="max-width: 500px; text-align: center; padding: 32px;">
        <div class="zw-pixel-pill">[NEURAL RE-CENTER]</div>
        <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 24px; color: #fff; margin: 14px 0 6px 0; font-weight: 800;">
          Focus Reset Complete
        </h2>
        <p style="color: #9499aa; font-size: 14px; margin-bottom: 24px; line-height: 1.5;">
          Breathe in sync with the pulsing matrix orb to clear mental fatigue and return refreshed.
        </p>

        <div class="zw-breath-orb-wrap">
          <div class="zw-breath-ring"></div>
          <div class="zw-breath-orb" id="zw-breath-orb">4s</div>
        </div>

        <div style="font-family: 'Space Mono', monospace; font-size: 13.5px; color: #00FF66; margin-top: 18px; font-weight: 700;" id="zw-breath-phase">
          INHALE SLOWLY...
        </div>

        <button class="zw-btn-game-quit" id="zw-breath-skip" style="margin-top: 24px; width: 100%;">
          [RETURN TO READING NOW]
        </button>
      </div>
    `;

    document.documentElement.appendChild(modal);

    let secs = 20;
    const orb = modal.querySelector('#zw-breath-orb');
    const phase = modal.querySelector('#zw-breath-phase');

    const int = setInterval(() => {
      secs--;
      if (orb) orb.textContent = `${secs}s`;

      if (secs % 8 >= 4) {
        if (phase) phase.textContent = 'EXHALE GENTLY...';
      } else {
        if (phase) phase.textContent = 'INHALE DEEPLY...';
      }

      if (secs <= 0) {
        clearInterval(int);
        modal.remove();
      }
    }, 1000);

    modal.querySelector('#zw-breath-skip').addEventListener('click', () => {
      clearInterval(int);
      modal.remove();
    });
  }

  closeAllModals() {
    ['zenweb-game-modal', 'zenweb-breathing-modal', 'zenweb-lockout-modal'].forEach(id => {
      document.getElementById(id)?.remove();
    });
  }
}

/* ==========================================================================
   MINI-GAME 1: DINO JUMP (RETRO T-REX KINETIC FOCUS WITH ACCELERATION)
   ========================================================================== */

class DinoJumpGame {
  constructor(canvas, ctx, width, height) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    this.groundY = height - 54;
    this.dino = {
      x: 72,
      y: this.groundY - 42,
      w: 36,
      h: 42,
      vy: 0,
      jumpForce: -660,
      gravity: 1720,
      isGrounded: true
    };

    this.obstacles = [];
    this.spawnTimer = 1.3;
    this.baseSpeed = 300;
    this.speed = 300;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('zw_dino_hi') || '0', 10);
    this.gameOver = false;
    this.particles = [];
    this.elapsedTime = 0;
    this.level = 1;

    this.handleKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.jump();
      }
    };

    this.handlePointer = () => {
      this.jump();
    };

    window.addEventListener('keydown', this.handleKey);
    this.canvas.addEventListener('pointerdown', this.handlePointer);
  }

  jump() {
    if (this.gameOver) {
      this.restart();
      return;
    }
    if (this.dino.isGrounded) {
      this.dino.vy = this.dino.jumpForce;
      this.dino.isGrounded = false;
      this.createJumpSparks(this.dino.x + 18, this.dino.y + 40);
    }
  }

  restart() {
    this.dino.y = this.groundY - 42;
    this.dino.vy = 0;
    this.dino.isGrounded = true;
    this.obstacles = [];
    this.speed = this.baseSpeed;
    this.score = 0;
    this.elapsedTime = 0;
    this.level = 1;
    this.gameOver = false;
  }

  createJumpSparks(x, y) {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 150,
        vy: (Math.random() - 1) * 95,
        life: 0.38,
        color: '#00FF66'
      });
    }
  }

  update(dt) {
    // Particle Physics
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.gameOver) return;

    this.elapsedTime += dt;
    this.level = 1 + Math.floor(this.elapsedTime / 12);

    // Gradual Difficulty Ramp: Speed accelerates with time & score
    this.speed = this.baseSpeed + Math.min(270, this.elapsedTime * 6.5) + Math.min(110, this.score * 0.35);

    // Dino Gravity Physics
    this.dino.vy += this.dino.gravity * dt;
    this.dino.y += this.dino.vy * dt;

    if (this.dino.y >= this.groundY - this.dino.h) {
      this.dino.y = this.groundY - this.dino.h;
      this.dino.vy = 0;
      this.dino.isGrounded = true;
    }

    // Dynamic Obstacle Spawner (Tighter intervals & clusters as time ramps up)
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const isTall = Math.random() > 0.45;
      const isCluster = this.level >= 2 && Math.random() > 0.6;

      this.obstacles.push({
        x: this.width + 20,
        y: isTall ? this.groundY - 50 : this.groundY - 34,
        w: isTall ? 24 : 20,
        h: isTall ? 50 : 34,
        isTall
      });

      if (isCluster) {
        this.obstacles.push({
          x: this.width + 52,
          y: this.groundY - 34,
          w: 20,
          h: 34,
          isTall: false
        });
      }

      const minInterval = Math.max(0.68, 1.35 - this.elapsedTime * 0.012);
      const maxInterval = Math.max(1.05, 2.05 - this.elapsedTime * 0.015);
      this.spawnTimer = minInterval + Math.random() * (maxInterval - minInterval);
    }

    // Move Obstacles & Collision Check
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.speed * dt;

      // Generous 5px collision inset for fair gameplay
      if (
        this.dino.x + 5 < obs.x + obs.w &&
        this.dino.x + this.dino.w - 5 > obs.x &&
        this.dino.y + 4 < obs.y + obs.h &&
        this.dino.y + this.dino.h - 4 > obs.y
      ) {
        this.gameOver = true;
        this.createJumpSparks(this.dino.x + 18, this.dino.y + 18);
        if (this.score > this.highScore) {
          this.highScore = this.score;
          try { localStorage.setItem('zw_dino_hi', this.highScore); } catch(e){}
        }
      }

      if (obs.x + obs.w < -20) {
        this.obstacles.splice(i, 1);
        this.score += 10;
      }
    }
  }

  render() {
    this.ctx.fillStyle = '#090a0f';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Matrix scanline backdrop
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let y = 0; y < this.groundY; y += 14) {
      this.ctx.fillRect(0, y, this.width, 1);
    }

    // Ground line
    this.ctx.strokeStyle = '#272a3d';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();

    // Animated dashed ground pixels
    this.ctx.fillStyle = '#00FF66';
    const offset = (Date.now() / 8) % 40;
    for (let x = offset; x < this.width; x += 40) {
      this.ctx.fillRect(this.width - x, this.groundY + 3, 16, 2);
    }

    // Draw Pixel Dino Character
    this.renderDinoSprite();

    // Draw Obstacles (Pixel Cacti)
    this.ctx.fillStyle = '#FF007A';
    this.obstacles.forEach(obs => {
      this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      if (obs.isTall) {
        this.ctx.fillRect(obs.x - 6, obs.y + 12, 6, 12);
        this.ctx.fillRect(obs.x + obs.w, obs.y + 18, 6, 12);
      }
    });

    // Particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, 3, 3);
    });

    // Score HUD with live Difficulty Telemetry
    this.ctx.font = "bold 13.5px 'Space Mono', monospace";
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#00FF66';
    this.ctx.fillText(`SCORE: ${this.score}`, 28, 34);

    this.ctx.fillStyle = '#9499aa';
    this.ctx.fillText(`HI: ${this.highScore}`, 150, 34);

    this.ctx.fillStyle = '#FF007A';
    this.ctx.fillText(`SPEED: ${Math.floor(this.speed)}px/s  |  LVL ${this.level}`, 250, 34);

    if (this.gameOver) {
      this.ctx.fillStyle = 'rgba(9, 10, 15, 0.88)';
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.ctx.font = "bold 24px 'Chivo', sans-serif";
      this.ctx.fillStyle = '#FF007A';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("COLLISION DETECTED", this.width / 2, this.height / 2 - 14);

      this.ctx.font = "13.5px 'Space Mono', monospace";
      this.ctx.fillStyle = '#00FF66';
      this.ctx.fillText("PRESS [SPACE] OR TAP TO RESPAWN", this.width / 2, this.height / 2 + 20);
      this.ctx.textAlign = 'left';
    }
  }

  renderDinoSprite() {
    const x = this.dino.x;
    const y = this.dino.y;
    this.ctx.fillStyle = '#00FF66';

    // Head
    this.ctx.fillRect(x + 14, y, 20, 16);
    // Eye
    this.ctx.fillStyle = '#090a0f';
    this.ctx.fillRect(x + 26, y + 4, 3, 3);
    // Body
    this.ctx.fillStyle = '#00FF66';
    this.ctx.fillRect(x + 4, y + 16, 24, 18);
    // Tiny arm
    this.ctx.fillRect(x + 26, y + 20, 6, 3);

    // Running legs animation
    const runCycle = Math.floor(Date.now() / 100) % 2;
    if (this.dino.isGrounded) {
      if (runCycle === 0) {
        this.ctx.fillRect(x + 6, y + 34, 5, 8);
        this.ctx.fillRect(x + 18, y + 34, 5, 4);
      } else {
        this.ctx.fillRect(x + 6, y + 34, 5, 4);
        this.ctx.fillRect(x + 18, y + 34, 5, 8);
      }
    } else {
      this.ctx.fillRect(x + 9, y + 34, 6, 6);
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKey);
    this.canvas.removeEventListener('pointerdown', this.handlePointer);
  }
}

/* ==========================================================================
   MINI-GAME 2: TETRIS MATRIX (10x20 WITH LEVEL PROGRESSION & SPEED RAMP)
   ========================================================================== */

class TetrisGame {
  constructor(canvas, ctx, width, height) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    this.cols = 10;
    this.rows = 18;
    this.blockSize = Math.floor(Math.min(height - 40, 420) / this.rows);
    this.gridWidth = this.cols * this.blockSize;
    this.gridHeight = this.rows * this.blockSize;
    this.startX = Math.floor((width - this.gridWidth) / 2);
    this.startY = Math.floor((height - this.gridHeight) / 2);

    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    this.score = 0;
    this.lines = 0;
    this.dropInterval = 0.65;
    this.dropTimer = 0;
    this.elapsedTime = 0;
    this.level = 1;

    // Cohesive Baseten Palette for Tetrominoes
    this.shapes = [
      { id: 1, color: '#00FF66', matrix: [[1,1,1,1]] }, // I (Neon Green)
      { id: 2, color: '#F4F6FB', matrix: [[1,1],[1,1]] }, // O (Arctic White)
      { id: 3, color: '#FF007A', matrix: [[0,1,0],[1,1,1]] }, // T (Cyber Pink)
      { id: 4, color: '#38BDF8', matrix: [[1,1,0],[0,1,1]] }, // S (Ice Cyan)
      { id: 5, color: '#FB7185', matrix: [[0,1,1],[1,1,0]] }, // Z (Coral Pink)
      { id: 6, color: '#A855F7', matrix: [[1,0,0],[1,1,1]] }, // J (Electric Purple)
      { id: 7, color: '#FBBF24', matrix: [[0,0,1],[1,1,1]] }  // L (Warm Gold)
    ];

    this.currentPiece = this.spawnPiece();

    this.handleKey = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        this.move(-1, 0);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        this.move(1, 0);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.move(0, 1);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        this.rotate();
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.hardDrop();
      }
    };

    window.addEventListener('keydown', this.handleKey);
  }

  spawnPiece() {
    const proto = this.shapes[Math.floor(Math.random() * this.shapes.length)];
    const matrix = proto.matrix.map(row => [...row]);
    return {
      id: proto.id,
      color: proto.color,
      matrix,
      x: Math.floor((this.cols - matrix[0].length) / 2),
      y: 0
    };
  }

  move(dx, dy) {
    this.currentPiece.x += dx;
    this.currentPiece.y += dy;
    if (this.collides(this.currentPiece)) {
      this.currentPiece.x -= dx;
      this.currentPiece.y -= dy;
      if (dy > 0) {
        this.lockPiece();
      }
      return false;
    }
    return true;
  }

  rotate() {
    const orig = this.currentPiece.matrix;
    const rotated = orig[0].map((_, i) => orig.map(row => row[i]).reverse());
    this.currentPiece.matrix = rotated;
    if (this.collides(this.currentPiece)) {
      this.currentPiece.matrix = orig; // Wall kick fallback
    }
  }

  hardDrop() {
    while (this.move(0, 1)) {}
  }

  getGhostY() {
    const ghost = {
      ...this.currentPiece,
      y: this.currentPiece.y
    };
    while (!this.collides({ ...ghost, y: ghost.y + 1 })) {
      ghost.y++;
    }
    return ghost.y;
  }

  collides(piece) {
    const { matrix, x, y } = piece;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const newX = x + c;
          const newY = y + r;
          if (newX < 0 || newX >= this.cols || newY >= this.rows) return true;
          if (newY >= 0 && this.grid[newY][newX]) return true;
        }
      }
    }
    return false;
  }

  lockPiece() {
    const { matrix, x, y, color } = this.currentPiece;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] && y + r >= 0) {
          this.grid[y + r][x + c] = color;
        }
      }
    }

    this.clearLines();
    this.currentPiece = this.spawnPiece();

    if (this.collides(this.currentPiece)) {
      // Grid full - gentle reset
      this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
      this.score = 0;
    }
  }

  clearLines() {
    let cleared = 0;
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.grid[r].every(cell => cell !== 0)) {
        this.grid.splice(r, 1);
        this.grid.unshift(Array(this.cols).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800];
      this.score += (points[cleared] || 400) * this.level;
      this.lines += cleared;
    }
  }

  update(dt) {
    this.elapsedTime += dt;
    this.level = 1 + Math.floor(this.elapsedTime / 16) + Math.floor(this.lines / 3);

    // Gradual difficulty increase: drop speed accelerates with Level
    this.dropInterval = Math.max(0.12, 0.65 - (this.level - 1) * 0.055);

    this.dropTimer += dt;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      this.move(0, 1);
    }
  }

  render() {
    this.ctx.fillStyle = '#090a0f';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Matrix Frame
    this.ctx.strokeStyle = '#272a3d';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.startX - 2, this.startY - 2, this.gridWidth + 4, this.gridHeight + 4);

    // Matrix Background
    this.ctx.fillStyle = '#12131c';
    this.ctx.fillRect(this.startX, this.startY, this.gridWidth, this.gridHeight);

    // Draw Grid Cells
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        const px = this.startX + c * this.blockSize;
        const py = this.startY + r * this.blockSize;

        if (cell) {
          this.ctx.fillStyle = cell;
          this.ctx.fillRect(px + 1, py + 1, this.blockSize - 2, this.blockSize - 2);
        } else {
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          this.ctx.fillRect(px + this.blockSize / 2, py + this.blockSize / 2, 1.5, 1.5);
        }
      }
    }

    // Ghost Piece Projection
    if (this.currentPiece) {
      const ghostY = this.getGhostY();
      const { matrix, x, color } = this.currentPiece;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;

      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            const px = this.startX + (x + c) * this.blockSize;
            const py = this.startY + (ghostY + r) * this.blockSize;
            if (py >= this.startY) {
              this.ctx.strokeRect(px + 2, py + 2, this.blockSize - 4, this.blockSize - 4);
            }
          }
        }
      }

      // Active Falling Piece
      this.ctx.fillStyle = color;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            const px = this.startX + (x + c) * this.blockSize;
            const py = this.startY + (this.currentPiece.y + r) * this.blockSize;
            if (py >= this.startY) {
              this.ctx.fillRect(px + 1, py + 1, this.blockSize - 2, this.blockSize - 2);
            }
          }
        }
      }
    }

    // HUD Display with Level Telemetry
    this.ctx.font = "bold 13.5px 'Space Mono', monospace";
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#00FF66';
    this.ctx.fillText(`SCORE: ${this.score}`, 28, 34);

    this.ctx.fillStyle = '#9499aa';
    this.ctx.fillText(`LINES: ${this.lines}`, 160, 34);

    this.ctx.fillStyle = '#FF007A';
    this.ctx.fillText(`LVL ${this.level} (${(1 / this.dropInterval).toFixed(1)}x SPEED)`, 280, 34);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKey);
  }
}

/* ==========================================================================
   MINI-GAME 3: WHACK-A-DINO (WIDE CENTERED 3x3 GRID WITH MULTI-SPAWNS & FRENZY)
   ========================================================================== */

class WhackADinoGame {
  constructor(canvas, ctx, width, height) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    this.score = 0;
    this.combo = 0;
    this.particles = [];
    this.elapsedTime = 0;
    this.frenzyLevel = 1;

    // Generous, large 3x3 terminal arcade pods centered with ample headroom
    this.holes = [];
    const cellSize = 100;
    const gap = 24;
    const gridTotalWidth = cellSize * 3 + gap * 2; // 348px
    const gridTotalHeight = cellSize * 3 + gap * 2; // 348px
    const startX = Math.floor((width - gridTotalWidth) / 2);
    const startY = Math.floor((height - gridTotalHeight) / 2) + 16;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        this.holes.push({
          x: startX + c * (cellSize + gap),
          y: startY + r * (cellSize + gap),
          size: cellSize,
          active: false,
          type: 'normal', // 'normal' (+10) | 'golden' (+30) | 'glitch' (-10)
          timeLeft: 0,
          whacked: false
        });
      }
    }

    this.nextSpawn = 0.5;

    this.handlePointer = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let hit = false;
      this.holes.forEach(hole => {
        if (
          hole.active && !hole.whacked &&
          mx >= hole.x && mx <= hole.x + hole.size &&
          my >= hole.y && my <= hole.y + hole.size
        ) {
          hit = true;
          hole.whacked = true;

          if (hole.type === 'normal') {
            this.combo++;
            const pts = 10 * Math.min(this.combo, 5);
            this.score += pts;
            this.spawnText(hole.x + 50, hole.y + 25, `+${pts}`, '#00FF66');
          } else if (hole.type === 'golden') {
            this.combo += 2;
            const pts = 30 * Math.min(this.combo, 5);
            this.score += pts;
            this.spawnText(hole.x + 50, hole.y + 25, `+${pts} ULTRA!`, '#FBBF24');
          } else if (hole.type === 'glitch') {
            this.combo = 0;
            this.score = Math.max(0, this.score - 10);
            this.spawnText(hole.x + 50, hole.y + 25, '-10 GLITCH', '#FF007A');
          }
        }
      });

      if (!hit) {
        this.combo = 0;
      }
    };

    this.canvas.addEventListener('pointerdown', this.handlePointer);
  }

  spawnText(x, y, text, color) {
    this.particles.push({
      x, y,
      text,
      color,
      vy: -40,
      alpha: 1,
      life: 0.7
    });
  }

  update(dt) {
    this.elapsedTime += dt;
    this.frenzyLevel = 1 + Math.floor(this.elapsedTime / 14);

    this.nextSpawn -= dt;
    if (this.nextSpawn <= 0) {
      const inactive = this.holes.filter(h => !h.active);
      if (inactive.length > 0) {
        // Multi-spawn frequency ramps up with frenzy level
        const maxSimultaneous = this.frenzyLevel >= 4 ? 3 : (this.frenzyLevel >= 2 ? 2 : 1);
        const countToSpawn = Math.min(inactive.length, 1 + Math.floor(Math.random() * maxSimultaneous));

        for (let i = 0; i < countToSpawn; i++) {
          const avail = this.holes.filter(h => !h.active);
          if (avail.length === 0) break;
          const pick = avail[Math.floor(Math.random() * avail.length)];
          pick.active = true;
          pick.whacked = false;

          // Peek duration decreases as time advances (starts at 1.25s, drops down to 0.45s)
          const peekDuration = Math.max(0.45, 1.25 - this.elapsedTime * 0.012);
          pick.timeLeft = peekDuration + Math.random() * 0.25;

          const roll = Math.random();
          if (roll < 0.22) pick.type = 'golden';
          else if (roll < 0.38) pick.type = 'glitch';
          else pick.type = 'normal';
        }
      }

      // Next spawn timer shortens with elapsed time
      const spawnDelay = Math.max(0.24, 0.65 - this.elapsedTime * 0.007);
      this.nextSpawn = spawnDelay + Math.random() * 0.25;
    }

    this.holes.forEach(hole => {
      if (hole.active) {
        hole.timeLeft -= dt;
        if (hole.timeLeft <= 0) {
          hole.active = false;
        }
      }
    });

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.y += p.vy * dt;
      p.alpha -= dt * 1.4;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  render() {
    this.ctx.fillStyle = '#090a0f';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw Grid Holes (Blocky brutalist arcade terminals)
    this.holes.forEach(hole => {
      this.ctx.fillStyle = '#14151e';
      this.ctx.strokeStyle = '#272a3d';
      this.ctx.lineWidth = 2;
      this.ctx.fillRect(hole.x, hole.y, hole.size, hole.size);
      this.ctx.strokeRect(hole.x, hole.y, hole.size, hole.size);

      // Inner corner crosshair notches
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      this.ctx.fillRect(hole.x + 4, hole.y + 4, 3, 3);
      this.ctx.fillRect(hole.x + hole.size - 7, hole.y + 4, 3, 3);
      this.ctx.fillRect(hole.x + 4, hole.y + hole.size - 7, 3, 3);
      this.ctx.fillRect(hole.x + hole.size - 7, hole.y + hole.size - 7, 3, 3);

      if (hole.active) {
        const cx = hole.x + hole.size / 2;
        const cy = hole.y + hole.size / 2;

        let dinoColor = '#00FF66';
        if (hole.type === 'golden') dinoColor = '#FBBF24';
        if (hole.type === 'glitch') dinoColor = '#FF007A';

        if (hole.whacked) {
          // Whacked pixel burst
          this.ctx.fillStyle = dinoColor;
          this.ctx.fillRect(cx - 10, cy - 10, 20, 20);
          this.ctx.fillRect(cx - 20, cy - 3, 40, 6);
          this.ctx.fillRect(cx - 3, cy - 20, 6, 40);
        } else {
          // Pixel Dino Head
          this.ctx.fillStyle = dinoColor;
          this.ctx.fillRect(cx - 16, cy - 16, 32, 24);
          this.ctx.fillRect(cx - 4, cy - 8, 24, 16);

          // Dino Eye
          this.ctx.fillStyle = '#090a0f';
          this.ctx.fillRect(cx + 6, cy - 8, 5, 5);
        }
      }
    });

    // Floating Points Particles
    this.particles.forEach(p => {
      this.ctx.font = "bold 15px 'Space Mono', monospace";
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.textAlign = 'center';
      this.ctx.fillText(p.text, p.x, p.y);
      this.ctx.globalAlpha = 1;
    });

    // Score HUD with Frenzy Telemetry
    this.ctx.font = "bold 13.5px 'Space Mono', monospace";
    this.ctx.fillStyle = '#00FF66';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${this.score}`, 28, 34);

    this.ctx.fillStyle = '#FF007A';
    this.ctx.fillText(`FRENZY LVL ${this.frenzyLevel}`, 160, 34);

    const reactionMs = Math.max(450, Math.floor(1250 - this.elapsedTime * 12));
    this.ctx.fillStyle = '#9499aa';
    this.ctx.fillText(`REACTION: ${reactionMs}ms`, 310, 34);

    if (this.combo > 1) {
      this.ctx.fillStyle = '#00FF66';
      this.ctx.fillText(`COMBO x${Math.min(this.combo, 5)}!`, 480, 34);
    }
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.handlePointer);
  }
}

// Attach globally
if (typeof window !== 'undefined') {
  window.ZenWebGames = new ZenWebGameEngine();
}
