// chatbot.js
(function () {
  // Configuration
  const WHATSAPP_NUMBER = '919220632019'; // international without + (replace if needed)
  const DEFAULT_WHATSAPP_MSG = 'Hi Zuvia, I need help with an order / distributorship';
  const STORAGE_KEY = 'zuvia_chat_history_v1';
  const typingDelay = 650; // ms to show typing indicator
  const AI_ENDPOINT = '/api/chat'; // server endpoint (optional). If not present, fallback to canned replies.

  // Elements
  const toggleBtn = document.getElementById('zuvia-chat-toggle');
  const chatWin = document.getElementById('zuvia-chat-window');
  const closeBtn = document.getElementById('zuvia-chat-close');
  const chatBody = document.getElementById('zuvia-chat-body');
  const chatForm = document.getElementById('zuvia-chat-form');
  const userInput = document.getElementById('zuvia-user-input');
  const quickRepliesContainer = document.getElementById('zuvia-quick-replies');

  if (!toggleBtn || !chatWin || !chatBody || !chatForm || !userInput) {
    console.warn('Zuvia chatbot: missing HTML elements. Make sure chatbot HTML exists.');
    return;
  }

  // Helper: create message DOM
  function makeMessage(text, who = 'bot') {
    const wrapper = document.createElement('div');
    wrapper.className = `z-message z-${who}`;
    const inner = document.createElement('div');
    inner.className = 'z-msg-inner';
    inner.textContent = text;
    wrapper.appendChild(inner);
    return wrapper;
  }

  // Helper: show typing indicator
  function showTyping() {
    const t = document.createElement('div');
    t.className = 'z-typing';
    t.id = 'z-typing';
    t.textContent = 'Zuvia is typing…';
    chatBody.appendChild(t);
    scrollChatToBottom();
    return t;
  }
  function removeTyping() {
    const t = document.getElementById('z-typing');
    if (t) t.remove();
  }

  // Scroll helper
  function scrollChatToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight + 200;
  }

  // Persist / restore conversation
  function saveHistory() {
    const msgs = Array.from(chatBody.querySelectorAll('.z-message')).map(node => {
      return {
        who: node.classList.contains('z-user') ? 'user' : 'bot',
        text: node.querySelector('.z-msg-inner')?.textContent || ''
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  }
  function restoreHistory() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const msgs = JSON.parse(raw);
      chatBody.innerHTML = '';
      msgs.forEach(m => {
        chatBody.appendChild(makeMessage(m.text, m.who === 'user' ? 'user' : 'bot'));
      });
      scrollChatToBottom();
    } catch (e) {
      console.warn('Failed to restore chat history', e);
    }
  }

  // Keyword-based "intelligence" (fallback)
  function cannedReplyFor(text) {
    const t = text.toLowerCase();

    // Warm welcome for greetings
    if (
      t.includes("hi") ||
      t.includes("hello") ||
      t.includes("hey") ||
      t.includes("good morning") ||
      t.includes("good afternoon") ||
      t.includes("good evening") ||
      t.includes("namaste") ||
      t.includes("hii") ||
      t.includes("hiii")
    ) {
      return `🌟 Welcome to Zuvia!  
I’m here to help you with orders, distributorship, pricing, or any questions you have.  
How may I assist you today? 😊`;
    }

    // distributors / dealership
    if (t.includes('distributor') || t.includes('dealership') || t.includes('dealer')) {
      return `Thanks — we have distributorship programs for city-level partners. Could you share your city and expected monthly volume? Or press "Apply Dealership" to open the application form.`;
    }

    // order
    if (t.includes('order') || t.includes('buy') || t.includes('bulk')) {
      return `Great — tell me the pack sizes and quantities you need (e.g., "20 x 1L and 10 x 20L"). Our sales team will follow up on WhatsApp or phone. Want me to open WhatsApp?`;
    }

    // sizes / price
    if (t.includes('price') || t.includes('cost') || t.includes('sizes') || t.includes('pack')) {
      return `Zuvia is available in 250 ml, 500 ml, 750 ml, 1.5 L and 20 L. For pricing we handle bulk/region-based quotes. Share your city and volume and we'll provide rates.`;
    }

    // contact
    if (t.includes('contact') || t.includes('phone') || t.includes('whatsapp') || t.includes('email')) {
      return `You can reach us on WhatsApp at +91-9220632019 or email zuviawater@gmail.com. Would you like me to open WhatsApp for you?`;
    }

    // events
    if (t.includes('event') || t.includes('catering') || t.includes('wedding')) {
      return `For events we offer collection & return incentives for large orders. Please share date, guest count and location so we can suggest a delivery plan.`;
    }

    // fallback
    return null;
  }

  // Add quick CTA to chat (WhatsApp button inside chat)
  function addWhatsAppCallToAction() {
    const actionWrap = document.createElement('div');
    actionWrap.className = 'z-message z-bot';
    const inner = document.createElement('div');
    inner.className = 'z-msg-inner';
    inner.style.display = 'flex';
    inner.style.flexDirection = 'column';
    inner.style.gap = '8px';

    const p = document.createElement('div');
    p.textContent = 'Contact via WhatsApp:';
    const btn = document.createElement('a');
    btn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_WHATSAPP_MSG)}`;
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.className = 'btn-primary';
    btn.style.width = 'fit-content';
    btn.textContent = 'Open WhatsApp';
    inner.appendChild(p);
    inner.appendChild(btn);
    actionWrap.appendChild(inner);
    chatBody.appendChild(actionWrap);
    scrollChatToBottom();
  }

  // Add follow-up quick replies under chat (non-persistent)
  function addFollowups(botReply) {
    // remove existing quick replies if any
    const existing = chatBody.querySelector('.z-qr-wrap');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.className = 'z-qr-wrap z-message z-bot';
    wrap.style.marginTop = '6px';

    const inner = document.createElement('div');
    inner.style.display = 'flex';
    inner.style.gap = '8px';
    inner.style.flexWrap = 'wrap';

    const q1 = document.createElement('button');
    q1.className = 'z-qr';
    q1.textContent = 'Place an order';
    q1.addEventListener('click', () => {
      sendMessage('I want to place an order');
    });

    const q2 = document.createElement('button');
    q2.className = 'z-qr';
    q2.textContent = 'Become a distributor';
    q2.addEventListener('click', () => {
      sendMessage('I want to become a distributor');
    });

    const q3 = document.createElement('button');
    q3.className = 'z-qr';
    q3.textContent = 'Contact details';
    q3.addEventListener('click', () => {
      sendMessage('What are your contact details?');
    });

    inner.appendChild(q1);
    inner.appendChild(q2);
    inner.appendChild(q3);
    wrap.appendChild(inner);
    chatBody.appendChild(wrap);
    scrollChatToBottom();
  }

  // Attach quick replies from the static UI (initial buttons)
  if (quickRepliesContainer) {
    quickRepliesContainer.querySelectorAll('.z-qr').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = (e.target.textContent || '').trim();
        sendMessage(val);
      });
    });
  }

  // Build conversation history to send to server
  function buildHistoryForAI(newUserText) {
    const history = [
      { role: "system", content: "You are Zuvia assistant. Be helpful, friendly and concise. Answer user queries about products, orders, distributorship and contact details. If user asks for numbers or addresses, repeat exactly as given." }
    ];
    // last messages
    const nodes = Array.from(chatBody.querySelectorAll('.z-message')).slice(-16);
    nodes.forEach(node => {
      const who = node.classList.contains('z-user') ? 'user' : 'assistant';
      const txt = node.querySelector('.z-msg-inner')?.textContent || '';
      history.push({ role: who, content: txt });
    });
    // include the new user text
    history.push({ role: 'user', content: newUserText });
    return history;
  }

  // Try to call AI endpoint. Returns reply string or null on failure.
  async function getAIReply(text) {
    try {
      const body = { messages: buildHistoryForAI(text) };
      const resp = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        // non-ok -> treat as no-AI available
        console.warn('AI endpoint not ok', resp.status);
        return null;
      }
      const data = await resp.json();
      return data.reply || null;
    } catch (e) {
      console.warn('AI call failed', e);
      return null;
    }
  }

  // Send message (user typed or quick reply) - uses AI if available else canned replies
  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    const userMsg = makeMessage(text, 'user');
    chatBody.appendChild(userMsg);
    scrollChatToBottom();
    saveHistory();

    // bot typing
    showTyping();

    // try AI first (if endpoint present)
    const aiReply = await getAIReply(text);

    removeTyping();

    if (aiReply) {
      chatBody.appendChild(makeMessage(aiReply, 'bot'));
      addFollowups(aiReply);
      saveHistory();
      scrollChatToBottom();
      return;
    }

    // fallback to canned replies if AI not available or returned null
    const reply = cannedReplyFor(text);
    if (reply) {
      chatBody.appendChild(makeMessage(reply, 'bot'));
      addFollowups(reply);
    } else {
      // offer WhatsApp quick connect & show default message
      const fallback = `Sorry, I don't have that info right now. Would you like me to connect you to our sales team on WhatsApp?`;
      chatBody.appendChild(makeMessage(fallback, 'bot'));
      addWhatsAppCallToAction();
    }

    scrollChatToBottom();
    saveHistory();
  }

  // Toggle open/close
  toggleBtn.addEventListener('click', () => {
    const shown = chatWin.getAttribute('aria-hidden') === 'false';
    chatWin.setAttribute('aria-hidden', shown ? 'true' : 'false');
    chatWin.style.display = shown ? 'none' : 'flex';
    if (!shown) {
      userInput.focus();
      // restore history when opened
      restoreHistory();
    } else {
      // optionally save on close
      saveHistory();
    }
  });
  closeBtn.addEventListener('click', () => {
    chatWin.setAttribute('aria-hidden', 'true');
    chatWin.style.display = 'none';
    saveHistory();
  });

  // Form submit
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;
    userInput.value = '';
    sendMessage(text);
  });

  // Initialize: show a greeting in chat body if empty
  function boot() {
    restoreHistory();
    if (!chatBody.querySelector('.z-message')) {
      const welcome = makeMessage("Hi! I'm Zuvia's assistant 👋 How can I help today?", 'bot');
      chatBody.appendChild(welcome);
      // append initial quick replies (copy from HTML if present)
      if (!document.getElementById('zuvia-quick-replies')) {
        const starterWrap = document.createElement('div');
        starterWrap.id = 'zuvia-quick-replies';
        starterWrap.className = 'z-quick-replies';
        ['Place an order','Become a distributor','Product sizes & price','Contact details'].forEach(text => {
          const b = document.createElement('button');
          b.className = 'z-qr';
          b.textContent = text;
          b.addEventListener('click', () => sendMessage(text));
          starterWrap.appendChild(b);
        });
        chatBody.appendChild(starterWrap);
      }
      scrollChatToBottom();
      saveHistory();
    }
  }

  // clear storage helper (dev)
  window._zuvia_clear_chat = function () { localStorage.removeItem(STORAGE_KEY); chatBody.innerHTML = ''; boot(); };

  // Boot
  boot();

})();
