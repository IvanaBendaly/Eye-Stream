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
    states: ['asleep', 'awake', 'warm', 'agitated', 'breaking', 'cursed', 'dead', 'overgrown'],
    decayMs: 1600,
    particleMs: 170,
    sampleMessages: [
      { user: 'lantern', text: 'whisper to wake the flame.' },
      { user: 'shade', text: 'kind words warm it, chaos breaks it.' },
      { user: 'root', text: testingMode ? 'testing input is enabled.' : 'awaiting live chat link.' }
    ],
    keywordToState: {
      asleep: ['sleepy', 'rest', 'quiet', 'calm down', 'sleep'],
      awake: ['hello', 'hi', 'hey', 'wake', 'watching'],
      warm: ['love', 'cute', 'cozy', 'gentle', 'safe', 'sweet', 'hug', 'lovely', 'warm'],
      agitated: ['angry', 'rage', 'burn', 'fire', 'mad', 'chaos', 'scream', 'explode', 'wild'],
      breaking: ['crack', 'break', 'shatter', 'overload', 'too much', 'pressure', 'burst'],
      cursed: ['cursed', 'demon', 'hex', 'void', 'haunt', 'possessed', 'consume', 'hollow', 'rot'],
      dead: ['dead', 'gone', 'empty', 'extinguish', 'cold', 'faded'],
      overgrown: ['vine', 'roots', 'overgrown', 'bloom', 'ivy', 'thorn', 'leaves', 'reclaim']
    },
    stateVariants: {
      asleep: 'asleep-ember',
      awake: 'base',
      warm: 'warm-sparkles',
      agitated: 'agitated-flare',
      breaking: 'breaking-flash',
      cursed: 'cursed-haze',
      dead: 'dead-smolder',
      overgrown: 'overgrown-vines'
    }
  };

  const state = {
    mode: { testing: testingMode },
    reactive: {
      state: 'awake',
      holdMs: 0,
      lastChange: Date.now()
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

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function setStateVisual(nextState, reason = 'render') {
    if (!config.states.includes(nextState)) return;
    const variant = config.stateVariants[nextState] || 'base';

    config.states.forEach((name) => lantern.classList.remove(`state-${name}`));
    lantern.classList.add(`state-${nextState}`);
    lantern.dataset.variant = variant;
    overlayRoot.dataset.state = nextState;

    state.render.state = nextState;
    state.render.variant = variant;

    if (nextState === 'agitated' || nextState === 'breaking' || nextState === 'cursed') pulseBurst();

    console.log(`[LanternOverlay] rendered state: ${nextState} (variant: ${variant}, reason: ${reason})`);
    updateTinyStatus();
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
    particle.style.left = `${random(80, 148)}px`;
    particle.style.top = `${random(88, 142)}px`;
    particle.style.setProperty('--dx', `${random(-24, 30)}px`);
    particle.style.setProperty('--dy', `${random(-92, -36)}px`);
    particle.style.animationDuration = `${random(1.2, 3.5)}s`;
    layer.appendChild(particle);
    setTimeout(() => particle.remove(), 3600);
  }

  function emitAmbientParticles() {
    const current = state.render.state;

    if (current === 'asleep') {
      if (Math.random() > 0.996) emitParticle('ash');
      return;
    }

    if (current === 'awake') {
      if (Math.random() > 0.78) emitParticle('warm');
      return;
    }

    if (current === 'warm') {
      emitParticle('warm');
      if (Math.random() > 0.45) emitParticle('warm');
      return;
    }

    if (current === 'agitated') {
      emitParticle('ash');
      emitParticle('warm');
      if (Math.random() > 0.52) pulseBurst();
      return;
    }

    if (current === 'breaking') {
      emitParticle('ash');
      emitParticle('ash');
      if (Math.random() > 0.55) emitParticle('warm');
      if (Math.random() > 0.5) pulseBurst();
      return;
    }

    if (current === 'cursed') {
      emitParticle('smoke');
      emitParticle('smoke');
      if (Math.random() > 0.58) emitParticle('ash');
      return;
    }

    if (current === 'dead') {
      if (Math.random() > 0.9) emitParticle('smoke');
      return;
    }

    if (current === 'overgrown') {
      emitParticle('leaves');
      if (Math.random() > 0.63) emitParticle('smoke');
    }
  }

  function detectStateFromText(text) {
    const msg = String(text || '').toLowerCase();
    for (const moodState of config.states) {
      const tokens = config.keywordToState[moodState] || [];
      if (tokens.some((token) => msg.includes(token))) {
        return moodState;
      }
    }
    return null;
  }

  function applyChatInfluence(text, source = 'chat') {
    const directState = detectStateFromText(text);

    if (directState) {
      state.reactive.state = directState;
      state.reactive.lastChange = Date.now();
      state.reactive.holdMs = state.mode.testing ? 9000 : 5200;
      setStateVisual(directState, `typed-${source}`);
      return;
    }

    if (state.mode.testing) {
      setStateVisual('awake', `typed-${source}-fallback`);
      return;
    }

    state.reactive.state = 'awake';
    state.reactive.lastChange = Date.now();
    state.reactive.holdMs = 1600;
    setStateVisual('awake', `typed-${source}-fallback`);
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

    appendChat('you', message);
    applyChatInfluence(message, 'input');
  }

  function updateTinyStatus() {
    if (!state.mode.testing) return;
    tinyStatus.textContent = `TEST • rendered: ${state.render.state}`;
  }

  function startDecayLoop() {
    state.timers.decay = setInterval(() => {
      if (Date.now() - state.reactive.lastChange > state.reactive.holdMs) {
        if (state.render.state !== 'awake') {
          state.reactive.state = 'awake';
          setStateVisual('awake', 'decay-reset');
        }
      }
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

    if (type === 'setstate' && config.states.includes(String(event.state).toLowerCase())) {
      const nextState = String(event.state).toLowerCase();
      state.reactive.state = nextState;
      state.reactive.lastChange = Date.now();
      state.reactive.holdMs = 6000;
      setStateVisual(nextState, 'api-setstate');
    }

    if (type === 'triggermood') {
      applyChatInfluence(String(event.mood || ''), 'api-mood');
    }
  }

  function bootstrap() {
    bootstrapChat();
    setupTestingInput();
    setStateVisual('awake', 'bootstrap');
    startDecayLoop();

    state.timers.particles = setInterval(emitAmbientParticles, config.particleMs);
  }

  window.LanternOverlay = {
    receive,
    setState: (stateName) => receive({ type: 'setState', state: stateName }),
    triggerMood: (mood) => receive({ type: 'triggerMood', mood }),
    pushChat: (user, text) => receive({ type: 'chat', user, text }),
    sendLocalMessage: (text) => handleTypedMessage(text)
  };

  bootstrap();
})();
