(function () {
  const shell = document.getElementById('eye-shell');
  const overlayRoot = document.getElementById('overlay-root');

  const STATE_CLASS = {
    awakened: 'state-awakened',
    overgrown: 'state-overgrown',
    corrupted: 'state-corrupted',
    rotten: 'state-rotten'
  };

  const PHASE_MOTION_CLASS = {
    awakened: 'phase-awakened',
    overgrown: 'phase-overgrown',
    corrupted: 'phase-corrupted',
    rotten: 'phase-rotten'
  };

  const EMOTION_CLASS = {
    neutral: 'emotion-neutral',
    happy: 'emotion-happy',
    sad: 'emotion-sad',
    alert: 'emotion-alert',
    angry: 'emotion-angry',
    afraid: 'emotion-afraid',
    empty: 'emotion-empty',
    bloodshot: 'emotion-bloodshot'
  };

  const BLINK_CLASS = {
    normal: 'blink-normal',
    soft: 'blink-soft',
    half: 'blink-half',
    tense: 'blink-tense',
    heavy: 'blink-heavy'
  };

  const VARIANT_CLASS = {
    bloodshot: 'variant-bloodshot',
    bleeding: 'variant-bleeding',
    zombified: 'variant-zombified',
    decay: 'variant-heavy-decay',
    glow: 'variant-soft-glow'
  };

  const stateAliases = {
    alive: 'awakened',
    zombie: 'rotten',
    zombified: 'rotten'
  };

  const emotionAliases = {
    calm: 'neutral',
    puppy: 'happy',
    puppyeye: 'happy',
    hostile: 'angry',
    dead: 'empty',
    blank: 'empty'
  };

  const stateToScore = { awakened: 0, overgrown: 2, corrupted: 4, rotten: 6 };

  const testUi = document.getElementById('test-ui');
  const testLabel = document.getElementById('test-label');
  const labelPhase = document.getElementById('label-phase');
  const labelEmotion = document.getElementById('label-emotion');
  const labelBlink = document.getElementById('label-blink');
  const labelShape = document.getElementById('label-shape');
  const labelAmbient = document.getElementById('label-ambient');

  const chatSim = document.getElementById('chat-sim');
  const chatFeed = document.getElementById('chat-feed');
  const chatState = document.getElementById('chat-state');

  let corruptionScore = 0;
  let currentEmotion = 'neutral';
  let currentState = 'awakened';
  let currentBlinkType = 'normal';
  let ambientEnabled = true;
  let demoTimer = null;
  let demoIndex = 0;
  const activeVariants = new Set(['glow']);

  const params = new URLSearchParams(window.location.search);
  const isTestMode = params.get('test') === '1' || params.get('mode') === 'test';

  const updateStateLabel = () => {
    if (chatState) {
      const variantText = activeVariants.size ? ` • ${Array.from(activeVariants).join('+')}` : '';
      chatState.textContent = `${currentState} • ${currentEmotion}${variantText}`;
    }
    if (!isTestMode || !testLabel) return;
    labelPhase.textContent = `phase:${currentState}`;
    labelEmotion.textContent = `emo:${currentEmotion}`;
    labelBlink.textContent = `blink:${currentBlinkType}`;
    labelShape.textContent = `shape:${currentState}-${currentEmotion}`;
    labelAmbient.textContent = `amb:${ambientEnabled ? 'on' : 'off'} • ${Array.from(activeVariants).join(',') || 'base'}`;
  };

  const setVisualState = (state) => {
    const resolved = STATE_CLASS[state] ? state : 'awakened';
    Object.values(STATE_CLASS).forEach((c) => shell.classList.remove(c));
    Object.values(PHASE_MOTION_CLASS).forEach((c) => shell.classList.remove(c));
    shell.classList.add(STATE_CLASS[resolved]);
    shell.classList.add(PHASE_MOTION_CLASS[resolved]);
    currentState = resolved;
    overlayRoot.dataset.eyeState = resolved;
  };

  const setEmotion = (emotion) => {
    const normalized = String(emotion || '').toLowerCase();
    const resolved = emotionAliases[normalized] || normalized;
    const finalEmotion = EMOTION_CLASS[resolved] ? resolved : 'neutral';
    Object.values(EMOTION_CLASS).forEach((c) => shell.classList.remove(c));
    shell.classList.add(EMOTION_CLASS[finalEmotion]);
    currentEmotion = finalEmotion;
    overlayRoot.dataset.eyeEmotion = finalEmotion;
  };

  const setBlinkType = (type = 'normal') => {
    const resolved = BLINK_CLASS[type] ? type : 'normal';
    Object.values(BLINK_CLASS).forEach((c) => shell.classList.remove(c));
    shell.classList.add(BLINK_CLASS[resolved]);
    currentBlinkType = resolved;
  };

  const setVariants = (variants = []) => {
    activeVariants.clear();
    variants.forEach((name) => {
      if (VARIANT_CLASS[name]) activeVariants.add(name);
    });
    Object.values(VARIANT_CLASS).forEach((c) => shell.classList.remove(c));
    Array.from(activeVariants).forEach((v) => shell.classList.add(VARIANT_CLASS[v]));
  };

  const toggleVariant = (name) => {
    if (!VARIANT_CLASS[name]) return;
    if (activeVariants.has(name)) activeVariants.delete(name);
    else activeVariants.add(name);
    setVariants(Array.from(activeVariants));
  };

  const setAmbient = (enabled) => {
    ambientEnabled = !!enabled;
    shell.classList.toggle('ambient-off', !ambientEnabled);
  };

  const blink = (type = currentBlinkType) => {
    setBlinkType(type);
    shell.classList.remove('blinking');
    shell.classList.add('blinking');
    const cssDuration = Number.parseFloat(getComputedStyle(shell).getPropertyValue('--blink-duration')) || 220;
    setTimeout(() => shell.classList.remove('blinking'), cssDuration + 40);
  };

  const twitch = () => {
    shell.classList.remove('twitch');
    shell.classList.add('twitch');
    setTimeout(() => shell.classList.remove('twitch'), 320);
  };

  const shudder = () => {
    shell.classList.remove('shudder');
    shell.classList.add('shudder');
    setTimeout(() => shell.classList.remove('shudder'), 900);
  };

  const movePupil = (x, y) => {
    shell.style.setProperty('--look-x', `${x}px`);
    shell.style.setProperty('--look-y', `${y}px`);
  };

  const getDriftProfile = () => {
    if (currentEmotion === 'happy') return { x: 3, y: 2, interval: 1700 };
    if (currentEmotion === 'afraid') return { x: 12, y: 9, interval: 520 };
    if (currentEmotion === 'alert' || currentEmotion === 'angry') return { x: 10, y: 4, interval: 700 };
    if (currentEmotion === 'sad' || currentEmotion === 'empty') return { x: 2, y: 1, interval: 2400 };
    if (currentState === 'rotten') return { x: 2, y: 1, interval: 3000 };
    if (currentState === 'corrupted') return { x: 9, y: 5, interval: 850 };
    return { x: 5, y: 3, interval: 1400 };
  };

  const randomPupilDrift = () => {
    const p = getDriftProfile();
    movePupil((Math.random() - 0.5) * p.x, (Math.random() - 0.5) * p.y);
    setTimeout(randomPupilDrift, p.interval);
  };

  const setCombination = ({ state, emotion, blinkType, ambient, variants, action }) => {
    if (state) {
      setVisualState(state);
      if (Object.prototype.hasOwnProperty.call(stateToScore, state)) corruptionScore = stateToScore[state];
    }
    if (emotion) setEmotion(emotion);
    if (blinkType) setBlinkType(blinkType);
    if (Array.isArray(variants)) setVariants(variants);
    if (typeof ambient === 'boolean') setAmbient(ambient);
    if (action === 'blink') blink(blinkType || currentBlinkType);
    if (action === 'twitch') twitch();
    if (action === 'shudder') shudder();
    updateStateLabel();
  };

  const applyAction = (action) => {
    if (action === 'blink') blink('normal');
    if (action === 'softBlink') blink('soft');
    if (action === 'halfBlink') blink('half');
    if (action === 'tenseBlink') blink('tense');
    if (action === 'heavyBlink') blink('heavy');
    if (action === 'twitch') twitch();
    if (action === 'shudder') shudder();
    if (action === 'toggleAmbient') setAmbient(!ambientEnabled);
    if (action === 'toggleBleeding') toggleVariant('bleeding');
    if (action === 'toggleBloodshot') toggleVariant('bloodshot');
    updateStateLabel();
  };

  const addChatLine = (text, tone = 'neutral') => {
    if (!chatFeed) return;
    const line = document.createElement('div');
    line.className = `chat-line${tone !== 'neutral' ? ` chat-line--${tone}` : ''}`;
    line.textContent = text;
    chatFeed.prepend(line);
    while (chatFeed.children.length > 4) chatFeed.removeChild(chatFeed.lastElementChild);
  };

  const simulateChat = () => {
    const script = [
      { user: 'gentlefern', message: 'you are safe, bloom softly', combo: { state: 'awakened', emotion: 'neutral', blinkType: 'soft', variants: ['glow'], ambient: true, action: 'blink' }, tone: 'heal' },
      { user: 'moonpetal', message: 'cute watcher, puppy eyes please', combo: { state: 'awakened', emotion: 'happy', blinkType: 'soft', variants: ['glow'], ambient: true, action: 'blink' }, tone: 'heal' },
      { user: 'vinescout', message: 'look behind, focus now, stay awake', combo: { state: 'overgrown', emotion: 'alert', blinkType: 'normal', variants: ['glow'], ambient: true, action: 'blink' }, tone: 'neutral' },
      { user: 'mosschoir', message: 'lush energy, grow, bloom', combo: { state: 'overgrown', emotion: 'happy', blinkType: 'soft', variants: ['glow'], ambient: true, action: 'blink' }, tone: 'heal' },
      { user: 'hexcrow', message: 'cursed ghost hunt decay', combo: { state: 'corrupted', emotion: 'angry', blinkType: 'tense', variants: ['bloodshot'], ambient: true, action: 'twitch' }, tone: 'corrupt' },
      { user: 'bleakling', message: 'blood hurt pain wounded eye', combo: { state: 'corrupted', emotion: 'afraid', blinkType: 'tense', variants: ['bloodshot', 'bleeding'], ambient: true, action: 'twitch' }, tone: 'corrupt' },
      { user: 'hollowbell', message: 'undead corpse rotten hollow', combo: { state: 'rotten', emotion: 'empty', blinkType: 'heavy', variants: ['bloodshot', 'bleeding', 'zombified', 'decay'], ambient: true, action: 'shudder' }, tone: 'corrupt' },
      { user: 'gravebot', message: 'revive then watch', combo: { state: 'rotten', emotion: 'sad', blinkType: 'heavy', variants: ['decay'], ambient: true, action: 'blink' }, tone: 'reset' },
      { user: 'modlight', message: 'okay breathe calm gentle love', combo: { state: 'awakened', emotion: 'neutral', blinkType: 'soft', variants: ['glow'], ambient: true, action: 'blink' }, tone: 'heal' }
    ];

    let idx = 0;
    setInterval(() => {
      const evt = script[idx % script.length];
      idx += 1;
      addChatLine(`${evt.user}: ${evt.message}`, evt.tone);
      setCombination(evt.combo);
    }, 2100);
  };

  const demoSequence = [
    { state: 'awakened', emotion: 'neutral', blinkType: 'normal', variants: ['glow'], ambient: true, action: 'blink', hold: 1800 },
    { state: 'awakened', emotion: 'happy', blinkType: 'soft', variants: ['glow'], ambient: true, action: 'blink', hold: 1900 },
    { state: 'overgrown', emotion: 'happy', blinkType: 'soft', variants: ['glow'], ambient: true, action: 'blink', hold: 1900 },
    { state: 'overgrown', emotion: 'alert', blinkType: 'normal', variants: ['glow'], ambient: true, action: 'blink', hold: 1900 },
    { state: 'corrupted', emotion: 'angry', blinkType: 'tense', variants: ['bloodshot'], ambient: true, action: 'twitch', hold: 2000 },
    { state: 'corrupted', emotion: 'afraid', blinkType: 'tense', variants: ['bloodshot', 'bleeding'], ambient: true, action: 'twitch', hold: 2050 },
    { state: 'corrupted', emotion: 'angry', blinkType: 'half', variants: ['bloodshot', 'bleeding', 'decay'], ambient: false, action: 'twitch', hold: 2100 },
    { state: 'rotten', emotion: 'sad', blinkType: 'heavy', variants: ['decay', 'zombified'], ambient: true, action: 'blink', hold: 2200 },
    { state: 'rotten', emotion: 'empty', blinkType: 'heavy', variants: ['bloodshot', 'bleeding', 'zombified', 'decay'], ambient: true, action: 'shudder', hold: 2300 },
    { state: 'rotten', emotion: 'bloodshot', blinkType: 'heavy', variants: ['bloodshot', 'bleeding', 'zombified', 'decay'], ambient: true, action: 'shudder', hold: 2300 },
    { state: 'rotten', emotion: 'empty', blinkType: 'heavy', variants: ['bloodshot', 'bleeding', 'zombified', 'decay'], ambient: true, action: 'blink', hold: 2400 }
  ];

  const runDemoStep = () => {
    const step = demoSequence[demoIndex % demoSequence.length];
    demoIndex += 1;
    setCombination(step);
    demoTimer = setTimeout(runDemoStep, step.hold || 1800);
  };

  const toggleDemo = () => {
    if (demoTimer) {
      clearTimeout(demoTimer);
      demoTimer = null;
      return;
    }
    demoIndex = 0;
    runDemoStep();
  };

  const setupTestMode = () => {
    if (!isTestMode) return;
    overlayRoot.dataset.mode = 'test';
    if (testUi) testUi.hidden = false;
    if (testLabel) testLabel.hidden = false;
    if (chatSim) chatSim.hidden = true;

    const btns = testUi ? testUi.querySelectorAll('button') : [];
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        const val = btn.dataset.value;
        if (act === 'phase') setCombination({ state: val });
        if (act === 'emotion') setCombination({ emotion: val });
        if (act === 'blink') blink(val);
        if (act === 'action') applyAction(val);
        if (act === 'variant') toggleVariant(val);
        if (act === 'ambient') setAmbient(!ambientEnabled);
        if (act === 'demo') toggleDemo();
        updateStateLabel();
      });
    });

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (key === '1') setCombination({ state: 'awakened' });
      if (key === '2') setCombination({ state: 'overgrown' });
      if (key === '3') setCombination({ state: 'corrupted' });
      if (key === '4') setCombination({ state: 'rotten' });
      if (key === 'q') setCombination({ emotion: 'neutral' });
      if (key === 'w') setCombination({ emotion: 'happy' });
      if (key === 'e') setCombination({ emotion: 'alert' });
      if (key === 'r') setCombination({ emotion: 'angry' });
      if (key === 'a') setCombination({ emotion: 'afraid' });
      if (key === 's') setCombination({ emotion: 'sad' });
      if (key === 'd') setCombination({ emotion: 'empty' });
      if (key === 'f') setCombination({ emotion: 'bloodshot' });
      if (key === 'b') blink('normal');
      if (key === 'h') blink('half');
      if (key === 'j') blink('heavy');
      if (key === 'k') blink('tense');
      if (key === 'l') blink('soft');
      if (key === 't') applyAction('twitch');
      if (key === 'y') applyAction('shudder');
      if (key === 'u') toggleVariant('bloodshot');
      if (key === 'i') toggleVariant('bleeding');
      if (key === 'o') toggleVariant('zombified');
      if (key === 'g') toggleVariant('glow');
      if (key === 'm') setAmbient(!ambientEnabled);
      if (key === 'p') toggleDemo();
      updateStateLabel();
    });

    toggleDemo();
  };

  const receive = (payload) => {
    if (!payload || typeof payload !== 'object') return;
    if (payload.type === 'action' && typeof payload.action === 'string') return applyAction(payload.action);
    if (payload.type === 'setScore' && Number.isFinite(payload.value)) {
      corruptionScore = Math.max(0, Math.min(10, payload.value));
      const derived = corruptionScore >= 6 ? 'rotten' : corruptionScore >= 4 ? 'corrupted' : corruptionScore >= 2 ? 'overgrown' : 'awakened';
      setVisualState(derived);
      return updateStateLabel();
    }
    if (payload.type === 'setEmotion' && typeof payload.emotion === 'string') return setCombination({ emotion: payload.emotion });
    if (payload.type === 'setBlink' && typeof payload.blink === 'string') return blink(payload.blink);
    if (payload.type === 'setAmbient' && typeof payload.enabled === 'boolean') return setAmbient(payload.enabled);
    if (payload.type === 'setState' && typeof payload.state === 'string') {
      const resolvedState = stateAliases[payload.state.toLowerCase()] || payload.state.toLowerCase();
      return setCombination({ state: resolvedState, emotion: payload.emotion, blinkType: payload.blink, variants: payload.variants });
    }
  };

  const connectWebSocketBridge = () => {
    const wsUrl = params.get('ws');
    if (!wsUrl) return;
    try {
      const socket = new WebSocket(wsUrl);
      socket.addEventListener('message', (event) => {
        try { receive(JSON.parse(event.data)); } catch (_error) { /* ignore */ }
      });
    } catch (_error) { /* ignore */ }
  };

  window.ChatEye = {
    receive,
    getScore: () => corruptionScore,
    getState: () => currentState,
    getEmotion: () => currentEmotion,
    setCombination,
    toggleDemo
  };

  setCombination({ state: 'awakened', emotion: 'neutral', blinkType: 'normal', variants: ['glow'], ambient: true });

  if (!isTestMode && chatSim) {
    chatSim.hidden = false;
    simulateChat();
  }

  const scheduleBlink = () => {
    const ranges = { awakened: [3000, 5600], overgrown: [2400, 4300], corrupted: [1500, 2900], rotten: [4300, 7600] };
    const [min, max] = ranges[currentState] || ranges.awakened;
    const wait = currentEmotion === 'empty' ? 4800 + Math.random() * 6200 : min + Math.random() * (max - min);
    setTimeout(() => {
      if (!isTestMode || !demoTimer) blink(currentBlinkType);
      scheduleBlink();
    }, wait);
  };

  randomPupilDrift();
  scheduleBlink();
  connectWebSocketBridge();
  setupTestMode();

  setInterval(() => {
    if (!ambientEnabled) return;
    const twitchChance = currentState === 'corrupted' ? 0.4 : currentState === 'rotten' ? 0.16 : 0.07;
    if (Math.random() < twitchChance) twitch();
    if (currentState === 'rotten' && Math.random() < 0.3) shudder();
    if (currentState === 'corrupted' && Math.random() < 0.2) toggleVariant('bloodshot');
  }, 2900);
})();
