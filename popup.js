/**
 * ZenWeb Popup Controller
 * Manages UI synchronization, real-time messaging with content script,
 * and persistent settings via chrome.storage.sync.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const tabs = document.querySelectorAll('.ff-tab');
  const tabContents = document.querySelectorAll('.ff-tab-content');
  const masterToggle = document.getElementById('master-toggle');
  const themeBtns = document.querySelectorAll('.ff-theme-btn');
  const fontSelect = document.getElementById('font-select');
  const shieldToggle = document.getElementById('shield-toggle');
  const animToggle = document.getElementById('anim-suppress-toggle');
  const maxWidthToggle = document.getElementById('max-width-toggle');
  const rulerToggle = document.getElementById('ruler-toggle');
  const rulerSlider = document.getElementById('ruler-height-slider');
  const rulerHeightVal = document.getElementById('ruler-height-val');
  const bionicToggle = document.getElementById('bionic-toggle');
  const chunkingToggle = document.getElementById('chunking-toggle');
  const anchorToggle = document.getElementById('anchor-toggle');

  // Audio elements
  const btnAudioToggle = document.getElementById('btn-audio-toggle');
  const soundChips = document.querySelectorAll('.ff-sound-chip');
  const audioVolumeSlider = document.getElementById('audio-volume-slider');
  const audioVolVal = document.getElementById('audio-vol-val');

  // Micro-game elements
  const gameBtns = document.querySelectorAll('.ff-game-btn');
  const btnLaunchBreak = document.getElementById('btn-launch-break');
  const btnLaunchBreathe = document.getElementById('btn-launch-breathe');
  const guardStatusBadge = document.getElementById('guard-status-badge');
  const btnResetLockout = document.getElementById('btn-reset-lockout');

  // AI elements
  const aiSummaryToggle = document.getElementById('ai-summary-toggle');
  const aiSimplifyToggle = document.getElementById('ai-simplify-toggle');
  const aiToneToggle = document.getElementById('ai-tone-toggle');
  const fatigueToggle = document.getElementById('fatigue-toggle');
  const btnOpenSidepanel = document.getElementById('btn-open-sidepanel');

  let currentSettings = {};
  let selectedGame = 'fluid';
  let isAudioPlaying = false;

  // 1. Tab Switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const target = document.getElementById(`tab-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });

  // 2. Load Settings from Storage
  chrome.storage.sync.get(null, (settings) => {
    currentSettings = settings || {};

    masterToggle.checked = settings.enabled !== false;
    fontSelect.value = settings.fontFamily || 'atkinson';
    shieldToggle.checked = settings.distractionShield !== false;
    animToggle.checked = settings.animationSuppressor !== false;
    maxWidthToggle.checked = settings.maxLineLength !== false;

    rulerToggle.checked = !!settings.readingRuler;
    rulerSlider.value = settings.rulerHeight || 120;
    rulerHeightVal.textContent = `${rulerSlider.value}px`;

    bionicToggle.checked = !!settings.bionicReading;
    chunkingToggle.checked = settings.smartChunking !== false;
    anchorToggle.checked = settings.lastReadAnchor !== false;

    // Theme active state
    themeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === (settings.theme || 'pastel'));
    });

    // Audio active state
    const soundType = settings.soundEngine?.type || 'brown';
    soundChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.sound === soundType);
    });

    const vol = settings.soundEngine?.volume !== undefined ? Math.round(settings.soundEngine.volume * 100) : 25;
    audioVolumeSlider.value = vol;
    audioVolVal.textContent = `${vol}%`;

    // AI switches
    aiSummaryToggle.checked = settings.aiSummaryCard !== false;
    aiSimplifyToggle.checked = settings.aiTooltipSimplifier !== false;
    aiToneToggle.checked = settings.toneNeutralizer !== false;
    fatigueToggle.checked = settings.fatigueDetection !== false;

    // Check Lockout Status
    checkLockoutStatus(settings.gameLockUntil || 0);
  });

  // Helper: Persist and Dispatch to Active Tab
  function updateAndDispatch(updatedKeyValues) {
    currentSettings = { ...currentSettings, ...updatedKeyValues };
    chrome.storage.sync.set(updatedKeyValues);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_SETTINGS',
          settings: updatedKeyValues
        });
      }
    });
  }

  // 3. Event Listeners
  masterToggle.addEventListener('change', () => {
    updateAndDispatch({ enabled: masterToggle.checked });
  });

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateAndDispatch({ theme: btn.dataset.theme });
    });
  });

  fontSelect.addEventListener('change', () => {
    updateAndDispatch({ fontFamily: fontSelect.value });
  });

  shieldToggle.addEventListener('change', () => {
    updateAndDispatch({ distractionShield: shieldToggle.checked });
  });

  animToggle.addEventListener('change', () => {
    updateAndDispatch({ animationSuppressor: animToggle.checked });
  });

  maxWidthToggle.addEventListener('change', () => {
    updateAndDispatch({ maxLineLength: maxWidthToggle.checked });
  });

  rulerToggle.addEventListener('change', () => {
    updateAndDispatch({ readingRuler: rulerToggle.checked });
  });

  rulerSlider.addEventListener('input', () => {
    rulerHeightVal.textContent = `${rulerSlider.value}px`;
    updateAndDispatch({ rulerHeight: parseInt(rulerSlider.value, 10) });
  });

  bionicToggle.addEventListener('change', () => {
    updateAndDispatch({ bionicReading: bionicToggle.checked });
  });

  chunkingToggle.addEventListener('change', () => {
    updateAndDispatch({ smartChunking: chunkingToggle.checked });
  });

  anchorToggle.addEventListener('change', () => {
    updateAndDispatch({ lastReadAnchor: anchorToggle.checked });
  });

  // Audio Controls
  soundChips.forEach(chip => {
    chip.addEventListener('click', () => {
      soundChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const type = chip.dataset.sound;
      updateAndDispatch({
        soundEngine: { ...currentSettings.soundEngine, type }
      });

      if (isAudioPlaying) {
        dispatchAudioPlay(type, audioVolumeSlider.value / 100);
      }
    });
  });

  audioVolumeSlider.addEventListener('input', () => {
    const volPercent = audioVolumeSlider.value;
    audioVolVal.textContent = `${volPercent}%`;
    const volFloat = volPercent / 100;
    updateAndDispatch({
      soundEngine: { ...currentSettings.soundEngine, volume: volFloat }
    });

    if (isAudioPlaying) {
      dispatchAudioPlay(getSelectedSoundType(), volFloat);
    }
  });

  btnAudioToggle.addEventListener('click', () => {
    isAudioPlaying = !isAudioPlaying;
    if (isAudioPlaying) {
      btnAudioToggle.textContent = 'Stop';
      btnAudioToggle.classList.add('active');
      dispatchAudioPlay(getSelectedSoundType(), audioVolumeSlider.value / 100);
    } else {
      btnAudioToggle.textContent = 'Play';
      btnAudioToggle.classList.remove('active');
      dispatchAudioStop();
    }
  });

  function getSelectedSoundType() {
    const active = document.querySelector('.ff-sound-chip.active');
    return active ? active.dataset.sound : 'brown';
  }

  function dispatchAudioPlay(audioType, volume) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'PLAY_AMBIENT_AUDIO',
          audioType,
          volume
        });
      }
    });
  }

  function dispatchAudioStop() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_AMBIENT_AUDIO' });
      }
    });
  }

  // Micro-Breaks
  gameBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      gameBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedGame = btn.dataset.game;
    });
  });

  btnLaunchBreak.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'LAUNCH_MICRO_BREAK',
          gameType: selectedGame,
          duration: 90
        });
        window.close();
      }
    });
  });

  btnLaunchBreathe.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'LAUNCH_MICRO_BREAK',
          gameType: 'breathe_direct',
          duration: 0
        });
        window.close();
      }
    });
  });

  btnResetLockout.addEventListener('click', () => {
    chrome.storage.sync.set({ gameLockUntil: 0 }, () => {
      checkLockoutStatus(0);
      btnResetLockout.textContent = 'Lockout cleared!';
      setTimeout(() => { btnResetLockout.textContent = 'Reset 15-min lockout (Dev override)'; }, 2000);
    });
  });

  function checkLockoutStatus(lockUntil) {
    const now = Date.now();
    if (now < lockUntil) {
      const remainingMs = lockUntil - now;
      const m = Math.floor(remainingMs / 60000);
      guardStatusBadge.textContent = `Locked (${m}m)`;
      guardStatusBadge.className = 'ff-guard-status locked';
    } else {
      guardStatusBadge.textContent = 'Ready (90s)';
      guardStatusBadge.className = 'ff-guard-status';
    }
  }

  // AI Switches
  aiSummaryToggle.addEventListener('change', () => {
    updateAndDispatch({ aiSummaryCard: aiSummaryToggle.checked });
  });

  aiSimplifyToggle.addEventListener('change', () => {
    updateAndDispatch({ aiTooltipSimplifier: aiSimplifyToggle.checked });
  });

  aiToneToggle.addEventListener('change', () => {
    updateAndDispatch({ toneNeutralizer: aiToneToggle.checked });
  });

  fatigueToggle.addEventListener('change', () => {
    updateAndDispatch({ fatigueDetection: fatigueToggle.checked });
  });

  btnOpenSidepanel.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    window.close();
  });
});
