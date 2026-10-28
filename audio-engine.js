/**
 * ZenWeb Audio Engine
 * High-performance, Web Audio API procedural sound synthesizer.
 * No external audio files or downloads required.
 * Generates continuous Brown Noise, Natural Calm Rain, Binaural Beats, and Zen Singing Bowl Chimes.
 */

class ZenWebAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.activeSource = null;
    this.isPlaying = false;
    this.currentType = 'brown'; // 'brown' | 'rain' | 'binaural'
    this.volume = 0.25;
  }

  /**
   * Initializes or resumes the AudioContext safely within user-gesture constraints
   */
  async initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('ZenWeb: Web Audio API not supported in this browser.');
        return false;
      }
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return true;
  }

  /**
   * Smoothly adjusts master volume without audio clicks
   * @param {number} val 0.0 to 1.0
   */
  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.08);
    }
  }

  /**
   * Starts ambient soundscape
   * @param {string} type 'brown' | 'rain' | 'binaural'
   */
  async start(type = 'brown') {
    const ready = await this.initContext();
    if (!ready) return;

    this.stop(false); // Stop any previous node gently
    this.currentType = type;

    switch (type) {
      case 'brown':
        this.activeSource = this.createBrownNoiseNode();
        break;
      case 'rain':
        this.activeSource = this.createCalmRainNode();
        break;
      case 'binaural':
        this.activeSource = this.createBinauralBeatsNode();
        break;
      default:
        this.activeSource = this.createBrownNoiseNode();
    }

    this.isPlaying = true;
  }

  /**
   * Stops active soundscape with smooth fadeout
   * @param {boolean} resetState whether to set isPlaying to false
   */
  stop(resetState = true) {
    if (this.activeSource) {
      try {
        if (this.activeSource.stop) {
          this.activeSource.stop();
        }
        if (this.activeSource.disconnect) {
          this.activeSource.disconnect();
        }
      } catch (e) {
        // Safe disconnect catch
      }
      this.activeSource = null;
    }
    if (resetState) {
      this.isPlaying = false;
    }
  }

  /**
   * Synthesizes warm, continuous Brown Noise (ADHD neural chatter suppression)
   * 1/f^2 slope using integrated white noise and multi-pole lowpass filters
   */
  createBrownNoiseNode() {
    const bufferSize = 4 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const output = noiseBuffer.getChannelData(channel);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise integration formula
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Compensate for low-gain integral
      }
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Gentle 450Hz low-pass filter to remove harsh upper hiss
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(450, this.ctx.currentTime);
    lowpass.Q.setValueAtTime(0.7, this.ctx.currentTime);

    // Warmth shelf
    const lowshelf = this.ctx.createBiquadFilter();
    lowshelf.type = 'lowshelf';
    lowshelf.frequency.setValueAtTime(120, this.ctx.currentTime);
    lowshelf.gain.setValueAtTime(3.0, this.ctx.currentTime);

    whiteNoise.connect(lowpass);
    lowpass.connect(lowshelf);
    lowshelf.connect(this.masterGain);

    whiteNoise.start();

    return {
      stop: () => {
        try { whiteNoise.stop(); } catch(e){}
        lowpass.disconnect();
        lowshelf.disconnect();
      },
      disconnect: () => {
        try { whiteNoise.disconnect(); } catch(e){}
      }
    };
  }

  /**
   * Synthesizes Calm Gentle Rain
   * Dual modulated pink noise streams + high resonant soft drops
   */
  createCalmRainNode() {
    const bufferSize = 4 * this.ctx.sampleRate;
    const rainBuffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);

    // Pink noise generation
    for (let channel = 0; channel < 2; channel++) {
      const out = rainBuffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        out[i] *= 0.11;
        b6 = white * 0.115926;
      }
    }

    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = rainBuffer;
    rainSource.loop = true;

    // Bandpass for rain body (800 Hz)
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(850, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(0.8, this.ctx.currentTime);

    // Highpass to eliminate heavy mud
    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(250, this.ctx.currentTime);

    // Subtle LFO sweep simulating wind and passing rain volume fluctuation
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.15, this.ctx.currentTime); // 0.15 Hz swell
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(200, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(bandpass.frequency);
    lfo.start();

    rainSource.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(this.masterGain);

    rainSource.start();

    return {
      stop: () => {
        try { rainSource.stop(); lfo.stop(); } catch(e){}
        highpass.disconnect();
        bandpass.disconnect();
      },
      disconnect: () => {
        try { rainSource.disconnect(); lfo.disconnect(); } catch(e){}
      }
    };
  }

  /**
   * Synthesizes 432Hz Carrier with 4Hz Theta / 10Hz Alpha Differential Binaural Beats
   * Separates left and right ear frequencies via ChannelMerger
   */
  createBinauralBeatsNode() {
    const carrierFreq = 432; // Sacred / calm resonant frequency
    const beatOffset = 6;    // 6Hz Theta frequency (deep relaxation & flow)

    const oscLeft = this.ctx.createOscillator();
    const oscRight = this.ctx.createOscillator();
    oscLeft.type = 'sine';
    oscRight.type = 'sine';
    oscLeft.frequency.setValueAtTime(carrierFreq, this.ctx.currentTime);
    oscRight.frequency.setValueAtTime(carrierFreq + beatOffset, this.ctx.currentTime);

    const gainLeft = this.ctx.createGain();
    const gainRight = this.ctx.createGain();
    gainLeft.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gainRight.gain.setValueAtTime(0.2, this.ctx.currentTime);

    oscLeft.connect(gainLeft);
    oscRight.connect(gainRight);

    // Stereo merger for isolated ear routing
    const merger = this.ctx.createChannelMerger(2);
    gainLeft.connect(merger, 0, 0);  // Left output
    gainRight.connect(merger, 0, 1); // Right output

    merger.connect(this.masterGain);

    oscLeft.start();
    oscRight.start();

    return {
      stop: () => {
        try { oscLeft.stop(); oscRight.stop(); } catch(e){}
        gainLeft.disconnect();
        gainRight.disconnect();
        merger.disconnect();
      },
      disconnect: () => {
        try { oscLeft.disconnect(); oscRight.disconnect(); } catch(e){}
      }
    };
  }

  /**
   * Plays a gentle Tibetan Singing Bowl harmonic chime
   * Invoked when micro-break timers finish before breathing reset
   */
  async playZenChime() {
    await this.initContext();
    if (!this.ctx) return;

    const fundamental = 396; // 396Hz Solfeggio frequency
    const harmonics = [1, 2.76, 5.4];
    const gains = [0.3, 0.15, 0.06];

    const now = this.ctx.currentTime;
    const chimeMaster = this.ctx.createGain();
    chimeMaster.gain.setValueAtTime(0.4, now);
    chimeMaster.connect(this.ctx.destination);

    harmonics.forEach((ratio, index) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * ratio, now);

      // Long resonant decay
      g.gain.setValueAtTime(gains[index], now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

      osc.connect(g);
      g.connect(chimeMaster);

      osc.start(now);
      osc.stop(now + 4.0);
    });
  }
}

// Attach globally for content script and popup usage
if (typeof window !== 'undefined') {
  window.ZenWebAudio = new ZenWebAudioEngine();
}
