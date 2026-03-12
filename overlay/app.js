(function () {
  const overlayRoot = document.getElementById('overlay-root');
  const eyeRoot = document.getElementById('lantern');
  const chatList = document.getElementById('chat-list');
  const chatInputForm = document.getElementById('chat-input-form');
  const chatInput = document.getElementById('chat-input');
  const tinyStatus = document.getElementById('tiny-status');
  const interactionHeader = document.getElementById('interaction-header');
  const explosionField = document.getElementById('explosion-field');

  const params = new URLSearchParams(window.location.search);
  const testingMode = params.get('test') === '1' || params.get('mode') === 'test' || params.get('preview') === '1';

  const IVY_THRESHOLD = 10;
  const STATE_ORDER = ['blissful', 'awakened', 'curious', 'disturbed', 'corrupted', 'rotting', 'dead'];
  const STATE_ALIAS = { alive: 'awakened', alert: 'curious', zombified: 'dead' };

  const matchConfig = {
    corruptWords: ['ghost','demon','cursed','curse','haunted','haunt','hex','rot','rotten','decay','dead','death','blood','kill','scream','nightmare','hunt','run','shadow','void','evil','possessed','possession','monster','creep','creepy','horror','break','shatter','crack','rage','anger','angry','burn','chaos','abyss','doom','fear','panic','wrath','dark','darkness','violent','insane','mad','destroy','ruin','pain','torment','sinister','malicious','unholy','infected','plague','parasite'],
    healWords: ['love','lovely','cute','cozy','calm','gentle','safe','okay','sweet','warm','bloom','light','hope','kind','peaceful','peace','comfort','serene','tranquil','pretty','soft','hug','healing','heal','rest','home','alive','smile','happy','joy','joyful','bright','angel','sunshine','breathe','relax','adorable','tender','clean'],
    resetWords: ['wake','awaken','revive','reborn','reset','blink','return','restore','renew','rebirth'],
    healPhrases: ['calm down', 'safe place'],
    corruptPhrases: ['fall apart', 'give in']
  };

  const state = {
    testingMode,
    corruptionScore: 0,
    ivyCounter: 0,
    renderedState: 'awakened',
    exploding: false,
    overloadPhase: null,
    pendingMessages: [],
    debug: { matchedCorrupt: [], matchedHeal: [], ivyHits: 0, resetTriggered: false, explosionTriggered: false, delta: 0 },
    timers: { particles: null, blinkCleanup: null, bloomCleanup: null, reactionCleanup: null, explosionCleanup: null }
  };

  const clampScore = (v) => Math.max(-3, Math.min(12, Math.round(v)));

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
    state.debug = { matchedCorrupt: [], matchedHeal: [], ivyHits: 0, resetTriggered: false, explosionTriggered: false, delta: 0 };
  }

  function updateStatus() {
    if (!testingMode) return;
    if (state.overloadPhase) {
      tinyStatus.textContent = `TEST • IVY OVERLOAD • PHASE: ${state.overloadPhase.toUpperCase()}`;
      return;
    }
    const c = state.debug.matchedCorrupt.length ? state.debug.matchedCorrupt.join(',') : '-';
    const h = state.debug.matchedHeal.length ? state.debug.matchedHeal.join(',') : '-';
    const d = state.debug.delta > 0 ? `+${state.debug.delta}` : `${state.debug.delta}`;
    tinyStatus.textContent = `TEST • SCORE: ${state.corruptionScore} • STATE: ${state.renderedState.toUpperCase()} • IVY: ${state.ivyCounter}/${IVY_THRESHOLD} • CORRUPT: ${c} • HEAL: ${h} • IVYHITS: x${state.debug.ivyHits} • RESET: ${state.debug.resetTriggered ? 'yes' : 'no'} • EXPLODE: ${state.debug.explosionTriggered ? 'yes' : 'no'} • DELTA: ${d}`;
  }

  function render(reason = 'render') {
    if (state.exploding) return;
    const derived = deriveStateFromScore();
    STATE_ORDER.forEach((name) => eyeRoot.classList.remove(`state-${name}`));
    eyeRoot.classList.add(`state-${derived}`);
    overlayRoot.dataset.state = derived;
    state.renderedState = derived;

    for (let i = 0; i <= 10; i += 1) eyeRoot.classList.remove(`ivy-level-${i}`);
    eyeRoot.classList.add(`ivy-level-${Math.max(0, Math.min(10, state.ivyCounter))}`);

    updateStatus();
    console.log(`[ChatEye] state=${derived} score=${state.corruptionScore} ivy=${state.ivyCounter} reason=${reason}`);
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
    eyeRoot.classList.remove('react-heal', 'react-corrupt', 'react-ivy');
    const cls = kind === 'corrupt' ? 'react-corrupt' : (kind === 'ivy' ? 'react-ivy' : 'react-heal');
    requestAnimationFrame(() => eyeRoot.classList.add(cls));
    clearTimeout(state.timers.reactionCleanup);
    state.timers.reactionCleanup = setTimeout(() => eyeRoot.classList.remove('react-heal', 'react-corrupt', 'react-ivy'), 420);
  }

  function setScore(value, reason = 'setScore') {
    state.corruptionScore = clampScore(value);
    render(reason);
  }

  function mutateScore(delta, reason = 'mutate') {
    setScore(state.corruptionScore + delta, reason);
  }

  function setState(nextStateRaw, reason = 'setState') {
    const alias = String(nextStateRaw || '').toLowerCase();
    const normalized = STATE_ALIAS[alias] || alias;
    if (!STATE_ORDER.includes(normalized)) return;
    setScore(stateToScore(normalized), reason);
  }

  function tokenize(text) {
    return String(text || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  }

  function emitExternalDebris(amount = 30) {
    if (!explosionField) return;
    for (let i = 0; i < amount; i += 1) {
      const r = Math.random();
      const type = r > 0.7 ? 'ember' : (r > 0.35 ? 'shard' : (r > 0.12 ? 'spore' : 'smoke'));
      const d = document.createElement('span');
      d.className = `debris ${type}`;
      d.style.left = `${108 + (Math.random() * 32 - 16)}px`;
      d.style.top = `${98 + (Math.random() * 20 - 10)}px`;
      d.style.setProperty('--dx', `${(Math.random() * 2 - 1) * 220}px`);
      d.style.setProperty('--dy', `${(Math.random() * -190) - 15}px`);
      d.style.animationDuration = `${1000 + Math.random() * 1000}ms`;
      explosionField.appendChild(d);
      setTimeout(() => d.remove(), 2300);
    }
  }

  function emitRubblePieces(amount = 16) {
    if (!explosionField) return;
    for (let i = 0; i < amount; i += 1) {
      const d = document.createElement('span');
      d.className = 'debris rubble';
      d.style.left = `${96 + (Math.random() * 56 - 18)}px`;
      d.style.top = `${172 + Math.random() * 16}px`;
      d.style.setProperty('--dx', `${(Math.random() * 2 - 1) * 28}px`);
      d.style.setProperty('--dy', `${20 + Math.random() * 14}px`);
      d.style.animationDuration = `${1400 + Math.random() * 800}ms`;
      explosionField.appendChild(d);
      setTimeout(() => d.remove(), 4200);
    }
  }

  function performIvyExplosion(source = 'ivyOverload') {
    if (state.exploding) return;
    state.exploding = true;
    state.debug.explosionTriggered = true;
    state.overloadPhase = 'charge';
    updateStatus();

    eyeRoot.classList.remove('explode-charge', 'explode-overload', 'explode-detonation', 'explode-afterflash', 'explode-aftermath', 'explode-rebirth');
    eyeRoot.classList.add('explode-charge');
    burst('stress');

    const phase = (name, className) => {
      state.overloadPhase = name;
      updateStatus();
      eyeRoot.classList.remove('explode-charge', 'explode-overload', 'explode-detonation', 'explode-afterflash', 'explode-aftermath', 'explode-rebirth');
      eyeRoot.classList.add(className);
    };

    setTimeout(() => {
      phase('overload', 'explode-overload');
      burst('stress');
    }, 430);

    setTimeout(() => {
      phase('detonation', 'explode-detonation');
      burst('stress');
      emitExternalDebris(52);
      emitRubblePieces(10);
    }, 980);

    setTimeout(() => {
      phase('afterflash', 'explode-afterflash');
      emitExternalDebris(16);
      emitRubblePieces(4);
    }, 1480);

    setTimeout(() => {
      phase('aftermath', 'explode-aftermath');
      emitRubblePieces(3);
    }, 2060);

    clearTimeout(state.timers.explosionCleanup);
    state.timers.explosionCleanup = setTimeout(() => {
      phase('rebirth', 'explode-rebirth');
      state.corruptionScore = 0;
      state.ivyCounter = 0;
      state.exploding = false;
      state.overloadPhase = null;
      eyeRoot.classList.remove('explode-charge', 'explode-overload', 'explode-detonation', 'explode-afterflash', 'explode-aftermath', 'explode-rebirth');
      render(`${source}:rebirth`);
      bloom();
      blink();
      updateStatus();

      if (state.pendingMessages.length) {
        const queued = [...state.pendingMessages];
        state.pendingMessages = [];
        queued.forEach((msg) => applyMessageTriggers(msg, 'queued'));
      }
    }, 3380);
  }

  function applyPhraseMatches(normalizedText) {
    for (const phrase of matchConfig.healPhrases) {
      if (normalizedText.includes(phrase)) {
        state.debug.matchedHeal.push(phrase);
        state.debug.delta -= 1;
      }
    }
    for (const phrase of matchConfig.corruptPhrases) {
      if (normalizedText.includes(phrase)) {
        state.debug.matchedCorrupt.push(phrase);
        state.debug.delta += 1;
      }
    }
  }

  function applyMessageTriggers(text, source = 'chat') {
    if (state.exploding) {
      state.pendingMessages.push(String(text || ''));
      return;
    }

    resetDebug();
    const normalizedText = String(text || '').toLowerCase().replace(/[^a-z\s]/g, ' ');
    const words = tokenize(normalizedText);
    applyPhraseMatches(normalizedText);

    for (const word of words) {
      if (word === 'ivy') {
        state.ivyCounter += 1;
        state.debug.ivyHits += 1;
        triggerReaction('ivy');
        continue;
      }
      if (matchConfig.corruptWords.includes(word)) {
        state.debug.matchedCorrupt.push(word);
        state.debug.delta += 1;
      }
      if (matchConfig.healWords.includes(word)) {
        state.debug.matchedHeal.push(word);
        state.debug.delta -= 1;
      }
      if (matchConfig.resetWords.includes(word)) state.debug.resetTriggered = true;
    }

    if (state.debug.resetTriggered) {
      setScore(0, `${source}:resetWord`);
      bloom();
      blink();
    } else if (state.debug.delta !== 0) {
      mutateScore(state.debug.delta, `${source}:delta(${state.debug.delta})`);
      if (state.debug.delta > 0) {
        triggerReaction('corrupt');
        burst(state.corruptionScore >= 7 ? 'stress' : 'pulse');
      }
      if (state.debug.delta < 0) {
        triggerReaction('heal');
        bloom();
      }
    }

    if (state.ivyCounter >= IVY_THRESHOLD) {
      performIvyExplosion(`${source}:ivy`);
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
    if (state.exploding) return;
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
    if (act === 'reset') { resetDebug(); state.debug.resetTriggered = true; setScore(0, 'action:reset'); bloom(); blink(); updateStatus(); }
    if (act === 'explode' || act === 'ivyburst') performIvyExplosion(`action:${act}`);
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
    chatInputForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handleTypedMessage(chatInput.value);
      chatInput.value = '';
      chatInput.focus();
    });
  }

  function bootstrapChat() {
    appendChat('ivy-eye', 'the lantern creature is listening.');
    if (testingMode) appendChat('ivy-eye', 'test: love love / shadow ghost / ivy ivy ivy / wake');
  }

  function bootstrap() {
    setupTestingInput();
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
    sendLocalMessage: handleTypedMessage
  };

  bootstrap();
})();
