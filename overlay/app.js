(function () {
  const overlayRoot = document.getElementById('overlay-root');
  const lantern = document.getElementById('lantern');
  const chatList = document.getElementById('chat-list');
  const chatInputForm = document.getElementById('chat-input-form');
  const chatInput = document.getElementById('chat-input');
  const tinyStatus = document.getElementById('tiny-status');

  const params = new URLSearchParams(window.location.search);
  const testingMode = params.get('test') === '1' || params.get('mode') === 'test' || params.get('preview') === '1';

  const config = {
    states: ['dormant', 'awake', 'warm', 'agitated', 'possessed'],
    decayMs: 1300,
    particleMs: 200,
    keywords: {
      warm: ['love', 'cute', 'cozy', 'safe', 'calm', 'soft', 'hug', 'sweet', 'gentle'],
      neutral: ['hello', 'hi', 'watching', 'okay', 'hey', 'lurking'],
      chaos: ['run', 'panic', 'insane', 'chaos', 'fast', 'scream', 'hunt', 'wild'],
      curse: ['possessed', 'demon', 'hex', 'void', 'haunt', 'consume', 'hollow', 'rot', 'curse']
    },
    sampleMessages: [
      { user: 'lantern', text: 'waiting for whispers...' },
      { user: 'shade', text: 'chat can wake or curse the flame.' },
      { user: 'ember', text: testingMode ? 'testing input is live below.' : 'connected to live chat soon.' }
    ]
  };

  const state = {
    mode: { testing: testingMode },
    reactive: {
      activity: 0.3,
      warmth: 0.24,
      chaos: 0.1,
      curse: 0
    },
    render: {
      state: 'awake',
      variant: 'base'
    },
    timers: {
      decay: null,
      particles: null
    }
  };

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function setStateVisual(nextState, variant = 'base', reason = 'render') {
    config.states.forEach((name) => lantern.classList.remove(`state-${name}`));
    lantern.classList.add(`state-${nextState}`);
    lantern.dataset.variant = variant;
    overlayRoot.dataset.state = nextState;

    state.render.state = nextState;
    state.render.variant = variant;

    console.log(`[LanternOverlay] rendered state: ${nextState} (variant: ${variant}, reason: ${reason})`);
    updateTinyStatus();
  }

  function deriveReactiveState() {
    const { activity, warmth, chaos, curse } = state.reactive;
    if (curse > 0.68) return { mood: 'possessed', variant: 'possessed-smoke' };
    if (chaos - warmth > 0.23 && activity > 0.26) return { mood: 'agitated', variant: 'agitated-spike' };
    if (warmth - chaos > 0.22 && activity > 0.2) return { mood: 'warm', variant: 'warm-sparkles' };
    if (activity < 0.16) return { mood: 'dormant', variant: 'base' };
    return { mood: 'awake', variant: 'base' };
  }

  function renderFromReactive(reason = 'reactive') {
    const { mood, variant } = deriveReactiveState();
    setStateVisual(mood, variant, reason);
  }

  function pulseBurst() {
    lantern.classList.remove('burst');
    requestAnimationFrame(() => lantern.classList.add('burst'));
  }

  function emitParticle(type) {
    const layer = lantern.querySelector(`.particle-layer.${type}`);
    if (!layer) return;

    const particle = document.createElement('span');
    particle.className = `particle ${type}`;
    particle.style.left = `${random(82, 146)}px`;
    particle.style.top = `${random(90, 142)}px`;
    particle.style.setProperty('--dx', `${random(-24, 28)}px`);
    particle.style.setProperty('--dy', `${random(-88, -34)}px`);
    particle.style.animationDuration = `${random(1.25, 3.4)}s`;
    layer.appendChild(particle);
    setTimeout(() => particle.remove(), 3600);
  }

  function emitAmbientParticles() {
    const current = state.render.state;
    const variant = state.render.variant;

    if (current === 'dormant') {
      if (Math.random() > 0.995) emitParticle('ash');
      return;
    }

    if (current === 'awake') {
      if (Math.random() > 0.75) emitParticle('warm');
      return;
    }

    if (current === 'warm') {
      emitParticle('warm');
      if (variant === 'warm-sparkles' || Math.random() > 0.42) emitParticle('warm');
      return;
    }

    if (current === 'agitated') {
      emitParticle('ash');
      if (Math.random() > 0.34) emitParticle('warm');
      if (variant === 'agitated-spike' && Math.random() > 0.56) pulseBurst();
      return;
    }

    if (current === 'possessed') {
      emitParticle('smoke');
      emitParticle('smoke');
      if (variant === 'possessed-burst' || Math.random() > 0.55) emitParticle('ash');
      if (Math.random() > 0.74) pulseBurst();
    }
  }

  function scoreMessage(text) {
    const msg = String(text || '').toLowerCase();
    const hits = (list) => list.reduce((acc, token) => acc + (msg.includes(token) ? 1 : 0), 0);

    return {
      warm: hits(config.keywords.warm),
      neutral: hits(config.keywords.neutral),
      chaos: hits(config.keywords.chaos),
      curse: hits(config.keywords.curse)
    };
  }

  function applyChatInfluence(text, source = 'chat') {
    const score = scoreMessage(text);

    if (score.warm) {
      state.reactive.warmth = clamp(state.reactive.warmth + score.warm * 0.2);
      state.reactive.chaos = clamp(state.reactive.chaos - score.warm * 0.06);
      state.reactive.activity = clamp(state.reactive.activity + score.warm * 0.12);
    }

    if (score.neutral) {
      state.reactive.activity = clamp((state.reactive.activity * 0.85) + 0.22);
      state.reactive.warmth = clamp((state.reactive.warmth * 0.82) + 0.2);
      state.reactive.chaos = clamp(state.reactive.chaos * 0.8);
      state.reactive.curse = clamp(state.reactive.curse * 0.8);
    }

    if (score.chaos) {
      state.reactive.chaos = clamp(state.reactive.chaos + score.chaos * 0.22);
      state.reactive.warmth = clamp(state.reactive.warmth - score.chaos * 0.08);
      state.reactive.activity = clamp(state.reactive.activity + score.chaos * 0.18);
      pulseBurst();
    }

    if (score.curse) {
      state.reactive.curse = clamp(state.reactive.curse + score.curse * 0.28);
      state.reactive.chaos = clamp(state.reactive.chaos + score.curse * 0.1);
      state.reactive.activity = clamp(state.reactive.activity + score.curse * 0.15);
      pulseBurst();
      lantern.dataset.variant = 'possessed-burst';
    }

    if (score.warm + score.neutral + score.chaos + score.curse === 0) {
      state.reactive.activity = clamp(state.reactive.activity + 0.06);
    }

    renderFromReactive(`typed-${source}`);
  }

  function appendChat(user, text) {
    const item = document.createElement('li');
    item.innerHTML = `<span class="tag">${user}</span>${text}`;
    chatList.prepend(item);
    while (chatList.children.length > 6) chatList.removeChild(chatList.lastChild);
  }

  function handleTypedMessage(rawText) {
    const message = String(rawText || '').trim();
    if (!message) return;

    console.log(`[LanternOverlay] typed message: ${message}`);
    appendChat('you', message);
    applyChatInfluence(message, 'input');
  }

  function updateTinyStatus() {
    if (!state.mode.testing) return;
    tinyStatus.textContent = `TEST • rendered: ${state.render.state}`;
  }

  function startDecayLoop() {
    state.timers.decay = setInterval(() => {
      state.reactive.activity = clamp(state.reactive.activity - 0.025);
      state.reactive.warmth = clamp(state.reactive.warmth - 0.03);
      state.reactive.chaos = clamp(state.reactive.chaos - 0.035);
      state.reactive.curse = clamp(state.reactive.curse - 0.02);
      renderFromReactive('decay');
    }, config.decayMs);
  }

  function setupTestingInput() {
    if (!state.mode.testing) return;

    overlayRoot.dataset.mode = 'test';
    chatInputForm.hidden = false;
    tinyStatus.hidden = false;

    chatInputForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handleTypedMessage(chatInput.value);
      chatInput.value = '';
      chatInput.focus();
    });

    chatInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleTypedMessage(chatInput.value);
        chatInput.value = '';
      }
    });
  }

  function bootstrapChat() {
    config.sampleMessages.forEach((msg) => appendChat(msg.user, msg.text));
  }

  function receive(event = {}) {
    if (!event || typeof event !== 'object') return;

    const type = String(event.type || '').toLowerCase();

    if (type === 'chat' && event.user && event.text) {
      appendChat(event.user, event.text);
      applyChatInfluence(event.text, 'external-chat');
    }

    if (type === 'setstate' && config.states.includes(event.state)) {
      setStateVisual(String(event.state).toLowerCase(), 'base', 'api-setstate');
    }

    if (type === 'addactivity') {
      state.reactive.activity = clamp(state.reactive.activity + Number(event.value ?? 0.12));
      renderFromReactive('api-addactivity');
    }

    if (type === 'triggermood') {
      applyChatInfluence(String(event.mood || ''), 'api-mood');
    }
  }

  function bootstrap() {
    bootstrapChat();
    setupTestingInput();
    renderFromReactive('bootstrap');
    startDecayLoop();

    state.timers.particles = setInterval(emitAmbientParticles, config.particleMs);
  }

  window.LanternOverlay = {
    receive,
    setState: (stateName) => receive({ type: 'setState', state: stateName }),
    addActivity: (value = 0.12) => receive({ type: 'addActivity', value }),
    triggerMood: (mood) => receive({ type: 'triggerMood', mood }),
    pushChat: (user, text) => receive({ type: 'chat', user, text }),
    sendLocalMessage: (text) => handleTypedMessage(text)
  };

  bootstrap();
})();
