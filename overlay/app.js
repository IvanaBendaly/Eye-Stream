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
    dormant: { look: 2, drift: 2600, blink: [4600, 7600] },
    awake: { look: 7, drift: 1800, blink: [2800, 5200] },
    fond: { look: 5, drift: 2100, blink: [3000, 5600] },
    agitated: { look: 11, drift: 850, blink: [1400, 2500] },
    possessed: { look: 13, drift: 620, blink: [1100, 2100] }
  };

  const aliases = {
    neutral: 'awake',
    calm: 'awake',
    sleepy: 'dormant',
    love: 'fond',
    angry: 'agitated',
    alert: 'agitated',
    cursed: 'possessed'
  };

  let currentState = 'awake';
  let moodScore = 0;

  const params = new URLSearchParams(window.location.search);
  const isTestMode = params.get('test') === '1' || params.get('mode') === 'test';

  const setState = (state) => {
    const key = aliases[String(state || '').toLowerCase()] || String(state || '').toLowerCase();
    const next = STATE_CLASS[key] ? key : 'awake';
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

  const blink = () => fireClass('blinking', 420);
  const pulse = () => fireClass('pulse', 520);
  const possessBurst = () => fireClass('possess-burst', 700);
  const glance = () => fireClass('glance', 620);

  const setLook = (x, y) => {
    shell.style.setProperty('--look-x', `${x}px`);
    shell.style.setProperty('--look-y', `${y}px`);
  };

  const applyMoodScore = () => {
    if (moodScore <= -4) setState('dormant');
    else if (moodScore >= 7) setState('possessed');
    else if (moodScore >= 4) setState('agitated');
    else if (moodScore >= 1) setState('awake');
    else setState('fond');
  };

  const influence = (kind, amount = 1) => {
    if (kind === 'warm') moodScore -= amount;
    if (kind === 'hype') moodScore += amount;
    if (kind === 'curse') moodScore += amount * 2;
    moodScore = Math.max(-6, Math.min(10, moodScore));
    applyMoodScore();
  };

  const runAction = (action) => {
    if (action === 'blink') blink();
    if (action === 'glance') glance();
    if (action === 'pulse') pulse();
    if (action === 'possess') {
      setState('possessed');
      moodScore = 8;
      possessBurst();
    }
    if (action === 'calm') {
      moodScore = 0;
      setState('awake');
      pulse();
    }
  };

  const randomDrift = () => {
    const profile = STATE_PROFILE[currentState] || STATE_PROFILE.awake;
    const x = (Math.random() * profile.look * 2) - profile.look;
    const y = (Math.random() * profile.look * 0.6) - profile.look * 0.3;
    setLook(Math.round(x), Math.round(y));
    setTimeout(randomDrift, profile.drift);
  };

  const autoBlink = () => {
    const profile = STATE_PROFILE[currentState] || STATE_PROFILE.awake;
    const [min, max] = profile.blink;
    const delay = min + Math.random() * (max - min);
    setTimeout(() => {
      blink();
      if (currentState === 'possessed' && Math.random() < 0.35) possessBurst();
      autoBlink();
    }, delay);
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
      // ignore connection failures
    }
  };

  window.ChatEye = {
    receive,
    setState,
    blink,
    pulse,
    influence,
    getState: () => currentState,
    getMood: () => moodScore
  };

  setState('awake');
  setupTestMode();
  connectWebSocketBridge();
  randomDrift();
  autoBlink();

  setInterval(() => {
    if (currentState === 'agitated' && Math.random() < 0.5) glance();
    if (currentState === 'fond' && Math.random() < 0.34) pulse();
    if (currentState === 'possessed' && Math.random() < 0.48) possessBurst();
  }, 1800);
})();
