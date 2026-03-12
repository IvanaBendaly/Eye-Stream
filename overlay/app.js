(function () {
  const overlayRoot = document.getElementById('overlay-root');
  const chatList = document.getElementById('chat-list');
  const chatInputForm = document.getElementById('chat-input-form');
  const chatInput = document.getElementById('chat-input');
  const tinyStatus = document.getElementById('tiny-status');
  const testControls = document.getElementById('test-controls');

  const modeLabel = document.getElementById('mode-label');
  const scoreLabel = document.getElementById('score-label');
  const runner = document.getElementById('runner');
  const groundRunner = document.getElementById('ground-runner');
  const obstacleLayer = document.getElementById('obstacle-layer');
  const ivyMeter = document.getElementById('ivy-meter');
  const ivyAura = document.getElementById('ivy-aura');

  const params = new URLSearchParams(window.location.search);
  const testingMode = params.get('test') === '1' || params.get('mode') === 'test' || params.get('preview') === '1';

  const GAME = {
    gravity: 2200,
    jumpVelocity: 760,
    duckScale: 0.58,
    groundY: 10,
    runnerX: 30,
    runnerW: 24,
    runnerH: 24,
    baseSpeed: 190,
    maxSpeed: 320,
    spawnBaseMs: 1180,
    ivyThreshold: 5,
    ivyDurationMs: 2300,
    darkDurationMs: 2600,
    returnDelayMs: 1800
  };

  const state = {
    testingMode,
    gameState: 'idle', // idle | starting | running | hit | gameover | returning
    roundActive: false,
    y: GAME.groundY,
    vy: 0,
    ducking: false,
    obstacles: [],
    speed: GAME.baseSpeed,
    spawnTimer: 0,
    elapsed: 0,
    score: 0,
    best: Number(window.localStorage.getItem('lantern-run-best') || 0),
    ivyCharge: 0,
    ivyShieldUntil: 0,
    darkPulseUntil: 0,
    lastFrame: 0,
    rafId: null,
    returnTimeout: null
  };

  function setGameState(next) {
    state.gameState = next;
    overlayRoot.dataset.gameState = next;
  }

  function setModeText() {
    if (!state.roundActive) {
      modeLabel.textContent = 'Lantern Companion';
      return;
    }

    if (state.gameState === 'running' || state.gameState === 'starting') modeLabel.textContent = 'Lantern Run';
    if (state.gameState === 'hit') modeLabel.textContent = 'Ouch!';
    if (state.gameState === 'gameover') modeLabel.textContent = 'Round Ended';
  }

  function updateScoreboard() {
    scoreLabel.hidden = !state.roundActive;
    scoreLabel.textContent = `Score: ${Math.floor(state.score)} • Best: ${Math.floor(state.best)}`;
  }

  function updateIvyUI() {
    ivyMeter.style.width = `${Math.min(100, (state.ivyCharge / GAME.ivyThreshold) * 100)}%`;
    const shieldOn = performance.now() < state.ivyShieldUntil;
    ivyAura.hidden = !shieldOn || !state.roundActive;
    runner.classList.toggle('mood-ivy', shieldOn);
  }

  function updateDebug() {
    if (!testingMode) return;
    const shieldMs = Math.max(0, state.ivyShieldUntil - performance.now());
    const darkMs = Math.max(0, state.darkPulseUntil - performance.now());
    tinyStatus.textContent = `TEST • state=${state.gameState} • score=${Math.floor(state.score)} • ivy=${state.ivyCharge}/${GAME.ivyThreshold} • shield=${Math.ceil(shieldMs)}ms • dark=${Math.ceil(darkMs)}ms`;
  }

  function addChat(user, text) {
    const item = document.createElement('li');
    item.innerHTML = `<span class="tag">${user}</span>${text}`;
    chatList.prepend(item);
    while (chatList.children.length > 6) chatList.removeChild(chatList.lastChild);
  }

  function clearObstacles() {
    state.obstacles.forEach((obs) => obs.el.remove());
    state.obstacles.length = 0;
  }

  function resetRunnerPose() {
    state.y = GAME.groundY;
    state.vy = 0;
    state.ducking = false;
    applyRunnerTransform();
  }

  function startRound(source = 'system') {
    clearTimeout(state.returnTimeout);
    clearObstacles();
    state.roundActive = true;
    setGameState('starting');
    state.score = 0;
    state.speed = GAME.baseSpeed;
    state.spawnTimer = 260;
    state.elapsed = 0;
    state.darkPulseUntil = 0;
    state.ivyShieldUntil = 0;
    resetRunnerPose();
    setModeText();
    updateScoreboard();
    updateIvyUI();
    addChat('lantern', `Lantern Run started (${source}). Type jump!`);

    setTimeout(() => {
      if (state.roundActive && state.gameState === 'starting') setGameState('running');
      setModeText();
      updateDebug();
    }, 280);
  }

  function finishRound(reason = 'hit') {
    state.roundActive = false;
    setGameState('gameover');
    setModeText();
    state.best = Math.max(state.best, state.score);
    window.localStorage.setItem('lantern-run-best', String(Math.floor(state.best)));
    updateScoreboard();
    addChat('lantern', `Round over (${reason}). Score ${Math.floor(state.score)}.`);
    state.returnTimeout = setTimeout(() => {
      setGameState('returning');
      clearObstacles();
      setTimeout(() => {
        setGameState('idle');
        resetRunnerPose();
        setModeText();
        updateScoreboard();
      }, 350);
    }, GAME.returnDelayMs);
  }

  function applyRunnerTransform() {
    const heightScale = state.ducking ? GAME.duckScale : 1;
    groundRunner.style.transform = `translateY(${-state.y}px) scale(1, ${heightScale})`;
  }

  function jump() {
    if (!state.roundActive || state.gameState !== 'running') return;
    if (state.y > GAME.groundY + 1) return;
    state.vy = GAME.jumpVelocity;
    runner.classList.add('mood-jump');
    setTimeout(() => runner.classList.remove('mood-jump'), 140);
  }

  function duck(active) {
    if (!state.roundActive || state.gameState !== 'running') return;
    state.ducking = !!active && state.y <= GAME.groundY + 2;
    applyRunnerTransform();
  }

  function makeObstacle() {
    const roll = Math.random();
    const type = roll > 0.72 ? 'eye' : (roll > 0.4 ? 'root' : 'spike');
    const width = type === 'root' ? 22 : 16;
    const height = type === 'eye' ? 16 : (type === 'root' ? 14 : 24);
    const y = type === 'eye' ? 31 : 10;

    const el = document.createElement('span');
    el.className = `obstacle type-${type}`;
    el.style.left = '330px';
    obstacleLayer.appendChild(el);

    state.obstacles.push({ el, type, x: 330, y, width, height, passed: false });
  }

  function activateIvyShield() {
    state.ivyCharge = 0;
    state.ivyShieldUntil = performance.now() + GAME.ivyDurationMs;
    addChat('lantern', 'Ivy form awakened: shielded glow!');
  }

  function applyCommand(text, user = 'chat') {
    const msg = String(text || '').toLowerCase().trim();
    if (!msg) return;

    if (/\b(start|run|go)\b/.test(msg)) {
      if (!state.roundActive) startRound(user);
      return;
    }

    if (/\bjump\b/.test(msg)) {
      jump();
      return;
    }

    if (/\bduck\b/.test(msg)) {
      duck(true);
      setTimeout(() => duck(false), 260);
      return;
    }

    if (/\bivy\b/.test(msg)) {
      state.ivyCharge = Math.min(GAME.ivyThreshold, state.ivyCharge + 1);
      if (state.ivyCharge >= GAME.ivyThreshold && state.roundActive) activateIvyShield();
      updateIvyUI();
      return;
    }

    if (/\b(love|light|heal)\b/.test(msg)) {
      if (state.roundActive) {
        state.ivyShieldUntil = Math.max(state.ivyShieldUntil, performance.now() + 900);
      }
      addChat('lantern', 'Warm light steadies the spirit.');
      updateIvyUI();
      return;
    }

    if (/\b(dead|curse|demon)\b/.test(msg)) {
      if (state.roundActive) {
        state.darkPulseUntil = performance.now() + GAME.darkDurationMs;
      }
      addChat('lantern', 'A cursed wave darkens the lane.');
      return;
    }
  }

  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function tick(ts) {
    if (!state.lastFrame) state.lastFrame = ts;
    const dt = Math.min(0.032, (ts - state.lastFrame) / 1000);
    state.lastFrame = ts;

    if (state.roundActive && state.gameState === 'running') {
      const darkActive = ts < state.darkPulseUntil;
      state.speed = Math.min(GAME.maxSpeed, state.speed + dt * (darkActive ? 15 : 8));

      state.vy -= GAME.gravity * dt;
      state.y += state.vy * dt;
      if (state.y <= GAME.groundY) {
        state.y = GAME.groundY;
        state.vy = 0;
      }

      applyRunnerTransform();

      state.spawnTimer -= dt * 1000;
      const spawnWindow = darkActive ? GAME.spawnBaseMs * 0.65 : GAME.spawnBaseMs;
      if (state.spawnTimer <= 0) {
        makeObstacle();
        state.spawnTimer = spawnWindow * (0.75 + Math.random() * 0.6);
      }

      const runnerHeight = state.ducking ? GAME.runnerH * GAME.duckScale : GAME.runnerH;
      const runnerBox = { x: GAME.runnerX, y: state.y, w: GAME.runnerW, h: runnerHeight };

      for (const obs of state.obstacles) {
        obs.x -= state.speed * dt;
        obs.el.style.left = `${obs.x}px`;

        const obsBox = { x: obs.x, y: obs.y, w: obs.width, h: obs.height };

        if (!obs.passed && obsBox.x + obsBox.w < GAME.runnerX) {
          obs.passed = true;
          state.score += 10;
        }

        const shieldOn = ts < state.ivyShieldUntil;
        if (intersects(runnerBox, obsBox)) {
          if (shieldOn) {
            obs.passed = true;
            obs.x = -40;
            state.score += 4;
          } else {
            setGameState('hit');
            runner.classList.add('mood-hit');
            setTimeout(() => runner.classList.remove('mood-hit'), 400);
            finishRound('collision');
            break;
          }
        }
      }

      state.obstacles = state.obstacles.filter((obs) => {
        const keep = obs.x > -40;
        if (!keep) obs.el.remove();
        return keep;
      });

      state.elapsed += dt;
      state.score += dt * 7;
      updateScoreboard();
      updateIvyUI();
    }

    updateDebug();
    state.rafId = requestAnimationFrame(tick);
  }

  function setupTesting() {
    if (!testingMode) return;
    overlayRoot.dataset.mode = 'test';
    chatInputForm.hidden = false;
    testControls.hidden = false;
    tinyStatus.hidden = false;

    chatInputForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      addChat('you', text);
      applyCommand(text, 'local');
      chatInput.value = '';
    });

    testControls.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        addChat('test', cmd);
        applyCommand(cmd, 'test');
      });
    });

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        jump();
      }
      if (event.code === 'ArrowDown') {
        event.preventDefault();
        duck(true);
      }
      if (event.code === 'Enter' && !state.roundActive) {
        event.preventDefault();
        startRound('keyboard');
      }
      if (event.key.toLowerCase() === 'i') applyCommand('ivy', 'keyboard');
      if (event.key.toLowerCase() === 'l') applyCommand('love', 'keyboard');
      if (event.key.toLowerCase() === 'c') applyCommand('curse', 'keyboard');
    });

    window.addEventListener('keyup', (event) => {
      if (event.code === 'ArrowDown') duck(false);
    });
  }

  function receive(payload = {}) {
    const type = String(payload.type || '').toLowerCase();
    if (type === 'chat' && payload.text) {
      addChat(payload.user || 'chat', payload.text);
      applyCommand(payload.text, payload.user || 'chat');
      return;
    }

    if (type === 'action' && payload.action) {
      applyCommand(String(payload.action), 'action');
    }
  }

  function bootstrap() {
    setGameState('idle');
    setModeText();
    updateScoreboard();
    updateIvyUI();
    setupTesting();

    addChat('lantern', 'Idle mode: type start/run/go to begin Lantern Run.');
    addChat('lantern', 'Commands: jump • ivy • love/light/heal • dead/curse/demon');

    state.rafId = requestAnimationFrame(tick);
  }

  window.ChatEye = {
    receive,
    sendLocalMessage: (text) => {
      addChat('local', text);
      applyCommand(text, 'local');
    },
    startRound: () => startRound('api'),
    jump,
    duck
  };

  bootstrap();
})();
