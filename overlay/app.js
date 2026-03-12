(function () {
  const overlayRoot = document.getElementById('overlay-root');
  const eyeRoot = document.getElementById('lantern');
  const chatList = document.getElementById('chat-list');
  const chatInputForm = document.getElementById('chat-input-form');
  const chatInput = document.getElementById('chat-input');
  const tinyStatus = document.getElementById('tiny-status');
  const interactionHeader = document.getElementById('interaction-header');

  const params = new URLSearchParams(window.location.search);
  const testingMode = params.get('test') === '1' || params.get('mode') === 'test' || params.get('preview') === '1';

  const SCORE_MAX = 10;
  const IVY_THRESHOLD = 10;
  const STATE_ORDER = ['awakened', 'overgrown', 'corrupted', 'rotten'];
  const STATE_ALIAS = { alive: 'awakened', alert: 'overgrown', zombified: 'rotten' };

  const keywords = {
    corrupt: [
      'ghost', 'demon', 'cursed', 'curse', 'haunted', 'haunt', 'hex', 'rot', 'rotten', 'decay', 'dead', 'death',
      'kill', 'blood', 'scream', 'nightmare', 'hunt', 'run', 'shadow', 'void', 'evil', 'possessed', 'possession',
      'monster', 'creep', 'creepy', 'horror', 'break', 'shatter', 'crack', 'rage', 'anger', 'burn', 'chaos',
      'abyss', 'doom', 'fear', 'panic', 'wrath', 'dark', 'darkness'
    ],
    heal: [
      'chill', 'safe', 'love', 'okay', 'cute', 'cozy', 'calm', 'gentle', 'soft', 'bloom', 'light', 'hope',
      'lovely', 'sweet', 'warm', 'comfort', 'peace', 'peaceful', 'kind', 'heal', 'healing', 'rest', 'breathe',
      'home', 'alive', 'clean', 'pretty', 'serene', 'tranquil', 'hug'
    ],
    reset: ['wake', 'blink', 'revive', 'reset', 'awaken', 'reborn', 'return']
  };

  const state = {
    testingMode,
    corruptionScore: 0,
    ivyCounter: 0,
    renderedState: 'awakened',
    look: 'center',
    exploding: false,
    explosionQueued: false,
    overloadPhase: null,
    debug: {
      matchedCorrupt: [],
      matchedHeal: [],
      ivyHits: 0,
      resetTriggered: false,
      explosionTriggered: false,
      delta: 0
    },
    timers: {
      particles: null,
      blinkCleanup: null,
      bloomCleanup: null,
      explodeCleanup: null
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
    if (state.exploding) return;
    const derivedState = deriveStateFromScore();
    STATE_ORDER.forEach((name) => eyeRoot.classList.remove(`state-${name}`));
    eyeRoot.classList.add(`state-${derivedState}`);
    overlayRoot.dataset.state = derivedState;
    state.renderedState = derivedState;
    applyIvyLevelClass();
    updateStatus();
    console.log(`[ChatEye] state=${derivedState} score=${state.corruptionScore} ivy=${state.ivyCounter} reason=${reason}`);
  }

  function updateStatus() {
    if (!testingMode) return;

    if (state.overloadPhase) {
      tinyStatus.textContent = `TEST • IVY OVERLOAD • PHASE: ${state.overloadPhase.toUpperCase()}`;
      return;
    }

    const corruptText = state.debug.matchedCorrupt.length ? state.debug.matchedCorrupt.join(',') : '-';
    const healText = state.debug.matchedHeal.length ? state.debug.matchedHeal.join(',') : '-';
    const ivyText = state.debug.ivyHits ? `x${state.debug.ivyHits}` : '0';
    const resetText = state.debug.resetTriggered ? 'yes' : 'no';
    const explosionText = state.debug.explosionTriggered ? 'yes' : 'no';
    const deltaSign = state.debug.delta > 0 ? '+' : '';

    tinyStatus.textContent = `TEST • SCORE: ${state.corruptionScore} • STATE: ${state.renderedState.toUpperCase()} • IVY: ${state.ivyCounter}/${IVY_THRESHOLD} • CORRUPT: ${corruptText} • HEAL: ${healText} • IVYHITS: ${ivyText} • RESET: ${resetText} • EXPLODE: ${explosionText} • DELTA: ${deltaSign}${state.debug.delta}`;
  }

  function applyIvyLevelClass() {
    eyeRoot.classList.remove(
      'ivy-level-0', 'ivy-level-1', 'ivy-level-2', 'ivy-level-3', 'ivy-level-4',
      'ivy-level-5', 'ivy-level-6', 'ivy-level-7', 'ivy-level-8', 'ivy-level-9', 'ivy-level-10'
    );
    const level = Math.max(0, Math.min(10, state.ivyCounter));
    eyeRoot.classList.add(`ivy-level-${level}`);
  }

  function burst(type = 'pulse') {
    eyeRoot.classList.remove('burst');
    eyeRoot.classList.remove('stress');
    requestAnimationFrame(() => eyeRoot.classList.add(type === 'stress' ? 'stress' : 'burst'));
  }

  function blink() {
    eyeRoot.classList.remove('blink');
    requestAnimationFrame(() => eyeRoot.classList.add('blink'));
    clearTimeout(state.timers.blinkCleanup);
    state.timers.blinkCleanup = setTimeout(() => eyeRoot.classList.remove('blink'), 450);
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

  function setScore(value, reason = 'setScore') {
    state.corruptionScore = clampScore(value);
    render(reason);
  }

  function mutateScore(delta, reason = 'mutateScore') {
    setScore(state.corruptionScore + delta, reason);
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

  function resetDebug() {
    state.debug = {
      matchedCorrupt: [],
      matchedHeal: [],
      ivyHits: 0,
      resetTriggered: false,
      explosionTriggered: false,
      delta: 0
    };
  }

  function performIvyExplosion(source = 'ivyOverload') {
    if (state.exploding) return;
    state.exploding = true;
    state.explosionQueued = false;
    state.debug.explosionTriggered = true;
    eyeRoot.classList.remove('explode', 'explode-charge', 'explode-shatter', 'explode-burst', 'explode-aftermath', 'explode-rebirth');
    eyeRoot.classList.add('explode');
    burst('stress');

    const setPhase = (phase, addClass) => {
      state.overloadPhase = phase;
      updateStatus();
      if (!addClass) return;
      eyeRoot.classList.remove('explode-charge', 'explode-shatter', 'explode-burst', 'explode-aftermath', 'explode-rebirth');
      eyeRoot.classList.add(addClass);
    };

    const timers = [];
    timers.push(setTimeout(() => setPhase('charge', 'explode-charge'), 0));
    timers.push(setTimeout(() => {
      state.corruptionScore = 6;
      render(`${source}:charge-rotten`);
      burst('stress');
    }, 220));
    timers.push(setTimeout(() => setPhase('shatter', 'explode-shatter'), 560));
    timers.push(setTimeout(() => setPhase('burst', 'explode-burst'), 860));
    timers.push(setTimeout(() => setPhase('aftermath', 'explode-aftermath'), 1160));
    timers.push(setTimeout(() => setPhase('rebirth', 'explode-rebirth'), 1500));

    clearTimeout(state.timers.explodeCleanup);
    state.timers.explodeCleanup = setTimeout(() => {
      state.corruptionScore = 0;
      state.ivyCounter = 0;
      state.exploding = false;
      state.overloadPhase = null;
      eyeRoot.classList.remove('explode', 'explode-charge', 'explode-shatter', 'explode-burst', 'explode-aftermath', 'explode-rebirth');
      applyIvyLevelClass();
      render(`${source}:reset`);
      bloom();
      blink();
      updateStatus();
      if (state.explosionQueued) {
        state.explosionQueued = false;
        performIvyExplosion(`${source}:queued`);
      }
    }, 1880);

    state.timers.explodePhases = timers;
  }

  function applyMessageTriggers(text, source = 'chat') {
    if (state.exploding) {
      if (tokenize(text).includes('ivy')) state.explosionQueued = true;
      return;
    }
    resetDebug();

    const words = tokenize(text);

    for (const word of words) {
      if (word === 'ivy') {
        state.ivyCounter += 1;
        state.debug.ivyHits += 1;
        burst('pulse');
        continue;
      }
      if (keywords.corrupt.includes(word)) {
        state.debug.matchedCorrupt.push(word);
        state.debug.delta += 1;
      }
      if (keywords.heal.includes(word)) {
        state.debug.matchedHeal.push(word);
        state.debug.delta -= 1;
      }
      if (keywords.reset.includes(word)) {
        state.debug.resetTriggered = true;
      }
    }

    if (state.debug.resetTriggered) {
      setScore(0, `${source}:resetWord`);
      bloom();
      blink();
    } else if (state.debug.delta !== 0) {
      mutateScore(state.debug.delta, `${source}:delta(${state.debug.delta})`);
      if (state.debug.delta > 0) burst(state.corruptionScore >= 6 ? 'stress' : 'pulse');
    } else {
      updateStatus();
    }

    if (state.ivyCounter >= IVY_THRESHOLD) {
      performIvyExplosion(`${source}:ivy`);
      return;
    }

    applyIvyLevelClass();
    updateStatus();
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
    if (state.exploding) return;
    if (state.renderedState === 'awakened') {
      if (Math.random() > 0.73) emitParticle('warm');
      return;
    }
    if (state.renderedState === 'overgrown') {
      emitParticle('leaves');
      if (Math.random() > 0.65) emitParticle('warm');
      return;
    }
    if (state.renderedState === 'corrupted') {
      emitParticle('ash');
      if (Math.random() > 0.58) emitParticle('smoke');
      return;
    }
    if (state.renderedState === 'rotten') {
      emitParticle('smoke');
      if (Math.random() > 0.52) emitParticle('ash');
      if (Math.random() > 0.88) blink();
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
      resetDebug();
      state.debug.resetTriggered = true;
      setScore(0, 'action:reset');
      bloom();
      blink();
      updateStatus();
    }
    if (act === 'explode' || act === 'ivyburst') {
      performIvyExplosion(`action:${act}`);
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
    if (!testingMode) {
      interactionHeader.hidden = true;
      return;
    }

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
    appendChat('ivy-eye', 'the flame still breathes.');
    if (testingMode) appendChat('ivy-eye', 'test: ghost demon / love cozy / wake / ivy ivy...');
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
