(function () {
  const shell = document.getElementById('ivy-shell');

  const STATE_CLASS = {
    sprout: 'state-sprout',
    growing: 'state-growing',
    wilted: 'state-wilted',
    blooming: 'state-blooming'
  };

  let growthScore = 0;

  const clampScore = (value) => Math.max(0, Math.min(10, value));

  const scoreToState = (score) => {
    if (score >= 6) return 'wilted';
    if (score >= 4) return 'growing';
    if (score >= 2) return 'growing';
    return 'sprout';
  };

  const setVisualState = (state) => {
    Object.values(STATE_CLASS).forEach((className) => shell.classList.remove(className));
    shell.classList.add(STATE_CLASS[state] || STATE_CLASS.sprout);
  };

  const syncStateFromScore = () => {
    setVisualState(scoreToState(growthScore));
  };

  const pulseBloom = () => {
    shell.classList.remove('bloom-burst');
    shell.classList.add('bloom-burst');
    setTimeout(() => shell.classList.remove('bloom-burst'), 620);
  };

  const droop = () => {
    shell.classList.remove('drop');
    shell.classList.add('drop');
    setTimeout(() => shell.classList.remove('drop'), 560);
  };

  const nudge = (direction) => {
    const className = direction === 'left' ? 'nudge-left' : 'nudge-right';
    const opposite = direction === 'left' ? 'nudge-right' : 'nudge-left';
    shell.classList.remove(opposite);
    shell.classList.add(className);
    setTimeout(() => shell.classList.remove(className), 450);
  };

  const applyAction = (action) => {
    switch (action) {
      case 'blink':
        pulseBloom();
        break;
      case 'lookLeft':
        nudge('left');
        break;
      case 'lookRight':
        nudge('right');
        break;
      case 'corrupt':
        growthScore = clampScore(growthScore + 1);
        syncStateFromScore();
        droop();
        break;
      case 'heal':
        growthScore = clampScore(growthScore - 1);
        syncStateFromScore();
        break;
      case 'reset':
        growthScore = 0;
        setVisualState('blooming');
        pulseBloom();
        setTimeout(syncStateFromScore, 650);
        break;
      default:
        break;
    }
  };

  const stateAliases = {
    awakened: 'sprout',
    overgrown: 'growing',
    corrupted: 'wilted',
    rotten: 'wilted',
    alive: 'sprout',
    alert: 'growing',
    zombified: 'wilted'
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
      growthScore = clampScore(payload.value);
      syncStateFromScore();
      return;
    }

    if (payload.type === 'setState' && typeof payload.state === 'string') {
      const normalized = payload.state.toLowerCase();
      setVisualState(stateAliases[normalized] || normalized);
      return;
    }

    if (payload.type === 'focus') {
      if (payload.x < 0) nudge('left');
      if (payload.x > 0) nudge('right');
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
    getScore: () => growthScore,
    getState: () => scoreToState(growthScore)
  };

  syncStateFromScore();
  connectWebSocketBridge();

  setInterval(() => {
    if (Math.random() < 0.23) {
      nudge(Math.random() > 0.5 ? 'left' : 'right');
    }
  }, 4200);
})();
