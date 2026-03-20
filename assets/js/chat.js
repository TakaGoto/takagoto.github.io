
(function() {
  var API_URL = 'https://takagoto-chat.plantwise.workers.dev';
  var MAX_CHARS = 300;
  var history = [];

  function init() {
    var form = document.getElementById('chat-form');
    var input = document.getElementById('chat-input');
    if (!form || !input) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      sendMessage();
    });

    input.addEventListener('input', function() {
      var remaining = MAX_CHARS - this.value.length;
      var counter = document.getElementById('chat-char-count');
      counter.textContent = remaining;
      if (remaining <= 20) {
        counter.classList.add('chat-char-count--warn');
      } else {
        counter.classList.remove('chat-char-count--warn');
      }
    });
  }

  function sendMessage() {
    var input = document.getElementById('chat-input');
    var msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    document.getElementById('chat-char-count').textContent = MAX_CHARS;
    document.getElementById('chat-char-count').classList.remove('chat-char-count--warn');
    appendMessage(msg, 'user');
    history.push({ role: 'user', content: msg });

    var sendBtn = document.getElementById('chat-send');
    sendBtn.disabled = true;
    input.disabled = true;

    var loadingEl = appendMessage('Thinking...', 'ai loading');

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: history.slice(-6) })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      loadingEl.remove();
      if (data.error) {
        appendMessage(data.error, 'ai error');
      } else {
        appendMessage(data.reply, 'ai');
        history.push({ role: 'assistant', content: data.reply });
        if (data.truncated) {
          appendMessage('Response was cut short due to length limits. Try asking a more specific question.', 'ai notice');
        }
      }
    })
    .catch(function() {
      loadingEl.remove();
      appendMessage('Something went wrong. Try again in a moment.', 'ai error');
    })
    .finally(function() {
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
    });
  }

  function appendMessage(text, type) {
    var container = document.getElementById('chat-messages');
    var div = document.createElement('div');
    var classes = 'chat-msg';
    if (type.indexOf('user') !== -1) classes += ' chat-msg--user';
    if (type.indexOf('ai') !== -1) classes += ' chat-msg--ai';
    if (type.indexOf('loading') !== -1) classes += ' chat-msg--loading';
    if (type.indexOf('error') !== -1) classes += ' chat-msg--error';
    if (type.indexOf('notice') !== -1) classes += ' chat-msg--notice';
    div.className = classes;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
