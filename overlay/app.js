(function () {
  const shell = document.getElementById('pet-shell');
  const dogFace = document.getElementById('dog-face');
  const overlayRoot = document.getElementById('overlay-root');

  const STATE_CLASS = {
    awakened: 'state-awakened',
    overgrown: 'state-overgrown',
    corrupted: 'state-corrupted',
    rotten: 'state-rotten'
  };

  const EXPRESSION_CLASS = ['expression-tired', 'expression-sick', 'expression-zombified', 'expression-true-zombie'];
  const EXPRESSION_SEQUENCE = {
    awakened: [],
    overgrown: ['expression-tired'],
    corrupted: ['expression-tired', 'expression-sick', 'expression-zombified'],
    rotten: ['expression-sick', 'expression-zombified', 'expression-true-zombie']
  };

  let corruptionScore = 0;
  let expressionTimer = null;
  let expressionIndex = 0;

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
    chatState.textContent = `${stateName[0].toUpperCase()}${stateName.slice(1)} • ${corruptionScore}`;
  };

  const clearExpressions = () => {
    EXPRESSION_CLASS.forEach((name) => shell.classList.remove(name));
  };

  const applyExpressionCycle = (state) => {
    if (expressionTimer) {
      clearInterval(expressionTimer);
      expressionTimer = null;
    }

    clearExpressions();
    expressionIndex = 0;
    const sequence = EXPRESSION_SEQUENCE[state] || [];

    if (!sequence.length) {
      return;
    }

    const paint = () => {
      clearExpressions();
      shell.classList.add(sequence[expressionIndex % sequence.length]);
      expressionIndex += 1;
    };

    paint();
    expressionTimer = setInterval(paint, state === 'rotten' ? 1100 : 1600);
  };

  const setVisualState = (state) => {
    const resolvedState = STATE_CLASS[state] ? state : 'awakened';
    Object.values(STATE_CLASS).forEach((className) => shell.classList.remove(className));
    shell.classList.add(STATE_CLASS[resolvedState]);
    if (overlayRoot) overlayRoot.dataset.petState = resolvedState;
    applyExpressionCycle(resolvedState);
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
    setTimeout(() => shell.classList.remove('twitch'), 280);
  };

  const bloom = () => {
    shell.classList.remove('bloom');
    shell.classList.add('bloom');
    setTimeout(() => shell.classList.remove('bloom'), 420);
  };

  const look = (x, y) => {
    dogFace.style.transform = `translate(${x}px, ${y}px)`;
  };

  const randomHeadDrift = () => {
    const dx = (Math.random() - 0.5) * 6;
    const dy = (Math.random() - 0.5) * 3;
    look(dx, dy);
  };

  const lookLeft = () => look(-5, 0);
  const lookRight = () => look(5, 0);

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
        bloom();
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
      { user: 'ivyvoid', message: 'poison ivy is closing in 😵', action: 'corrupt', tone: 'corrupt' },
      { user: 'moonmoss', message: 'good dog, breathe slow', action: 'heal', tone: 'heal' },
      { user: 'nightowl', message: 'it looks tired now...', action: 'corrupt', tone: 'corrupt' },
      { user: 'fernfriend', message: 'zombie pup incoming!', action: 'corrupt', tone: 'corrupt' },
      { user: 'modbot', message: 'revive pup', action: 'reset', tone: 'reset' }
    ];

    let idx = 0;
    setInterval(() => {
      const evt = script[idx % script.length];
      idx += 1;
      addChatLine(`${evt.user}: ${evt.message}`, evt.tone);
      applyAction(evt.action);
    }, 1900);
  };

  const stateAliases = {
    alive: 'awakened',
    alert: 'overgrown',
    zombified: 'rotten',
    happy: 'awakened',
    suffocating: 'rotten',
    truezombie: 'rotten'
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
      const resolvedState = stateAliases[normalized] || normalized;
      setVisualState(resolvedState);
      if (Object.prototype.hasOwnProperty.call(stateToScore, resolvedState)) {
        corruptionScore = stateToScore[resolvedState];
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
    getState: () => scoreToState(corruptionScore)
  };

  syncStateFromScore();

  if (chatSim) {
    chatSim.hidden = false;
    simulateChat();
  }

  const scheduleBlink = () => {
    const nextBlinkIn = 2400 + Math.random() * 3200;
    setTimeout(() => {
      blink();
      scheduleBlink();
    }, nextBlinkIn);
  };

  setInterval(randomHeadDrift, 1400);
  scheduleBlink();
  connectWebSocketBridge();

  setInterval(() => {
    if (Math.random() < 0.18) {
      twitch();
    }
  }, 2800);
})();
