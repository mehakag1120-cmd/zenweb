/**
 * ZenWeb Background Service Worker (Manifest V3)
 * Manages side panel initialization, idle detection, context menus,
 * storage synchronization, and cross-tab event coordination.
 */

// Default configuration schema
const DEFAULT_SETTINGS = {
  enabled: true,
  theme: 'pastel', // 'none' | 'pastel' | 'deep-contrast' | 'sepia'
  fontFamily: 'atkinson', // 'atkinson' | 'opendyslexic' | 'system' | 'serif'
  fontSize: 100, // percentage
  lineSpacing: '1.75',
  maxLineLength: true,
  distractionShield: true,
  animationSuppressor: true,
  readingRuler: false,
  rulerHeight: 120,
  rulerDimOpacity: 0.65,
  bionicReading: false,
  smartChunking: true,
  lastReadAnchor: true,
  soundEngine: {
    playing: false,
    type: 'brown', // 'brown' | 'rain' | 'binaural'
    volume: 0.25
  },
  aiSummaryCard: true,
  aiTooltipSimplifier: true,
  toneNeutralizer: true,
  fatigueDetection: true,
  fatigueThresholdMinutes: 4,
  gameCoolingPeriodMinutes: 15,
  gameLockUntil: 0
};

// Lifecycle: Installation & Default Settings Setup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('ZenWeb Extension Installed / Updated:', details.reason);

  chrome.storage.sync.get(null, (existing) => {
    const initialized = { ...DEFAULT_SETTINGS, ...existing };
    chrome.storage.sync.set(initialized);
  });

  // Configure Side Panel behavior (if available in Chrome version)
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }

  // Create Accessibility Context Menus
  if (chrome.contextMenus) {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'ff-simplify-selection',
        title: 'ZenWeb: Rewrite in Plain English',
        contexts: ['selection']
      });

      chrome.contextMenus.create({
        id: 'ff-neutralize-selection',
        title: 'ZenWeb: Neutralize Clickbait/Alarmist Tone',
        contexts: ['selection']
      });

      chrome.contextMenus.create({
        id: 'ff-separator-1',
        type: 'separator',
        contexts: ['all']
      });

      chrome.contextMenus.create({
        id: 'ff-open-sidepanel',
        title: 'ZenWeb: Open AI Assistant Side Panel',
        contexts: ['all']
      });

      chrome.contextMenus.create({
        id: 'ff-trigger-break',
        title: 'ZenWeb: Take 90s Focus Reset Break',
        contexts: ['all']
      });
    });
  }

  // Configure Idle Detection
  if (chrome.idle) {
    chrome.idle.setDetectionInterval(240); // 4 minutes
  }
});

// Handle Context Menu Clicks
chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  switch (info.menuItemId) {
    case 'ff-simplify-selection':
      chrome.tabs.sendMessage(tab.id, {
        type: 'TRIGGER_SELECTION_ACTION',
        action: 'simplify',
        selectionText: info.selectionText
      });
      break;

    case 'ff-neutralize-selection':
      chrome.tabs.sendMessage(tab.id, {
        type: 'TRIGGER_SELECTION_ACTION',
        action: 'neutralize',
        selectionText: info.selectionText
      });
      break;

    case 'ff-open-sidepanel':
      if (chrome.sidePanel && chrome.sidePanel.open) {
        chrome.sidePanel.open({ tabId: tab.id });
      }
      break;

    case 'ff-trigger-break':
      chrome.tabs.sendMessage(tab.id, {
        type: 'LAUNCH_MICRO_BREAK',
        gameType: 'fluid',
        duration: 90
      });
      break;
  }
});

// Idle State Notification
chrome.idle?.onStateChanged.addListener((newState) => {
  if (newState === 'idle' || newState === 'locked') {
    // Notify active tabs about idle state to halt audio or pause timers
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SYSTEM_IDLE_STATE', state: newState });
      }
    });
  }
});

// Message Dispatcher between Sidepanel, Popup, and Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Request active tab's text content for Sidepanel AI analysis
  if (message.type === 'GET_TAB_CONTENT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        sendResponse({ content: '', title: '', url: '' });
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { type: 'EXTRACT_PAGE_CONTENT' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          sendResponse({ content: '', title: activeTab.title || '', url: activeTab.url || '' });
        } else {
          sendResponse(response);
        }
      });
    });
    return true; // Keep sendResponse asynchronous
  }

  // Open side panel programmatically from popup or floating pill
  if (message.type === 'OPEN_SIDE_PANEL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id && chrome.sidePanel && chrome.sidePanel.open) {
        chrome.sidePanel.open({ tabId: tabs[0].id })
          .then(() => sendResponse({ success: true }))
          .catch(err => sendResponse({ success: false, error: err.message }));
      }
    });
    return true;
  }
});
