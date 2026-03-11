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

  const stateAliases = {
    alive: 'awakened',
    alert: 'overgrown',
    zombified: 'rotten',
    ombified: 'rotten',
    zombie: 'rotten'
  };

  const emotionAliases = {
    calm: 'neutral',
    puppy: 'happy',
    puppyeye: 'happy',
    puppy_eyes: 'happy',
    affectionate: 'happy',
    hostile: 'angry',
    disturbed: 'afraid',
    dead: 'empty',
    blank: 'empty'
  };

  const stateToScore = {
    awakened: 0,
    overgrown: 2,
    corrupted: 4,
    rotten: 6
  };

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

  const clampScore = (value) => Math.max(0, Math.min(10, value));
  const params = new URLSearchParams(window.location.search);
  const isTestMode = params.get('test') === '1' || params.get('mode') === 'test';

  const scoreToState = (score) => {
    if (score >= 6) return 'rotten';
    if (score >= 4) return 'corrupted';
    if (score >= 2) return 'overgrown';
    return 'awakened';
  };

  const updateStateLabel = () => {
    if (chatState) {
      const emotionName = currentEmotion === 'neutral' ? '' : ` • ${currentEmotion}`;
      chatState.textContent = `${currentState[0].toUpperCase()}${currentState.slice(1)} • ${corruptionScore}${emotionName}`;
    }

    if (!isTestMode || !testLabel) return;
    labelPhase.textContent = `phase: ${currentState}`;
    labelEmotion.textContent = `emotion: ${currentEmotion}`;
    labelBlink.textContent = `blink: ${currentBlinkType}`;
    labelShape.textContent = `shape: ${currentState}-${currentEmotion}`;
    labelAmbient.textContent = `ambient: ${ambientEnabled ? 'on' : 'off'}`;
  };

  const setVisualState = (state) => {
    const resolvedState = STATE_CLASS[state] ? state : 'awakened';
    Object.values(STATE_CLASS).forEach((className) => shell.classList.remove(className));
    Object.values(PHASE_MOTION_CLASS).forEach((className) => shell.classList.remove(className));
    shell.classList.add(STATE_CLASS[resolvedState]);
    shell.classList.add(PHASE_MOTION_CLASS[resolvedState]);
    currentState = resolvedState;
    if (overlayRoot) overlayRoot.dataset.eyeState = resolvedState;
  };

  const setEmotion = (emotion) => {
    const normalized = String(emotion || '').toLowerCase();
    const resolved = emotionAliases[normalized] || normalized;
    const resolvedEmotion = EMOTION_CLASS[resolved] ? resolved : 'neutral';
    Object.values(EMOTION_CLASS).forEach((className) => shell.classList.remove(className));
    shell.classList.add(EMOTION_CLASS[resolvedEmotion]);
    currentEmotion = resolvedEmotion;
    if (overlayRoot) overlayRoot.dataset.eyeEmotion = resolvedEmotion;
    updateStateLabel();
  };

  const setBlinkType = (type = 'normal') => {
    const resolved = BLINK_CLASS[type] ? type : 'normal';
    Object.values(BLINK_CLASS).forEach((className) => shell.classList.remove(className));
    shell.classList.add(BLINK_CLASS[resolved]);
    currentBlinkType = resolved;
    updateStateLabel();
  };

  const setAmbient = (enabled) => {
    ambientEnabled = !!enabled;
    shell.classList.toggle('ambient-off', !ambientEnabled);
    updateStateLabel();
  };

  const syncStateFromScore = () => {
    setVisualState(scoreToState(corruptionScore));
    updateStateLabel();
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

  const bloom = () => {
    shell.classList.remove('bloom');
    shell.classList.add('bloom');
    setTimeout(() => shell.classList.remove('bloom'), 440);
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
    const state = currentState;
    if (currentEmotion === 'happy') return { x: 3, y: 2, interval: 1650 };
    if (currentEmotion === 'afraid' || currentEmotion === 'bloodshot') return { x: 12, y: 9, interval: 500 };
    if (currentEmotion === 'alert' || currentEmotion === 'angry') return { x: 10, y: 4, interval: 720 };
    if (currentEmotion === 'sad' || currentEmotion === 'empty') return { x: 2, y: 1, interval: 2300 };
    if (state === 'rotten') return { x: 2.2, y: 1.1, interval: 2900 };
    if (state === 'corrupted') return { x: 9, y: 5, interval: 860 };
    if (state === 'overgrown') return { x: 6, y: 3, interval: 1300 };
    return { x: 5, y: 3, interval: 1500 };
  };

  const randomPupilDrift = () => {
    const profile = getDriftProfile();
    movePupil((Math.random() - 0.5) * profile.x, (Math.random() - 0.5) * profile.y);
    setTimeout(randomPupilDrift, profile.interval);
  };

  const setCombination = ({ state, emotion, blinkType, ambient, action }) => {
    if (state) {
      setVisualState(state);
      if (Object.prototype.hasOwnProperty.call(stateToScore, state)) {
        corruptionScore = stateToScore[state];
      }
    }
    if (emotion) setEmotion(emotion);
    if (typeof ambient === 'boolean') setAmbient(ambient);
    if (blinkType) setBlinkType(blinkType);
    updateStateLabel();
    if (action === 'blink') blink(blinkType || currentBlinkType);
    if (action === 'twitch') twitch();
    if (action === 'shudder') shudder();
  };

  const applyAction = (action) => {
    switch (action) {
      case 'blink':
        blink('normal');
        break;
      case 'halfBlink':
        blink('half');
        break;
      case 'heavyBlink':
        blink('heavy');
        break;
      case 'softBlink':
        blink('soft');
        break;
      case 'tenseBlink':
        blink('tense');
        break;
      case 'lookLeft':
        movePupil(-7, 0);
        break;
      case 'lookRight':
        movePupil(7, 0);
        break;
      case 'twitch':
        twitch();
        break;
      case 'shudder':
        shudder();
        break;
      case 'corrupt':
        corruptionScore = clampScore(corruptionScore + 1);
        syncStateFromScore();
        if (scoreToState(corruptionScore) === 'corrupted') setEmotion('bloodshot');
        twitch();
        break;
      case 'heal':
        corruptionScore = clampScore(corruptionScore - 1);
        syncStateFromScore();
        setEmotion('happy');
        if (Math.random() > 0.35) bloom();
        break;
      case 'reset':
        corruptionScore = 0;
        syncStateFromScore();
        setEmotion('neutral');
        setBlinkType('normal');
        bloom();
        blink('normal');
        break;
      default:
        break;
    }
  };

  const addChatLine = (text, tone = 'neutral') => {
    if (!chatFeed) return;
    const line = document.createElement('div');
    line.className = `chat-line${tone !== 'neutral' ? ` chat-line--${tone}` : ''}`;
    line.textContent = text;
    chatFeed.prepend(line);

    while (chatFeed.children.length > 4) {
      chatFeed.removeChild(chatFeed.lastElementChild);
    }
  };

  const simulateChat = () => {
    const script = [
      { user: 'spookylurker', message: 'ghost in the vines 👻', action: 'corrupt', tone: 'corrupt' },
      { user: 'moonmoss', message: 'you got this eye, stay calm', action: 'heal', tone: 'heal' },
      { user: 'nightowl', message: 'run run run', action: 'corrupt', tone: 'corrupt' },
      { user: 'fernfriend', message: 'gentle watcher, don\'t cry', action: 'heal', tone: 'heal' },
      { user: 'modbot', message: 'revive', action: 'reset', tone: 'reset' },
      { user: 'hauntchat', message: 'cursed gaze', action: 'corrupt', tone: 'corrupt' }
    ];

    let idx = 0;
    setInterval(() => {
      const evt = script[idx % script.length];
      idx += 1;
      addChatLine(`${evt.user}: ${evt.message}`, evt.tone);
      applyAction(evt.action);
    }, 1800);
  };

  const demoSequence = [
    { state: 'awakened', emotion: 'neutral', blinkType: 'normal', ambient: true, action: 'blink', hold: 1600 },
    { state: 'awakened', emotion: 'happy', blinkType: 'soft', ambient: true, action: 'blink', hold: 1700 },
    { state: 'overgrown', emotion: 'neutral', blinkType: 'soft', ambient: true, action: 'blink', hold: 1600 },
    { state: 'overgrown', emotion: 'happy', blinkType: 'soft', ambient: true, action: 'blink', hold: 1700 },
    { state: 'overgrown', emotion: 'alert', blinkType: 'normal', ambient: true, action: 'blink', hold: 1700 },
    { state: 'corrupted', emotion: 'angry', blinkType: 'tense', ambient: true, action: 'twitch', hold: 1750 },
    { state: 'corrupted', emotion: 'afraid', blinkType: 'tense', ambient: true, action: 'blink', hold: 1700 },
    { state: 'corrupted', emotion: 'bloodshot', blinkType: 'tense', ambient: true, action: 'twitch', hold: 1750 },
    { state: 'rotten', emotion: 'empty', blinkType: 'heavy', ambient: true, action: 'shudder', hold: 2100 },
    { state: 'rotten', emotion: 'sad', blinkType: 'heavy', ambient: true, action: 'blink', hold: 2100 },
    { state: 'rotten', emotion: 'afraid', blinkType: 'heavy', ambient: true, action: 'shudder', hold: 2200 }
  ];

  const stopDemo = () => {
    if (demoTimer) {
      clearTimeout(demoTimer);
      demoTimer = null;
    }
  };

  const runDemoStep = () => {
    const step = demoSequence[demoIndex % demoSequence.length];
    demoIndex += 1;
    setCombination(step);
    demoTimer = setTimeout(runDemoStep, step.hold || 1700);
  };

  const toggleDemo = () => {
    if (demoTimer) {
      stopDemo();
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
        if (act === 'ambient') setAmbient(!ambientEnabled);
        if (act === 'demo') toggleDemo();
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
      if (key === 'm') setAmbient(!ambientEnabled);
      if (key === 'p') toggleDemo();
    });

    toggleDemo();
  };

  const receive = (payload) => {
    if (!payload || typeof payload !== 'object') return;

    if (payload.type === 'action' && typeof payload.action === 'string') {
      applyAction(payload.action);
      return;
    }

    if (payload.type === 'setScore' && Number.isFinite(payload.value)) {
      corruptionScore = clampScore(payload.value);
      syncStateFromScore();
      return;
    }

    if (payload.type === 'setEmotion' && typeof payload.emotion === 'string') {
      setEmotion(payload.emotion);
      return;
    }

    if (payload.type === 'setBlink' && typeof payload.blink === 'string') {
      blink(payload.blink);
      return;
    }

    if (payload.type === 'setAmbient' && typeof payload.enabled === 'boolean') {
      setAmbient(payload.enabled);
      return;
    }

    if (payload.type === 'setState' && typeof payload.state === 'string') {
      const normalized = payload.state.toLowerCase();
      const resolvedState = stateAliases[normalized] || normalized;
      setVisualState(resolvedState);
      if (Object.prototype.hasOwnProperty.call(stateToScore, resolvedState)) {
        corruptionScore = stateToScore[resolvedState];
      }
      if (typeof payload.emotion === 'string') setEmotion(payload.emotion);
      if (typeof payload.blink === 'string') setBlinkType(payload.blink);
      updateStateLabel();
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
          // Ignore malformed payloads.
        }
      });
    } catch (_error) {
      // Ignore websocket bootstrap failures.
    }
  };

  window.ChatEye = {
    receive,
    getScore: () => corruptionScore,
    getState: () => currentState,
    getEmotion: () => currentEmotion,
    setCombination,
    toggleDemo
  };

  syncStateFromScore();
  setEmotion('neutral');
  setBlinkType('normal');
  setAmbient(true);

  if (!isTestMode && chatSim) {
    chatSim.hidden = false;
    simulateChat();
  }

  const scheduleBlink = () => {
    const ranges = {
      awakened: [2900, 5200],
      overgrown: [2200, 4200],
      corrupted: [1600, 3000],
      rotten: [4200, 7600]
    };

    const [min, max] = ranges[currentState] || ranges.awakened;
    const weighted = currentEmotion === 'empty'
      ? 4500 + Math.random() * 6200
      : min + Math.random() * (max - min);

    setTimeout(() => {
      if (!isTestMode || !demoTimer) blink(currentBlinkType);
      scheduleBlink();
    }, weighted);
  };

  randomPupilDrift();
  scheduleBlink();
  connectWebSocketBridge();
  setupTestMode();

  setInterval(() => {
    if (!ambientEnabled) return;
    const twitchChance = currentState === 'corrupted' ? 0.38 : currentState === 'rotten' ? 0.12 : 0.06;
    if (Math.random() < twitchChance) twitch();
    if (currentState === 'rotten' && Math.random() < 0.28) shudder();
  }, 3000);
})();
