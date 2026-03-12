(function () {
  const overlayRoot = document.getElementById('overlay-root');
  const eyeRoot = document.getElementById('lantern');
  const chatList = document.getElementById('chat-list');
  const chatInputForm = document.getElementById('chat-input-form');
  const chatInput = document.getElementById('chat-input');
  const tinyStatus = document.getElementById('tiny-status');

  const params = new URLSearchParams(window.location.search);
  const testingMode = params.get('test') === '1' || params.get('mode') === 'test' || params.get('preview') === '1';

  const SCORE_MAX = 10;
  const STATE_ORDER = ['awakened', 'overgrown', 'corrupted', 'rotten'];
  const STATE_ALIAS = { alive: 'awakened', alert: 'overgrown', zombified: 'rotten' };

  const keywords = {
    corrupt: ['ghost', 'demon', 'cursed', 'run', 'hunt'],
    heal: ['chill', 'safe', 'love', 'okay', 'cute'],
    reset: ['wake', 'blink', 'revive']
  };

  const state = {
    testingMode,
    corruptionScore: 0,
    renderedState: 'awakened',
    look: 'center',
    timers: {
      particles: null,
      blinkCleanup: null,
      bloomCleanup: null
    }
  };

  function clampScore(value) {
    return Math.max(0, Math.min(SCORE_MAX, Math.round(value)));
  }

  function deriveStateFromScore(score = state.corruptionScore) {
    if (score <= 1) return 'awakened';
    if (score <= 3) return 'overgrown';
    if (score <= 5) return 'corrupted';
    return 'rotten';
  }

  function stateToScore(nextState) {
    if (nextState === 'awakened') return 0;
    if (nextState === 'overgrown') return 2;
    if (nextState === 'corrupted') return 4;
    return 6;
  }

  function render(reason = 'render') {
    const derivedState = deriveStateFromScore();
    STATE_ORDER.forEach((name) => eyeRoot.classList.remove(`state-${name}`));
    eyeRoot.classList.add(`state-${derivedState}`);
    overlayRoot.dataset.state = derivedState;
    state.renderedState = derivedState;
    updateStatus();
    console.log(`[ChatEye] render state=${derivedState} score=${state.corruptionScore} reason=${reason}`);
  }

  function updateStatus() {
    if (!testingMode) return;
    tinyStatus.textContent = `TEST • score: ${state.corruptionScore} • state: ${state.renderedState}`;
  }

  function burst(type = 'pulse') {
    eyeRoot.classList.remove('burst');
    eyeRoot.classList.remove('stress');
    if (type === 'stress') {
      requestAnimationFrame(() => eyeRoot.classList.add('stress'));
      return;
    }
    requestAnimationFrame(() => eyeRoot.classList.add('burst'));
  }

  function blink() {
    eyeRoot.classList.remove('blink');
    requestAnimationFrame(() => eyeRoot.classList.add('blink'));
    clearTimeout(state.timers.blinkCleanup);
    state.timers.blinkCleanup = setTimeout(() => eyeRoot.classList.remove('blink'), 500);
  }

  function bloom() {
    eyeRoot.classList.remove('bloom');
    requestAnimationFrame(() => eyeRoot.classList.add('bloom'));
    clearTimeout(state.timers.bloomCleanup);
    state.timers.bloomCleanup = setTimeout(() => eyeRoot.classList.remove('bloom'), 900);
  }

  function setLook(direction) {
    const next = ['left', 'right', 'center'].includes(direction) ? direction : 'center';
    state.look = next;
    eyeRoot.dataset.look = next;
  }

  function mutateScore(delta, reason) {
    state.corruptionScore = clampScore(state.corruptionScore + delta);
    render(reason);
  }

  function setScore(value, reason = 'setScore') {
    state.corruptionScore = clampScore(value);
    render(reason);
  }

  function setState(nextStateRaw, reason = 'setState') {
    const alias = String(nextStateRaw || '').toLowerCase();
    const normalized = STATE_ALIAS[alias] || alias;
    if (!STATE_ORDER.includes(normalized)) return;
    setScore(stateToScore(normalized), reason);
  }

  function tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function applyMessageTriggers(text, source = 'chat') {
    const words = tokenize(text);
    let delta = 0;
    let sawReset = false;

    for (const word of words) {
      if (keywords.corrupt.includes(word)) delta += 1;
      if (keywords.heal.includes(word)) delta -= 1;
      if (keywords.reset.includes(word)) sawReset = true;
    }

    if (sawReset) {
      setScore(0, `${source}:reset`);
      bloom();
      blink();
      return;
    }

    if (delta !== 0) {
      mutateScore(delta, `${source}:delta(${delta})`);
      if (delta > 0) burst(state.corruptionScore >= 6 ? 'stress' : 'pulse');
    }
  }

  function appendChat(user, text) {
    const item = document.createElement('li');
    item.innerHTML = `<span class="tag">${user}</span>${text}`;
    chatList.prepend(item);
    while (chatList.children.length > 6) chatList.removeChild(chatList.lastChild);
  }

  function emitParticle(type) {
    const layer = eyeRoot.querySelector(`.particle-layer.${type}`);
    if (!layer) return;
    const p = document.createElement('span');
    p.className = `particle ${type}`;
    p.style.left = `${80 + Math.random() * 65}px`;
    p.style.top = `${86 + Math.random() * 56}px`;
    p.style.setProperty('--dx', `${-22 + Math.random() * 44}px`);
    p.style.setProperty('--dy', `${-88 + Math.random() * 52}px`);
    layer.appendChild(p);
    setTimeout(() => p.remove(), 3200);
  }

  function ambient() {
    if (state.renderedState === 'awakened' && Math.random() > 0.75) emitParticle('warm');
    if (state.renderedState === 'overgrown') {
      emitParticle('leaves');
      if (Math.random() > 0.7) emitParticle('warm');
    }
    if (state.renderedState === 'corrupted') {
      emitParticle('ash');
      if (Math.random() > 0.6) emitParticle('smoke');
    }
    if (state.renderedState === 'rotten') {
      emitParticle('smoke');
      if (Math.random() > 0.55) emitParticle('ash');
    }
  }

  function action(name) {
    const act = String(name || '').toLowerCase();
    if (act === 'blink') blink();
    if (act === 'lookleft') setLook('left');
    if (act === 'lookright') setLook('right');
    if (act === 'corrupt') mutateScore(1, 'action:corrupt');
    if (act === 'heal') mutateScore(-1, 'action:heal');
    if (act === 'reset') {
      setScore(0, 'action:reset');
      bloom();
      blink();
    }
  }

  function receive(payload = {}) {
    const type = String(payload.type || '').toLowerCase();

    if (type === 'chat' && payload.text) {
      appendChat(payload.user || 'chat', payload.text);
      applyMessageTriggers(payload.text, 'receive:chat');
    }

    if (type === 'action' && payload.action) action(payload.action);
    if (type === 'setscore') setScore(Number(payload.value ?? 0), 'receive:setScore');
    if (type === 'setstate' && payload.state) setState(payload.state, 'receive:setState');
  }

  function handleTypedMessage(rawText) {
    const text = String(rawText || '').trim();
    if (!text) return;
    appendChat('you', text);
    applyMessageTriggers(text, 'local-input');
  }

  function setupTestingInput() {
    if (!testingMode) return;
    overlayRoot.dataset.mode = 'test';
    chatInputForm.hidden = false;
    tinyStatus.hidden = false;

    chatInputForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handleTypedMessage(chatInput.value);
      chatInput.value = '';
      chatInput.focus();
    });
  }

  function bootstrapChat() {
    appendChat('ivy-eye', 'chat can heal or corrupt me.');
    if (testingMode) appendChat('ivy-eye', 'type words like: demon / love / wake');
  }

  function bootstrap() {
    setupTestingInput();
    bootstrapChat();
    setLook('center');
    render('bootstrap');
    state.timers.particles = setInterval(ambient, 180);
  }

  window.ChatEye = {
    receive,
    setScore: (value) => setScore(value, 'api:setScore'),
    setState: (name) => setState(name, 'api:setState'),
    action,
    sendLocalMessage: handleTypedMessage
  };

  bootstrap();
})();
