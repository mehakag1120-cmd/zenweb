/**
 * ZenWeb Micro-Gaming Suite (v2.1)
 * High-performance (60-120 FPS) Canvas gaming engine inspired by books.baseten.com.
 * Features 3 randomized mini-games for 15-minute focus resets:
 * 1. Dino Jump (Pixel T-Rex jumping cacti)
 * 2. Tetris (10x20 falling tetromino matrix)
 * 3. Whack-A-Dino (3x3 pop-up digital arcade grid)
 * Hard-limited to 90 seconds to prevent hyperfixation traps.
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
  }

  /**
   * Randomly picks one of the three mini-games
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
  }

  renderGameModal(gameType) {
    const titles = {
      dino: 'DINO JUMP // KINETIC FOCUS',
      tetris: 'TETRIS MATRIX // SPATIAL RESET',
      whack: 'WHACK-A-DINO // REACTION BURST'
    };

    const hints = {
      dino: 'Press [SPACEBAR], [UP ARROW], or [CLICK] to Jump over cacti',
      tetris: '[ARROWS] Move/Rotate | [DOWN] Soft Drop | [SPACE] Hard Drop',
      whack: '[CLICK / TAP] popping green & golden dinos! Avoid red glitch dinos.'
    };

    const modal = document.createElement('div');
    modal.id = 'zenweb-game-modal';
    modal.className = 'zw-game-backdrop';
    modal.innerHTML = `
      <div class="zw-game-window">
        <!-- Digital Window Header -->
        <div class="zw-game-header">
          <div class="zw-game-title-group">
            <span class="zw-pixel-pill">[RESET PROTOCOL]</span>
            <span class="zw-game-title">${titles[gameType] || 'FOCUS MINI-GAME'}</span>
          </div>
          <div class="zw-game-clock">
            <span class="zw-clock-dot"></span>
            <span id="zw-game-timer-display">${this.timeRemaining}s</span>
          </div>
        </div>

        <!-- Canvas Container -->
        <div class="zw-game-canvas-box">
          <canvas id="zenweb-game-canvas"></canvas>
        </div>

        <!-- Footer & Controls Guide -->
        <div class="zw-game-footer">
          <div class="zw-game-hint">
            <span class="zw-badge-hint">CONTROLS</span>
            <span>${hints[gameType]}</span>
          </div>
          <button class="zw-btn-game-quit" id="zw-game-close-btn">[RESUME READING]</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    modal.querySelector('#zw-game-close-btn').addEventListener('click', () => {
      this.terminateGame(false);
    });
  }

  initCanvas(gameType) {
    this.canvasEl = document.getElementById('zenweb-game-canvas');
    if (!this.canvasEl) return;

    this.ctx = this.canvasEl.getContext('2d');
    const rect = this.canvasEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Retina anti-aliasing normalization
    this.canvasEl.width = rect.width * dpr;
    this.canvasEl.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Instantiate chosen game
    switch (gameType) {
      case 'dino':
        this.currentGame = new DinoJumpGame(this.canvasEl, this.ctx, width, height);
        break;
      case 'tetris':
        this.currentGame = new TetrisGame(this.canvasEl, this.ctx, width, height);
        break;
      case 'whack':
        this.currentGame = new WhackADinoGame(this.canvasEl, this.ctx, width, height);
        break;
      default:
        this.currentGame = new DinoJumpGame(this.canvasEl, this.ctx, width, height);
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

    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.currentGame?.destroy) this.currentGame.destroy();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    // Audio chime
    if (window.ZenWebAudio) window.ZenWebAudio.playZenChime();

    // Reset background 15-min break timer
    chrome.runtime?.sendMessage({ type: 'RESET_BREAK_TIMER' });

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
      <div class="zw-game-window" style="max-width: 480px; text-align: center; padding: 28px;">
        <div class="zw-pixel-pill">[NEURAL RE-CENTER]</div>
        <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; color: #fff; margin: 12px 0 6px 0;">
          30-Second Reset Complete
        </h2>
        <p style="color: #9e9eb0; font-size: 13.5px; margin-bottom: 24px;">
          Breathe in sync with the pulsing matrix orb before diving back into reading.
        </p>

        <div class="zw-breath-orb-wrap">
          <div class="zw-breath-ring"></div>
          <div class="zw-breath-orb" id="zw-breath-orb">4s</div>
        </div>

        <div style="font-family: monospace; font-size: 13px; color: #00FF66; margin-top: 18px;" id="zw-breath-phase">
          INHALE SLOWLY...
        </div>

        <button class="zw-btn-game-quit" id="zw-breath-skip" style="margin-top: 24px; width: 100%;">
          [RETURN TO READING NOW]
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    let secs = 15;
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
   MINI-GAME 1: DINO JUMP (RETRO T-REX KINETIC FOCUS)
   ========================================================================== */

class DinoJumpGame {
  constructor(canvas, ctx, width, height) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    this.groundY = height - 45;
    this.dino = {
      x: 60,
      y: this.groundY - 36,
      w: 32,
      h: 36,
      vy: 0,
      jumpForce: -620,
      gravity: 1600,
      isGrounded: true
    };

    this.obstacles = [];
    this.spawnTimer = 1.2;
    this.speed = 280;
    this.score = 0;
    this.gameOver = false;
    this.particles = [];

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
      this.createJumpSparks(this.dino.x + 16, this.dino.y + 36);
    }
  }

  restart() {
    this.dino.y = this.groundY - 36;
    this.dino.vy = 0;
    this.dino.isGrounded = true;
    this.obstacles = [];
    this.speed = 280;
    this.score = 0;
    this.gameOver = false;
  }

  createJumpSparks(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 120,
        vy: (Math.random() - 1) * 80,
        life: 0.35,
        color: '#00FF66'
      });
    }
  }

  update(dt) {
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.gameOver) return;

    // Dino Physics
    this.dino.vy += this.dino.gravity * dt;
    this.dino.y += this.dino.vy * dt;

    if (this.dino.y >= this.groundY - this.dino.h) {
      this.dino.y = this.groundY - this.dino.h;
      this.dino.vy = 0;
      this.dino.isGrounded = true;
    }

    // Obstacle Spawning
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const isTall = Math.random() > 0.5;
      this.obstacles.push({
        x: this.width + 20,
        y: isTall ? this.groundY - 44 : this.groundY - 30,
        w: isTall ? 22 : 18,
        h: isTall ? 44 : 30,
        isTall
      });
      this.spawnTimer = 1.1 + Math.random() * 0.9;
    }

    // Move obstacles & collision
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.speed * dt;

      // AABB Box collision with 4px forgiveness
      if (
        this.dino.x + 4 < obs.x + obs.w &&
        this.dino.x + this.dino.w - 4 > obs.x &&
        this.dino.y + 4 < obs.y + obs.h &&
        this.dino.y + this.dino.h - 4 > obs.y
      ) {
        this.gameOver = true;
        this.createJumpSparks(this.dino.x + 16, this.dino.y + 16);
      }

      if (obs.x + obs.w < -20) {
        this.obstacles.splice(i, 1);
        this.score += 10;
        this.speed = Math.min(520, this.speed + 8); // Gently ramp up
      }
    }
  }

  render() {
    this.ctx.fillStyle = '#0a0a0e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Pixel matrix stars
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let x = 30; x < this.width; x += 60) {
      this.ctx.fillRect(x, 25 + Math.sin(x) * 15, 2, 2);
    }

    // Ground Line
    this.ctx.strokeStyle = '#262833';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();

    // Ground dashed grid pattern
    this.ctx.fillStyle = '#00FF66';
    for (let x = (Date.now() / 8) % 40; x < this.width; x += 40) {
      this.ctx.fillRect(this.width - x, this.groundY + 3, 12, 2);
    }

    // Dino Character (Pixelated Block Form)
    this.ctx.fillStyle = '#00FF66';
    this.ctx.shadowColor = '#00FF66';
    this.ctx.shadowBlur = 8;
    // Dino Head
    this.ctx.fillRect(this.dino.x + 12, this.dino.y, 18, 14);
    // Eye
    this.ctx.fillStyle = '#0a0a0e';
    this.ctx.fillRect(this.dino.x + 22, this.dino.y + 3, 3, 3);
    // Body
    this.ctx.fillStyle = '#00FF66';
    this.ctx.fillRect(this.dino.x + 4, this.dino.y + 14, 20, 16);
    // Legs
    const runCycle = Math.floor(Date.now() / 120) % 2;
    if (this.dino.isGrounded) {
      if (runCycle === 0) {
        this.ctx.fillRect(this.dino.x + 6, this.dino.y + 30, 4, 6);
        this.ctx.fillRect(this.dino.x + 16, this.dino.y + 30, 4, 4);
      } else {
        this.ctx.fillRect(this.dino.x + 6, this.dino.y + 30, 4, 4);
        this.ctx.fillRect(this.dino.x + 16, this.dino.y + 30, 4, 6);
      }
    } else {
      this.ctx.fillRect(this.dino.x + 8, this.dino.y + 30, 5, 4);
    }
    this.ctx.shadowBlur = 0;

    // Obstacles (Pixel Cacti)
    this.ctx.fillStyle = '#FF007A';
    this.ctx.shadowColor = '#FF007A';
    this.ctx.shadowBlur = 8;
    this.obstacles.forEach(obs => {
      this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      // Cactus arms
      if (obs.isTall) {
        this.ctx.fillRect(obs.x - 5, obs.y + 10, 5, 8);
        this.ctx.fillRect(obs.x + obs.w, obs.y + 14, 5, 8);
      }
    });
    this.ctx.shadowBlur = 0;

    // Particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, 3, 3);
    });

    // Score HUD
    this.ctx.font = "bold 15px 'Plus Jakarta Sans', monospace";
    this.ctx.fillStyle = '#f2f4f8';
    this.ctx.fillText(`SCORE: ${this.score}`, 24, 34);

    if (this.gameOver) {
      this.ctx.fillStyle = 'rgba(10, 10, 14, 0.85)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.font = "bold 22px 'Plus Jakarta Sans', monospace";
      this.ctx.fillStyle = '#FF007A';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("COLLISION DETECTED", this.width / 2, this.height / 2 - 12);
      this.ctx.font = "14px monospace";
      this.ctx.fillStyle = '#00FF66';
      this.ctx.fillText("TAP OR PRESS SPACE TO RESPAWN", this.width / 2, this.height / 2 + 20);
      this.ctx.textAlign = 'left';
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKey);
    this.canvas.removeEventListener('pointerdown', this.handlePointer);
  }
}

/* ==========================================================================
   MINI-GAME 2: TETRIS (CLASSIC 10x20 FALLING MATRIX)
   ========================================================================== */

class TetrisGame {
  constructor(canvas, ctx, width, height) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    this.cols = 10;
    this.rows = 18;
    this.blockSize = Math.floor(Math.min(height - 40, 360) / this.rows);
    this.gridWidth = this.cols * this.blockSize;
    this.gridHeight = this.rows * this.blockSize;
    this.startX = Math.floor((width - this.gridWidth) / 2);
    this.startY = Math.floor((height - this.gridHeight) / 2);

    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    this.score = 0;
    this.lines = 0;
    this.dropInterval = 0.55;
    this.dropTimer = 0;

    // Tetrominoes
    this.shapes = [
      { id: 1, color: '#00FF66', matrix: [[1,1,1,1]] }, // I
      { id: 2, color: '#FFD600', matrix: [[1,1],[1,1]] }, // O
      { id: 3, color: '#FF007A', matrix: [[0,1,0],[1,1,1]] }, // T
      { id: 4, color: '#00E5FF', matrix: [[1,1,0],[0,1,1]] }, // S
      { id: 5, color: '#FF3D00', matrix: [[0,1,1],[1,1,0]] }, // Z
      { id: 6, color: '#7C4DFF', matrix: [[1,0,0],[1,1,1]] }, // J
      { id: 7, color: '#FF9100', matrix: [[0,0,1],[1,1,1]] }  // L
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
    if (this.collides()) {
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
    if (this.collides()) {
      this.currentPiece.matrix = orig; // Wall kick fallback
    }
  }

  hardDrop() {
    while (this.move(0, 1)) {}
  }

  collides() {
    const { matrix, x, y } = this.currentPiece;
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

    if (this.collides()) {
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
      const pts = [0, 100, 300, 500, 800];
      this.score += pts[cleared] || 400;
      this.lines += cleared;
    }
  }

  update(dt) {
    this.dropTimer += dt;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      this.move(0, 1);
    }
  }

  render() {
    this.ctx.fillStyle = '#0a0a0e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Matrix Border Box
    this.ctx.strokeStyle = '#262833';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.startX - 2, this.startY - 2, this.gridWidth + 4, this.gridHeight + 4);

    // Grid Background
    this.ctx.fillStyle = '#12131a';
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
          // Subtle dot
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          this.ctx.fillRect(px + this.blockSize / 2, py + this.blockSize / 2, 1.5, 1.5);
        }
      }
    }

    // Active Falling Piece
    if (this.currentPiece) {
      const { matrix, x, y, color } = this.currentPiece;
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 6;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            const px = this.startX + (x + c) * this.blockSize;
            const py = this.startY + (y + r) * this.blockSize;
            if (py >= this.startY) {
              this.ctx.fillRect(px + 1, py + 1, this.blockSize - 2, this.blockSize - 2);
            }
          }
        }
      }
      this.ctx.shadowBlur = 0;
    }

    // HUD Side Display
    this.ctx.font = "bold 14px 'Plus Jakarta Sans', monospace";
    this.ctx.fillStyle = '#00FF66';
    this.ctx.fillText(`SCORE: ${this.score}`, 24, 34);
    this.ctx.fillStyle = '#f2f4f8';
    this.ctx.fillText(`LINES: ${this.lines}`, 24, 56);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKey);
  }
}

/* ==========================================================================
   MINI-GAME 3: WHACK-A-DINO (3x3 POP-UP ARCADE REACTION BURST)
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

    // 3x3 Grid of digital terminals
    this.holes = [];
    const cellSize = 80;
    const gap = 20;
    const startX = (width - (cellSize * 3 + gap * 2)) / 2;
    const startY = (height - (cellSize * 3 + gap * 2)) / 2 + 10;

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

    this.nextSpawn = 0.4;

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
            const pts = 10 * Math.min(this.combo, 4);
            this.score += pts;
            this.spawnText(hole.x + 40, hole.y + 20, `+${pts}`, '#00FF66');
          } else if (hole.type === 'golden') {
            this.combo += 2;
            const pts = 30 * Math.min(this.combo, 4);
            this.score += pts;
            this.spawnText(hole.x + 40, hole.y + 20, `+${pts} ULTRA!`, '#FFD600');
          } else if (hole.type === 'glitch') {
            this.combo = 0;
            this.score = Math.max(0, this.score - 10);
            this.spawnText(hole.x + 40, hole.y + 20, '-10 GLITCH', '#FF007A');
          }
        }
      });

      if (!hit) {
        this.combo = 0; // Miss reset
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
    // Spawner
    this.nextSpawn -= dt;
    if (this.nextSpawn <= 0) {
      const inactive = this.holes.filter(h => !h.active);
      if (inactive.length > 0) {
        const pick = inactive[Math.floor(Math.random() * inactive.length)];
        pick.active = true;
        pick.whacked = false;
        pick.timeLeft = 0.9 + Math.random() * 0.7;

        // 70% normal green dino, 20% golden dino, 10% glitch red dino
        const roll = Math.random();
        if (roll < 0.20) pick.type = 'golden';
        else if (roll < 0.32) pick.type = 'glitch';
        else pick.type = 'normal';
      }
      this.nextSpawn = 0.45 + Math.random() * 0.5;
    }

    // Active dinos timer
    this.holes.forEach(hole => {
      if (hole.active) {
        hole.timeLeft -= dt;
        if (hole.timeLeft <= 0) {
          hole.active = false;
        }
      }
    });

    // Floating text update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.y += p.vy * dt;
      p.alpha -= dt * 1.4;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  render() {
    this.ctx.fillStyle = '#0a0a0e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw Grid Holes
    this.holes.forEach(hole => {
      this.ctx.fillStyle = '#14151e';
      this.ctx.strokeStyle = '#262833';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.roundRect(hole.x, hole.y, hole.size, hole.size, 10);
      this.ctx.fill();
      this.ctx.stroke();

      if (hole.active) {
        const cx = hole.x + hole.size / 2;
        const cy = hole.y + hole.size / 2;

        let dinoColor = '#00FF66';
        if (hole.type === 'golden') dinoColor = '#FFD600';
        if (hole.type === 'glitch') dinoColor = '#FF007A';

        this.ctx.fillStyle = dinoColor;
        this.ctx.shadowColor = dinoColor;
        this.ctx.shadowBlur = 10;

        if (hole.whacked) {
          // Whacked state
          this.ctx.font = '24px monospace';
          this.ctx.textAlign = 'center';
          this.ctx.fillText("💥", cx, cy + 8);
        } else {
          // Pixel Dino Head
          this.ctx.fillRect(cx - 14, cy - 16, 28, 22);
          // Dino snout
          this.ctx.fillRect(cx - 4, cy - 10, 22, 16);
          // Eye
          this.ctx.fillStyle = '#0a0a0e';
          this.ctx.fillRect(cx + 6, cy - 8, 4, 4);
        }
        this.ctx.shadowBlur = 0;
      }
    });

    // Floating Points Particles
    this.particles.forEach(p => {
      this.ctx.font = "bold 15px 'Plus Jakarta Sans', monospace";
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.textAlign = 'center';
      this.ctx.fillText(p.text, p.x, p.y);
      this.ctx.globalAlpha = 1;
    });

    // Score HUD
    this.ctx.font = "bold 15px 'Plus Jakarta Sans', monospace";
    this.ctx.fillStyle = '#00FF66';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${this.score}`, 24, 34);

    if (this.combo > 1) {
      this.ctx.fillStyle = '#FF007A';
      this.ctx.fillText(`COMBO x${Math.min(this.combo, 4)}!`, 150, 34);
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
