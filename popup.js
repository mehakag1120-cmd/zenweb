/**
 * ZenWeb Popup Controller (v2.0)
 * Bubbly Micro-Interactions, Live Explicit State Badges, and Real-Time Tab Synchronization.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Master Switch & Hero
  const masterToggle = document.getElementById('master-toggle');
  const masterCard = document.getElementById('zw-master-card');
  const masterStatusDot = document.getElementById('master-status-dot');
  const masterStatusText = document.getElementById('master-status-text');
  const masterStatusSub = document.getElementById('master-status-sub');
  const mainControls = document.getElementById('zw-main-controls');

  // Tabs
  const tabs = document.querySelectorAll('.zw-tab');
  const tabContents = document.querySelectorAll('.zw-tab-content');

  // Sensory Elements
  const themeCards = document.querySelectorAll('.zw-theme-card');
  const fontSelect = document.getElementById('font-select');
  const shieldToggle = document.getElementById('shield-toggle');
  const animToggle = document.getElementById('anim-suppress-toggle');
  const maxWidthToggle = document.getElementById('max-width-toggle');

  // Badges
  const badgeShield = document.getElementById('badge-shield');
  const badgeAnim = document.getElementById('badge-anim');
  const badgeMaxWidth = document.getElementById('badge-max-width');
  const badgeRuler = document.getElementById('badge-ruler');
  const badgeBionic = document.getElementById('badge-bionic');
  const badgeChunking = document.getElementById('badge-chunking');
  const badgeAnchor = document.getElementById('badge-anchor');

  // Reading & Focus
  const rulerToggle = document.getElementById('ruler-toggle');
  const rulerSlider = document.getElementById('ruler-height-slider');
  const rulerHeightVal = document.getElementById('ruler-height-val');
  const bionicToggle = document.getElementById('bionic-toggle');
  const chunkingToggle = document.getElementById('chunking-toggle');
  const anchorToggle = document.getElementById('anchor-toggle');

  // Audio Engine
  const btnAudioToggle = document.getElementById('btn-audio-toggle');
  const audioIconWrap = document.getElementById('audio-icon-wrap');
  const soundCards = document.querySelectorAll('.zw-sound-card');
  const audioVolumeSlider = document.getElementById('audio-volume-slider');
  const audioVolVal = document.getElementById('audio-vol-val');

  // Micro-Breaks
  const gameCards = document.querySelectorAll('.zw-game-card');
  const btnLaunchBreak = document.getElementById('btn-launch-break');
  const btnLaunchBreathe = document.getElementById('btn-launch-breathe');
  const guardStatusBadge = document.getElementById('guard-status-badge');
  const btnResetLockout = document.getElementById('btn-reset-lockout');

  // AI Elements
  const aiSummaryToggle = document.getElementById('ai-summary-toggle');
  const aiSimplifyToggle = document.getElementById('ai-simplify-toggle');
  const aiToneToggle = document.getElementById('ai-tone-toggle');
  const fatigueToggle = document.getElementById('fatigue-toggle');
  const badgeAiSummary = document.getElementById('badge-ai-summary');
  const badgeAiSimplify = document.getElementById('badge-ai-simplify');
  const badgeAiTone = document.getElementById('badge-ai-tone');
  const badgeFatigue = document.getElementById('badge-fatigue');
  const btnOpenSidepanel = document.getElementById('btn-open-sidepanel');
  const btnHeaderSidepanel = document.getElementById('btn-header-sidepanel');

  let currentSettings = {};
  let selectedGame = 'fluid';
  let isAudioPlaying = false;

  // Helper: Explicit Badge State Updater
  function updateBadge(badgeEl, isChecked) {
    if (!badgeEl) return;
    badgeEl.textContent = isChecked ? 'ON' : 'OFF';
    badgeEl.classList.toggle('on', isChecked);
    badgeEl.classList.toggle('off', !isChecked);
  }

  // Helper: Master UI State Updater
  function updateMasterUI(isEnabled) {
    masterToggle.checked = isEnabled;
    masterCard.classList.toggle('active', isEnabled);
    masterStatusDot.classList.toggle('active', isEnabled);

    if (isEnabled) {
      masterStatusText.textContent = 'ZenWeb is Active';
      masterStatusSub.textContent = 'Transforming site into a calm, accessible space';
      mainControls.style.opacity = '1';
      mainControls.style.pointerEvents = 'auto';
    } else {
      masterStatusText.textContent = 'ZenWeb is Paused';
      masterStatusSub.textContent = 'Original website restored';
      mainControls.style.opacity = '0.55';
    }
  }

  // 1. Tab Switching with Spring Feedback
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

    const isEnabled = settings.enabled !== false;
    updateMasterUI(isEnabled);

    // Font selection
    fontSelect.value = settings.fontFamily || 'lexend';

    // Sensory toggles
    shieldToggle.checked = settings.distractionShield !== false;
    updateBadge(badgeShield, shieldToggle.checked);

    animToggle.checked = settings.animationSuppressor !== false;
    updateBadge(badgeAnim, animToggle.checked);

    maxWidthToggle.checked = settings.maxLineLength !== false;
    updateBadge(badgeMaxWidth, maxWidthToggle.checked);

    // Reading accommodations
    rulerToggle.checked = !!settings.readingRuler;
    updateBadge(badgeRuler, rulerToggle.checked);

    rulerSlider.value = settings.rulerHeight || 120;
    rulerHeightVal.textContent = `${rulerSlider.value}px`;

    bionicToggle.checked = !!settings.bionicReading;
    updateBadge(badgeBionic, bionicToggle.checked);

    chunkingToggle.checked = settings.smartChunking !== false;
    updateBadge(badgeChunking, chunkingToggle.checked);

    anchorToggle.checked = settings.lastReadAnchor !== false;
    updateBadge(badgeAnchor, anchorToggle.checked);

    // Theme cards
    themeCards.forEach(card => {
      card.classList.toggle('active', card.dataset.theme === (settings.theme || 'pastel'));
    });

    // Audio setup
    const soundType = settings.soundEngine?.type || 'brown';
    soundCards.forEach(card => {
      card.classList.toggle('active', card.dataset.sound === soundType);
    });

    const vol = settings.soundEngine?.volume !== undefined ? Math.round(settings.soundEngine.volume * 100) : 25;
    audioVolumeSlider.value = vol;
    audioVolVal.textContent = `${vol}%`;

    // AI toggles
    aiSummaryToggle.checked = settings.aiSummaryCard !== false;
    updateBadge(badgeAiSummary, aiSummaryToggle.checked);

    aiSimplifyToggle.checked = settings.aiTooltipSimplifier !== false;
    updateBadge(badgeAiSimplify, aiSimplifyToggle.checked);

    aiToneToggle.checked = settings.toneNeutralizer !== false;
    updateBadge(badgeAiTone, aiToneToggle.checked);

    fatigueToggle.checked = settings.fatigueDetection !== false;
    updateBadge(badgeFatigue, fatigueToggle.checked);

    // Lockout status
    checkLockoutStatus(settings.gameLockUntil || 0);
  });

  // Helper: Persist and Dispatch Message to Active Tab
  function updateAndDispatch(updatedKeyValues) {
    currentSettings = { ...currentSettings, ...updatedKeyValues };
    chrome.storage.sync.set(updatedKeyValues);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_SETTINGS',
          settings: currentSettings // Dispatch full settings snapshot for clean state resolution
        });
      }
    });
  }

  // 3. Master Toggle Listener
  masterToggle.addEventListener('change', () => {
    const isEnabled = masterToggle.checked;
    updateMasterUI(isEnabled);
    updateAndDispatch({ enabled: isEnabled });
  });

  // 4. Theme & Font Listeners
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      themeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      updateAndDispatch({ theme: card.dataset.theme });
    });
  });

  fontSelect.addEventListener('change', () => {
    updateAndDispatch({ fontFamily: fontSelect.value });
  });

  shieldToggle.addEventListener('change', () => {
    updateBadge(badgeShield, shieldToggle.checked);
    updateAndDispatch({ distractionShield: shieldToggle.checked });
  });

  animToggle.addEventListener('change', () => {
    updateBadge(badgeAnim, animToggle.checked);
    updateAndDispatch({ animationSuppressor: animToggle.checked });
  });

  maxWidthToggle.addEventListener('change', () => {
    updateBadge(badgeMaxWidth, maxWidthToggle.checked);
    updateAndDispatch({ maxLineLength: maxWidthToggle.checked });
  });

  // 5. Reading Focus Listeners (Frosted Ruler & Bionic)
  rulerToggle.addEventListener('change', () => {
    updateBadge(badgeRuler, rulerToggle.checked);
    updateAndDispatch({ readingRuler: rulerToggle.checked });
  });

  rulerSlider.addEventListener('input', () => {
    const val = parseInt(rulerSlider.value, 10);
    rulerHeightVal.textContent = `${val}px`;
    updateAndDispatch({ rulerHeight: val });
  });

  bionicToggle.addEventListener('change', () => {
    updateBadge(badgeBionic, bionicToggle.checked);
    updateAndDispatch({ bionicReading: bionicToggle.checked });
  });

  chunkingToggle.addEventListener('change', () => {
    updateBadge(badgeChunking, chunkingToggle.checked);
    updateAndDispatch({ smartChunking: chunkingToggle.checked });
  });

  anchorToggle.addEventListener('change', () => {
    updateBadge(badgeAnchor, anchorToggle.checked);
    updateAndDispatch({ lastReadAnchor: anchorToggle.checked });
  });

  // 6. Audio Engine Listeners
  soundCards.forEach(card => {
    card.addEventListener('click', () => {
      soundCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const soundType = card.dataset.sound;
      updateAndDispatch({
        soundEngine: { ...currentSettings.soundEngine, type: soundType }
      });

      if (isAudioPlaying) {
        dispatchAudioPlay(soundType, audioVolumeSlider.value / 100);
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
      btnAudioToggle.classList.add('playing');
      audioIconWrap.classList.add('playing');
      dispatchAudioPlay(getSelectedSoundType(), audioVolumeSlider.value / 100);
    } else {
      btnAudioToggle.textContent = 'Play';
      btnAudioToggle.classList.remove('playing');
      audioIconWrap.classList.remove('playing');
      dispatchAudioStop();
    }
  });

  function getSelectedSoundType() {
    const active = document.querySelector('.zw-sound-card.active');
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

  // 7. Micro-Break & Hyperfixation Guard
  gameCards.forEach(card => {
    card.addEventListener('click', () => {
      gameCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedGame = card.dataset.game;
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
      setTimeout(() => { btnResetLockout.textContent = 'Reset 15-min lockout (Dev Test)'; }, 2000);
    });
  });

  function checkLockoutStatus(lockUntil) {
    const now = Date.now();
    if (now < lockUntil) {
      const remainingMs = lockUntil - now;
      const m = Math.floor(remainingMs / 60000);
      guardStatusBadge.textContent = `Locked (${m}m)`;
      guardStatusBadge.className = 'zw-guard-pill locked';
    } else {
      guardStatusBadge.textContent = 'Ready (90s)';
      guardStatusBadge.className = 'zw-guard-pill';
    }
  }

  // 8. AI Toggles
  aiSummaryToggle.addEventListener('change', () => {
    updateBadge(badgeAiSummary, aiSummaryToggle.checked);
    updateAndDispatch({ aiSummaryCard: aiSummaryToggle.checked });
  });

  aiSimplifyToggle.addEventListener('change', () => {
    updateBadge(badgeAiSimplify, aiSimplifyToggle.checked);
    updateAndDispatch({ aiTooltipSimplifier: aiSimplifyToggle.checked });
  });

  aiToneToggle.addEventListener('change', () => {
    updateBadge(badgeAiTone, aiToneToggle.checked);
    updateAndDispatch({ toneNeutralizer: aiToneToggle.checked });
  });

  fatigueToggle.addEventListener('change', () => {
    updateBadge(badgeFatigue, fatigueToggle.checked);
    updateAndDispatch({ fatigueDetection: fatigueToggle.checked });
  });

  // Open Side Panel
  const openSidepanel = () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    window.close();
  };
  btnOpenSidepanel.addEventListener('click', openSidepanel);
  btnHeaderSidepanel.addEventListener('click', openSidepanel);
});
