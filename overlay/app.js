(function () {
  const config = {
    states: ['dormant', 'awake', 'warm', 'agitated', 'possessed'],
    decay: { activity: 0.03, warm: 0.045, chaos: 0.05, curse: 0.022 },
    keywords: {
      warm: ['love', 'cute', 'safe', 'cozy', 'gentle', 'calm', 'hug', 'lovely', 'sweet'],
      chaos: ['run', 'chaos', 'panic', 'fast', 'insane', 'scream', 'cursed', 'hunt', 'wild'],
      curse: ['void', 'possessed', 'demon', 'hex', 'rot', 'bleed', 'haunt', 'watcher', 'consume', 'hollow']
    },
    thresholds: {
      dormantActivity: 0.18,
      warmDelta: 0.18,
      agitatedDelta: 0.2,
      possessedCurse: 0.84,
      possessedDurationMs: 12000
    },
    manualOverrideMs: 15000
  };

  const root = document.getElementById('overlay-root');
  const lantern = document.getElementById('lantern');
  const testUi = document.getElementById('test-ui');
  const testStatus = document.getElementById('test-status');

  const params = new URLSearchParams(window.location.search);
  const isTestMode = params.get('mode') === 'test' || params.get('test') === '1';
  root.dataset.mode = isTestMode ? 'test' : 'overlay';

  const model = {
    currentState: 'awake',
    activityLevel: 0.2,
    warmLevel: 0,
    chaosLevel: 0,
    curseLevel: 0,
    forcedState: null,
    manualOverrideUntil: 0,
    possessedUntil: 0,
    isAutoDemo: false,
    effects: { particles: true, smoke: true, thorns: false },
    demoTimer: null,
    decayTimer: null,
    particleTimer: null
  };

  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
  const random = (min, max) => Math.random() * (max - min) + min;

  function setVisualClass(state) {
    config.states.forEach((name) => lantern.classList.remove(`state-${name}`));
    lantern.classList.add(`state-${state}`);
    root.dataset.state = state;
    model.currentState = state;
    console.log(`[LanternOverlay] render applied: ${state}`);
  }

  function updateVisualEffects() {
    lantern.dataset.particles = model.effects.particles ? 'on' : 'off';
    lantern.dataset.smoke = model.effects.smoke ? 'on' : 'off';
    lantern.dataset.thorns = model.effects.thorns ? 'on' : 'off';
  }

  function updateStatus() {
    if (!isTestMode || !testStatus) return;
    const manualActive = Date.now() < model.manualOverrideUntil || !!model.forcedState;
    testStatus.textContent = [
      `state: ${model.currentState}`,
      `auto: ${model.isAutoDemo ? 'on' : 'off'}`,
      `manual: ${manualActive ? 'on' : 'off'}`,
      `activity: ${model.activityLevel.toFixed(2)}`,
      `warm: ${model.warmLevel.toFixed(2)}`,
      `chaos: ${model.chaosLevel.toFixed(2)}`,
      `curse: ${model.curseLevel.toFixed(2)}`
    ].join(' • ');
  }

  function getDerivedState() {
    const now = Date.now();
    if (now < model.manualOverrideUntil && model.forcedState) return model.forcedState;
    if (now < model.possessedUntil) return 'possessed';

    if (model.curseLevel >= config.thresholds.possessedCurse) {
      model.possessedUntil = now + config.thresholds.possessedDurationMs;
      model.curseLevel = clamp(model.curseLevel * 0.55);
      return 'possessed';
    }

    const warmBias = model.warmLevel - model.chaosLevel;
    const chaosBias = model.chaosLevel - model.warmLevel;

    if (model.activityLevel < config.thresholds.dormantActivity && model.warmLevel < 0.2 && model.chaosLevel < 0.2) {
      return 'dormant';
    }
    if (warmBias >= config.thresholds.warmDelta && model.activityLevel > 0.2) return 'warm';
    if (chaosBias >= config.thresholds.agitatedDelta && model.activityLevel > 0.26) return 'agitated';
    return 'awake';
  }

  function renderState(reason = 'unknown') {
    const derived = getDerivedState();
    setVisualClass(derived);

    if (derived === 'possessed') {
      model.effects.thorns = true;
      model.effects.smoke = true;
    }
    if (derived === 'dormant') {
      model.effects.smoke = false;
    }

    updateVisualEffects();
    updateStatus();
    console.log(`[LanternOverlay] state changed to ${derived} (reason: ${reason})`);
  }

  function emitParticle(type) {
    if ((type === 'smoke' && !model.effects.smoke) || (!model.effects.particles && type !== 'smoke')) return;
    const layer = lantern.querySelector(`.particle-layer.${type}`);
    if (!layer) return;

    const p = document.createElement('span');
    p.className = `particle ${type}`;
    p.style.left = `${random(82, 138)}px`;
    p.style.top = `${random(96, 138)}px`;
    p.style.setProperty('--dx', `${random(-16, 20)}px`);
    p.style.setProperty('--dy', `${random(-72, -36)}px`);
    p.style.animationDuration = `${random(1.6, 3.4)}s`;
    layer.appendChild(p);
    setTimeout(() => p.remove(), 3800);
  }

  function pulseBurst(kind) {
    lantern.classList.remove('burst');
    requestAnimationFrame(() => lantern.classList.add('burst'));
    if (kind === 'kind') for (let i = 0; i < 5; i += 1) setTimeout(() => emitParticle('warm'), i * 65);
    if (kind === 'chaos') for (let i = 0; i < 6; i += 1) setTimeout(() => emitParticle('ash'), i * 50);
    if (kind === 'curse') for (let i = 0; i < 7; i += 1) setTimeout(() => emitParticle('smoke'), i * 55);
  }

  function addActivity(amount = 0.1) {
    model.activityLevel = clamp(model.activityLevel + amount * 0.1);
    renderState('addActivity');
  }

  function stopDemo() {
    if (!model.demoTimer) return;
    clearInterval(model.demoTimer);
    model.demoTimer = null;
    model.isAutoDemo = false;
  }

  function setState(state, source = 'api') {
    if (!config.states.includes(state)) return;
    model.forcedState = state;
    model.manualOverrideUntil = Date.now() + config.manualOverrideMs;
    stopDemo();
    console.log(`[LanternOverlay] clicked ${state} (${source})`);
    renderState('manual-setState');
  }

  function clearForcedState() {
    model.forcedState = null;
    model.manualOverrideUntil = 0;
    renderState('clearForcedState');
  }

  function toggleEffect(effect, value) {
    if (!(effect in model.effects)) return;
    model.effects[effect] = typeof value === 'boolean' ? value : !model.effects[effect];
    updateVisualEffects();
    updateStatus();
  }

  function triggerBurst(kind, options = {}) {
    const amount = options.amount ?? 0.12;
    if (kind === 'kind') {
      model.warmLevel = clamp(model.warmLevel + amount * 1.35);
      model.chaosLevel = clamp(model.chaosLevel - amount * 0.28);
      model.activityLevel = clamp(model.activityLevel + amount * 1.25);
    }
    if (kind === 'chaos') {
      model.chaosLevel = clamp(model.chaosLevel + amount * 1.45);
      model.warmLevel = clamp(model.warmLevel - amount * 0.2);
      model.activityLevel = clamp(model.activityLevel + amount * 1.38);
    }
    if (kind === 'curse') {
      model.curseLevel = clamp(model.curseLevel + amount * 1.5);
      model.chaosLevel = clamp(model.chaosLevel + amount * 0.5);
      model.activityLevel = clamp(model.activityLevel + amount * 1.4);
      model.effects.thorns = true;
      updateVisualEffects();
    }

    pulseBurst(kind);
    renderState(`triggerBurst:${kind}`);
  }

  function parseChatText(text = '') {
    const msg = String(text).toLowerCase();
    const scoreKeyword = (list) => list.reduce((acc, token) => acc + (msg.includes(token) ? 1 : 0), 0);
    const warmHits = scoreKeyword(config.keywords.warm);
    const chaosHits = scoreKeyword(config.keywords.chaos);
    const curseHits = scoreKeyword(config.keywords.curse);

    if (warmHits + chaosHits + curseHits === 0) addActivity(0.4);
    if (warmHits) triggerBurst('kind', { amount: warmHits * 0.11 });
    if (chaosHits) triggerBurst('chaos', { amount: chaosHits * 0.11 });
    if (curseHits) triggerBurst('curse', { amount: curseHits * 0.14 });
  }

  function applyDecayTick() {
    model.activityLevel = clamp(model.activityLevel - config.decay.activity);
    model.warmLevel = clamp(model.warmLevel - config.decay.warm);
    model.chaosLevel = clamp(model.chaosLevel - config.decay.chaos);
    model.curseLevel = clamp(model.curseLevel - config.decay.curse);

    if (Date.now() > model.manualOverrideUntil) {
      model.forcedState = null;
    }

    if (model.currentState !== 'possessed' && model.curseLevel < 0.12 && !model.forcedState) {
      model.effects.thorns = false;
      if (!model.isAutoDemo) model.effects.smoke = true;
    }

    renderState('decay');
  }

  function startAmbientLoop() {
    if (model.particleTimer) clearInterval(model.particleTimer);
    model.particleTimer = setInterval(() => {
      if (model.currentState === 'warm') emitParticle('warm');
      if (model.currentState === 'agitated') emitParticle('ash');
      if (model.currentState === 'possessed') emitParticle('smoke');
      if (model.currentState === 'awake' && Math.random() > 0.55) emitParticle('warm');
    }, 340);
  }

  function toggleDemo() {
    if (model.demoTimer) {
      stopDemo();
      updateStatus();
      return;
    }

    model.forcedState = null;
    model.manualOverrideUntil = 0;
    model.isAutoDemo = true;

    const seq = ['dormant', 'awake', 'warm', 'agitated', 'possessed'];
    let i = 0;
    setVisualClass(seq[0]);
    updateStatus();

    model.demoTimer = setInterval(() => {
      i = (i + 1) % seq.length;
      const step = seq[i];
      model.forcedState = step;
      model.manualOverrideUntil = Date.now() + 2200;
      renderState('auto-demo');
      if (step === 'warm') pulseBurst('kind');
      if (step === 'agitated') pulseBurst('chaos');
      if (step === 'possessed') pulseBurst('curse');
    }, 2400);
  }

  function receive(payload = {}) {
    const { type } = payload;
    if (type === 'setState' && payload.state) setState(String(payload.state).toLowerCase(), 'receive');
    if (type === 'addActivity') addActivity(Number(payload.amount ?? payload.value ?? 1));
    if (type === 'triggerBurst' && payload.kind) triggerBurst(String(payload.kind).toLowerCase());
    if (type === 'toggleEffect' && payload.effect) toggleEffect(payload.effect, payload.value);
    if (type === 'chat' && payload.text) parseChatText(payload.text);
    if (type === 'setIntensity') {
      model.activityLevel = clamp(Number(payload.activity ?? model.activityLevel));
      model.warmLevel = clamp(Number(payload.warm ?? model.warmLevel));
      model.chaosLevel = clamp(Number(payload.chaos ?? model.chaosLevel));
      model.curseLevel = clamp(Number(payload.curse ?? model.curseLevel));
      renderState('setIntensity');
    }
  }

  function setupTestMode() {
    if (!isTestMode) return;
    root.dataset.mode = 'test';
    root.style.pointerEvents = 'auto';
    testUi.hidden = false;

    testUi.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        const act = button.dataset.act;
        const value = button.dataset.value;

        if (act === 'setState') setState(value, 'button');
        if (act === 'activity') addActivity(Number(value));
        if (act === 'burst') triggerBurst(value);
        if (act === 'toggleEffect') toggleEffect(value);
        if (act === 'demo') toggleDemo();
        if (act === 'force') clearForcedState();

        updateStatus();
      });
    });
  }

  function bootstrap() {
    if (!isTestMode) root.style.pointerEvents = 'none';
    setupTestMode();
    updateVisualEffects();
    renderState('bootstrap');
    startAmbientLoop();
    model.decayTimer = setInterval(applyDecayTick, 1300);
  }

  window.LanternOverlay = {
    config,
    receive,
    setState,
    clearForcedState,
    addActivity,
    triggerBurst,
    toggleEffect,
    parseChatText,
    setIntensity: (values) => receive({ type: 'setIntensity', ...values })
  };

  bootstrap();
})();
