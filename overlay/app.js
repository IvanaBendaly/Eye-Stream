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
    showcaseMs: 3000,
    decayMs: 1400,
    particleMs: 220,
    showcaseSequence: [
      { state: 'dormant', variant: 'base' },
      { state: 'awake', variant: 'base' },
      { state: 'warm', variant: 'warm-sparkles' },
      { state: 'agitated', variant: 'agitated-spike' },
      { state: 'possessed', variant: 'possessed-smoke' },
      { state: 'possessed', variant: 'possessed-thorns' },
      { state: 'possessed', variant: 'possessed-cracks' },
      { state: 'possessed', variant: 'possessed-burst' }
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
      showcaseOn: previewMode,
      showcaseTimer: null,
      showcaseIndex: 0,
      showcaseState: 'awake',
      showcaseVariant: 'base',
      manualState: null,
      manualVariant: 'base',
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

  function activePreviewSource() {
    if (state.preview.manualState) {
      return { moodState: state.preview.manualState, variant: state.preview.manualVariant };
    }

    return { moodState: state.preview.showcaseState, variant: state.preview.showcaseVariant };
  }

  function getRenderSource() {
    if (state.preview.enabled) {
      return activePreviewSource();
    }
    return { moodState: deriveReactiveState(), variant: 'base' };
  }

  function updatePreviewStatus() {
    if (!previewMode) return;

    const manualLabel = state.preview.manualState || 'none';
    const showcaseLabel = state.preview.showcaseOn ? 'running' : 'paused';
    previewStatus.textContent = `Preview ON • showcase: ${showcaseLabel} • manual: ${manualLabel} • rendered: ${state.render.state}`;
  }

  function renderLantern(reason = 'unknown') {
    const { moodState, variant } = getRenderSource();
    config.states.forEach((name) => lantern.classList.remove(`state-${name}`));
    lantern.classList.add(`state-${moodState}`);
    lantern.dataset.variant = variant;

    state.render.state = moodState;
    state.render.variant = variant;
    overlayRoot.dataset.state = moodState;

    updatePreviewStatus();
    if (previewMode) {
      console.log(`[LanternOverlay] rendered preview state: ${moodState} (variant: ${variant}, reason: ${reason})`);
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
    particle.style.top = `${random(92, 140)}px`;
    particle.style.setProperty('--dx', `${random(-22, 26)}px`);
    particle.style.setProperty('--dy', `${random(-84, -38)}px`);
    particle.style.animationDuration = `${random(1.4, 3.3)}s`;
    layer.appendChild(particle);
    setTimeout(() => particle.remove(), 3400);
  }

  function emitAmbientParticles() {
    const mood = state.render.state;
    const variant = state.render.variant;

    if (mood === 'dormant' && Math.random() > 0.98) emitParticle('ash');

    if (mood === 'awake') {
      if (Math.random() > 0.72) emitParticle('warm');
    }

    if (mood === 'warm') {
      emitParticle('warm');
      if (variant === 'warm-sparkles' || Math.random() > 0.4) emitParticle('warm');
    }

    if (mood === 'agitated') {
      emitParticle('ash');
      if (Math.random() > 0.35) emitParticle('warm');
      if (variant === 'agitated-spike' && Math.random() > 0.55) pulseBurst();
    }

    if (mood === 'possessed') {
      emitParticle('smoke');
      if (Math.random() > 0.4) emitParticle('smoke');
      if (variant === 'possessed-burst' && Math.random() > 0.45) {
        emitParticle('ash');
        pulseBurst();
      }
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

    if (!state.preview.enabled) renderLantern('apply-mood');
  }

  function appendChat(message) {
    const item = document.createElement('li');
    item.innerHTML = `<span class="tag">${message.user}</span>${message.text}`;
    chatList.prepend(item);
    while (chatList.children.length > 5) chatList.removeChild(chatList.lastChild);
  }

  function stopShowcase(logReason = 'manual') {
    state.preview.showcaseOn = false;
    clearTimeout(state.preview.showcaseTimer);
    console.log(`[LanternOverlay] showcase paused (${logReason})`);
    if (showcaseToggle) showcaseToggle.textContent = 'Resume showcase';
  }

  function showcaseStep() {
    if (!state.preview.enabled || !state.preview.showcaseOn || state.preview.manualState) return;

    const entry = config.showcaseSequence[state.preview.showcaseIndex % config.showcaseSequence.length];
    state.preview.showcaseState = entry.state;
    state.preview.showcaseVariant = entry.variant;
    state.preview.showcaseIndex += 1;
    renderLantern('showcase-step');

    if (entry.variant === 'possessed-burst' || entry.variant === 'agitated-spike') {
      pulseBurst();
    }

    state.preview.showcaseTimer = setTimeout(showcaseStep, config.showcaseMs);
  }

  function startShowcase(logReason = 'button') {
    if (!state.preview.enabled) return;

    state.preview.manualState = null;
    state.preview.manualVariant = 'base';
    state.preview.showcaseOn = true;
    clearTimeout(state.preview.showcaseTimer);
    console.log(`[LanternOverlay] showcase resumed (${logReason})`);
    if (showcaseToggle) showcaseToggle.textContent = 'Pause showcase';
    showcaseStep();
  }

  function setManualPreviewState(nextState) {
    if (!state.preview.enabled || !config.states.includes(nextState)) return;

    console.log(`[LanternOverlay] clicked preview button: ${nextState}`);
    stopShowcase('preview-button-click');

    state.preview.manualState = nextState;
    state.preview.manualVariant = nextState === 'warm' ? 'warm-sparkles' : (nextState === 'agitated' ? 'agitated-spike' : 'base');

    if (nextState === 'possessed') {
      state.preview.manualVariant = 'possessed-thorns';
      pulseBurst();
    }

    console.log(`[LanternOverlay] manual preview override enabled: ${nextState}`);
    renderLantern('manual-preview-state');
  }

  function startPreviewChat() {
    clearInterval(state.preview.chatTimer);
    state.preview.chatTimer = setInterval(() => {
      const message = config.previewChat[state.preview.chatIndex % config.previewChat.length];
      state.preview.chatIndex += 1;
      appendChat(message);

      if (!state.preview.manualState) {
        if (message.mood === 'kind') applyMood('kind');
        if (message.mood === 'chaos') applyMood('chaos');
        if (message.mood === 'curse') applyMood('curse');
      }
    }, 2100);
  }

  function startReactiveDecay() {
    state.reactive.decayTimer = setInterval(() => {
      if (state.preview.enabled) return;
      state.reactive.activity = clamp(state.reactive.activity - 0.03);
      state.reactive.warmth = clamp(state.reactive.warmth - 0.035);
      state.reactive.chaos = clamp(state.reactive.chaos - 0.04);
      state.reactive.curse = clamp(state.reactive.curse - 0.025);
      renderLantern('reactive-decay');
    }, config.decayMs);
  }

  function bindPreviewControls() {
    if (!previewMode) return;
    previewPanel.hidden = false;
    overlayRoot.dataset.mode = 'preview';

    previewPanel.querySelectorAll('[data-state]').forEach((button) => {
      button.addEventListener('click', () => {
        setManualPreviewState(button.dataset.state);
      });
    });

    showcaseToggle.addEventListener('click', () => {
      if (state.preview.showcaseOn) {
        stopShowcase('toggle-button');
        renderLantern('showcase-paused');
      } else {
        startShowcase('toggle-button');
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
      renderLantern('api-setstate');
    }

    if (command === 'addactivity' && !state.preview.enabled) {
      state.reactive.activity = clamp(state.reactive.activity + Number(event.value ?? 0.12));
      renderLantern('api-addactivity');
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

    renderLantern('bootstrap');
    state.render.particleTimer = setInterval(emitAmbientParticles, config.particleMs);

    if (previewMode) {
      startShowcase('bootstrap');
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
      startShowcase('api');
    },
    stopShowcase: () => {
      if (!state.preview.enabled) return;
      stopShowcase('api');
      renderLantern('api-stop-showcase');
    },
    setPreviewState: (previewState) => {
      if (!state.preview.enabled) return;
      setManualPreviewState(String(previewState || '').toLowerCase());
    }
  };

  bootstrap();
})();
