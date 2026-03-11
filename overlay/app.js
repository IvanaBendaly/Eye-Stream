(function () {
  const shell = document.getElementById('eye-shell');
  const overlayRoot = document.getElementById('overlay-root');

  const STATE_CLASS = {
    awakened: 'state-awakened',
    overgrown: 'state-overgrown',
    corrupted: 'state-corrupted',
    rotten: 'state-rotten'
  };

  const EMOTION_CLASS = {
    neutral: 'emotion-neutral',
    happy: 'emotion-happy',
    sad: 'emotion-sad',
    alert: 'emotion-alert',
    angry: 'emotion-angry',
    afraid: 'emotion-afraid',
    empty: 'emotion-empty'
  };

  const stateAliases = {
    alive: 'awakened',
    alert: 'overgrown',
    zombified: 'rotten',
    ombified: 'rotten',
    zombie: 'rotten'
  };

  const emotionAliases = {
    puppy: 'happy',
    puppyeye: 'happy',
    puppy_eyes: 'happy',
    affectionate: 'happy',
    hostile: 'angry',
    disturbed: 'afraid',
    dead: 'empty',
    blank: 'empty'
  };

  let corruptionScore = 0;
  let currentEmotion = 'neutral';

  const chatSim = document.getElementById('chat-sim');
  const chatFeed = document.getElementById('chat-feed');
  const chatState = document.getElementById('chat-state');

  const clampScore = (value) => Math.max(0, Math.min(10, value));

  const scoreToState = (score) => {
    if (score >= 6) return 'rotten';
    if (score >= 4) return 'corrupted';
    if (score >= 2) return 'overgrown';
    return 'awakened';
  };

  const stateToScore = {
    awakened: 0,
    overgrown: 2,
    corrupted: 4,
    rotten: 6
  };

  const updateStateLabel = () => {
    if (!chatState) return;
    const stateName = scoreToState(corruptionScore);
    const emotionName = currentEmotion === 'neutral' ? '' : ` • ${currentEmotion}`;
    chatState.textContent = `${stateName[0].toUpperCase()}${stateName.slice(1)} • ${corruptionScore}${emotionName}`;
  };

  const setVisualState = (state) => {
    const resolvedState = STATE_CLASS[state] ? state : 'awakened';
    Object.values(STATE_CLASS).forEach((className) => shell.classList.remove(className));
    shell.classList.add(STATE_CLASS[resolvedState]);
    if (overlayRoot) overlayRoot.dataset.eyeState = resolvedState;
  };

  const setEmotion = (emotion) => {
    const normalized = String(emotion || '').toLowerCase();
    const resolvedEmotion = EMOTION_CLASS[emotionAliases[normalized] || normalized] ? (emotionAliases[normalized] || normalized) : 'neutral';
    Object.values(EMOTION_CLASS).forEach((className) => shell.classList.remove(className));
    shell.classList.add(EMOTION_CLASS[resolvedEmotion]);
    currentEmotion = resolvedEmotion;
    if (overlayRoot) overlayRoot.dataset.eyeEmotion = resolvedEmotion;
    updateStateLabel();
  };

  const syncStateFromScore = () => {
    setVisualState(scoreToState(corruptionScore));
    updateStateLabel();
  };

  const blink = () => {
    shell.classList.remove('blinking');
    shell.classList.add('blinking');
    setTimeout(() => shell.classList.remove('blinking'), 220);
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
    const state = scoreToState(corruptionScore);
    if (currentEmotion === 'happy') return { x: 3, y: 2, interval: 1600 };
    if (currentEmotion === 'afraid') return { x: 12, y: 9, interval: 500 };
    if (currentEmotion === 'alert' || currentEmotion === 'angry') return { x: 10, y: 4, interval: 720 };
    if (currentEmotion === 'sad' || currentEmotion === 'empty') return { x: 2, y: 1, interval: 2300 };
    if (state === 'rotten') return { x: 2.6, y: 1.5, interval: 2600 };
    if (state === 'corrupted') return { x: 9, y: 5, interval: 860 };
    if (state === 'overgrown') return { x: 6, y: 3, interval: 1300 };
    return { x: 5, y: 3, interval: 1500 };
  };

  const randomPupilDrift = () => {
    const profile = getDriftProfile();
    const dx = (Math.random() - 0.5) * profile.x;
    const dy = (Math.random() - 0.5) * profile.y;
    movePupil(dx, dy);
    setTimeout(randomPupilDrift, profile.interval);
  };

  const lookLeft = () => movePupil(-7, 0);
  const lookRight = () => movePupil(7, 0);

  const applyAction = (action) => {
    switch (action) {
      case 'blink':
        blink();
        break;
      case 'lookLeft':
        lookLeft();
        break;
      case 'lookRight':
        lookRight();
        break;
      case 'corrupt':
        corruptionScore = clampScore(corruptionScore + 1);
        syncStateFromScore();
        if (scoreToState(corruptionScore) === 'corrupted') setEmotion('afraid');
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
        bloom();
        blink();
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

  const receive = (payload) => {
    if (!payload || typeof payload !== 'object') {
      return;
    }

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

    if (payload.type === 'setState' && typeof payload.state === 'string') {
      const normalized = payload.state.toLowerCase();
      const resolvedState = stateAliases[normalized] || normalized;
      setVisualState(resolvedState);
      if (Object.prototype.hasOwnProperty.call(stateToScore, resolvedState)) {
        corruptionScore = stateToScore[resolvedState];
      }
      if (typeof payload.emotion === 'string') {
        setEmotion(payload.emotion);
      }
      updateStateLabel();
    }
  };

  const connectWebSocketBridge = () => {
    const params = new URLSearchParams(window.location.search);
    const wsUrl = params.get('ws');
    if (!wsUrl) {
      return;
    }

    try {
      const socket = new WebSocket(wsUrl);
      socket.addEventListener('message', (event) => {
        try {
          const payload = JSON.parse(event.data);
          receive(payload);
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
    getState: () => scoreToState(corruptionScore),
    getEmotion: () => currentEmotion
  };

  syncStateFromScore();
  setEmotion('neutral');

  if (chatSim) {
    chatSim.hidden = false;
    simulateChat();
  }

  const scheduleBlink = () => {
    const state = scoreToState(corruptionScore);
    const weighted = state === 'rotten' || currentEmotion === 'empty'
      ? 3800 + Math.random() * 5200
      : 2400 + Math.random() * 3400;

    setTimeout(() => {
      blink();
      scheduleBlink();
    }, weighted);
  };

  randomPupilDrift();
  scheduleBlink();
  connectWebSocketBridge();

  setInterval(() => {
    const state = scoreToState(corruptionScore);
    const twitchChance = state === 'corrupted' ? 0.38 : state === 'rotten' ? 0.12 : 0.06;
    if (Math.random() < twitchChance) {
      twitch();
    }

    if (state === 'rotten' && Math.random() < 0.28) {
      shudder();
    }
  }, 3000);
})();
