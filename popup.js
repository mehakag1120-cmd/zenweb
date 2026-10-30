/**
 * ZenWeb Popup Controller (v2.3)
 * Live synchronization for 15-min focus reset mini-games, 30-min water reminders,
 * AI Screen Activity Monitor permissions, and page data restructuring.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const masterToggle = document.getElementById('master-toggle');
  const masterStatusBadge = document.getElementById('master-status-badge');
  const deckControls = document.getElementById('zw-deck-controls');

  const restructureToggle = document.getElementById('restructure-toggle');
  const slidingPixelsToggle = document.getElementById('sliding-pixels-toggle');

  const agentPermBadge = document.getElementById('agent-perm-badge');
  const agentStatusText = document.getElementById('agent-status-text');
  const agentStatusDesc = document.getElementById('agent-status-desc');
  const btnRequestPerm = document.getElementById('btn-request-perm');

  const nextResetCountdown = document.getElementById('next-reset-countdown');
  const gameSelector = document.getElementById('game-selector');
  const btnPlayGameNow = document.getElementById('btn-play-game-now');

  const nextWaterCountdown = document.getElementById('next-water-countdown');
  const waterStatCount = document.getElementById('water-stat-count');
  const btnLogWaterNow = document.getElementById('btn-log-water-now');

  let currentSettings = {};

  // 1. Load Settings
  chrome.storage.sync.get(null, (settings) => {
    currentSettings = settings || {};

    const isEnabled = settings.enabled !== false;
    updateMasterUI(isEnabled);

    // Restructuring
    restructureToggle.checked = settings.dataRestructuring !== false;
    slidingPixelsToggle.checked = settings.slidingPixels !== false;

    // Agent Permission
    updateAgentUI(settings.screenMonitoringPermission === true, settings.screenActivityMonitoring !== false);

    // Mini-Game Selector
    gameSelector.value = settings.selectedMiniGame || 'random';

    // Water Stats
    waterStatCount.textContent = `${settings.waterCountToday || 0} Breaks Today`;

    // Start Live Timers
    startLiveCountdowns(settings);
  });

  function updateMasterUI(isEnabled) {
    masterToggle.checked = isEnabled;
    masterStatusBadge.textContent = isEnabled ? 'ONLINE' : 'STANDBY';
    masterStatusBadge.className = isEnabled ? 'zw-badge-status' : 'zw-badge-status offline';
    deckControls.style.opacity = isEnabled ? '1' : '0.45';
    deckControls.style.pointerEvents = isEnabled ? 'auto' : 'none';
  }

  function updateAgentUI(hasPerm, isMonitoring) {
    if (hasPerm && isMonitoring) {
      agentPermBadge.textContent = 'ACTIVE';
      agentPermBadge.className = 'zw-badge-accent-green';
      agentStatusText.textContent = 'Screen Monitor Active';
      agentStatusDesc.textContent = 'Observes reading pace & cognitive stalls to trigger timely resets';
      btnRequestPerm.textContent = '[PAUSE MONITOR]';
    } else if (hasPerm && !isMonitoring) {
      agentPermBadge.textContent = 'PAUSED';
      agentPermBadge.className = 'zw-badge-accent-pink';
      agentStatusText.textContent = 'Screen Monitor Paused';
      agentStatusDesc.textContent = 'Permission granted. Click below to resume activity monitoring';
      btnRequestPerm.textContent = '[RESUME MONITOR]';
    } else {
      agentPermBadge.textContent = 'CONSENT REQ';
      agentPermBadge.className = 'zw-badge-accent-pink';
      agentStatusText.textContent = 'Awaiting User Permission';
      agentStatusDesc.textContent = 'Permission required to monitor screen activity and idle dwell time';
      btnRequestPerm.textContent = '[GRANT PERMISSION]';
    }
  }

  function startLiveCountdowns(settings) {
    const update = () => {
      const now = Date.now();

      // 15-Minute Focus Reset Mini-Game Timer
      const lastFocus = settings.lastFocusBreakTimestamp || now;
      const focusIntervalMs = (settings.focusResetIntervalMinutes || 15) * 60 * 1000;
      const focusRemaining = Math.max(0, focusIntervalMs - (now - lastFocus));
      const fMins = Math.floor(focusRemaining / 60000);
      const fSecs = Math.floor((focusRemaining % 60000) / 1000);
      nextResetCountdown.textContent = `${fMins}:${fSecs < 10 ? '0' : ''}${fSecs}`;

      // 30-Minute Water Reminder Timer
      const lastWater = settings.lastWaterBreakTimestamp || now;
      const waterIntervalMs = (settings.waterReminderIntervalMinutes || 30) * 60 * 1000;
      const waterRemaining = Math.max(0, waterIntervalMs - (now - lastWater));
      const wMins = Math.floor(waterRemaining / 60000);
      const wSecs = Math.floor((waterRemaining % 60000) / 1000);
      nextWaterCountdown.textContent = `${wMins}:${wSecs < 10 ? '0' : ''}${wSecs}`;
    };

    update();
    setInterval(update, 1000);
  }

  function updateAndDispatch(updated) {
    currentSettings = { ...currentSettings, ...updated };
    chrome.storage.sync.set(updated);

    // Broadcast to all open tabs so every tab synchronizes immediately
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'UPDATE_SETTINGS',
            settings: currentSettings
          }).catch(() => {});
        }
      });
    });
  }

  // Event Listeners
  masterToggle.addEventListener('change', () => {
    updateMasterUI(masterToggle.checked);
    updateAndDispatch({ enabled: masterToggle.checked });
  });

  restructureToggle.addEventListener('change', () => {
    updateAndDispatch({ dataRestructuring: restructureToggle.checked });
  });

  slidingPixelsToggle.addEventListener('change', () => {
    updateAndDispatch({ slidingPixels: slidingPixelsToggle.checked });
  });

  btnRequestPerm.addEventListener('click', () => {
    if (!currentSettings.screenMonitoringPermission) {
      // Trigger permission modal on active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'REQUEST_PERMISSION_DIALOG' }).catch(() => {});
          window.close();
        }
      });
    } else {
      // Toggle active / paused
      const newActive = !(currentSettings.screenActivityMonitoring !== false);
      updateAndDispatch({ screenActivityMonitoring: newActive });
      updateAgentUI(true, newActive);
    }
  });

  gameSelector.addEventListener('change', () => {
    updateAndDispatch({ selectedMiniGame: gameSelector.value });
  });

  btnPlayGameNow.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'TRIGGER_MINIGAME_BREAK',
          game: gameSelector.value,
          duration: 90
        }).catch(() => {});
        window.close();
      }
    });
  });

  btnLogWaterNow.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'LOG_WATER_BREAK' }, (res) => {
      const count = res?.count || 1;
      waterStatCount.textContent = `${count} Breaks Today`;
      currentSettings.lastWaterBreakTimestamp = Date.now();
    });
  });
});
