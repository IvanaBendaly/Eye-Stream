(function () {
  const shell = document.getElementById('eye-shell');
  const pupil = document.getElementById('pupil');

  const STATE_CLASS = {
    awakened: 'state-awakened',
    overgrown: 'state-overgrown',
    corrupted: 'state-corrupted',
    rotten: 'state-rotten'
  };

  let corruptionScore = 0;

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

  const updateStateLabel = () => {
    if (!chatState) return;
    const stateName = scoreToState(corruptionScore);
    chatState.textContent = `${stateName[0].toUpperCase()}${stateName.slice(1)} • ${corruptionScore}`;
  };

  const setVisualState = (state) => {
    Object.values(STATE_CLASS).forEach((className) => shell.classList.remove(className));
    shell.classList.add(STATE_CLASS[state] || STATE_CLASS.awakened);
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

  const movePupil = (x, y) => {
    pupil.style.transform = `translate(${x}px, ${y}px)`;
  };

  const randomPupilDrift = () => {
    const dx = (Math.random() - 0.5) * 10;
    const dy = (Math.random() - 0.5) * 6;
    movePupil(dx, dy);
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
        twitch();
        break;
      case 'heal':
        corruptionScore = clampScore(corruptionScore - 1);
        syncStateFromScore();
        if (Math.random() > 0.35) bloom();
        break;
      case 'reset':
        corruptionScore = 0;
        syncStateFromScore();
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
      { user: 'fernfriend', message: 'cute little watcher 🌿', action: 'heal', tone: 'heal' },
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

  const stateAliases = {
    alive: 'awakened',
    alert: 'overgrown',
    zombified: 'rotten'
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

    if (payload.type === 'setState' && typeof payload.state === 'string') {
      const normalized = payload.state.toLowerCase();
      setVisualState(stateAliases[normalized] || normalized);
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
    getState: () => scoreToState(corruptionScore)
  };

  syncStateFromScore();

  if (chatSim) {
    chatSim.hidden = false;
    simulateChat();
  }

  const scheduleBlink = () => {
    const nextBlinkIn = 2500 + Math.random() * 3700;
    setTimeout(() => {
      blink();
      scheduleBlink();
    }, nextBlinkIn);
  };

  setInterval(randomPupilDrift, 1500);
  scheduleBlink();
  connectWebSocketBridge();

  setInterval(() => {
    if (Math.random() < 0.15) {
      twitch();
    }
  }, 3000);
})();
