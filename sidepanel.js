/**
 * ZenWeb Side Panel Controller (v2.1)
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
  const chips = document.querySelectorAll('.zw-sp-chip');

  let activePageContext = {
    title: '',
    url: '',
    content: ''
  };

  async function refreshPageContext() {
    pageTitleEl.textContent = 'Syncing active page...';
    chrome.runtime.sendMessage({ type: 'GET_TAB_CONTENT' }, (response) => {
      if (response && response.title) {
        activePageContext = response;
        pageTitleEl.textContent = response.title;
        pageTitleEl.title = response.title;
      } else {
        pageTitleEl.textContent = 'Ready (Digital Context)';
      }
    });
  }

  await refreshPageContext();
  refreshBtn.addEventListener('click', refreshPageContext);

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = `${Math.min(inputEl.scrollHeight, 100)}px`;
  });

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
      appendMessage('assistant', "I had trouble parsing that section. Try highlighting the paragraph directly!");
    }
  }

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  chips.forEach(chip => {
    chip.addEventListener('click', async () => {
      const action = chip.dataset.action;
      if (!activePageContext.content) {
        appendMessage('assistant', "Navigate to an article or refresh page context first!");
        return;
      }

      let promptDesc = "";
      let loadingId = "";

      switch (action) {
        case 'summary':
          promptDesc = "Synthesize an executive 3-bullet overview of this page.";
          appendMessage('user', promptDesc);
          loadingId = appendLoadingIndicator();
          const bullets = await window.ZenWebAI.generate3BulletSummary(activePageContext.content);
          removeLoadingIndicator(loadingId);
          appendMessage('assistant', `**Core Executive Takeaways:**\n\n${bullets.map(b => `• ${b}`).join('\n')}`);
          break;

        case 'adhd':
          promptDesc = "Format this page into scannable digital bullet points.";
          appendMessage('user', promptDesc);
          loadingId = appendLoadingIndicator();
          const adhdPrompt = "Break down the core message into simple, direct bullet points with highlighted key terms. Keep it punchy.";
          const adhdResp = await window.ZenWebAI.answerPageQuestion(adhdPrompt, activePageContext.content);
          removeLoadingIndicator(loadingId);
          appendMessage('assistant', adhdResp);
          break;

        case 'tone':
          promptDesc = "Identify any clickbait or sensationalist framing.";
          appendMessage('user', promptDesc);
          loadingId = appendLoadingIndicator();
          const neutralized = await window.ZenWebAI.neutralizeTone(activePageContext.content.slice(0, 1500));
          removeLoadingIndicator(loadingId);
          appendMessage('assistant', `**Objective, Calm Perspective:**\n\n${neutralized.slice(0, 500)}...`);
          break;

        case 'actions':
          promptDesc = "Extract practical action items from this reading.";
          appendMessage('user', promptDesc);
          loadingId = appendLoadingIndicator();
          const actionResp = await window.ZenWebAI.answerPageQuestion("What are the key actionable takeaways or lessons?", activePageContext.content);
          removeLoadingIndicator(loadingId);
          appendMessage('assistant', actionResp);
          break;
      }
    });
  });

  clearBtn.addEventListener('click', () => {
    messagesEl.innerHTML = `
      <div class="zw-sp-msg zw-sp-assistant">
        <div class="zw-sp-msg-header">
          <span class="zw-sp-avatar">🤖</span>
          <span class="zw-sp-sender">ZENWEB AGENT</span>
        </div>
        <div class="zw-sp-msg-body">
          Deck history cleared. Ask questions about the current page or select a quick action above.
        </div>
      </div>
    `;
  });

  function appendMessage(sender, text) {
    const msg = document.createElement('div');
    msg.className = `zw-sp-msg zw-sp-${sender}`;

    const formattedBody = formatMarkdown(text);

    msg.innerHTML = `
      <div class="zw-sp-msg-header">
        <span class="zw-sp-avatar">${sender === 'assistant' ? '🤖' : '👤'}</span>
        <span class="zw-sp-sender">${sender === 'assistant' ? 'ZENWEB AGENT' : 'YOU'}</span>
      </div>
      <div class="zw-sp-msg-body">${formattedBody}</div>
    `;

    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendLoadingIndicator() {
    const id = 'loading-' + Date.now();
    const msg = document.createElement('div');
    msg.id = id;
    msg.className = 'zw-sp-msg zw-sp-assistant';
    msg.innerHTML = `
      <div class="zw-sp-msg-header">
        <span class="zw-sp-avatar">🤖</span>
        <span class="zw-sp-sender">ZENWEB AGENT</span>
      </div>
      <div class="zw-sp-msg-body" style="color: var(--text-muted); font-family: var(--font-mono);">Processing digital context...</div>
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
