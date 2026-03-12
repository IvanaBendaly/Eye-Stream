(function () {
  const config = {
    states: ['dormant', 'awake', 'warm', 'agitated', 'possessed'],
    decay: {
      activity: 0.03,
      warm: 0.045,
      chaos: 0.05,
      curse: 0.022
    },
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

  const model = {
    state: 'awake',
    activity: 0.2,
    warm: 0,
    chaos: 0,
    curse: 0,
    forcedState: null,
    possessedUntil: 0,
    effects: {
      particles: true,
      smoke: true,
      thorns: false
    },
    demoTimer: null,
    decayTimer: null,
    particleTimer: null
  };

  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
  const random = (min, max) => Math.random() * (max - min) + min;

  function applyVisualState(state) {
    config.states.forEach((name) => lantern.classList.remove(`state-${name}`));
    lantern.classList.add(`state-${state}`);
    root.dataset.state = state;
    model.state = state;
  }

  function updateVisualEffects() {
    lantern.dataset.particles = model.effects.particles ? 'on' : 'off';
    lantern.dataset.smoke = model.effects.smoke ? 'on' : 'off';
    lantern.dataset.thorns = model.effects.thorns ? 'on' : 'off';
  }

  function updateStatus() {
    if (!isTestMode || !testStatus) return;
    testStatus.textContent = `state: ${model.state} • activity: ${model.activity.toFixed(2)} • warm: ${model.warm.toFixed(2)} • chaos: ${model.chaos.toFixed(2)} • curse: ${model.curse.toFixed(2)}${model.forcedState ? ` • forced:${model.forcedState}` : ''}`;
  }

  function chooseState() {
    if (model.forcedState) return model.forcedState;
    const now = Date.now();
    if (now < model.possessedUntil) return 'possessed';
    if (model.curse >= config.thresholds.possessedCurse) {
      model.possessedUntil = now + config.thresholds.possessedDurationMs;
      model.curse = clamp(model.curse * 0.55);
      return 'possessed';
    }

    const warmBias = model.warm - model.chaos;
    const chaosBias = model.chaos - model.warm;

    if (model.activity < config.thresholds.dormantActivity && model.warm < 0.2 && model.chaos < 0.2) {
      return 'dormant';
    }
    if (warmBias >= config.thresholds.warmDelta && model.activity > 0.2) return 'warm';
    if (chaosBias >= config.thresholds.agitatedDelta && model.activity > 0.26) return 'agitated';
    return 'awake';
  }

  function evaluateMood() {
    applyVisualState(chooseState());
    updateStatus();
  }

  function emitParticle(type) {
    if ((type === 'smoke' && !model.effects.smoke) || (!model.effects.particles && type !== 'smoke')) return;
    const layer = lantern.querySelector(`.particle-layer.${type}`);
    if (!layer) return;

    const p = document.createElement('span');
    p.className = `particle ${type}`;
    p.style.left = `${random(82, 138)}px`;
    p.style.top = `${random(96, 138)}px`;
    p.style.setProperty('--dx', `${random(-14, 18)}px`);
    p.style.setProperty('--dy', `${random(-68, -34)}px`);
    p.style.animationDuration = `${random(1.8, 3.5)}s`;
    p.style.animationDelay = `${random(0, 0.5)}s`;
    layer.appendChild(p);

    setTimeout(() => p.remove(), 3800);
  }

  function pulseBurst(kind) {
    lantern.classList.remove('burst');
    requestAnimationFrame(() => lantern.classList.add('burst'));
    if (kind === 'kind') {
      for (let i = 0; i < 4; i += 1) setTimeout(() => emitParticle('warm'), i * 75);
    } else if (kind === 'chaos') {
      for (let i = 0; i < 5; i += 1) setTimeout(() => emitParticle('ash'), i * 55);
    } else if (kind === 'curse') {
      for (let i = 0; i < 6; i += 1) setTimeout(() => emitParticle('smoke'), i * 70);
    }
  }

  function addActivity(amount = 0.1) {
    model.activity = clamp(model.activity + amount * 0.1);
    evaluateMood();
  }

  function setState(state) {
    if (!config.states.includes(state)) return;
    model.forcedState = state;
    applyVisualState(state);
    updateStatus();
  }

  function clearForcedState() {
    model.forcedState = null;
    evaluateMood();
  }

  function toggleEffect(effect, value) {
    if (!(effect in model.effects)) return;
    model.effects[effect] = typeof value === 'boolean' ? value : !model.effects[effect];
    updateVisualEffects();
    updateStatus();
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

  function triggerBurst(kind, options = {}) {
    const amount = options.amount ?? 0.12;
    if (kind === 'kind') {
      model.warm = clamp(model.warm + amount * 1.35);
      model.chaos = clamp(model.chaos - amount * 0.28);
      model.activity = clamp(model.activity + amount * 1.25);
    }
    if (kind === 'chaos') {
      model.chaos = clamp(model.chaos + amount * 1.45);
      model.warm = clamp(model.warm - amount * 0.2);
      model.activity = clamp(model.activity + amount * 1.38);
    }
    if (kind === 'curse') {
      model.curse = clamp(model.curse + amount * 1.5);
      model.chaos = clamp(model.chaos + amount * 0.5);
      model.activity = clamp(model.activity + amount * 1.4);
      model.effects.thorns = true;
      updateVisualEffects();
    }
    pulseBurst(kind);
    evaluateMood();
  }

  function applyDecayTick() {
    model.activity = clamp(model.activity - config.decay.activity);
    model.warm = clamp(model.warm - config.decay.warm);
    model.chaos = clamp(model.chaos - config.decay.chaos);
    model.curse = clamp(model.curse - config.decay.curse);

    if (model.state !== 'possessed' && model.curse < 0.12 && !model.forcedState) {
      model.effects.thorns = false;
      updateVisualEffects();
    }

    evaluateMood();
  }

  function startAmbientLoop() {
    if (model.particleTimer) clearInterval(model.particleTimer);
    model.particleTimer = setInterval(() => {
      if (model.state === 'warm') emitParticle('warm');
      if (model.state === 'agitated') emitParticle('ash');
      if (model.state === 'possessed') emitParticle('smoke');
      if (model.state === 'awake' && Math.random() > 0.5) emitParticle('warm');
    }, 360);
  }

  function toggleDemo() {
    if (model.demoTimer) {
      clearInterval(model.demoTimer);
      model.demoTimer = null;
      return;
    }

    const seq = [
      () => setState('dormant'),
      () => setState('awake'),
      () => { setState('warm'); triggerBurst('kind'); },
      () => { setState('agitated'); triggerBurst('chaos'); },
      () => { setState('possessed'); triggerBurst('curse'); },
      () => clearForcedState()
    ];
    let i = 0;
    seq[0]();
    model.demoTimer = setInterval(() => {
      i = (i + 1) % seq.length;
      seq[i]();
    }, 2600);
  }

  function receive(payload = {}) {
    const { type } = payload;
    if (type === 'setState' && payload.state) setState(String(payload.state).toLowerCase());
    if (type === 'addActivity') addActivity(Number(payload.amount ?? payload.value ?? 1));
    if (type === 'triggerBurst' && payload.kind) triggerBurst(String(payload.kind).toLowerCase());
    if (type === 'toggleEffect' && payload.effect) toggleEffect(payload.effect, payload.value);
    if (type === 'chat' && payload.text) parseChatText(payload.text);
    if (type === 'setIntensity') {
      model.activity = clamp(Number(payload.activity ?? model.activity));
      model.warm = clamp(Number(payload.warm ?? model.warm));
      model.chaos = clamp(Number(payload.chaos ?? model.chaos));
      model.curse = clamp(Number(payload.curse ?? model.curse));
      evaluateMood();
    }
  }

  function setupTestMode() {
    if (!isTestMode) return;
    root.dataset.mode = 'test';
    testUi.hidden = false;

    testUi.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        const act = button.dataset.act;
        const value = button.dataset.value;
        if (act === 'setState') setState(value);
        if (act === 'activity') addActivity(Number(value));
        if (act === 'burst') triggerBurst(value);
        if (act === 'toggleEffect') toggleEffect(value);
        if (act === 'demo') toggleDemo();
        if (act === 'force') clearForcedState();
      });
    });
  }

  function bootstrap() {
    setupTestMode();
    updateVisualEffects();
    evaluateMood();
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
