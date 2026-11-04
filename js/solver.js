/*
 * Gridlock — moteur et solveur
 * Plateau 6x6 encodé en chaîne de 36 caractères, lue ligne par ligne :
 *   '.' = case vide, 'x' = plot fixe (cône), 'A' = voiture rouge (horizontale, 3e ligne),
 *   autres lettres = véhicules (2 cases = voiture, 3 cases = camion/bus).
 * La sortie est à droite de la ligne de la voiture rouge.
 * Un "coup" = déplacer un véhicule d'autant de cases qu'on veut dans son axe.
 */
(function (root) {
  const SIZE = 6;
  const EXIT_ROW = 2;

  function parse(board) {
    const seen = {};
    const vehicles = [];
    const walls = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const ch = board[i];
      if (ch === 'x') { walls.push(i); continue; }
      if (ch === '.' || seen[ch]) continue;
      seen[ch] = true;
      const r = Math.floor(i / SIZE), c = i % SIZE;
      const horiz = c + 1 < SIZE && board[i + 1] === ch;
      let len = 1;
      if (horiz) { while (c + len < SIZE && board[i + len] === ch) len++; }
      else { while (r + len < SIZE && board[i + len * SIZE] === ch) len++; }
      vehicles.push({ id: ch, horiz, len, fixed: horiz ? r : c, pos: horiz ? c : r });
    }
    vehicles.sort((a, b) => (a.id === 'A' ? -1 : b.id === 'A' ? 1 : a.id < b.id ? -1 : 1));
    vehicles.walls = walls;
    return vehicles;
  }

  function cells(v, pos) {
    const out = [];
    for (let k = 0; k < v.len; k++) out.push(v.horiz ? v.fixed * SIZE + pos + k : (pos + k) * SIZE + v.fixed);
    return out;
  }

  function occupancy(vehicles, state) {
    const g = new Int8Array(SIZE * SIZE).fill(-1);
    for (const w of vehicles.walls || []) g[w] = -2;
    for (let i = 0; i < vehicles.length; i++) for (const c of cells(vehicles[i], state[i])) g[c] = i;
    return g;
  }

  // Limites de déplacement [min, max] d'un véhicule dans l'état donné
  function range(vehicles, state, i, grid) {
    const v = vehicles[i];
    const g = grid || occupancy(vehicles, state);
    const at = (p) => (v.horiz ? v.fixed * SIZE + p : p * SIZE + v.fixed);
    let lo = state[i], hi = state[i];
    while (lo - 1 >= 0 && g[at(lo - 1)] === -1) lo--;
    while (hi + v.len < SIZE && g[at(hi + v.len)] === -1) hi++;
    return [lo, hi];
  }

  function neighbors(vehicles, state) {
    const g = occupancy(vehicles, state);
    const out = [];
    for (let i = 0; i < vehicles.length; i++) {
      const [lo, hi] = range(vehicles, state, i, g);
      for (let p = lo; p <= hi; p++) {
        if (p === state[i]) continue;
        const s = state.slice();
        s[i] = p;
        out.push({ state: s, move: [i, p] });
      }
    }
    return out;
  }

  const key = (s) => String.fromCharCode.apply(null, s);
  const isGoal = (s) => s[0] === SIZE - 2;

  // Résolution optimale (BFS). Renvoie la liste des coups [indexVéhicule, nouvellePosition]
  function solve(vehicles, start, maxStates) {
    maxStates = maxStates || 600000;
    const s0 = Array.from(start);
    if (isGoal(s0)) return [];
    const parent = new Map();
    parent.set(key(s0), null);
    let frontier = [s0];
    while (frontier.length) {
      const next = [];
      for (const s of frontier) {
        for (const n of neighbors(vehicles, s)) {
          const k = key(n.state);
          if (parent.has(k)) continue;
          parent.set(k, { prev: key(s), move: n.move });
          if (isGoal(n.state)) {
            const path = [];
            let cur = k;
            while (parent.get(cur)) { const p = parent.get(cur); path.push(p.move); cur = p.prev; }
            return path.reverse();
          }
          if (parent.size > maxStates) return false; // trop grand pour être vérifié
          next.push(n.state);
        }
      }
      frontier = next;
    }
    return null; // insoluble
  }

  // Parmi toutes les positions atteignables depuis `start`, trouve celle qui demande
  // le plus de coups pour sortir. Renvoie { state, dist } ou null (insoluble / trop grand).
  function hardest(vehicles, start, maxStates) {
    maxStates = maxStates || 300000;
    const ids = new Map(), states = [], adj = [];
    const s0 = Array.from(start);
    ids.set(key(s0), 0); states.push(s0);
    for (let q = 0; q < states.length; q++) {
      if (states.length > maxStates) return null;
      const list = [];
      for (const n of neighbors(vehicles, states[q])) {
        const k = key(n.state);
        let id = ids.get(k);
        if (id === undefined) { id = states.length; ids.set(k, id); states.push(n.state); }
        list.push(id);
      }
      adj.push(list);
    }
    const dist = new Int32Array(states.length).fill(-1);
    let frontier = [];
    states.forEach((s, i) => { if (isGoal(s)) { dist[i] = 0; frontier.push(i); } });
    if (!frontier.length) return null;
    while (frontier.length) {
      const next = [];
      for (const i of frontier) for (const j of adj[i]) if (dist[j] < 0) { dist[j] = dist[i] + 1; next.push(j); }
      frontier = next;
    }
    let best = 0;
    for (let i = 1; i < states.length; i++) if (dist[i] > dist[best]) best = i;
    return { state: states[best], dist: dist[best] };
  }

  // ----- Codes de partage -----
  // Chaque pièce = type (0 ta voiture, 1 voiture ↔, 2 voiture ↕, 3 camion ↔, 4 camion ↕, 5 cône)
  // et case de départ (coin haut-gauche), codée sur 2 caractères ; + 1 caractère de contrôle.
  const ALPH = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function boardToPieces(board) {
    const V = parse(board), out = [];
    V.forEach((v, i) => {
      const cell = v.horiz ? v.fixed * SIZE + v.pos : v.pos * SIZE + v.fixed;
      const t = i === 0 ? 0 : v.len === 2 ? (v.horiz ? 1 : 2) : (v.horiz ? 3 : 4);
      out.push({ t, cell });
    });
    for (const w of V.walls) out.push({ t: 5, cell: w });
    return out;
  }
  const SHAPE = [[true, 2], [true, 2], [false, 2], [true, 3], [false, 3], [true, 1]];
  function pieceCells(p) {
    const [h, len] = SHAPE[p.t], r = Math.floor(p.cell / SIZE), c = p.cell % SIZE, out = [];
    for (let k = 0; k < len; k++) {
      if (h ? c + k >= SIZE : r + k >= SIZE) return null;
      out.push(h ? p.cell + k : p.cell + k * SIZE);
    }
    return out;
  }
  function piecesToBoard(pieces) {
    const b = new Array(SIZE * SIZE).fill('.');
    const letters = 'BCDEFGHIJKLMNOPQRSTUVW';
    let n = 0;
    for (const p of pieces) {
      const cs = pieceCells(p);
      if (!cs) return null;
      const ch = p.t === 0 ? 'A' : p.t === 5 ? 'x' : letters[n++];
      for (const c of cs) { if (b[c] !== '.') return null; b[c] = ch; }
    }
    return b.join('');
  }
  function encode(board) {
    const ps = boardToPieces(board);
    let s = '', sum = 7;
    ps.forEach((p, k) => {
      const v = p.t * 36 + p.cell;
      s += ALPH[v >> 5] + ALPH[v & 31];
      sum = (sum * 31 + v + k) % 1021;
    });
    s += ALPH[sum % 32];
    return 'GL-' + s.match(/.{1,4}/g).join('-');
  }
  function decode(code) {
    const s = String(code || '').toUpperCase().replace(/^.*?GL/, '').replace(/[^0-9A-Z]/g, '');
    if (s.length < 3 || s.length % 2 === 0) return null;
    const ps = [];
    let sum = 7;
    for (let k = 0; k + 1 < s.length; k += 2) {
      const a = ALPH.indexOf(s[k]), b = ALPH.indexOf(s[k + 1]);
      if (a < 0 || b < 0) return null;
      const v = a * 32 + b;
      if (v >= 6 * 36) return null;
      ps.push({ t: Math.floor(v / 36), cell: v % 36 });
      sum = (sum * 31 + v + k / 2) % 1021;
    }
    if (ALPH[sum % 32] !== s[s.length - 1]) return null;
    if (ps.filter((p) => p.t === 0).length !== 1) return null;
    const hero = ps.find((p) => p.t === 0);
    if (Math.floor(hero.cell / SIZE) !== EXIT_ROW) return null;
    ps.sort((a, b) => (a.t === 0 ? -1 : b.t === 0 ? 1 : 0));
    return piecesToBoard(ps);
  }

  function toBoard(vehicles, state) {
    const b = new Array(SIZE * SIZE).fill('.');
    for (const w of vehicles.walls || []) b[w] = 'x';
    vehicles.forEach((v, i) => { for (const c of cells(v, state[i])) b[c] = v.id; });
    return b.join('');
  }

  const api = { SIZE, EXIT_ROW, parse, cells, occupancy, range, neighbors, solve, hardest, toBoard, key, isGoal,
    boardToPieces, piecesToBoard, pieceCells, encode, decode };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Solver = api;
})(this);
