/**
 * ZenWeb Side Panel Controller
 * Facilitates context-aware reading Q&A, executive function assistance,
 * and conversational breakdown of active tab content.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const pageTitleEl = document.getElementById('sp-page-title');
  const messagesEl = document.getElementById('sp-messages');
  const inputEl = document.getElementById('sp-user-input');
  const sendBtn = document.getElementById('sp-send-btn');
  const clearBtn = document.getElementById('sp-clear-btn');
  const refreshBtn = document.getElementById('btn-refresh-context');
  const chips = document.querySelectorAll('.ff-sp-chip');

  let activePageContext = {
    title: '',
    url: '',
    content: ''
  };

  // Fetch active tab content
  async function refreshPageContext() {
    pageTitleEl.textContent = 'Syncing active page...';
    chrome.runtime.sendMessage({ type: 'GET_TAB_CONTENT' }, (response) => {
      if (response && response.title) {
        activePageContext = response;
        pageTitleEl.textContent = response.title;
        pageTitleEl.title = response.title;
      } else {
        pageTitleEl.textContent = 'Ready (Generic Context)';
      }
    });
  }

  await refreshPageContext();
  refreshBtn.addEventListener('click', refreshPageContext);

  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = `${Math.min(inputEl.scrollHeight, 100)}px`;
  });

  // Send message handler
  async function handleSend() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    inputEl.style.height = 'auto';

    appendMessage('user', text);
    const loadingId = appendLoadingIndicator();

    try {
      const response = await window.ZenWebAI.answerPageQuestion(text, activePageContext.content);
      removeLoadingIndicator(loadingId);
      appendMessage('assistant', response);
    } catch (err) {
      removeLoadingIndicator(loadingId);
      appendMessage('assistant', "Sorry, I had trouble analyzing that section. You can try highlighting the paragraph directly!");
    }
  }

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Quick Action Chips
  chips.forEach(chip => {
    chip.addEventListener('click', async () => {
      const action = chip.dataset.action;
      if (!activePageContext.content) {
        appendMessage('assistant', "Please navigate to an article or refresh page context first!");
        return;
      }

      let promptDesc = "";
      let loadingId = "";

      switch (action) {
        case 'summary':
          promptDesc = "Give me an executive 3-bullet overview of this page.";
          appendMessage('user', promptDesc);
          loadingId = appendLoadingIndicator();
          const bullets = await window.ZenWebAI.generate3BulletSummary(activePageContext.content);
          removeLoadingIndicator(loadingId);
          appendMessage('assistant', `**Key Executive Points:**\n\n${bullets.map(b => `• ${b}`).join('\n')}`);
          break;

        case 'adhd':
          promptDesc = "Explain this page in an ADHD-friendly, high-scannability format.";
          appendMessage('user', promptDesc);
          loadingId = appendLoadingIndicator();
          const adhdPrompt = "Break down the core message into simple, direct bullet points with zero corporate jargon. Highlight key takeaways.";
          const adhdResp = await window.ZenWebAI.answerPageQuestion(adhdPrompt, activePageContext.content);
          removeLoadingIndicator(loadingId);
          appendMessage('assistant', adhdResp);
          break;

        case 'tone':
          promptDesc = "Detect any sensationalist or anxiety-inducing tone in this article.";
          appendMessage('user', promptDesc);
          loadingId = appendLoadingIndicator();
          const neutralized = await window.ZenWebAI.neutralizeTone(activePageContext.content.slice(0, 1500));
          removeLoadingIndicator(loadingId);
          appendMessage('assistant', `**Calm, Objective Perspective:**\n\n${neutralized.slice(0, 500)}...`);
          break;

        case 'actions':
          promptDesc = "Extract actionable steps and practical takeaways from this page.";
          appendMessage('user', promptDesc);
          loadingId = appendLoadingIndicator();
          const actionResp = await window.ZenWebAI.answerPageQuestion("What are the actionable steps, key lessons, or concrete takeaways?", activePageContext.content);
          removeLoadingIndicator(loadingId);
          appendMessage('assistant', actionResp);
          break;
      }
    });
  });

  // Clear Chat
  clearBtn.addEventListener('click', () => {
    messagesEl.innerHTML = `
      <div class="ff-sp-msg ff-sp-assistant">
        <div class="ff-sp-msg-header">
          <span class="ff-sp-avatar">✨</span>
          <span class="ff-sp-sender">ZenWeb Assistant</span>
        </div>
        <div class="ff-sp-msg-body">
          Chat cleared. Ask me anything about this page or use the quick chips above!
        </div>
      </div>
    `;
  });

  // UI Helpers
  function appendMessage(sender, text) {
    const msg = document.createElement('div');
    msg.className = `ff-sp-msg ff-sp-${sender}`;

    const formattedBody = formatMarkdown(text);

    msg.innerHTML = `
      <div class="ff-sp-msg-header">
        <span class="ff-sp-avatar">${sender === 'assistant' ? '✨' : '👤'}</span>
        <span class="ff-sp-sender">${sender === 'assistant' ? 'ZenWeb Assistant' : 'You'}</span>
      </div>
      <div class="ff-sp-msg-body">${formattedBody}</div>
    `;

    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendLoadingIndicator() {
    const id = 'loading-' + Date.now();
    const msg = document.createElement('div');
    msg.id = id;
    msg.className = 'ff-sp-msg ff-sp-assistant';
    msg.innerHTML = `
      <div class="ff-sp-msg-header">
        <span class="ff-sp-avatar">✨</span>
        <span class="ff-sp-sender">ZenWeb Assistant</span>
      </div>
      <div class="ff-sp-msg-body" style="color: var(--sp-muted);">Thinking & reading context...</div>
    `;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return id;
  }

  function removeLoadingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function formatMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\s*•\s*(.*)/g, '<br>• $1')
      .replace(/\n\s*-\s*(.*)/g, '<br>• $1')
      .replace(/\n\n/g, '<br><br>');
  }
});
