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
    gravity: 1880,
    jumpVelocity: 820,
    duckScale: 0.58,
    groundY: 10,
    runnerX: 30,
    runnerW: 24,
    runnerH: 24,
    baseSpeed: 156,
    maxSpeed: 292,
    spawnBaseMs: 1220,
    jumpBufferMs: 145,
    coyoteMs: 120,
    difficultyRampMs: 60000,
    ivyThreshold: 5,
    ivyDurationMs: 2300,
    darkDurationMs: 2600,
    slowDurationMs: 2000,
    summonGraceMs: 1400,
    returnDelayMs: 1800
  };

  const state = {
    testingMode,
    controlMode: testingMode ? 'local' : 'auto',
    gameState: 'idle', // idle | starting | running | hit | gameover | returning
    roundActive: false,
    y: GAME.groundY,
    vy: 0,
    jumpBufferUntil: 0,
    lastGroundedAt: 0,
    ducking: false,
    obstacles: [],
    speed: GAME.baseSpeed,
    spawnTimer: 0,
    roundElapsedMs: 0,
    score: 0,
    best: Number(window.localStorage.getItem('lantern-run-best') || 0),
    ivyCharge: 0,
    ivyShieldUntil: 0,
    darkPulseUntil: 0,
    slowUntil: 0,
    summonGraceUntil: 0,
    cursedWaveCount: 0,
    lastFrame: 0,
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

    if (state.gameState === 'running' || state.gameState === 'starting') {
      modeLabel.textContent = state.controlMode === 'auto' ? 'Lantern Run • Auto Spirit' : 'Lantern Run • Local';
    }
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
    const now = performance.now();
    const shieldMs = Math.max(0, state.ivyShieldUntil - now);
    const darkMs = Math.max(0, state.darkPulseUntil - now);
    const slowMs = Math.max(0, state.slowUntil - now);
    const summonMs = Math.max(0, state.summonGraceUntil - now);
    tinyStatus.textContent = `TEST • ${state.controlMode} • state=${state.gameState} • score=${Math.floor(state.score)} • ivy=${state.ivyCharge}/${GAME.ivyThreshold} • shield=${Math.ceil(shieldMs)} • dark=${Math.ceil(darkMs)} • slow=${Math.ceil(slowMs)} • summon=${Math.ceil(summonMs)}`;
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
    state.lastGroundedAt = performance.now();
    state.jumpBufferUntil = 0;
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
    state.spawnTimer = 920;
    state.roundElapsedMs = 0;
    state.darkPulseUntil = 0;
    state.slowUntil = 0;
    state.summonGraceUntil = 0;
    state.cursedWaveCount = 0;
    state.ivyShieldUntil = 0;
    resetRunnerPose();
    setModeText();
    updateScoreboard();
    updateIvyUI();
    addChat('lantern', `Lantern Run started (${source}). Chat powers influence fate.`);

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

  function jump(force = false) {
    if (!state.roundActive || state.gameState !== 'running') return;
    const now = performance.now();
    state.jumpBufferUntil = now + GAME.jumpBufferMs + (force ? 60 : 0);
    if (!canJump(now) && !force) return;
    if (!canJump(now) && force) return;
    state.jumpBufferUntil = 0;
    state.vy = GAME.jumpVelocity;
    runner.classList.add('mood-jump');
    setTimeout(() => runner.classList.remove('mood-jump'), 140);
  }

  function canJump(now) {
    const grounded = state.y <= GAME.groundY + 0.6;
    const coyote = now - state.lastGroundedAt <= GAME.coyoteMs;
    return grounded || coyote;
  }

  function duck(active) {
    if (!state.roundActive || state.gameState !== 'running') return;
    state.ducking = !!active && state.y <= GAME.groundY + 2;
    applyRunnerTransform();
  }

  function makeObstacle(typeForced = null) {
    const roll = Math.random();
    const type = typeForced || (roll > 0.72 ? 'eye' : (roll > 0.4 ? 'root' : 'spike'));
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

  function triggerSummon() {
    if (!state.roundActive) return;
    state.summonGraceUntil = performance.now() + GAME.summonGraceMs;
    const nearest = state.obstacles.find((obs) => obs.x > GAME.runnerX - 12);
    if (nearest) nearest.x += 65;
    addChat('lantern', 'A helper spirit pushes danger back.');
  }

  function triggerCurseWave() {
    if (!state.roundActive) return;
    state.darkPulseUntil = performance.now() + GAME.darkDurationMs;
    state.cursedWaveCount = Math.min(3, state.cursedWaveCount + 2);
    addChat('lantern', 'A cursed wave thickens the shadows.');
  }

  function triggerLove() {
    if (state.roundActive) {
      state.ivyShieldUntil = Math.max(state.ivyShieldUntil, performance.now() + 900);
      state.slowUntil = Math.max(state.slowUntil, performance.now() + 1000);
    }
    addChat('lantern', 'Warm light steadies the spirit.');
  }

  function triggerSlow() {
    if (!state.roundActive) return;
    state.slowUntil = performance.now() + GAME.slowDurationMs;
    addChat('lantern', 'The lane softens for a moment.');
  }

  function applyCommand(text, user = 'chat') {
    const msg = String(text || '').toLowerCase().trim();
    if (!msg) return;

    if (/\b(start|run|go)\b/.test(msg)) {
      if (!state.roundActive) startRound(user);
      return;
    }

    if (/\b(jump|hop)\b/.test(msg)) {
      // latency-friendly: this is a supportive nudge, not required precision timing
      if (state.roundActive) {
        jump(true);
        state.score += 3;
      }
      return;
    }

    if (/\bduck\b/.test(msg)) {
      duck(true);
      setTimeout(() => duck(false), 300);
      return;
    }

    if (/\bivy\b/.test(msg)) {
      state.ivyCharge = Math.min(GAME.ivyThreshold, state.ivyCharge + 1);
      if (state.ivyCharge >= GAME.ivyThreshold && state.roundActive) activateIvyShield();
      updateIvyUI();
      return;
    }

    if (/\b(love|light|heal)\b/.test(msg)) {
      triggerLove();
      updateIvyUI();
      return;
    }

    if (/\b(dead|curse|demon)\b/.test(msg)) {
      triggerCurseWave();
      return;
    }

    if (/\b(ivyhelp|summon|wisp|assist)\b/.test(msg)) {
      triggerSummon();
      return;
    }

    if (/\b(calm|slow|gentle)\b/.test(msg)) {
      triggerSlow();
    }
  }

  function autoDriveAssist() {
    if (state.controlMode !== 'auto' || !state.roundActive || state.gameState !== 'running') return;
    if (state.y > GAME.groundY + 2) return;

    const closest = state.obstacles
      .filter((obs) => obs.x + obs.width > GAME.runnerX - 8)
      .sort((a, b) => a.x - b.x)[0];

    if (!closest) return;

    const distance = closest.x - GAME.runnerX;
    if (closest.type === 'eye') {
      if (distance < 34 && distance > 6) {
        duck(true);
        setTimeout(() => duck(false), 220);
      }
      return;
    }

    if (distance < 72 && distance > 8) {
      jump();
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
      state.roundElapsedMs += dt * 1000;
      const darkActive = ts < state.darkPulseUntil;
      const slowActive = ts < state.slowUntil;
      const graceActive = ts < state.summonGraceUntil;
      const speedFactor = slowActive ? 0.7 : 1;
      const ramp = Math.min(1, state.roundElapsedMs / GAME.difficultyRampMs);

      const targetSpeed = Math.min(
        GAME.maxSpeed,
        GAME.baseSpeed + (GAME.maxSpeed - GAME.baseSpeed) * ramp + (darkActive ? 16 : 0)
      );
      state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 1.7);

      autoDriveAssist();

      if (state.jumpBufferUntil >= ts && canJump(ts)) {
        state.vy = GAME.jumpVelocity;
        state.jumpBufferUntil = 0;
        runner.classList.add('mood-jump');
        setTimeout(() => runner.classList.remove('mood-jump'), 140);
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
      const spawnWindowBase = GAME.spawnBaseMs * (1.2 - ramp * 0.35);
      const spawnWindow = (darkActive ? spawnWindowBase * 0.82 : spawnWindowBase);
      if (state.spawnTimer <= 0) {
        if (state.cursedWaveCount > 0) {
          makeObstacle(Math.random() > 0.5 ? 'spike' : 'root');
          state.cursedWaveCount -= 1;
        } else {
          makeObstacle();
        }
        state.spawnTimer = spawnWindow * (0.78 + Math.random() * 0.58);
      }

      const runnerHeight = state.ducking ? GAME.runnerH * GAME.duckScale : GAME.runnerH;
      const runnerBox = {
        x: GAME.runnerX + 2,
        y: state.y + 2,
        w: Math.max(8, GAME.runnerW - 4),
        h: Math.max(8, runnerHeight - 4)
      };

      for (const obs of state.obstacles) {
        obs.x -= state.speed * speedFactor * dt;
        obs.el.style.left = `${obs.x}px`;

        const obsBox = {
          x: obs.x + 2,
          y: obs.y + 2,
          w: Math.max(8, obs.width - 4),
          h: Math.max(8, obs.height - 4)
        };

        if (!obs.passed && obsBox.x + obsBox.w < GAME.runnerX) {
          obs.passed = true;
          state.score += 10;
        }

        const shieldOn = ts < state.ivyShieldUntil;
        if (intersects(runnerBox, obsBox)) {
          if (shieldOn || graceActive) {
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

      state.score += dt * 7;
      updateScoreboard();
      updateIvyUI();
    }

    updateDebug();
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
        jump(true);
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
      if (event.key.toLowerCase() === 's') applyCommand('summon', 'keyboard');
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

    addChat('lantern', 'Idle mode: start/run/go begins Lantern Run.');
    addChat('lantern', 'Chat powers: ivy, love/light/heal, summon, curse.');

    requestAnimationFrame(tick);
  }

  window.ChatEye = {
    receive,
    sendLocalMessage: (text) => {
      addChat('local', text);
      applyCommand(text, 'local');
    },
    startRound: () => startRound('api'),
    jump: () => jump(true),
    duck
  };

  bootstrap();
})();
