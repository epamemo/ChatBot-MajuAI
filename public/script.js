// ============================================================
// Moka AI — Frontend Script
// Connects to /api/chat with conversation history management
// ============================================================

const chatArea = document.getElementById('chat-area');
const messagesContainer = document.getElementById('messages-container');
const welcomeScreen = document.getElementById('welcome-screen');
const typingIndicator = document.getElementById('typing-indicator');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const btnSend = document.getElementById('btn-send');
const btnClear = document.getElementById('btn-clear-chat');
const suggestions = document.getElementById('suggestions');

// Conversation history: [{role: 'user'|'assistant', text: '...'}]
let conversation = [];
let isLoading = false;

// ─── Init ────────────────────────────────────────────────────
function init() {
  chatForm.addEventListener('submit', handleSubmit);
  btnClear.addEventListener('click', clearChat);
  userInput.addEventListener('input', autoResize);
  userInput.addEventListener('keydown', handleKeydown);

  // Suggestion chips
  suggestions.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const question = chip.getAttribute('data-question');
      if (question && !isLoading) {
        sendMessage(question);
      }
    });
  });

  userInput.focus();
}

// ─── Handle Form Submit ──────────────────────────────────────
function handleSubmit(e) {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text || isLoading) return;
  sendMessage(text);
}

// ─── Send Message ────────────────────────────────────────────
async function sendMessage(text) {
  // Hide welcome, show messages
  welcomeScreen.classList.add('hidden');

  // Add user message
  conversation.push({ role: 'user', text });
  appendMessage('user', text);

  // Clear input
  userInput.value = '';
  userInput.style.height = 'auto';

  // Show loading
  setLoading(true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${response.status})`);
    }

    const data = await response.json();
    const botText = data.result || 'Maaf, tidak ada respons dari server.';

    conversation.push({ role: 'assistant', text: botText });
    appendMessage('bot', botText);

  } catch (err) {
    console.error('Chat error:', err);
    appendMessage('bot', `⚠️ Terjadi kesalahan: ${err.message}. Silakan coba lagi.`, true);
  } finally {
    setLoading(false);
    userInput.focus();
  }
}

// ─── Append Message to DOM ───────────────────────────────────
function appendMessage(sender, text, isError = false) {
  const row = document.createElement('div');
  row.className = `message-row ${sender}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';

  if (sender === 'bot') {
    avatar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;
  } else {
    avatar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  if (isError) bubble.classList.add('error-msg');

  if (sender === 'bot') {
    bubble.innerHTML = renderMarkdown(text);
  } else {
    bubble.textContent = text;
  }

  row.appendChild(avatar);
  row.appendChild(bubble);
  messagesContainer.appendChild(row);

  scrollToBottom();
}

// ─── Simple Markdown Renderer ────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  // Code blocks (```...```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Unordered lists
  html = html.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs — split by double newline
  html = html.replace(/\n{2,}/g, '</p><p>');

  // Single newlines → <br>
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*(<h[1-3]>)/g, '$1');
  html = html.replace(/(<\/h[1-3]>)\s*<\/p>/g, '$1');
  html = html.replace(/<p>\s*(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');
  html = html.replace(/<p>\s*(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)\s*<\/p>/g, '$1');

  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─── Loading / Typing Indicator ──────────────────────────────
function setLoading(loading) {
  isLoading = loading;
  btnSend.disabled = loading;

  if (loading) {
    typingIndicator.classList.add('visible');
    scrollToBottom();
  } else {
    typingIndicator.classList.remove('visible');
  }
}

// ─── Scroll to Bottom ────────────────────────────────────────
function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

// ─── Auto Resize Textarea ────────────────────────────────────
function autoResize() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
}

// ─── Keyboard Handling ───────────────────────────────────────
function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event('submit'));
  }
}

// ─── Clear Chat ──────────────────────────────────────────────
function clearChat() {
  if (isLoading) return;

  conversation = [];
  messagesContainer.innerHTML = '';
  welcomeScreen.classList.remove('hidden');
  userInput.focus();
}

// ─── Start ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
