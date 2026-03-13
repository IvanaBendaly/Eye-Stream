(function () {
  const overlayRoot = document.getElementById('overlay-root');
  const chatList = document.getElementById('chat-list');
  const chatInputForm = document.getElementById('chat-input-form');
  const chatInput = document.getElementById('chat-input');
  const tinyStatus = document.getElementById('tiny-status');
  const testControls = document.getElementById('test-controls');

  const modeLabel = document.getElementById('mode-label');
  const scoreLabel = document.getElementById('score-label');
  const lanternBlob = document.getElementById('lantern-blob');
  const runBlob = document.getElementById('run-blob');
  const gameStrip = document.getElementById('game-strip');
  const obstacleLayer = document.getElementById('obstacle-layer');
  const ivyMeter = document.getElementById('ivy-meter');
  const ivyCount = document.getElementById('ivy-count');

  const params = new URLSearchParams(window.location.search);
  const testingMode = params.get('test') === '1' || params.get('mode') === 'test' || params.get('preview') === '1';

  const GAME = {
    ivyThreshold: 10,
    gravity: 1840,
    jumpVelocity: 790,
    groundY: 10,
    runnerX: 30,
    runnerW: 24,
    runnerH: 24,
    baseSpeed: 150,
    maxSpeed: 280,
    spawnBaseMs: 1260,
    difficultyRampMs: 62000,
    jumpBufferMs: 150,
    coyoteMs: 120,
    shieldMs: 1300,
    darkPulseMs: 2400,
    returnDelayMs: 1700
  };

  const words = {
    comfort: ['love', 'cute', 'cozy', 'safe', 'warm', 'happy', 'sweet', 'light', 'soft', 'adorable'],
    corrupt: ['dead', 'cursed', 'demon', 'ghost', 'rot', 'void', 'fear', 'creepy', 'haunt', 'decay']
  };

  const state = {
    testingMode,
    gameState: 'idle', // idle | charging | transition | running | hit | gameover | returning
    moodScore: 0,
    ivyCounter: 0,
    roundActive: false,
    y: GAME.groundY,
    vy: 0,
    jumpBufferUntil: 0,
    lastGroundedAt: 0,
    obstacles: [],
    speed: GAME.baseSpeed,
    spawnTimer: 0,
    roundElapsedMs: 0,
    score: 0,
    best: Number(window.localStorage.getItem('lantern-run-best') || 0),
    shieldUntil: 0,
    darkPulseUntil: 0,
    lastFrame: 0,
    returnTimeout: null
  };

  function setGameState(next) {
    state.gameState = next;
    overlayRoot.dataset.gameState = next;
  }

  function addChat(user, text) {
    const item = document.createElement('li');
    item.innerHTML = `<span class="tag">${user}</span>${text}`;
    chatList.prepend(item);
    while (chatList.children.length > 6) chatList.removeChild(chatList.lastChild);
  }

  function updateMoodVisual() {
    let mood = 'healthy';
    if (state.moodScore >= 4) mood = 'comforted';
    if (state.moodScore >= 8) mood = 'bliss';
    if (state.moodScore <= -4) mood = 'corrupted';
    if (state.moodScore <= -8) mood = 'zombified';
    overlayRoot.dataset.mood = mood;
  }

  function setModeLabel(text) {
    modeLabel.textContent = text;
  }

  function updateScore() {
    scoreLabel.hidden = !state.roundActive;
    scoreLabel.textContent = `Score: ${Math.floor(state.score)} • Best: ${Math.floor(state.best)}`;
  }

  function updateIvyUI() {
    const pct = Math.min(100, (state.ivyCounter / GAME.ivyThreshold) * 100);
    ivyMeter.style.width = `${pct}%`;
    ivyCount.textContent = `${state.ivyCounter}/${GAME.ivyThreshold}`;
  }

  function pulseReaction(kind = 'neutral') {
    overlayRoot.classList.remove('reaction-pop', 'reaction-ivy', 'reaction-comfort', 'reaction-corrupt');
    overlayRoot.classList.add(kind === 'ivy' ? 'reaction-ivy' : (kind === 'comfort' ? 'reaction-comfort' : (kind === 'corrupt' ? 'reaction-corrupt' : 'reaction-pop')));
    setTimeout(() => {
      overlayRoot.classList.remove('reaction-pop', 'reaction-ivy', 'reaction-comfort', 'reaction-corrupt');
    }, 220);
  }

  function blinkBlob(target = lanternBlob) {
    target.style.transform += ' scaleY(0.9)';
    setTimeout(() => { target.style.transform = target.style.transform.replace(' scaleY(0.9)', ''); }, 120);
  }

  function clearObstacles() {
    state.obstacles.forEach((o) => o.el.remove());
    state.obstacles = [];
  }

  function applyRunnerTransform() {
    runBlob.style.transform = `translateY(${-state.y}px)`;
  }

  function resetRunner() {
    state.y = GAME.groundY;
    state.vy = 0;
    state.jumpBufferUntil = 0;
    state.lastGroundedAt = performance.now();
    applyRunnerTransform();
  }

  function countWord(text, target) {
    return (String(text).toLowerCase().match(new RegExp(`\\b${target}\\b`, 'g')) || []).length;
  }

  function tokenize(text) {
    return String(text).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  }

  function startRunEvent(source = 'ivy') {
    if (state.roundActive) return;
    state.ivyCounter = 0;
    updateIvyUI();
    state.roundActive = true;
    setGameState('transition');
    setModeLabel('Lantern Run Awakening');
    gameStrip.hidden = false;
    scoreLabel.hidden = false;
    pulseReaction('ivy');

    setTimeout(() => {
      state.score = 0;
      state.speed = GAME.baseSpeed;
      state.roundElapsedMs = 0;
      state.spawnTimer = 900;
      state.shieldUntil = 0;
      state.darkPulseUntil = 0;
      resetRunner();
      setGameState('running');
      setModeLabel('Lantern Run');
      addChat('lantern', `Ivy threshold reached! ${source} summoned Lantern Run.`);
      updateScore();
    }, 420);
  }

  function finishRun(reason = 'collision') {
    state.roundActive = false;
    setGameState('gameover');
    runBlob.classList.add('hit-flash');
    setTimeout(() => runBlob.classList.remove('hit-flash'), 300);
    state.best = Math.max(state.best, state.score);
    window.localStorage.setItem('lantern-run-best', String(Math.floor(state.best)));
    updateScore();
    setModeLabel(`Run End • ${Math.floor(state.score)}`);

    state.returnTimeout = setTimeout(() => {
      setGameState('returning');
      setModeLabel('Returning Home');
      clearObstacles();
      setTimeout(() => {
        gameStrip.hidden = true;
        setGameState('idle');
        setModeLabel('Lantern Companion');
        updateScore();
        addChat('lantern', `The blob returns home. Round score: ${Math.floor(state.score)}.`);
      }, 520);
    }, GAME.returnDelayMs);
  }

  function canJump(now) {
    return state.y <= GAME.groundY + 0.6 || now - state.lastGroundedAt <= GAME.coyoteMs;
  }

  function requestJump() {
    if (!state.roundActive || state.gameState !== 'running') return;
    const now = performance.now();
    state.jumpBufferUntil = now + GAME.jumpBufferMs;
  }

  function spawnObstacle(typeForced = null) {
    const roll = Math.random();
    const type = typeForced || (roll > 0.75 ? 'eye' : (roll > 0.42 ? 'root' : 'spike'));
    const width = type === 'root' ? 22 : 16;
    const height = type === 'eye' ? 16 : (type === 'root' ? 14 : 24);
    const y = type === 'eye' ? 30 : 10;

    const el = document.createElement('span');
    el.className = `obstacle type-${type}`;
    el.style.left = '336px';
    obstacleLayer.appendChild(el);

    state.obstacles.push({ el, type, x: 336, y, width, height, passed: false });
  }

  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function applyChatMessage(raw, user = 'chat') {
    const text = String(raw || '').trim();
    if (!text) return;
    addChat(user, text);
    blinkBlob();

    const tokens = tokenize(text);
    let comfortHits = 0;
    let corruptHits = 0;
    tokens.forEach((t) => {
      if (words.comfort.includes(t)) comfortHits += 1;
      if (words.corrupt.includes(t)) corruptHits += 1;
    });

    const ivyHits = countWord(text, 'ivy');
    if (!state.roundActive && ivyHits > 0) {
      state.ivyCounter = Math.min(GAME.ivyThreshold, state.ivyCounter + ivyHits);
      pulseReaction('ivy');
      if (state.ivyCounter >= GAME.ivyThreshold) {
        startRunEvent('ivy');
      }
    }

    if (comfortHits > 0) {
      state.moodScore = Math.min(10, state.moodScore + comfortHits);
      pulseReaction('comfort');
      if (state.roundActive) state.shieldUntil = Math.max(state.shieldUntil, performance.now() + GAME.shieldMs);
    } else if (corruptHits > 0) {
      state.moodScore = Math.max(-10, state.moodScore - corruptHits);
      pulseReaction('corrupt');
      if (state.roundActive) state.darkPulseUntil = Math.max(state.darkPulseUntil, performance.now() + GAME.darkPulseMs);
    } else {
      pulseReaction('neutral');
    }

    if (state.roundActive && /\bjump\b/i.test(text)) requestJump();

    if (testingMode && /\bstart\b/i.test(text) && !state.roundActive) startRunEvent('test');

    updateMoodVisual();
    updateIvyUI();
    updateScore();
  }

  function tick(ts) {
    if (!state.lastFrame) state.lastFrame = ts;
    const dt = Math.min(0.032, (ts - state.lastFrame) / 1000);
    state.lastFrame = ts;

    if (state.roundActive && state.gameState === 'running') {
      state.roundElapsedMs += dt * 1000;
      const ramp = Math.min(1, state.roundElapsedMs / GAME.difficultyRampMs);
      const darkActive = ts < state.darkPulseUntil;
      const targetSpeed = Math.min(GAME.maxSpeed, GAME.baseSpeed + (GAME.maxSpeed - GAME.baseSpeed) * ramp + (darkActive ? 18 : 0));
      state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 1.6);

      if (state.jumpBufferUntil >= ts && canJump(ts)) {
        state.vy = GAME.jumpVelocity;
        state.jumpBufferUntil = 0;
        runBlob.classList.add('jump-squash');
        setTimeout(() => runBlob.classList.remove('jump-squash'), 130);
      }

      state.vy -= GAME.gravity * dt;
      state.y += state.vy * dt;
      if (state.y <= GAME.groundY) {
        state.y = GAME.groundY;
        state.vy = 0;
        state.lastGroundedAt = ts;
      }
      applyRunnerTransform();

      state.spawnTimer -= dt * 1000;
      const spawnBase = GAME.spawnBaseMs * (1.14 - ramp * 0.34);
      if (state.spawnTimer <= 0) {
        spawnObstacle();
        state.spawnTimer = spawnBase * (0.8 + Math.random() * 0.55);
      }

      const runnerBox = { x: GAME.runnerX + 2, y: state.y + 2, w: GAME.runnerW - 4, h: GAME.runnerH - 4 };
      const shielded = ts < state.shieldUntil;

      for (const obs of state.obstacles) {
        obs.x -= state.speed * dt;
        obs.el.style.left = `${obs.x}px`;
        const obsBox = { x: obs.x + 2, y: obs.y + 2, w: Math.max(8, obs.width - 4), h: Math.max(8, obs.height - 4) };

        if (!obs.passed && obsBox.x + obsBox.w < GAME.runnerX) {
          obs.passed = true;
          state.score += 10;
        }

        if (intersects(runnerBox, obsBox)) {
          if (shielded) {
            obs.x = -50;
            obs.passed = true;
            state.score += 4;
          } else {
            setGameState('hit');
            finishRun('hit');
            break;
          }
        }
      }

      state.obstacles = state.obstacles.filter((obs) => {
        const keep = obs.x > -40;
        if (!keep) obs.el.remove();
        return keep;
      });

      state.score += dt * 7;
      updateScore();
    }

    if (testingMode) {
      tinyStatus.textContent = `TEST • state=${state.gameState} • mood=${overlayRoot.dataset.mood} • ivy=${state.ivyCounter}/${GAME.ivyThreshold} • speed=${Math.round(state.speed)} • score=${Math.floor(state.score)}`;
    }

    requestAnimationFrame(tick);
  }

  function setupTesting() {
    if (!testingMode) return;
    overlayRoot.dataset.mode = 'test';
    chatInputForm.hidden = false;
    testControls.hidden = false;
    tinyStatus.hidden = false;

    chatInputForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const txt = chatInput.value.trim();
      if (!txt) return;
      applyChatMessage(txt, 'you');
      chatInput.value = '';
    });

    testControls.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        if (cmd === 'ivyx10') applyChatMessage('ivy ivy ivy ivy ivy ivy ivy ivy ivy ivy', 'test');
        else applyChatMessage(cmd, 'test');
      });
    });

    window.addEventListener('keydown', (event) => {
      if ((event.code === 'Space' || event.code === 'ArrowUp') && state.roundActive) {
        event.preventDefault();
        requestJump();
      }
      if (event.code === 'Enter' && !state.roundActive) {
        event.preventDefault();
        startRunEvent('keyboard');
      }
    });
  }

  function receive(payload = {}) {
    const type = String(payload.type || '').toLowerCase();
    if (type === 'chat' && payload.text) applyChatMessage(payload.text, payload.user || 'chat');
    if (type === 'action' && payload.action) applyChatMessage(payload.action, 'action');
  }

  function bootstrap() {
    setGameState('idle');
    setModeLabel('Lantern Companion');
    updateMoodVisual();
    updateIvyUI();
    updateScore();
    setupTesting();

    addChat('lantern', 'Kind words comfort. Dark words corrupt. Ivy x10 summons a run.');
    if (testingMode) addChat('lantern', 'Test: Enter/start to force run, Space to jump.');

    requestAnimationFrame(tick);
  }

  window.ChatEye = {
    receive,
    sendLocalMessage: (text) => applyChatMessage(text, 'local'),
    requestJump,
    forceRun: () => startRunEvent('api')
  };

  bootstrap();
})();
