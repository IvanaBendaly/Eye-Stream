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
    }
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
    derivedState: 'awake',
    renderedState: 'awake',
    activityLevel: 0.2,
    warmLevel: 0,
    chaosLevel: 0,
    curseLevel: 0,
    possessedUntil: 0,
    manualOverride: false,
    manualState: null,
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
    model.renderedState = state;
    console.log(`[LanternOverlay] render updated: ${state}`);
  }

  function updateVisualEffects(state = model.renderedState) {
    if (state === 'possessed') {
      model.effects.thorns = true;
      model.effects.smoke = true;
    } else if (state === 'dormant' && !model.manualOverride) {
      model.effects.smoke = false;
      model.effects.thorns = false;
    } else if (!model.manualOverride && state === 'awake') {
      model.effects.thorns = false;
      model.effects.smoke = true;
    }

    lantern.dataset.particles = model.effects.particles ? 'on' : 'off';
    lantern.dataset.smoke = model.effects.smoke ? 'on' : 'off';
    lantern.dataset.thorns = model.effects.thorns ? 'on' : 'off';
  }

  function updateStatus() {
    if (!isTestMode || !testStatus) return;
    testStatus.textContent = [
      `manualOverride: ${model.manualOverride ? 'on' : 'off'}`,
      `manualState: ${model.manualState || '-'}`,
      `auto: ${model.isAutoDemo ? 'on' : 'off'}`,
      `derivedState: ${model.derivedState}`,
      `renderedState: ${model.renderedState}`
    ].join(' • ');
  }

  function deriveStateFromMeters(reason = 'auto') {
    const now = Date.now();
    if (now < model.possessedUntil) {
      model.derivedState = 'possessed';
      console.log(`[LanternOverlay] derived auto state: possessed (reason: possessed-hold/${reason})`);
      return 'possessed';
    }

    if (model.curseLevel >= config.thresholds.possessedCurse) {
      model.possessedUntil = now + config.thresholds.possessedDurationMs;
      model.curseLevel = clamp(model.curseLevel * 0.55);
      model.derivedState = 'possessed';
      console.log(`[LanternOverlay] derived auto state: possessed (reason: curse-threshold/${reason})`);
      return 'possessed';
    }

    const warmBias = model.warmLevel - model.chaosLevel;
    const chaosBias = model.chaosLevel - model.warmLevel;

    let next = 'awake';
    if (model.activityLevel < config.thresholds.dormantActivity && model.warmLevel < 0.2 && model.chaosLevel < 0.2) {
      next = 'dormant';
    } else if (warmBias >= config.thresholds.warmDelta && model.activityLevel > 0.2) {
      next = 'warm';
    } else if (chaosBias >= config.thresholds.agitatedDelta && model.activityLevel > 0.26) {
      next = 'agitated';
    }

    model.derivedState = next;
    console.log(`[LanternOverlay] derived auto state: ${next} (reason: ${reason})`);
    return next;
  }

  function render(reason = 'unknown') {
    const stateToRender = model.manualOverride && model.manualState
      ? model.manualState
      : deriveStateFromMeters(reason);

    const source = model.manualOverride && model.manualState ? 'manual override' : 'auto resolver';
    setVisualClass(stateToRender);
    updateVisualEffects(stateToRender);
    updateStatus();
    console.log(`[LanternOverlay] final rendered state: ${stateToRender} (source: ${source}, reason: ${reason})`);
  }

  function stopDemo() {
    if (!model.demoTimer) return;
    clearInterval(model.demoTimer);
    model.demoTimer = null;
    model.isAutoDemo = false;
  }

  function setManualState(state, source = 'api') {
    if (!config.states.includes(state)) return;
    console.log(`[LanternOverlay] clicked state button: ${state} (${source})`);
    stopDemo();
    model.manualOverride = true;
    model.manualState = state;
    console.log(`[LanternOverlay] requested manual state: ${state}`);
    console.log('[LanternOverlay] manual override enabled');
    render('manual-state');
  }

  function resumeAutoMode() {
    model.manualOverride = false;
    model.manualState = null;
    console.log('[LanternOverlay] manual override disabled; resumed auto mode');
    render('resume-auto');
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
    render('add-activity');
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
    render(`trigger-burst:${kind}`);
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

    if (model.manualOverride) {
      updateStatus();
      return;
    }

    render('decay');
  }

  function startAmbientLoop() {
    if (model.particleTimer) clearInterval(model.particleTimer);
    model.particleTimer = setInterval(() => {
      if (model.renderedState === 'warm') emitParticle('warm');
      if (model.renderedState === 'agitated') emitParticle('ash');
      if (model.renderedState === 'possessed') emitParticle('smoke');
      if (model.renderedState === 'awake' && Math.random() > 0.55) emitParticle('warm');
    }, 340);
  }

  function toggleDemo() {
    if (model.demoTimer) {
      stopDemo();
      resumeAutoMode();
      return;
    }

    model.manualOverride = false;
    model.manualState = null;
    model.isAutoDemo = true;

    const seq = ['dormant', 'awake', 'warm', 'agitated', 'possessed'];
    let i = 0;
    model.manualOverride = true;
    model.manualState = seq[0];
    render('auto-demo-start');

    model.demoTimer = setInterval(() => {
      i = (i + 1) % seq.length;
      const step = seq[i];
      model.manualOverride = true;
      model.manualState = step;
      render('auto-demo-step');
      if (step === 'warm') pulseBurst('kind');
      if (step === 'agitated') pulseBurst('chaos');
      if (step === 'possessed') pulseBurst('curse');
    }, 2400);
  }

  function receive(payload = {}) {
    const { type } = payload;
    if (type === 'setState' && payload.state) setManualState(String(payload.state).toLowerCase(), 'receive');
    if (type === 'addActivity') addActivity(Number(payload.amount ?? payload.value ?? 1));
    if (type === 'triggerBurst' && payload.kind) triggerBurst(String(payload.kind).toLowerCase());
    if (type === 'toggleEffect' && payload.effect) toggleEffect(payload.effect, payload.value);
    if (type === 'chat' && payload.text) parseChatText(payload.text);
    if (type === 'setIntensity') {
      model.activityLevel = clamp(Number(payload.activity ?? model.activityLevel));
      model.warmLevel = clamp(Number(payload.warm ?? model.warmLevel));
      model.chaosLevel = clamp(Number(payload.chaos ?? model.chaosLevel));
      model.curseLevel = clamp(Number(payload.curse ?? model.curseLevel));
      render('set-intensity');
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

        if (act === 'setState') setManualState(value, 'button');
        if (act === 'activity') addActivity(Number(value));
        if (act === 'burst') triggerBurst(value);
        if (act === 'toggleEffect') toggleEffect(value);
        if (act === 'demo') toggleDemo();
        if (act === 'force') resumeAutoMode();

        updateStatus();
      });
    });
  }

  function bootstrap() {
    if (!isTestMode) root.style.pointerEvents = 'none';
    setupTestMode();
    updateVisualEffects();
    render('bootstrap');
    startAmbientLoop();
    model.decayTimer = setInterval(applyDecayTick, 1300);
  }

  window.LanternOverlay = {
    config,
    receive,
    setState: setManualState,
    setManualState,
    clearForcedState: resumeAutoMode,
    resumeAutoMode,
    addActivity,
    triggerBurst,
    toggleEffect,
    parseChatText,
    setIntensity: (values) => receive({ type: 'setIntensity', ...values })
  };

  bootstrap();
})();
