(function () {
  const shell = document.getElementById('eye-shell');
  const overlay = document.getElementById('overlay-root');
  const testUi = document.getElementById('test-ui');

  const STATE_CLASS = {
    dormant: 'state-dormant',
    awake: 'state-awake',
    fond: 'state-fond',
    agitated: 'state-agitated',
    possessed: 'state-possessed'
  };

  const STATE_PROFILE = {
    dormant: { lookX: 2, lookY: 1, driftMs: 2800, blinkMin: 4600, blinkMax: 7400, softBlinkBias: 0.85 },
    awake: { lookX: 6, lookY: 3, driftMs: 1800, blinkMin: 2800, blinkMax: 4900, softBlinkBias: 0.35 },
    fond: { lookX: 4, lookY: 2, driftMs: 2200, blinkMin: 3200, blinkMax: 5400, softBlinkBias: 0.75 },
    agitated: { lookX: 10, lookY: 4, driftMs: 900, blinkMin: 1500, blinkMax: 2600, softBlinkBias: 0.12 },
    possessed: { lookX: 12, lookY: 5, driftMs: 640, blinkMin: 1200, blinkMax: 2100, softBlinkBias: 0 }
  };

  const aliases = {
    neutral: 'awake',
    calm: 'awake',
    sleepy: 'dormant',
    sweet: 'fond',
    love: 'fond',
    angry: 'agitated',
    alert: 'agitated',
    cursed: 'possessed'
  };

  let currentState = 'awake';
  let moodScore = 0;
  let heat = 0;

  const params = new URLSearchParams(window.location.search);
  const isTestMode = params.get('test') === '1' || params.get('mode') === 'test';

  const setState = (state) => {
    const requested = String(state || '').toLowerCase();
    const resolved = aliases[requested] || requested;
    const next = STATE_CLASS[resolved] ? resolved : 'awake';
    Object.values(STATE_CLASS).forEach((name) => shell.classList.remove(name));
    shell.classList.add(STATE_CLASS[next]);
    currentState = next;
    overlay.dataset.eyeState = next;
  };

  const fireClass = (name, duration) => {
    shell.classList.remove(name);
    shell.classList.add(name);
    setTimeout(() => shell.classList.remove(name), duration);
  };

  const blink = () => fireClass('blinking', 440);
  const softBlink = () => fireClass('soft-blink', 500);
  const pulse = () => fireClass('pulse', 580);
  const glance = () => fireClass('glance', 660);
  const possessBurst = () => fireClass('possess-burst', 760);

  const setLook = (x, y) => {
    shell.style.setProperty('--look-x', `${x}px`);
    shell.style.setProperty('--look-y', `${y}px`);
  };

  const applyMoodScore = () => {
    if (moodScore <= -4) setState('dormant');
    else if (moodScore >= 8) setState('possessed');
    else if (moodScore >= 4) setState('agitated');
    else if (moodScore <= 0) setState('fond');
    else setState('awake');
  };

  const maybeTriggerPossessed = () => {
    if (currentState === 'possessed') return;
    if (heat >= 7 && moodScore >= 5 && Math.random() < 0.35) {
      moodScore = 8;
      setState('possessed');
      possessBurst();
      heat = 0;
    }
  };

  const influence = (kind, amount = 1) => {
    const power = Number.isFinite(amount) ? Math.max(1, Math.min(4, amount)) : 1;

    if (kind === 'warm') {
      moodScore -= power;
      heat = Math.max(0, heat - 2);
      if (Math.random() < 0.6) softBlink();
    }

    if (kind === 'hype') {
      moodScore += power;
      heat += 1;
      if (Math.random() < 0.55) glance();
    }

    if (kind === 'curse') {
      moodScore += power * 2;
      heat += 3;
      possessBurst();
    }

    moodScore = Math.max(-6, Math.min(10, moodScore));
    heat = Math.max(0, Math.min(10, heat));
    applyMoodScore();
    maybeTriggerPossessed();
  };

  const recover = () => {
    moodScore = Math.max(-1, moodScore - 3);
    heat = Math.max(0, heat - 4);
    applyMoodScore();
    pulse();
  };

  const runAction = (action) => {
    if (action === 'blink') blink();
    if (action === 'softBlink') softBlink();
    if (action === 'glance') glance();
    if (action === 'pulse') pulse();
    if (action === 'possess') {
      moodScore = 8;
      heat = 10;
      setState('possessed');
      possessBurst();
    }
    if (action === 'recover') recover();
  };

  const randomDrift = () => {
    const profile = STATE_PROFILE[currentState] || STATE_PROFILE.awake;
    const nextX = Math.round((Math.random() * profile.lookX * 2) - profile.lookX);
    const nextY = Math.round((Math.random() * profile.lookY * 2) - profile.lookY);
    setLook(nextX, nextY);
    setTimeout(randomDrift, profile.driftMs);
  };

  const scheduleBlink = () => {
    const profile = STATE_PROFILE[currentState] || STATE_PROFILE.awake;
    const wait = profile.blinkMin + Math.random() * (profile.blinkMax - profile.blinkMin);
    setTimeout(() => {
      if (Math.random() < profile.softBlinkBias) softBlink();
      else blink();

      if (currentState === 'possessed' && Math.random() < 0.4) possessBurst();
      scheduleBlink();
    }, wait);
  };

  const setupTestMode = () => {
    if (!isTestMode) return;
    overlay.dataset.mode = 'test';
    testUi.hidden = false;

    testUi.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        const act = button.dataset.act;
        const value = button.dataset.value;
        if (act === 'state') setState(value);
        if (act === 'action') runAction(value);
      });
    });
  };

  const receive = (payload) => {
    if (!payload || typeof payload !== 'object') return;

    if (payload.type === 'setState') setState(payload.state);
    if (payload.type === 'action') runAction(payload.action);
    if (payload.type === 'influence') influence(payload.kind, payload.amount || 1);

    if (payload.type === 'setMood' && Number.isFinite(payload.value)) {
      moodScore = Math.max(-6, Math.min(10, payload.value));
      applyMoodScore();
    }

    if (payload.type === 'recover') recover();
  };

  const connectWebSocketBridge = () => {
    const wsUrl = params.get('ws');
    if (!wsUrl) return;

    try {
      const socket = new WebSocket(wsUrl);
      socket.addEventListener('message', (event) => {
        try {
          receive(JSON.parse(event.data));
        } catch (_error) {
          // ignore malformed payloads
        }
      });
    } catch (_error) {
      // ignore bridge connection failures
    }
  };

  window.ChatEye = {
    receive,
    setState,
    blink,
    softBlink,
    pulse,
    influence,
    recover,
    getState: () => currentState,
    getMood: () => moodScore,
    getHeat: () => heat
  };

  setState('awake');
  setupTestMode();
  connectWebSocketBridge();
  randomDrift();
  scheduleBlink();

  setInterval(() => {
    if (currentState === 'fond' && Math.random() < 0.25) pulse();
    if (currentState === 'agitated' && Math.random() < 0.45) glance();
    if (currentState === 'possessed' && Math.random() < 0.5) possessBurst();
  }, 1800);
})();
