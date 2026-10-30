/**
 * ZenWeb Background Service Worker (Manifest V3)
 * Coordinates 15-minute randomized focus reset breaks, 30-minute water break reminders,
 * screen activity monitoring permissions, alarms, and cross-tab event messaging.
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  theme: 'pixel-dark', // 'pixel-dark' | 'pixel-light' | 'pixel-contrast'
  fontFamily: 'circular-digital', // 'circular-digital' (Plus Jakarta Sans/Outfit) | 'space-grotesk' | 'mono-digital'
  fontSize: 105, // percentage
  slidingPixels: true, // Sliding pixel grid animation inspired by books.baseten.com
  dataRestructuring: true, // Auto-restructure dense text into scannable cards & bullet points
  screenMonitoringPermission: false, // Must explicitly ask user for permission!
  screenActivityMonitoring: true, // Active when permission granted
  idleThresholdMinutes: 3, // Dwell without activity triggering cognitive idle prompt
  focusResetIntervalMinutes: 15, // Every 15 minutes trigger mini-game focus reset
  focusResetDurationSeconds: 90, // 90 seconds break
  waterReminderIntervalMinutes: 30, // Every 30 minutes trigger hydration alert
  selectedMiniGame: 'random', // 'random' | 'dino' | 'tetris' | 'whack'
  lastFocusBreakTimestamp: Date.now(),
  lastWaterBreakTimestamp: Date.now(),
  waterCountToday: 0
};

// Lifecycle: Install & Initialize Alarms
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[ZenWeb] Extension installed/updated:', details.reason);

  chrome.storage.sync.get(null, (existing) => {
    const initialized = { ...DEFAULT_SETTINGS, ...existing };
    chrome.storage.sync.set(initialized);
  });

  // Setup periodic check alarm (every 1 minute) for 15-min and 30-min triggers
  chrome.alarms.create('zenweb-interval-checker', {
    periodInMinutes: 1
  });

  // Setup context menu shortcuts
  if (chrome.contextMenus) {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'zw-trigger-minigame',
        title: 'ZenWeb: Take Focus Reset Mini-Game (90s)',
        contexts: ['all']
      });

      chrome.contextMenus.create({
        id: 'zw-trigger-water',
        title: 'ZenWeb: Log Water Break (30m Check-in)',
        contexts: ['all']
      });

      chrome.contextMenus.create({
        id: 'zw-restructure-page',
        title: 'ZenWeb: Restructure Webpage into Bullet Cards',
        contexts: ['all']
      });

      chrome.contextMenus.create({
        id: 'zw-open-sidepanel',
        title: 'ZenWeb: Open AI Reading Deck',
        contexts: ['all']
      });
    });
  }
});

// Periodic Alarms Handler (Tracks 15-min Mini-Game and 30-min Water Breaks)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'zenweb-interval-checker') {
    chrome.storage.sync.get(null, (settings) => {
      if (!settings.enabled) return;

      const now = Date.now();
      const focusIntervalMs = (settings.focusResetIntervalMinutes || 15) * 60 * 1000;
      const waterIntervalMs = (settings.waterReminderIntervalMinutes || 30) * 60 * 1000;

      // Check 15-Minute Focus Reset Mini-Game Break
      const lastFocus = settings.lastFocusBreakTimestamp || now;
      if (now - lastFocus >= focusIntervalMs) {
        chrome.storage.sync.set({ lastFocusBreakTimestamp: now });

        // Randomize between the 3 mini-games: dino, tetris, whack
        const games = ['dino', 'tetris', 'whack'];
        const chosenGame = settings.selectedMiniGame === 'random'
          ? games[Math.floor(Math.random() * games.length)]
          : (settings.selectedMiniGame || 'dino');

        broadcastToActiveTab({
          type: 'TRIGGER_MINIGAME_BREAK',
          game: chosenGame,
          duration: settings.focusResetDurationSeconds || 90,
          reason: '15_MIN_INTERVAL'
        });
      }

      // Check 30-Minute Water Break Reminder
      const lastWater = settings.lastWaterBreakTimestamp || now;
      if (now - lastWater >= waterIntervalMs) {
        chrome.storage.sync.set({ lastWaterBreakTimestamp: now });

        broadcastToActiveTab({
          type: 'TRIGGER_WATER_REMINDER',
          reason: '30_MIN_INTERVAL'
        });
      }
    });
  }
});

function broadcastToActiveTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.id && tab?.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      chrome.tabs.sendMessage(tab.id, message, () => {
        void chrome.runtime.lastError;
      });
    }
  });
}

// Context Menu Click Dispatcher
chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (!tab?.id || !tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  switch (info.menuItemId) {
    case 'zw-trigger-minigame':
      chrome.tabs.sendMessage(tab.id, {
        type: 'TRIGGER_MINIGAME_BREAK',
        game: 'random',
        duration: 90,
        reason: 'USER_MANUAL'
      }, () => { void chrome.runtime.lastError; });
      break;

    case 'zw-trigger-water':
      chrome.tabs.sendMessage(tab.id, {
        type: 'TRIGGER_WATER_REMINDER',
        reason: 'USER_MANUAL'
      }, () => { void chrome.runtime.lastError; });
      break;

    case 'zw-restructure-page':
      chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_RESTRUCTURE'
      }, () => { void chrome.runtime.lastError; });
      break;

    case 'zw-open-sidepanel':
      if (chrome.sidePanel?.open) {
        chrome.sidePanel.open({ tabId: tab.id });
      }
      break;
  }
});

// Runtime Messaging Hub
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_TAB_CONTENT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        sendResponse({ content: '', title: '', url: '' });
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { type: 'EXTRACT_PAGE_CONTENT' }, (res) => {
        if (chrome.runtime.lastError || !res) {
          sendResponse({ content: '', title: activeTab.title || '', url: activeTab.url || '' });
        } else {
          sendResponse(res);
        }
      });
    });
    return true;
  }

  if (msg.type === 'OPEN_SIDE_PANEL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id && chrome.sidePanel?.open) {
        chrome.sidePanel.open({ tabId: tabs[0].id })
          .then(() => sendResponse({ success: true }))
          .catch((err) => sendResponse({ success: false, error: err.message }));
      }
    });
    return true;
  }

  if (msg.type === 'RESET_BREAK_TIMER') {
    chrome.storage.sync.set({ lastFocusBreakTimestamp: Date.now() });
    sendResponse({ success: true });
    return;
  }

  if (msg.type === 'LOG_WATER_BREAK') {
    chrome.storage.sync.get(['waterCountToday'], (res) => {
      const count = (res.waterCountToday || 0) + 1;
      chrome.storage.sync.set({
        waterCountToday: count,
        lastWaterBreakTimestamp: Date.now()
      });
      sendResponse({ success: true, count });
    });
    return true;
  }
});
