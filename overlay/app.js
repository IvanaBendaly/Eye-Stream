(function () {
  const overlayRoot = document.getElementById('overlay-root');
  const lantern = document.getElementById('lantern');
  const chatList = document.getElementById('chat-list');
  const previewPanel = document.getElementById('preview-panel');
  const previewStatus = document.getElementById('preview-status');
  const showcaseToggle = document.getElementById('toggle-showcase');

  const params = new URLSearchParams(window.location.search);
  const previewMode = params.get('preview') === '1' || params.get('mode') === 'preview';

  const config = {
    states: ['dormant', 'awake', 'warm', 'agitated', 'possessed'],
    showcaseMs: 2600,
    decayMs: 1400,
    particleMs: 280,
    showcaseSequence: [
      { state: 'dormant', variant: 'base', label: 'Dormant' },
      { state: 'awake', variant: 'base', label: 'Awake' },
      { state: 'warm', variant: 'warm-sparkles', label: 'Warm / Fond' },
      { state: 'agitated', variant: 'agitated-spike', label: 'Agitated / Chaotic' },
      { state: 'possessed', variant: 'possessed-smoke', label: 'Possessed / Cursed' },
      { state: 'possessed', variant: 'possessed-thorns', label: 'Possessed + Thorns' },
      { state: 'possessed', variant: 'possessed-cracks', label: 'Possessed + Cracks' },
      { state: 'possessed', variant: 'possessed-burst', label: 'Possessed + Curse Burst' }
    ],
    previewChat: [
      { user: 'kindling', text: 'soft vibes tonight, stay cozy ember ✨', mood: 'kind' },
      { user: 'raider', text: 'GO GO GO CHAOS PUSH', mood: 'chaos' },
      { user: 'oracle', text: 'the sigil wakes. cursed eyes open.', mood: 'curse' },
      { user: 'hearth', text: 'gentle lantern, keep us warm', mood: 'kind' },
      { user: 'swarm', text: 'SPAM SPARKS SPAM SPARKS', mood: 'chaos' }
    ]
  };

  const state = {
    preview: {
      enabled: previewMode,
      forcedState: 'awake',
      variant: 'base',
      showcaseOn: previewMode,
      showcaseTimer: null,
      showcaseIndex: 0,
      chatTimer: null,
      chatIndex: 0
    },
    reactive: {
      activity: 0.32,
      warmth: 0.26,
      chaos: 0.08,
      curse: 0,
      decayTimer: null
    },
    render: {
      state: 'awake',
      variant: 'base',
      particleTimer: null
    }
  };

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function getRenderSource() {
    if (state.preview.enabled) {
      return { moodState: state.preview.forcedState, variant: state.preview.variant };
    }
    return { moodState: deriveReactiveState(), variant: 'base' };
  }

  function renderLantern() {
    const { moodState, variant } = getRenderSource();
    config.states.forEach((name) => lantern.classList.remove(`state-${name}`));
    lantern.classList.add(`state-${moodState}`);
    lantern.dataset.variant = variant;

    state.render.state = moodState;
    state.render.variant = variant;

    overlayRoot.dataset.state = moodState;
    if (previewMode) {
      previewStatus.textContent = `Preview ON • state: ${moodState} • showcase: ${state.preview.showcaseOn ? 'on' : 'off'}`;
    }
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
    particle.style.left = `${random(82, 142)}px`;
    particle.style.top = `${random(92, 138)}px`;
    particle.style.setProperty('--dx', `${random(-18, 20)}px`);
    particle.style.setProperty('--dy', `${random(-74, -36)}px`);
    layer.appendChild(particle);
    setTimeout(() => particle.remove(), 3000);
  }

  function emitAmbientParticles() {
    const mood = state.render.state;
    const variant = state.render.variant;

    if (mood === 'dormant' && Math.random() > 0.85) emitParticle('ash');
    if (mood === 'awake' && Math.random() > 0.6) emitParticle('warm');
    if (mood === 'warm') {
      emitParticle('warm');
      if (variant === 'warm-sparkles' && Math.random() > 0.5) emitParticle('warm');
    }
    if (mood === 'agitated') {
      emitParticle('ash');
      if (variant === 'agitated-spike') emitParticle('warm');
    }
    if (mood === 'possessed') {
      emitParticle('smoke');
      if (variant === 'possessed-burst' && Math.random() > 0.45) emitParticle('ash');
    }
  }

  function deriveReactiveState() {
    const { activity, warmth, chaos, curse } = state.reactive;
    if (curse > 0.72) return 'possessed';
    if (chaos - warmth > 0.25 && activity > 0.28) return 'agitated';
    if (warmth - chaos > 0.24 && activity > 0.22) return 'warm';
    if (activity < 0.17) return 'dormant';
    return 'awake';
  }

  function applyMood(kind) {
    if (kind === 'kind') {
      state.reactive.warmth = clamp(state.reactive.warmth + 0.28);
      state.reactive.chaos = clamp(state.reactive.chaos - 0.1);
      state.reactive.activity = clamp(state.reactive.activity + 0.18);
    }
    if (kind === 'chaos') {
      state.reactive.chaos = clamp(state.reactive.chaos + 0.3);
      state.reactive.warmth = clamp(state.reactive.warmth - 0.08);
      state.reactive.activity = clamp(state.reactive.activity + 0.22);
    }
    if (kind === 'curse') {
      state.reactive.curse = clamp(state.reactive.curse + 0.36);
      state.reactive.chaos = clamp(state.reactive.chaos + 0.12);
      state.reactive.activity = clamp(state.reactive.activity + 0.2);
      pulseBurst();
    }

    if (!state.preview.enabled) renderLantern();
  }

  function appendChat(message) {
    const item = document.createElement('li');
    item.innerHTML = `<span class="tag">${message.user}</span>${message.text}`;
    chatList.prepend(item);
    while (chatList.children.length > 5) chatList.removeChild(chatList.lastChild);
  }

  function showcaseStep() {
    if (!state.preview.enabled || !state.preview.showcaseOn) return;
    const entry = config.showcaseSequence[state.preview.showcaseIndex % config.showcaseSequence.length];
    state.preview.showcaseIndex += 1;
    state.preview.forcedState = entry.state;
    state.preview.variant = entry.variant;
    renderLantern();

    if (entry.variant === 'possessed-burst' || entry.variant === 'agitated-spike') {
      pulseBurst();
    }

    state.preview.showcaseTimer = setTimeout(showcaseStep, config.showcaseMs);
  }

  function startShowcase() {
    state.preview.showcaseOn = true;
    clearTimeout(state.preview.showcaseTimer);
    showcaseStep();
  }

  function stopShowcase() {
    state.preview.showcaseOn = false;
    clearTimeout(state.preview.showcaseTimer);
    renderLantern();
  }

  function startPreviewChat() {
    clearInterval(state.preview.chatTimer);
    state.preview.chatTimer = setInterval(() => {
      const message = config.previewChat[state.preview.chatIndex % config.previewChat.length];
      state.preview.chatIndex += 1;
      appendChat(message);

      if (message.mood === 'kind') applyMood('kind');
      if (message.mood === 'chaos') applyMood('chaos');
      if (message.mood === 'curse') applyMood('curse');
    }, 2100);
  }

  function startReactiveDecay() {
    state.reactive.decayTimer = setInterval(() => {
      if (state.preview.enabled) return;
      state.reactive.activity = clamp(state.reactive.activity - 0.03);
      state.reactive.warmth = clamp(state.reactive.warmth - 0.035);
      state.reactive.chaos = clamp(state.reactive.chaos - 0.04);
      state.reactive.curse = clamp(state.reactive.curse - 0.025);
      renderLantern();
    }, config.decayMs);
  }

  function bindPreviewControls() {
    if (!previewMode) return;
    previewPanel.hidden = false;
    overlayRoot.dataset.mode = 'preview';

    previewPanel.querySelectorAll('[data-state]').forEach((button) => {
      button.addEventListener('click', () => {
        stopShowcase();
        state.preview.forcedState = button.dataset.state;
        state.preview.variant = 'base';
        renderLantern();
      });
    });

    showcaseToggle.addEventListener('click', () => {
      if (state.preview.showcaseOn) {
        stopShowcase();
        showcaseToggle.textContent = 'Resume showcase';
      } else {
        startShowcase();
        showcaseToggle.textContent = 'Pause showcase';
      }
    });
  }

  function receive(event = {}) {
    if (!event || typeof event !== 'object') return;
    const command = String(event.type || '').toLowerCase();

    if (command === 'setstate' && config.states.includes(event.state) && !state.preview.enabled) {
      state.reactive.activity = 0.4;
      state.reactive.warmth = event.state === 'warm' ? 0.72 : 0.24;
      state.reactive.chaos = event.state === 'agitated' ? 0.74 : 0.08;
      state.reactive.curse = event.state === 'possessed' ? 0.9 : 0;
      if (event.state === 'dormant') state.reactive.activity = 0.08;
      renderLantern();
    }

    if (command === 'addactivity' && !state.preview.enabled) {
      state.reactive.activity = clamp(state.reactive.activity + Number(event.value ?? 0.12));
      renderLantern();
    }

    if (command === 'triggermood' && !state.preview.enabled) {
      applyMood(String(event.mood || '').toLowerCase());
    }

    if (command === 'chat' && event.user && event.text) {
      appendChat({ user: event.user, text: event.text });
      if (!state.preview.enabled && event.mood) applyMood(event.mood);
    }
  }

  function bootstrapChat() {
    const initial = [
      { user: 'lantern', text: 'watching quietly...' },
      { user: 'shade', text: 'all systems waiting for chat.' },
      { user: 'ember', text: 'tip: use ?preview=1 for showcase mode.' }
    ];
    initial.forEach((msg) => appendChat(msg));
  }

  function bootstrap() {
    bindPreviewControls();
    bootstrapChat();

    renderLantern();
    state.render.particleTimer = setInterval(emitAmbientParticles, config.particleMs);

    if (previewMode) {
      startShowcase();
      startPreviewChat();
    } else {
      startReactiveDecay();
    }
  }

  window.LanternOverlay = {
    receive,
    setState: (stateName) => receive({ type: 'setState', state: stateName }),
    addActivity: (value = 0.12) => receive({ type: 'addActivity', value }),
    triggerMood: (mood) => receive({ type: 'triggerMood', mood }),
    pushChat: (user, text, mood) => receive({ type: 'chat', user, text, mood }),
    startShowcase: () => {
      if (!state.preview.enabled) return;
      startShowcase();
    },
    stopShowcase: () => {
      if (!state.preview.enabled) return;
      stopShowcase();
    }
  };

  bootstrap();
})();
