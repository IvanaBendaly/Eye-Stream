(function () {
  const overlayRoot = document.getElementById('overlay-root');
  const eyeRoot = document.getElementById('lantern');
  const gameRoot = document.getElementById('ivy-game');
  const runner = document.getElementById('runner');
  const obstacleLayer = document.getElementById('obstacle-layer');
  const gameHud = document.getElementById('game-hud');
  const gameFlash = document.getElementById('game-flash');

  const chatList = document.getElementById('chat-list');
  const chatInputForm = document.getElementById('chat-input-form');
  const chatInput = document.getElementById('chat-input');
  const tinyStatus = document.getElementById('tiny-status');
  const interactionHeader = document.getElementById('interaction-header');
  const explosionField = document.getElementById('explosion-field');
  const testControls = document.getElementById('test-controls');

  const params = new URLSearchParams(window.location.search);
  const testingMode = params.get('test') === '1' || params.get('mode') === 'test' || params.get('preview') === '1';

  const IVY_THRESHOLD = 10;
  const IVY_COOLDOWN_MS = 5000;
  const STATE_ORDER = ['blissful', 'awakened', 'curious', 'disturbed', 'corrupted', 'rotting', 'dead'];
  const STATE_ALIAS = { alive: 'awakened', alert: 'curious', zombified: 'dead' };

  const matchConfig = {
    corruptWords: ['ghost', 'demon', 'cursed', 'curse', 'haunted', 'haunt', 'hex', 'rot', 'rotten', 'decay', 'dead', 'death', 'blood', 'kill', 'scream', 'nightmare', 'hunt', 'run', 'shadow', 'void', 'evil', 'possessed', 'possession', 'monster', 'creep', 'creepy', 'horror', 'break', 'shatter', 'crack', 'rage', 'anger', 'angry', 'burn', 'chaos', 'abyss', 'doom', 'fear', 'panic', 'wrath', 'dark', 'darkness', 'violent', 'insane', 'mad', 'destroy', 'ruin', 'pain', 'torment', 'sinister', 'malicious', 'unholy', 'infected', 'plague', 'parasite', 'zombie', 'hollow'],
    healWords: ['love', 'lovely', 'cute', 'cozy', 'calm', 'gentle', 'safe', 'okay', 'sweet', 'warm', 'bloom', 'light', 'hope', 'kind', 'peaceful', 'peace', 'comfort', 'serene', 'tranquil', 'pretty', 'soft', 'hug', 'healing', 'heal', 'rest', 'home', 'alive', 'smile', 'happy', 'joy', 'joyful', 'bright', 'angel', 'sunshine', 'breathe', 'relax', 'adorable', 'tender', 'clean', 'comfy'],
    resetWords: ['wake', 'awaken', 'revive', 'reborn', 'reset', 'blink', 'return', 'restore', 'renew', 'rebirth'],
    healPhrases: ['calm down', 'safe place'],
    corruptPhrases: ['fall apart', 'give in']
  };

  const state = {
    testingMode,
    corruptionScore: 0,
    ivyCounter: 0,
    renderedState: 'awakened',
    mode: 'lantern',
    ivyCooldownUntil: 0,
    debug: { matchedCorrupt: [], matchedHeal: [], ivyHits: 0, resetTriggered: false, delta: 0, cooldown: false },
    timers: { particles: null, blinkCleanup: null, bloomCleanup: null, reactionCleanup: null, ivyHitCleanup: null, messageCleanup: null, lookReset: null },
    game: {
      running: false,
      raf: 0,
      score: 0,
      shieldTimer: 0,
      pressureTimer: 0,
      runnerY: 0,
      runnerVY: 0,
      grounded: true,
      coyoteUntil: 0,
      jumpBufferUntil: 0,
      ducking: false,
      spawnIn: 900,
      speed: 182,
      elapsed: 0,
      obstacles: []
    }
  };

  const clampScore = (v) => Math.max(-3, Math.min(12, Math.round(v)));

  const isIvyCoolingDown = () => Date.now() < state.ivyCooldownUntil;

  function deriveStateFromScore(score = state.corruptionScore) {
    if (score <= -2) return 'blissful';
    if (score <= 1) return 'awakened';
    if (score <= 3) return 'curious';
    if (score <= 5) return 'disturbed';
    if (score <= 7) return 'corrupted';
    if (score <= 9) return 'rotting';
    return 'dead';
  }

  function stateToScore(nextState) {
    if (nextState === 'blissful') return -2;
    if (nextState === 'awakened') return 0;
    if (nextState === 'curious') return 2;
    if (nextState === 'disturbed') return 4;
    if (nextState === 'corrupted') return 6;
    if (nextState === 'rotting') return 8;
    return 10;
  }

  function resetDebug() {
    state.debug = { matchedCorrupt: [], matchedHeal: [], ivyHits: 0, resetTriggered: false, delta: 0, cooldown: isIvyCoolingDown() };
  }

  function updateStatus() {
    if (!testingMode) return;
    const cooldownMs = Math.max(0, state.ivyCooldownUntil - Date.now());
    tinyStatus.textContent = `TEST • MODE:${state.mode.toUpperCase()} • IVY ${state.ivyCounter}/${IVY_THRESHOLD} • COOLDOWN:${cooldownMs > 0 ? `${(cooldownMs / 1000).toFixed(1)}s` : 'ready'} • SCORE:${state.corruptionScore}(${state.renderedState}) • GAME:${state.game.running ? `on ${Math.floor(state.game.score)}` : 'off'}`;
  }

  function render(reason = 'render') {
    const derived = deriveStateFromScore();
    STATE_ORDER.forEach((name) => eyeRoot.classList.remove(`state-${name}`));
    eyeRoot.classList.add(`state-${derived}`);
    overlayRoot.dataset.state = derived;
    state.renderedState = derived;

    eyeRoot.classList.remove('ivy-charge', 'ivy-warning', 'ivy-cooldown');
    for (let i = 0; i <= 10; i += 1) eyeRoot.classList.remove(`ivy-level-${i}`);
    eyeRoot.classList.add(`ivy-level-${Math.max(0, Math.min(10, state.ivyCounter))}`);

    if (isIvyCoolingDown()) eyeRoot.classList.add('ivy-cooldown');
    else if (state.ivyCounter >= IVY_THRESHOLD - 2) eyeRoot.classList.add('ivy-warning');
    else eyeRoot.classList.add('ivy-charge');

    overlayRoot.dataset.mode = state.mode;
    eyeRoot.hidden = state.mode !== 'lantern';
    gameRoot.hidden = state.mode !== 'game';

    updateStatus();
    console.log(`[ChatEye] mode=${state.mode} state=${derived} score=${state.corruptionScore} ivy=${state.ivyCounter} reason=${reason}`);
  }

  function blink() {
    eyeRoot.classList.remove('blink');
    requestAnimationFrame(() => eyeRoot.classList.add('blink'));
    clearTimeout(state.timers.blinkCleanup);
    state.timers.blinkCleanup = setTimeout(() => eyeRoot.classList.remove('blink'), 460);
  }

  function bloom() {
    eyeRoot.classList.remove('bloom');
    requestAnimationFrame(() => eyeRoot.classList.add('bloom'));
    clearTimeout(state.timers.bloomCleanup);
    state.timers.bloomCleanup = setTimeout(() => eyeRoot.classList.remove('bloom'), 900);
  }

  function burst(type = 'pulse') {
    eyeRoot.classList.remove('burst', 'stress');
    requestAnimationFrame(() => eyeRoot.classList.add(type === 'stress' ? 'stress' : 'burst'));
  }

  function triggerReaction(kind = 'heal') {
    eyeRoot.classList.remove('react-heal', 'react-corrupt', 'react-ivy', 'react-neutral');
    const cls = kind === 'corrupt' ? 'react-corrupt' : (kind === 'ivy' ? 'react-ivy' : 'react-heal');
    requestAnimationFrame(() => eyeRoot.classList.add(cls));
    clearTimeout(state.timers.reactionCleanup);
    state.timers.reactionCleanup = setTimeout(() => eyeRoot.classList.remove('react-heal', 'react-corrupt', 'react-ivy', 'react-neutral'), 420);
  }

  function glance(kind = 'neutral') {
    if (kind === 'heal') eyeRoot.dataset.look = Math.random() > 0.5 ? 'left' : 'right';
    else if (kind === 'corrupt') eyeRoot.dataset.look = Math.random() > 0.5 ? 'right' : 'left';
    else eyeRoot.dataset.look = Math.random() > 0.55 ? 'left' : (Math.random() > 0.5 ? 'right' : 'center');

    clearTimeout(state.timers.lookReset);
    state.timers.lookReset = setTimeout(() => { eyeRoot.dataset.look = 'center'; }, 300);
  }

  function triggerMessageResponse(kind = 'neutral') {
    eyeRoot.classList.remove('message-ping');
    requestAnimationFrame(() => eyeRoot.classList.add('message-ping'));
    burst('pulse');
    glance(kind);
    clearTimeout(state.timers.messageCleanup);
    state.timers.messageCleanup = setTimeout(() => eyeRoot.classList.remove('message-ping'), 320);

    if (kind === 'ivy') {
      triggerReaction('ivy');
      burst('stress');
      blink();
      return;
    }
    if (kind === 'corrupt') {
      triggerReaction('corrupt');
      return;
    }
    if (kind === 'heal') {
      triggerReaction('heal');
      bloom();
      return;
    }
    eyeRoot.classList.remove('react-neutral');
    requestAnimationFrame(() => eyeRoot.classList.add('react-neutral'));
    blink();
  }

  function emitExternalDebris(amount = 12) {
    if (!explosionField) return;
    for (let i = 0; i < amount; i += 1) {
      const d = document.createElement('span');
      d.className = `debris ${Math.random() > 0.5 ? 'ember' : 'smoke'}`;
      d.style.left = `${108 + (Math.random() * 30 - 15)}px`;
      d.style.top = `${102 + (Math.random() * 18 - 9)}px`;
      d.style.setProperty('--dx', `${(Math.random() * 2 - 1) * 84}px`);
      d.style.setProperty('--dy', `${(Math.random() * -86) - 10}px`);
      d.style.animationDuration = `${920 + Math.random() * 760}ms`;
      explosionField.appendChild(d);
      setTimeout(() => d.remove(), 1900);
    }
  }

  function triggerIvyHitFeedback(intensity = 1) {
    triggerReaction('ivy');
    eyeRoot.classList.remove('ivy-surge-hit');
    requestAnimationFrame(() => eyeRoot.classList.add('ivy-surge-hit'));
    clearTimeout(state.timers.ivyHitCleanup);
    state.timers.ivyHitCleanup = setTimeout(() => eyeRoot.classList.remove('ivy-surge-hit'), 440);
    burst(intensity > 1 ? 'stress' : 'pulse');
  }

  function setScore(value, reason = 'setScore') { state.corruptionScore = clampScore(value); render(reason); }
  function mutateScore(delta, reason = 'mutate') { setScore(state.corruptionScore + delta, reason); }
  function setState(nextStateRaw, reason = 'setState') {
    const alias = String(nextStateRaw || '').toLowerCase();
    const normalized = STATE_ALIAS[alias] || alias;
    if (!STATE_ORDER.includes(normalized)) return;
    setScore(stateToScore(normalized), reason);
  }

  function tokenize(text) {
    return String(text || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  }

  function countExactIvyTokens(words) {
    let hits = 0;
    for (const word of words) if (word === 'ivy') hits += 1;
    return hits;
  }

  function applyPhraseMatches(normalizedText) {
    for (const phrase of matchConfig.healPhrases) if (normalizedText.includes(phrase)) { state.debug.matchedHeal.push(phrase); state.debug.delta -= 1; }
    for (const phrase of matchConfig.corruptPhrases) if (normalizedText.includes(phrase)) { state.debug.matchedCorrupt.push(phrase); state.debug.delta += 1; }
  }

  function grantGameChatEffect(kind) {
    if (!state.game.running) return;
    if (kind === 'heal') {
      state.game.shieldTimer = Math.max(state.game.shieldTimer, 2400);
      gameRoot.classList.add('buff-glow');
      setTimeout(() => gameRoot.classList.remove('buff-glow'), 260);
    }
    if (kind === 'corrupt') {
      state.game.pressureTimer = Math.max(state.game.pressureTimer, 2000);
      gameRoot.classList.add('debuff-flash');
      setTimeout(() => gameRoot.classList.remove('debuff-flash'), 220);
    }
  }

  function createObstacle() {
    const variants = ['root', 'gravestone', 'spike', 'candle', 'skull', 'branch'];
    const type = variants[Math.floor(Math.random() * variants.length)];
    const el = document.createElement('span');
    el.className = `obstacle ${type}`;
    obstacleLayer.appendChild(el);
    return { el, x: 316, w: type === 'branch' ? 32 : 22, h: type === 'spike' ? 26 : 34, type, passed: false };
  }

  function resetGameObjects() {
    for (const o of state.game.obstacles) o.el.remove();
    state.game.obstacles = [];
  }

  function setRunnerY(px) {
    runner.style.transform = `translateY(${-px}px)`;
  }

  function jump() {
    if (!state.game.running) return;
    state.game.jumpBufferUntil = performance.now() + 140;
  }

  function setDuck(active) {
    const shouldDuck = Boolean(active && state.game.running && state.game.grounded);
    state.game.ducking = shouldDuck;
    runner.classList.toggle('duck', shouldDuck);
  }

  function processJump(now) {
    const canCoyote = now <= state.game.coyoteUntil;
    if (state.game.jumpBufferUntil > now && (state.game.grounded || canCoyote)) {
      state.game.runnerVY = 338;
      state.game.grounded = false;
      state.game.jumpBufferUntil = 0;
      runner.classList.add('jump');
      setTimeout(() => runner.classList.remove('jump'), 180);
    }
  }

  function obstacleHit(o) {
    const rx = 58;
    const rw = state.game.ducking ? 28 : 26;
    const rh = state.game.ducking ? 18 : 28;
    const rbottom = 18 + state.game.runnerY;
    const rtop = rbottom + rh;

    const ox = o.x;
    const ow = o.w;
    const otop = 18 + o.h;

    const overlapX = rx + rw - 4 > ox && rx + 4 < ox + ow;
    const overlapY = rbottom + 2 < otop && rtop - 4 > 18;
    return overlapX && overlapY;
  }

  function endGame(reason = 'collision') {
    state.game.running = false;
    cancelAnimationFrame(state.game.raf);
    setState('dead', 'game-over-zombie');
    state.ivyCooldownUntil = Date.now() + IVY_COOLDOWN_MS;
    state.ivyCounter = 0;
    state.mode = 'lantern';
    gameFlash.classList.add('show');
    setTimeout(() => gameFlash.classList.remove('show'), 220);
    setDuck(false);
    resetGameObjects();
    render(`game-over:${reason}`);
    if (testingMode && chatInput && !chatInputForm.hidden) {
      setTimeout(() => chatInput.focus(), 0);
    }
  }

  function gameFrame(now, prev) {
    if (!state.game.running) return;
    const dt = Math.min(0.032, (now - prev) / 1000);
    const g = state.game;

    g.elapsed += dt;
    g.score += dt * 12;
    g.shieldTimer = Math.max(0, g.shieldTimer - dt * 1000);
    g.pressureTimer = Math.max(0, g.pressureTimer - dt * 1000);

    const difficulty = Math.min(1, g.elapsed / 28);
    const pressureBoost = g.pressureTimer > 0 ? 26 : 0;
    g.speed = 172 + difficulty * 90 + pressureBoost;

    g.spawnIn -= dt * 1000;
    if (g.spawnIn <= 0) {
      g.obstacles.push(createObstacle());
      g.spawnIn = 920 - difficulty * 340 + Math.random() * 260;
      if (g.shieldTimer > 0) g.spawnIn += 120;
    }

    const prevY = g.runnerY;
    g.runnerVY -= 660 * dt;
    g.runnerY += g.runnerVY * dt;

    if (prevY <= 0 && g.runnerY > 0) g.grounded = false;

    if (g.runnerY <= 0) {
      if (!g.grounded) g.coyoteUntil = now + 100;
      g.runnerY = 0;
      g.runnerVY = 0;
      g.grounded = true;
    }

    processJump(now);
    setRunnerY(g.runnerY);

    const worldSpeed = g.speed * (g.shieldTimer > 0 ? 0.95 : 1);
    for (let i = g.obstacles.length - 1; i >= 0; i -= 1) {
      const o = g.obstacles[i];
      o.x -= worldSpeed * dt;
      o.el.style.transform = `translateX(${o.x}px)`;

      if (!o.passed && o.x + o.w < 58) {
        o.passed = true;
        g.score += 5;
      }

      if (o.x + o.w < -40) {
        o.el.remove();
        g.obstacles.splice(i, 1);
        continue;
      }

      if (obstacleHit(o)) {
        if (g.shieldTimer > 0) {
          g.shieldTimer = 0;
          o.el.remove();
          g.obstacles.splice(i, 1);
          gameRoot.classList.add('shield-pop');
          setTimeout(() => gameRoot.classList.remove('shield-pop'), 180);
          continue;
        }
        endGame('collision');
        return;
      }
    }

    gameHud.textContent = `SCORE ${Math.floor(g.score)}`;
    state.game.raf = requestAnimationFrame((next) => gameFrame(next, now));
  }

  function startGame(source = 'ivy-threshold') {
    if (state.game.running) return;
    state.mode = 'game';
    state.ivyCounter = 0;

    state.game.running = true;
    state.game.score = 0;
    state.game.shieldTimer = 0;
    state.game.pressureTimer = 0;
    state.game.runnerY = 0;
    state.game.runnerVY = 0;
    state.game.grounded = true;
    state.game.coyoteUntil = 0;
    state.game.jumpBufferUntil = 0;
    state.game.ducking = false;
    state.game.spawnIn = 1000;
    state.game.speed = 172;
    state.game.elapsed = 0;
    resetGameObjects();
    setRunnerY(0);
    setDuck(false);
    if (document.activeElement === chatInput) chatInput.blur();
    render(`game-start:${source}`);

    state.game.raf = requestAnimationFrame((now) => gameFrame(now, now));
  }

  function applyMessageTriggers(text, source = 'chat') {
    resetDebug();
    const normalizedText = String(text || '').toLowerCase().replace(/[^a-z\s]/g, ' ');
    const words = tokenize(normalizedText);
    applyPhraseMatches(normalizedText);

    const ivyHits = countExactIvyTokens(words);
    state.debug.ivyHits = ivyHits;

    for (const word of words) {
      if (word === 'ivy') continue;
      if (matchConfig.corruptWords.includes(word)) { state.debug.matchedCorrupt.push(word); state.debug.delta += 1; }
      if (matchConfig.healWords.includes(word)) { state.debug.matchedHeal.push(word); state.debug.delta -= 1; }
      if (matchConfig.resetWords.includes(word)) state.debug.resetTriggered = true;
    }

    let messageKind = 'neutral';

    if (state.debug.resetTriggered) {
      setScore(0, `${source}:resetWord`);
      bloom();
      blink();
      messageKind = 'heal';
    } else if (state.debug.delta !== 0) {
      mutateScore(state.debug.delta, `${source}:delta(${state.debug.delta})`);
      messageKind = state.debug.delta > 0 ? 'corrupt' : 'heal';
    }

    if (state.mode === 'game') {
      if (messageKind === 'heal') grantGameChatEffect('heal');
      if (messageKind === 'corrupt') grantGameChatEffect('corrupt');
      render(`${source}:game-post`);
      return;
    }

    if (ivyHits > 0 && !isIvyCoolingDown()) {
      state.ivyCounter = Math.min(IVY_THRESHOLD, state.ivyCounter + ivyHits);
      triggerIvyHitFeedback(ivyHits);
      messageKind = 'ivy';
    }

    triggerMessageResponse(messageKind);

    if (state.ivyCounter >= IVY_THRESHOLD) {
      startGame(`${source}:ivy`);
      return;
    }

    render(`${source}:post`);
  }

  function appendChat(user, text) {
    const item = document.createElement('li');
    item.innerHTML = `<span class="tag">${user}</span>${text}`;
    chatList.prepend(item);
    while (chatList.children.length > 6) chatList.removeChild(chatList.lastChild);
  }

  function emitParticle(type) {
    const layer = eyeRoot.querySelector(`.particle-layer.${type}`);
    if (!layer) return;
    const p = document.createElement('span');
    p.className = `particle ${type}`;
    p.style.left = `${80 + Math.random() * 65}px`;
    p.style.top = `${86 + Math.random() * 56}px`;
    p.style.setProperty('--dx', `${-22 + Math.random() * 44}px`);
    p.style.setProperty('--dy', `${-88 + Math.random() * 52}px`);
    layer.appendChild(p);
    setTimeout(() => p.remove(), 3200);
  }

  function ambient() {
    if (state.mode !== 'lantern') return;
    if (['blissful', 'awakened'].includes(state.renderedState)) {
      if (Math.random() > 0.65) emitParticle('warm');
    } else if (['curious', 'disturbed'].includes(state.renderedState)) {
      emitParticle('warm');
      if (Math.random() > 0.7) emitParticle('ash');
    } else {
      emitParticle('smoke');
      if (Math.random() > 0.48) emitParticle('ash');
      if (Math.random() > 0.84) blink();
    }
  }

  function action(name) {
    const act = String(name || '').toLowerCase();
    if (act === 'blink') blink();
    if (act === 'lookleft') eyeRoot.dataset.look = 'left';
    if (act === 'lookright') eyeRoot.dataset.look = 'right';
    if (act === 'corrupt') { mutateScore(1, 'action:corrupt'); triggerReaction('corrupt'); }
    if (act === 'heal') { mutateScore(-1, 'action:heal'); triggerReaction('heal'); }
    if (act === 'reset') { resetDebug(); setScore(0, 'action:reset'); bloom(); blink(); updateStatus(); }
    if (act === 'ivyburst' && !isIvyCoolingDown()) {
      state.ivyCounter = IVY_THRESHOLD;
      startGame('action:ivyburst');
    }
  }

  function receive(payload = {}) {
    const type = String(payload.type || '').toLowerCase();
    if (type === 'chat' && payload.text) {
      appendChat(payload.user || 'chat', payload.text);
      applyMessageTriggers(payload.text, 'receive:chat');
    }
    if (type === 'action' && payload.action) action(payload.action);
    if (type === 'setscore') setScore(Number(payload.value ?? 0), 'receive:setScore');
    if (type === 'setstate' && payload.state) setState(payload.state, 'receive:setState');
  }

  function handleTypedMessage(rawText) {
    const text = String(rawText || '').trim();
    if (!text) return;
    appendChat('you', text);
    applyMessageTriggers(text, 'local-input');
  }

  function setupTestingInput() {
    if (!testingMode) {
      interactionHeader.hidden = true;
      return;
    }
    overlayRoot.dataset.mode = 'test';
    chatInputForm.hidden = false;
    tinyStatus.hidden = false;
    testControls.hidden = false;

    chatInputForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handleTypedMessage(chatInput.value);
      chatInput.value = '';
      chatInput.focus();
    });

    testControls.addEventListener('click', (event) => {
      const actionName = event.target?.getAttribute('data-test-action');
      if (!actionName) return;
      if (actionName === 'ivy') handleTypedMessage('ivy');
      if (actionName === 'ten-ivy') handleTypedMessage('ivy ivy ivy ivy ivy ivy ivy ivy ivy ivy');
      if (actionName === 'jump') jump();
      if (actionName === 'start' && !state.game.running && !isIvyCoolingDown()) startGame('test:start');
    });
  }

  function bootstrapChat() {
    appendChat('ivy-eye', 'lantern is listening...');
    if (testingMode) appendChat('ivy-eye', 'test mode: use chat + controls to trigger ivy run');
  }

  function setupKeybinds() {
    window.addEventListener('keydown', (event) => {
      if (!state.game.running) return;

      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        jump();
      }
      if (event.code === 'ArrowDown') {
        event.preventDefault();
        setDuck(true);
      }
    });

    window.addEventListener('keyup', (event) => {
      if (!state.game.running) return;
      if (event.code === 'ArrowDown') {
        event.preventDefault();
        setDuck(false);
      }
    });
  }

  function bootstrap() {
    setupTestingInput();
    setupKeybinds();
    bootstrapChat();
    eyeRoot.dataset.look = 'center';
    render('bootstrap');
    state.timers.particles = setInterval(ambient, 170);
  }

  window.ChatEye = {
    receive,
    setScore: (value) => setScore(value, 'api:setScore'),
    setState: (name) => setState(name, 'api:setState'),
    action,
    sendLocalMessage: handleTypedMessage,
    jump
  };

  bootstrap();
})();
