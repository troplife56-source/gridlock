/* Gridlock — logique du jeu : carte, plateau, glisser-déposer, coups limités, pièces,
   garage, atelier (éditeur de niveaux) et installation sur l'écran d'accueil */
(function () {
  'use strict';
  const S = window.Solver, Art = window.Art, LEVELS = window.LEVELS;
  const $ = (id) => document.getElementById(id);
  const UNIT = 100 / S.SIZE;

  // ---------- Chapitres ----------
  const CHAPTERS = [
    { name: 'Le Centre-ville', slack: 0.6 },
    { name: 'Le Port', slack: 0.45 },
    { name: "L'Aéroport", slack: 0.35 },
    { name: 'La Ville de nuit', slack: 0.28 },
    { name: 'Le Grand Prix', slack: 0.22 },
  ];
  const PER = Math.ceil(LEVELS.length / CHAPTERS.length);
  const chapterOf = (i) => Math.min(CHAPTERS.length - 1, Math.floor(i / PER));

  const TIPS = [
    "Astuce : pars de la sortie. Qu'est-ce qui bloque ta voiture, et qu'est-ce qui bloque ce véhicule ?",
    'Astuce : un camion de 3 cases ne peut libérer une ligne que tout en haut ou tout en bas du parking.',
    'Astuce : avant de bouger, cherche les cases vides. Ce sont elles qui permettent tout.',
    'Astuce : un véhicule déplacé trop loin peut en bloquer un autre. Pousse-le juste assez.',
    'Astuce : chaque glissement compte pour un coup, quelle que soit la distance. Profites-en.',
    "Astuce : si tu tournes en rond, recommence. Un nouveau plan coûte moins cher qu'un indice.",
  ];

  // ---------- Garage ----------
  const CARS = [
    { id: 'sport-rouge', name: 'Bolide rouge', model: 'hero', colors: ['#ff5a4c', '#c4211d', '#8c1512', '#ffffff'], price: 0 },
    { id: 'sport-bleu', name: 'Bolide bleu', model: 'hero', colors: ['#4aa3ff', '#1d62c9', '#123f80', '#ffffff'], price: 150 },
    { id: 'retro-menthe', name: 'Rétro menthe', model: 'retro', colors: ['#8fe8c8', '#3fb48c', '#2b8566'], price: 200 },
    { id: 'retro-rose', name: 'Rétro rose', model: 'retro', colors: ['#ffa9d6', '#e0609f', '#b8447e'], price: 250 },
    { id: 'sport-nuit', name: 'Bolide nuit', model: 'hero', colors: ['#4a4e5a', '#1b1d23', '#0d0e12', '#ffc93c'], price: 300 },
    { id: 'police', name: 'Police', model: 'police', colors: ['#f7f9fc', '#c5ced9', '#8d99a8'], price: 400 },
    { id: 'f1-rouge', name: 'Formule rouge', model: 'f1', colors: ['#ff3b30', '#b3150f', '#7a0d09', '#ffffff'], price: 600 },
    { id: 'f1-verte', name: 'Formule verte', model: 'f1', colors: ['#2fd17a', '#118a4a', '#0a5c30', '#ffe14d'], price: 800 },
    { id: 'sport-or', name: 'Bolide en or', model: 'hero', colors: ['#ffe27a', '#d6a21a', '#9b7208', '#1d1d1f'], price: 1200 },
  ];
  const skin = () => CARS.find((c) => c.id === save.skin) || CARS[0];

  // ---------- Sauvegarde ----------
  const KEY = 'gridlock-save-v2';
  const save = { stars: {}, best: {}, coins: 100, sound: true, video: false, daily: {}, skin: 'sport-rouge', owned: ['sport-rouge'], mine: [] };
  try { Object.assign(save, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} };
  const unlocked = (i) => save.video || i === 0 || !!save.stars[i - 1] || !!save.stars[i];
  const nextLevel = () => { for (let i = 0; i < LEVELS.length; i++) if (!save.stars[i]) return i; return LEVELS.length - 1; };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function dailyIndex() {
    const d = new Date();
    const n = (d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) >>> 0;
    const from = Math.floor(LEVELS.length * 0.55);
    return from + (Math.imul(n, 2654435761) >>> 0) % (LEVELS.length - from);
  }

  // ---------- Son et vibrations ----------
  let actx = null;
  function tone(f, dur, type, vol, when, slide) {
    if (!save.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + (when || 0);
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  const buzz = (ms) => { try { if (save.sound && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
  const sfx = {
    pick: () => tone(420, 0.06, 'triangle', 0.05),
    move: () => { tone(160, 0.12, 'sawtooth', 0.025, 0, 90); tone(620, 0.05, 'triangle', 0.04, 0.04); },
    bump: () => { tone(110, 0.1, 'square', 0.05, 0, 70); buzz(25); },
    gate: () => tone(300, 0.25, 'triangle', 0.05, 0, 600),
    vroom: () => { tone(90, 0.55, 'sawtooth', 0.05, 0, 340); buzz([30, 40, 60]); },
    star: (k) => tone([660, 830, 990][k], 0.22, 'triangle', 0.08),
    coin: () => { tone(1320, 0.08, 'square', 0.03); tone(1760, 0.12, 'square', 0.03, 0.07); },
    fail: () => [392, 330, 262].forEach((f, k) => tone(f, 0.25, 'triangle', 0.07, k * 0.16)),
    place: () => tone(520, 0.07, 'triangle', 0.05),
  };

  // ---------- Pièces ----------
  function renderCoins(bump) {
    document.querySelectorAll('.coins').forEach((el) => {
      el.querySelector('span').textContent = save.coins;
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
  }
  function spend(n) {
    if (save.video) return true;
    if (save.coins < n) return false;
    save.coins -= n; persist(); renderCoins(true); return true;
  }

  // ---------- Peinture du parking ----------
  let asphaltURL = null;
  function asphalt() {
    if (asphaltURL !== null) return asphaltURL;
    try {
      const c = document.createElement('canvas'); c.width = c.height = 160;
      const x = c.getContext('2d'), img = x.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 52 + Math.random() * 22 + (Math.random() < 0.03 ? 30 : 0);
        img.data[i] = v; img.data[i + 1] = v + 3; img.data[i + 2] = v + 12; img.data[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      asphaltURL = c.toDataURL();
    } catch (e) { asphaltURL = ''; }
    return asphaltURL;
  }
  function paintLot(svg, lot) {
    let s = '';
    for (let k = 1; k < 6; k++) {
      s += `<path d="M${k * 50} 6V294" stroke="#fff" stroke-opacity=".16" stroke-width="2" stroke-dasharray="14 10"/>`;
      if (k !== 2 && k !== 3) s += `<path d="M6 ${k * 50}H294" stroke="#fff" stroke-opacity=".16" stroke-width="2" stroke-dasharray="14 10"/>`;
    }
    s += '<path d="M4 100H296M4 150H296" stroke="#ffc93c" stroke-opacity=".55" stroke-width="2.5"/>';
    for (let x = 30; x < 290; x += 52) s += `<path d="M${x} 114l12 11-12 11" fill="none" stroke="#ffc93c" stroke-opacity=".22" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
    svg.innerHTML = s;
    if (asphalt()) lot.style.backgroundImage = `url(${asphalt()})`;
  }

  // ---------- Apparence des véhicules ----------
  const COLORS = [
    ['#4aa3ff', '#1d62c9', '#174f9e'], ['#7fd84a', '#3f9a1d', '#2f7613'], ['#a785ff', '#6a43d6', '#5532b0'],
    ['#3fd6c6', '#169488', '#0f7067'], ['#ff9d3c', '#d8641a', '#ab4c10'], ['#ff7cc8', '#c93c92', '#a02c74'],
    ['#f4f6f9', '#bcc5d0', '#98a3b1'], ['#5a6cff', '#3341c4', '#2833a0'],
  ];
  const TAXI = ['#ffd23f', '#e0a400', '#b88400'];
  function look(seed, i, v) {
    if (i === 0) { const k = skin(); return { kind: k.model, colors: k.colors, facing: 'right' }; }
    let h = Math.imul(seed + 1, 73856093) ^ Math.imul(i + 1, 19349663);
    const r = () => ((h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) % 1000) / 1000;
    const facing = v.horiz ? (r() < 0.5 ? 'right' : 'left') : (r() < 0.5 ? 'up' : 'down');
    const t = r();
    const kind = v.len === 3 ? (t < 0.55 ? 'truck' : 'bus') : (t < 0.16 ? 'taxi' : t < 0.42 ? 'van' : 'sedan');
    const colors = kind === 'taxi' ? TAXI : COLORS[Math.floor(r() * COLORS.length)];
    return { kind, colors, facing };
  }
  const hashStr = (s) => { let h = 7; for (let k = 0; k < s.length; k++) h = (Math.imul(h, 31) + s.charCodeAt(k)) >>> 0; return h % 100000; };
  function vehicleEl(seed, i, v) {
    const el = document.createElement('div');
    el.className = 'veh' + (i === 0 ? ' hero' : '');
    const L = look(seed, i, v);
    el.innerHTML = '<div class="inner">' + Art.vehicle(L.kind, v.len, v.horiz, L.facing, L.colors) + '</div>';
    el.style.width = (v.horiz ? v.len : 1) * UNIT + '%';
    el.style.height = (v.horiz ? 1 : v.len) * UNIT + '%';
    return el;
  }
  function coneEl(w) {
    const el = document.createElement('div');
    el.className = 'cone';
    el.style.cssText = `left:${(w % 6) * UNIT}%;top:${Math.floor(w / 6) * UNIT}%;width:${UNIT}%;height:${UNIT}%`;
    el.innerHTML = Art.cone();
    return el;
  }
  function placeEl(el, v, pos) {
    if (v.horiz) { el.style.left = pos * UNIT + '%'; el.style.top = v.fixed * UNIT + '%'; }
    else { el.style.top = pos * UNIT + '%'; el.style.left = v.fixed * UNIT + '%'; }
  }

  // ---------- Niveaux ----------
  // Un niveau : { kind: 'campaign' | 'daily' | 'custom', index?, board, opt, code?, fromEditor? }
  const campaign = (i) => ({ kind: 'campaign', index: i, board: LEVELS[i][0], opt: LEVELS[i][1] });
  const daily = () => { const i = dailyIndex(); return { kind: 'daily', index: i, board: LEVELS[i][0], opt: LEVELS[i][1] }; };
  function rules(L) {
    const f = L.kind === 'custom' ? 0.4 : CHAPTERS[chapterOf(L.index)].slack;
    const slack = Math.max(L.kind === 'custom' ? 3 : 2, Math.ceil(L.opt * f));
    return { limit: L.opt + slack, two: L.opt + Math.ceil(slack / 2) };
  }

  // ---------- Partie ----------
  let G = null, timer = null;

  function loadLevel(L, opts) {
    opts = opts || {};
    const vehicles = S.parse(L.board);
    G = {
      L, vehicles, opt: L.opt, ...rules(L),
      seed: L.kind === 'custom' ? hashStr(L.board) : L.index,
      state: opts.state || vehicles.map((v) => v.pos),
      history: opts.history || [], used: opts.used || 0, bonus: opts.bonus || 0,
      hinted: !!opts.hinted, elapsed: opts.elapsed || 0, start: null,
      over: false, busy: false, els: [],
    };
    const custom = L.kind === 'custom';
    document.body.dataset.ch = custom ? 2 : chapterOf(L.index);
    $('lvl-name').textContent = L.kind === 'daily' ? 'Défi du jour' : custom ? (L.fromEditor ? 'Test de ton niveau' : 'Niveau partagé') : 'Niveau ' + (L.index + 1);
    $('lvl-sub').textContent = custom ? (L.code || 'Atelier') : CHAPTERS[chapterOf(L.index)].name;
    $('btn-solve').hidden = !save.video;
    $('controls').classList.toggle('four', save.video);
    $('hint-price').hidden = save.video;
    $('gate').classList.remove('open');
    let tip = custom ? 'Niveau créé dans l\'Atelier. Solution parfaite : ' + L.opt + ' coups.' : TIPS[L.index % TIPS.length];
    if (!custom && L.index === 0) tip = "Fais glisser les véhicules pour ouvrir un passage, puis amène ta voiture jusqu'à la barrière.";
    else if (!custom && vehicles.walls.length && !LEVELS.slice(0, L.index).some((l) => l[0].includes('x'))) tip = 'Nouveau : les cônes ne bougent jamais. Il faudra les contourner.';
    else if (!custom && vehicles.walls.length && L.index % 3 === 0) tip = 'Les cônes ne bougent jamais. Ils réduisent les cases libres : chaque coup compte.';
    $('tip').textContent = tip;
    buildBoard();
    renderHud();
    show('game');
    if (!opts.state) track('level_start', { level_type: L.kind, level: custom ? L.code : L.index + 1 });
    clearInterval(timer); timer = setInterval(renderTime, 250);
  }

  function buildBoard() {
    const lot = $('lot');
    lot.querySelectorAll('.veh, .cone, .ghost').forEach((n) => n.remove());
    for (const w of G.vehicles.walls) lot.appendChild(coneEl(w));
    G.vehicles.forEach((v, i) => {
      const el = vehicleEl(G.seed, i, v);
      el.dataset.i = i;
      el.setAttribute('aria-label', i === 0 ? 'Ta voiture' : 'Véhicule');
      el.addEventListener('pointerdown', onDown);
      lot.appendChild(el);
      G.els[i] = el;
      placeEl(el, v, G.state[i]);
    });
  }
  const place = (i, pos) => placeEl(G.els[i], G.vehicles[i], pos);

  // ---------- Glisser-déposer ----------
  let drag = null;
  function onDown(e) {
    if (!G || G.over || G.busy || drag) return;
    e.preventDefault();
    const i = Number(e.currentTarget.dataset.i), el = G.els[i];
    el.setPointerCapture(e.pointerId);
    const [lo, hi] = S.range(G.vehicles, G.state, i);
    drag = { i, el, lo, hi, from: G.state[i], pos: G.state[i], x: e.clientX, y: e.clientY, cell: $('lot').clientWidth / S.SIZE, hit: false };
    el.classList.add('dragging');
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    clearHint(); sfx.pick();
  }
  function onMove(e) {
    if (!drag) return;
    const v = G.vehicles[drag.i];
    let p = drag.from + (v.horiz ? e.clientX - drag.x : e.clientY - drag.y) / drag.cell;
    const out = p < drag.lo - 0.12 || p > drag.hi + 0.12;
    if (out && !drag.hit) { sfx.bump(); drag.el.classList.remove('shake'); void drag.el.offsetWidth; drag.el.classList.add('shake'); }
    drag.hit = out;
    p = Math.max(drag.lo, Math.min(drag.hi, p));
    drag.pos = p; place(drag.i, p);
  }
  function onUp() {
    if (!drag) return;
    const { i, el } = drag, target = Math.round(drag.pos);
    el.classList.remove('dragging');
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    drag = null;
    commit(i, target);
  }
  function commit(i, target, auto) {
    const from = G.state[i];
    place(i, target);
    if (target === from) return;
    G.history.push([i, from]);
    G.state[i] = target;
    G.used++;
    if (!G.start) G.start = Date.now();
    sfx.move();
    renderHud();
    if (S.isGoal(G.state)) win(auto);
    else if (left() <= 0 && !auto) { G.over = true; setTimeout(fail, 380); }
  }
  const left = () => G.limit + G.bonus - G.used;

  // ---------- Commandes ----------
  function undo() {
    if (!G || G.over || G.busy || !G.history.length) return;
    const [i, from] = G.history.pop();
    G.state[i] = from; place(i, from); clearHint(); sfx.move(); renderHud();
  }
  function reset() { if (G && !G.busy) loadLevel(G.L); }

  function hint() {
    if (!G || G.over || G.busy) return;
    const path = S.solve(G.vehicles, G.state);
    if (!path || !path.length) return;
    if (path.length > left() && !save.video) {
      $('tip').textContent = 'Il faut encore ' + path.length + " coups et il ne t'en reste que " + left() + '. Recommence le niveau.';
      return;
    }
    if (!spend(25)) { $('tip').textContent = 'Un indice coûte 25 pièces. Gagne des pièces en terminant des niveaux.'; return; }
    G.hinted = true;
    track('hint_used', { level: G.L.kind === 'custom' ? G.L.code : G.L.index + 1 });
    const [i, p] = path[0], v = G.vehicles[i], el = G.els[i];
    clearHint();
    el.classList.add('hint');
    const ghost = document.createElement('div');
    ghost.className = 'ghost'; ghost.innerHTML = '<div></div>';
    ghost.style.width = el.style.width; ghost.style.height = el.style.height;
    placeEl(ghost, v, p);
    $('lot').appendChild(ghost);
    $('tip').textContent = "Glisse le véhicule qui brille jusqu'au cadre pointillé. Solution parfaite : encore " + path.length + ' coups.';
    sfx.coin();
  }
  function clearHint() {
    if (!G) return;
    G.els.forEach((el) => el.classList.remove('hint'));
    $('lot').querySelectorAll('.ghost').forEach((n) => n.remove());
  }
  async function playSolution() {
    if (!G || G.over || G.busy) return;
    const path = S.solve(G.vehicles, G.state);
    if (!path) return;
    G.busy = true; G.hinted = true; clearHint();
    $('tip').textContent = 'Solution optimale : ' + path.length + ' coups.';
    const me = G;
    for (const [i, p] of path) {
      await new Promise((r) => setTimeout(r, 520));
      if (G !== me || !G.busy) return;
      G.els[i].classList.add('hint');
      commit(i, p, true);
      setTimeout(() => me.els[i] && me.els[i].classList.remove('hint'), 400);
    }
  }

  // ---------- Fin de partie ----------
  function win(auto) {
    G.over = true; G.busy = false; G.elapsed = elapsed();
    clearInterval(timer); renderTime();
    const me = G, L = G.L;
    $('gate').classList.add('open'); sfx.gate();
    setTimeout(() => { if (G !== me) return; const h = G.els[0]; h.classList.add('leaving'); h.style.left = '135%'; sfx.vroom(); }, 260);

    let stars = G.used <= G.opt ? 3 : G.used <= G.two ? 2 : 1;
    if (G.hinted) stars = Math.min(stars, 2);
    if (auto && L.kind === 'campaign') stars = 0;
    let reward = 0;
    if (L.kind === 'daily') {
      if (!save.daily[today()] && stars > 0) { reward = 50; save.daily[today()] = stars; }
    } else if (L.kind === 'campaign' && stars > 0) {
      const old = save.stars[L.index] || 0;
      if (stars > old) reward = (old ? 0 : 10) + 5 * (stars - old);
      save.stars[L.index] = Math.max(old, stars);
      if (!save.best[L.index] || G.used < save.best[L.index]) save.best[L.index] = G.used;
    }
    if (save.video) reward = 0;
    save.coins += reward; persist();
    track('level_complete', { level_type: L.kind, level: L.kind === 'custom' ? L.code : L.index + 1, moves: G.used, optimal: G.opt, stars, hint: G.hinted, seconds: Math.round(G.elapsed / 1000) });

    setTimeout(() => {
      if (G !== me) return;
      $('win-title').textContent = stars === 3 ? 'Parfait !' : stars === 0 ? 'Solution' : 'Sorti !';
      $('win-moves').textContent = G.used;
      $('win-opt').textContent = G.opt;
      $('win-time').textContent = fmt(G.elapsed);
      $('win-text').textContent = stars === 3 ? 'Tu as trouvé la solution la plus courte possible.'
        : stars === 0 ? 'Rejoue-le sans aide pour gagner des étoiles.'
        : G.hinted ? 'Sans indice et en ' + G.opt + ' coups, tu décroches les 3 étoiles.'
        : 'La solution parfaite tient en ' + G.opt + ' coups. Tu peux faire mieux.';
      $('win-reward').hidden = reward === 0;
      $('win-reward').querySelector('span').textContent = '+' + reward;
      const next = $('win-next');
      if (L.kind === 'campaign') { next.hidden = L.index >= LEVELS.length - 1; next.textContent = 'Suivant'; }
      else if (L.kind === 'custom') { next.hidden = false; next.textContent = L.fromEditor ? 'Modifier' : 'Créer le mien'; }
      else next.hidden = true;
      $('win-retry').textContent = L.kind === 'daily' ? 'Carte' : 'Rejouer';
      const st = [...$('win-stars').children];
      st.forEach((s) => { s.classList.remove('on', 'off'); s.style.color = '#d5dce5'; });
      $('win').hidden = false;
      st.forEach((s, k) => setTimeout(() => {
        if (k < stars) { s.style.color = '#ffc93c'; s.classList.add('on'); sfx.star(k); } else s.classList.add('off');
      }, 250 + k * 260));
      if (reward) setTimeout(() => { renderCoins(true); sfx.coin(); }, 1100);
      if (stars > 0) setTimeout(confetti, 300);
    }, 900);
  }
  function fail() {
    clearInterval(timer);
    track('level_fail', { level_type: G.L.kind, level: G.L.kind === 'custom' ? G.L.code : G.L.index + 1 });
    sfx.fail();
    $('fail-more').disabled = !save.video && save.coins < 30;
    $('fail').hidden = false;
  }

  // ---------- Affichage du jeu ----------
  const elapsed = () => (G.over ? G.elapsed : G.start ? G.elapsed + Date.now() - G.start : G.elapsed);
  const fmt = (ms) => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function renderTime() { if (G) $('timer').textContent = fmt(elapsed()); }
  function renderHud() {
    const total = G.limit + G.bonus, l = Math.max(0, left());
    $('moves-left').textContent = l;
    $('meter-bar').style.strokeDashoffset = 169.6 * (1 - l / total);
    const m = $('meter');
    m.classList.toggle('danger', l <= 3);
    m.classList.toggle('warn', l > 3 && l <= Math.ceil(total * 0.3));
    const u = G.used;
    $('targets').innerHTML =
      `<span class="${u > G.opt || G.hinted ? 'lost' : ''}"><b>★★★</b> ${G.opt}</span>` +
      `<span class="${u > G.two ? 'lost' : ''}"><b>★★</b> ${G.two}</span>` +
      `<span><b>★</b> ${G.limit}</span>`;
    $('btn-undo').disabled = !G.history.length;
    renderTime();
  }

  const SCREENS = ['menu', 'game', 'garage', 'editor'];
  function show(screen) {
    SCREENS.forEach((s) => { $(s).hidden = s !== screen; });
    document.querySelectorAll('.overlay').forEach((o) => { o.hidden = true; });
    if (screen !== 'game') { clearInterval(timer); if (G) G.busy = false; }
    if (screen === 'menu') { document.body.dataset.ch = chapterOf(nextLevel()); renderMap(); }
    if (screen === 'garage') { document.body.dataset.ch = 0; renderGarage(); }
    if (screen === 'editor') { document.body.dataset.ch = 2; renderEditor(); }
    if (screen !== 'menu') window.scrollTo(0, 0);
    if (screen !== 'game' && location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
    renderCoins();
  }

  // ---------- Carte ----------
  function heroSvg(viewBox) {
    const k = skin();
    return `<svg class="pin" viewBox="${viewBox || '0 0 100 50'}">` + Art.vehicle(k.model, 2, true, 'right', k.colors).replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</svg>';
  }
  function renderMap() {
    const map = $('map');
    const W = map.clientWidth || 360;
    const STEP = 92, SIGN = 170;
    const pts = [];
    let y = 70;
    for (let i = 0; i < LEVELS.length; i++) {
      if (i % PER === 0) y += SIGN;
      pts.push([W / 2 + Math.sin(i * 0.85) * W * 0.3, y]);
      y += STEP;
    }
    map.style.height = y + 'px';
    const all = [[W / 2, 0], ...pts];
    let d = `M${all[0][0]} ${all[0][1]}`;
    for (let k = 0; k < all.length - 1; k++) {
      const p0 = all[k - 1] || all[k], p1 = all[k], p2 = all[k + 1], p3 = all[k + 2] || p2;
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
    }
    let html = `<svg class="road" viewBox="0 0 ${W} ${y}" preserveAspectRatio="none">
      <path d="${d}" fill="none" stroke="#0b1a3a" stroke-opacity=".18" stroke-width="58" stroke-linecap="round" transform="translate(0 6)"/>
      <path d="${d}" fill="none" stroke="#c9ced6" stroke-width="58" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#454b58" stroke-width="48" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="3.5" stroke-dasharray="14 14"/></svg>`;
    const next = nextLevel();
    CHAPTERS.forEach((c, ci) => {
      const first = ci * PER;
      if (first >= LEVELS.length) return;
      const ids = LEVELS.map((l, i) => i).filter((i) => chapterOf(i) === ci);
      const got = ids.reduce((s, i) => s + (save.stars[i] || 0), 0);
      html += `<div class="chapter-sign" style="top:${pts[first][1] - 112}px"><small>Chapitre ${ci + 1}</small><b>${c.name}</b><span class="count">★ ${got} sur ${ids.length * 3}</span></div>`;
    });
    const pin = heroSvg();
    pts.forEach(([x, py], i) => {
      const st = save.stars[i] || 0, open = unlocked(i), cur = i === next && open;
      const cls = 'node' + (st ? ' done' : '') + (!open ? ' locked' : '') + (cur ? ' current' : '');
      const stars = st ? `<span class="st">${'★'.repeat(st)}<i>${'★'.repeat(3 - st)}</i></span>` : '';
      html += `<button class="${cls}" style="left:${x}px;top:${py}px" data-i="${i}" ${open ? '' : 'disabled'} aria-label="Niveau ${i + 1}${st ? ', ' + st + ' étoiles' : ''}${open ? '' : ', verrouillé'}">${i + 1}${stars}${cur ? pin : ''}</button>`;
    });
    map.innerHTML = html;
    map.querySelectorAll('.node:not(.locked)').forEach((b) => b.addEventListener('click', () => loadLevel(campaign(Number(b.dataset.i)))));
    $('btn-play').textContent = 'Jouer le niveau ' + (next + 1);
    const di = dailyIndex(), done = save.daily[today()];
    $('daily-day').textContent = new Date().getDate();
    $('daily-sub').textContent = done ? "Réussi aujourd'hui. Reviens demain pour un nouveau défi." : LEVELS[di][1] + ' coups minimum, 50 pièces à gagner';
    $('btn-daily').classList.toggle('done', !!done);
    $('daily-go').textContent = done ? '★'.repeat(done) : 'Jouer';
    $('garage-sub').textContent = skin().name;
    renderInstall();
    requestAnimationFrame(() => {
      const cur = map.querySelector('.current');
      if (cur && !renderMap.scrolled) { renderMap.scrolled = true; window.scrollTo(0, cur.getBoundingClientRect().top + scrollY - innerHeight * 0.45); }
    });
  }

  // ---------- Garage ----------
  function renderGarage() {
    const k = skin();
    $('showroom-car').innerHTML = Art.vehicle(k.model, 2, true, 'right', k.colors);
    $('showroom-name').textContent = k.name;
    const grid = $('garage-grid');
    grid.innerHTML = '';
    CARS.forEach((c) => {
      const owned = save.owned.includes(c.id) || c.price === 0, eq = c.id === k.id;
      const card = document.createElement('div');
      card.className = 'car-card' + (eq ? ' equipped' : '');
      card.innerHTML = `<div class="pv"><div>${Art.vehicle(c.model, 2, true, 'right', c.colors)}</div></div><b>${c.name}</b>`;
      if (eq) card.insertAdjacentHTML('beforeend', '<span class="tag">Au volant</span>');
      else {
        const b = document.createElement('button');
        b.className = 'chunky' + (owned ? '' : ' yellow');
        if (owned) b.textContent = 'Choisir';
        else {
          b.innerHTML = `<svg class="coin"><use href="#i-coin"/></svg>${c.price}`;
          b.setAttribute('aria-label', 'Acheter ' + c.name + ' pour ' + c.price + ' pièces');
          if (!save.video && save.coins < c.price) b.disabled = true;
        }
        b.addEventListener('click', () => {
          if (!owned) { if (!spend(c.price)) return; save.owned.push(c.id); sfx.coin(); track('car_unlocked', { car: c.id }); }
          save.skin = c.id; persist(); sfx.vroom(); renderGarage();
        });
        card.appendChild(b);
      }
      grid.appendChild(card);
    });
  }

  // ---------- Atelier ----------
  const TOOLS = [
    { t: 0, label: 'Toi', aria: 'Ta voiture' },
    { t: 1, label: 'Auto ↔', aria: 'Voiture horizontale' },
    { t: 2, label: 'Auto ↕', aria: 'Voiture verticale' },
    { t: 3, label: 'Camion ↔', aria: 'Camion horizontal' },
    { t: 4, label: 'Camion ↕', aria: 'Camion vertical' },
    { t: 5, label: 'Cône', aria: 'Cône fixe' },
  ];
  const ED_KEY_START = LEVELS[4][0];
  const ed = { pieces: S.boardToPieces(save.edBoard || ED_KEY_START), tool: 1, result: null, board: null, timer: null };

  function edToolIcon(t) {
    const k = skin();
    if (t === 5) return Art.cone();
    const len = t >= 3 ? 3 : 2, h = t === 0 || t % 2 === 1;
    const svg = t === 0 ? Art.vehicle(k.model, 2, true, 'right', k.colors)
      : Art.vehicle(len === 3 ? 'truck' : 'sedan', len, h, h ? 'right' : 'up', COLORS[t === 1 ? 0 : t === 2 ? 1 : t === 3 ? 4 : 2]);
    return svg.replace('preserveAspectRatio="none"', 'preserveAspectRatio="xMidYMid meet"');
  }
  function renderTools() {
    const box = $('tools');
    box.innerHTML = '';
    TOOLS.forEach((tl) => {
      const b = document.createElement('button');
      b.className = 'tool';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', ed.tool === tl.t);
      b.setAttribute('aria-label', tl.aria);
      b.innerHTML = edToolIcon(tl.t) + `<span class="tool-label">${tl.label}</span>`;
      b.addEventListener('click', () => { ed.tool = tl.t; renderTools(); });
      box.appendChild(b);
    });
  }
  function edBoard() {
    const ps = ed.pieces.slice().sort((a, b) => (a.t === 0 ? -1 : b.t === 0 ? 1 : 0));
    return S.piecesToBoard(ps);
  }
  function renderEditor() {
    renderTools();
    drawEditor();
    evaluate();
    renderMine();
  }
  function drawEditor(popCell) {
    const lot = $('ed-lot');
    lot.querySelectorAll('.veh, .cone').forEach((n) => n.remove());
    const board = edBoard();
    if (!board) return;
    const V = S.parse(board), seed = 4242;
    for (const w of V.walls) { const c = coneEl(w); if (w === popCell) c.classList.add('pop'); lot.appendChild(c); }
    V.forEach((v, i) => {
      const el = vehicleEl(seed, i, v);
      placeEl(el, v, v.pos);
      const cell = v.horiz ? v.fixed * 6 + v.pos : v.pos * 6 + v.fixed;
      if (cell === popCell) el.classList.add('pop');
      lot.appendChild(el);
    });
  }
  function edStatus(cls, badge, title, detail) {
    const st = $('ed-status');
    st.classList.remove('bad', 'busy');
    if (cls) st.classList.add(cls);
    $('ed-badge').textContent = badge;
    $('ed-title').textContent = title;
    $('ed-detail').textContent = detail;
  }
  function evaluate() {
    clearTimeout(ed.timer);
    ed.result = null;
    $('ed-test').disabled = $('ed-share').disabled = true;
    edStatus('busy', '…', 'Vérification…', 'Le solveur cherche la solution la plus courte.');
    ed.timer = setTimeout(() => {
      const board = edBoard();
      ed.board = board;
      save.edBoard = board; persist();
      const V = S.parse(board);
      const path = S.solve(V, V.map((v) => v.pos), 400000);
      if (path === false) return edStatus('bad', '?', 'Trop complexe', 'Retire quelques véhicules pour que le solveur puisse vérifier.');
      if (!path) return edStatus('bad', '✕', 'Impossible', 'Ta voiture ne peut jamais atteindre la sortie. Libère sa ligne.');
      if (!path.length) return edStatus('bad', '0', 'Déjà sortie', 'Ta voiture est déjà devant la barrière. Bloque-lui le passage.');
      ed.result = path.length;
      const n = path.length;
      const tier = n < 8 ? 'Facile' : n < 16 ? 'Moyen' : n < 25 ? 'Difficile' : 'Expert';
      edStatus('', n, 'Soluble en ' + n + ' coups', tier + (n < 25 ? '. « Plus dur » cherche le départ le plus difficile.' : '. Prêt à piéger tes amis.'));
      $('ed-test').disabled = $('ed-share').disabled = false;
    }, 120);
  }
  const SHAPES = [[true, 2], [true, 2], [false, 2], [true, 3], [false, 3], [true, 1]];
  function edTap(e) {
    const rect = $('ed-lot').getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * 6), r = Math.floor(((e.clientY - rect.top) / rect.height) * 6);
    if (c < 0 || c > 5 || r < 0 || r > 5) return;
    const cell = r * 6 + c;
    const owner = ed.pieces.findIndex((p) => (S.pieceCells(p) || []).includes(cell));
    if (owner >= 0) {
      if (ed.pieces[owner].t === 0) return edWarn('Ta voiture ne peut pas être enlevée. Choisis « Toi » pour la déplacer.');
      ed.pieces.splice(owner, 1); sfx.pick(); drawEditor(); evaluate(); return;
    }
    const [h, len] = SHAPES[ed.tool];
    if (ed.tool === 0 && r !== S.EXIT_ROW) return edWarn('Ta voiture reste toujours sur la ligne de sortie, entre les lignes jaunes.');
    const nVeh = ed.pieces.filter((p) => p.t >= 1 && p.t <= 4).length, nCone = ed.pieces.filter((p) => p.t === 5).length;
    if (ed.tool >= 1 && ed.tool <= 4 && nVeh >= 15) return edWarn('15 véhicules au maximum.');
    if (ed.tool === 5 && nCone >= 8) return edWarn('8 cônes au maximum.');
    const base = ed.tool === 0 ? ed.pieces.filter((p) => p.t !== 0) : ed.pieces;
    for (let k = 0; k < len; k++) {
      const ar = h ? r : r - k, ac = h ? c - k : c;
      if (ar < 0 || ac < 0) continue;
      const cand = { t: ed.tool, cell: ar * 6 + ac };
      const trial = base.concat([cand]).sort((a, b) => (a.t === 0 ? -1 : b.t === 0 ? 1 : 0));
      if (S.piecesToBoard(trial)) {
        ed.pieces = trial; sfx.place(); drawEditor(cand.cell); evaluate(); return;
      }
    }
    edWarn("Pas assez de place ici pour cette pièce.");
  }
  function edWarn(msg) {
    sfx.bump();
    const b = $('ed-lot').parentElement;
    b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
    $('ed-detail').textContent = msg;
  }
  function edHarder() {
    const board = edBoard(), V = S.parse(board), before = ed.result;
    edStatus('busy', '…', 'Recherche…', 'Le solveur essaie toutes les positions de départ possibles.');
    setTimeout(() => {
      const h = S.hardest(V, V.map((v) => v.pos), 300000);
      if (!h) { evaluate(); return; }
      ed.pieces = S.boardToPieces(S.toBoard(V, h.state));
      drawEditor(); evaluate();
      setTimeout(() => { if (ed.result) $('ed-detail').textContent = before && h.dist > before ? 'Départ le plus difficile trouvé : ' + before + ' → ' + h.dist + ' coups.' : "C'est déjà le départ le plus difficile avec ces véhicules. Ajoute-en ou déplace-les."; }, 200);
    }, 30);
  }
  function edTest() {
    if (!ed.result) return;
    loadLevel({ kind: 'custom', board: ed.board, opt: ed.result, code: S.encode(ed.board), fromEditor: true });
  }
  function shareLink(code) { return location.href.split('#')[0] + '#' + code; }
  function edShare() {
    if (!ed.result) return;
    const code = S.encode(ed.board);
    save.mine = [{ code, m: ed.result }].concat((save.mine || []).filter((x) => x.code !== code)).slice(0, 12);
    persist(); renderMine();
    track('share_level', { moves: ed.result });
    $('share-code').textContent = code;
    $('share-text').textContent = 'Solution parfaite : ' + ed.result + ' coups. Tes amis entrent ce code dans l\'Atelier, ou ouvrent le lien.';
    $('share-msg').textContent = '';
    $('copy-fallback').hidden = true;
    $('share').hidden = false;
    $('share').dataset.code = code;
  }
  function copy(text, okMsg) {
    const done = () => { $('share-msg').classList.remove('err'); $('share-msg').textContent = okMsg; sfx.coin(); };
    const fallback = () => {
      const ta = $('copy-fallback');
      ta.hidden = false; ta.value = text; ta.focus(); ta.select();
      $('share-msg').textContent = 'Copie le texte sélectionné ci-dessus.';
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }
  function renderMine() {
    const list = save.mine || [];
    $('mine-panel').hidden = !list.length;
    const box = $('mine');
    box.innerHTML = '';
    list.forEach((x) => {
      const b = document.createElement('button');
      b.className = 'mine-row';
      b.innerHTML = `<code>${x.code}</code><span>${x.m} coups</span>`;
      b.setAttribute('aria-label', 'Ouvrir ' + x.code + ' dans l\'Atelier');
      b.addEventListener('click', () => {
        const board = S.decode(x.code);
        if (!board) return;
        ed.pieces = S.boardToPieces(board); drawEditor(); evaluate(); window.scrollTo(0, 0);
      });
      box.appendChild(b);
    });
  }
  function playCode(code, fromEditor) {
    const board = S.decode(code);
    if (!board) return 'Code invalide. Vérifie qu\'il commence par GL- et qu\'il est complet.';
    const V = S.parse(board);
    const path = S.solve(V, V.map((v) => v.pos), 600000);
    if (!path || !path.length) return 'Ce niveau ne peut pas être résolu.';
    loadLevel({ kind: 'custom', board, opt: path.length, code: S.encode(board), fromEditor });
    return null;
  }

  // ---------- Réglages et installation ----------
  function renderSettings() {
    $('tg-sound').setAttribute('aria-checked', save.sound);
    $('tg-video').setAttribute('aria-checked', save.video);
    $('tg-stats').setAttribute('aria-checked', save.stats === 'yes');
    renderInstall();
  }
  let wipeArmed = false;
  let installEvt = null;
  const standalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
  function renderInstall() {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    $('install-banner').hidden = !installEvt || standalone();
    $('btn-install').hidden = !installEvt;
    $('install-text').textContent = standalone() ? 'Le jeu est installé sur cet appareil.'
      : installEvt ? 'Ajoute Gridlock à ton écran d\'accueil pour jouer sans internet.'
      : ios ? 'Sur iPhone : ouvre le jeu dans Safari, touche Partager puis « Sur l\'écran d\'accueil ».'
      : 'Ouvre le jeu depuis son adresse en ligne, dans Chrome, Edge ou Safari, pour pouvoir l\'installer.';
  }
  async function install() {
    if (!installEvt) return;
    try { installEvt.prompt(); await installEvt.userChoice; } catch (e) {}
    installEvt = null; renderInstall();
  }
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; renderInstall(); });
  addEventListener('appinstalled', () => { installEvt = null; renderInstall(); });
  try {
    if ('serviceWorker' in navigator && document.querySelector('link[rel="manifest"]') && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  } catch (e) {}

  // ---------- Statistiques (Google Analytics, avec consentement) ----------
  const GA = window.GRIDLOCK_GA;
  let gaLoaded = false;
  function loadGA() {
    if (!GA || gaLoaded || save.stats !== 'yes') return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA);
    const sc = document.createElement('script');
    sc.async = true; sc.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA;
    document.head.appendChild(sc);
  }
  function track(name, params) {
    try { if (gaLoaded && window.gtag) window.gtag('event', name, params || {}); } catch (e) {}
  }
  function setStats(v) {
    save.stats = v; persist();
    $('consent').hidden = true;
    if (v === 'yes') loadGA();
    else if (gaLoaded) { try { window['ga-disable-' + GA] = true; } catch (e) {} }
    renderSettings();
  }
  if (GA) {
    $('tg-stats').hidden = false;
    if (save.stats === 'yes') loadGA();
    else if (!save.stats) $('consent').hidden = false;
  }

  // ---------- Confettis ----------
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = $('confetti'), c = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ['#ffc93c', '#ef3b36', '#4aa3ff', '#7fd84a', '#ff7cc8', '#ffffff'];
    const parts = Array.from({ length: 150 }, (_, k) => ({
      x: k % 2 ? -10 : innerWidth + 10, y: innerHeight * 0.65,
      vx: (k % 2 ? 1 : -1) * (Math.random() * 9 + 4), vy: -Math.random() * 15 - 8,
      w: Math.random() * 8 + 5, a: Math.random() * 6, s: Math.random() * 0.3 + 0.1, col: cols[k % cols.length],
    }));
    let f = 0;
    (function tick() {
      c.clearRect(0, 0, cv.width, cv.height);
      for (const p of parts) {
        p.vy += 0.4; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.s;
        c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.scale(1, Math.cos(p.a * 2));
        c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); c.restore();
      }
      if (f++ < 130) requestAnimationFrame(tick); else c.clearRect(0, 0, cv.width, cv.height);
    })();
  }

  // ---------- Branchements ----------
  $('btn-play').addEventListener('click', () => loadLevel(campaign(nextLevel())));
  $('btn-daily').addEventListener('click', () => loadLevel(daily()));
  $('btn-garage').addEventListener('click', () => show('garage'));
  $('btn-editor').addEventListener('click', () => show('editor'));
  document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => show('menu')));
  $('btn-back').addEventListener('click', () => show(G && G.L.kind === 'custom' && G.L.fromEditor ? 'editor' : 'menu'));
  $('btn-undo').addEventListener('click', undo);
  $('btn-reset').addEventListener('click', reset);
  $('btn-hint').addEventListener('click', hint);
  $('btn-solve').addEventListener('click', playSolution);
  $('win-retry').addEventListener('click', () => (G.L.kind === 'daily' ? show('menu') : loadLevel(G.L)));
  $('win-next').addEventListener('click', () => {
    if (G.L.kind === 'campaign') loadLevel(campaign(G.L.index + 1));
    else {
      if (!G.L.fromEditor) ed.pieces = S.boardToPieces(G.L.board);
      show('editor');
    }
  });
  $('fail-retry').addEventListener('click', () => loadLevel(G.L));
  $('fail-more').addEventListener('click', () => {
    if (!spend(30)) return;
    G.bonus += 5; G.over = false; G.start = Date.now();
    $('fail').hidden = true; renderHud(); timer = setInterval(renderTime, 250);
  });
  $('btn-settings').addEventListener('click', () => { wipeArmed = false; $('btn-wipe').textContent = 'Effacer ma progression'; renderSettings(); $('settings').hidden = false; });
  $('set-close').addEventListener('click', () => { $('settings').hidden = true; renderMap(); });
  $('tg-sound').addEventListener('click', () => { save.sound = !save.sound; persist(); renderSettings(); });
  $('tg-video').addEventListener('click', () => { save.video = !save.video; persist(); renderSettings(); });
  $('btn-install').addEventListener('click', install);
  $('tg-stats').addEventListener('click', () => setStats(save.stats === 'yes' ? 'no' : 'yes'));
  $('consent-yes').addEventListener('click', () => setStats('yes'));
  $('consent-no').addEventListener('click', () => setStats('no'));
  $('install-banner').addEventListener('click', install);
  $('btn-wipe').addEventListener('click', () => {
    if (!wipeArmed) { wipeArmed = true; $('btn-wipe').textContent = 'Toucher encore pour tout effacer'; return; }
    Object.assign(save, { stars: {}, best: {}, coins: 100, daily: {}, skin: 'sport-rouge', owned: ['sport-rouge'] }); persist();
    renderMap.scrolled = false; show('menu');
  });
  // Atelier
  $('ed-lot').addEventListener('pointerdown', (e) => { e.preventDefault(); edTap(e); });
  $('ed-clear').addEventListener('click', () => { ed.pieces = ed.pieces.filter((p) => p.t === 0); drawEditor(); evaluate(); });
  $('ed-harder').addEventListener('click', edHarder);
  $('ed-test').addEventListener('click', edTest);
  $('ed-share').addEventListener('click', edShare);
  $('share-close').addEventListener('click', () => { $('share').hidden = true; });
  $('copy-code').addEventListener('click', () => copy($('share').dataset.code, 'Code copié.'));
  $('copy-link').addEventListener('click', () => {
    const code = $('share').dataset.code;
    copy('Bats mon niveau Gridlock en ' + ed.result + ' coups : ' + shareLink(code), 'Lien copié. Colle-le dans un message ou en commentaire.');
  });
  $('code-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const err = playCode($('code-input').value, true);
    $('code-msg').textContent = err || '';
    $('code-msg').classList.toggle('err', !!err);
  });

  document.addEventListener('keydown', (e) => {
    if ($('game').hidden) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    else if (e.key === 'r') reset();
    else if (e.key === 'h') hint();
    else if (e.key === 'Escape') $('btn-back').click();
  });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!$('menu').hidden) renderMap(); }, 150); });
  addEventListener('hashchange', () => { if (/^#GL-/i.test(location.hash)) playCode(location.hash.slice(1), false); });

  paintLot($('paint'), $('lot'));
  paintLot($('ed-paint'), $('ed-lot'));

  // Garder la partie en cours si la page est mise à jour pendant qu'on joue
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => (G && !$('game').hidden && !G.over
    ? { L: G.L, state: G.state.slice(), history: G.history.slice(), used: G.used, bonus: G.bonus, hinted: G.hinted, elapsed: elapsed() } : {}));
  function start(data) {
    if (/^#GL-/i.test(location.hash) && !playCode(location.hash.slice(1), false)) return;
    if (data && data.L && data.L.board) loadLevel(data.L, data);
    else show('menu');
  }
  if (hot && hot.ready) hot.ready(start); else start(hot && hot.data);
})();
