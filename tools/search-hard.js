#!/usr/bin/env node
/*
 * Recherche de niveaux difficiles par amélioration progressive (hill-climbing).
 * On part d'un parking aléatoire, on le modifie petit à petit (ajouter/retirer/déplacer
 * un véhicule, poser un plot fixe) et on garde la modification si le puzzle devient
 * au moins aussi dur. La difficulté = nombre minimal de coups depuis la pire position
 * de départ possible (calculé exactement par BFS sur tous les états atteignables).
 *
 * Usage : node tools/search-hard.js <secondes> <graine> > sortie.jsonl
 * Chaque ligne : {"b": plateau 36 caractères, "m": coups optimaux, "v": véhicules utilisés, "n": nb véhicules, "w": nb plots}
 */
const N = 6, ROW = 2;
const SECONDS = Number(process.argv[2] || 60);
let seed = Number(process.argv[3] || 1) >>> 0;
const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const ri = (n) => Math.floor(rand() * n);

// Configuration : { cars: [{h, len, fixed, pos}], walls: [cellIndex] } ; cars[0] = rouge
function cellsOf(c, pos) {
  const out = [];
  for (let k = 0; k < c.len; k++) out.push(c.h ? c.fixed * N + pos + k : (pos + k) * N + c.fixed);
  return out;
}
function valid(cfg) {
  const g = new Uint8Array(36);
  for (const w of cfg.walls) { if (g[w]) return false; g[w] = 1; }
  for (let i = 0; i < cfg.cars.length; i++) {
    const c = cfg.cars[i];
    if (i > 0 && c.h && c.fixed === ROW) return false;
    if (c.pos < 0 || c.pos + c.len > N) return false;
    for (const x of cellsOf(c, c.pos)) { if (g[x]) return false; g[x] = 1; }
  }
  // un plot sur la ligne de sortie à droite de la rouge rendrait tout insoluble
  for (const w of cfg.walls) if (Math.floor(w / N) === ROW) return false;
  return true;
}

const P6 = [1]; for (let i = 1; i < 20; i++) P6.push(P6[i - 1] * 6);

function evaluate(cfg, cap) {
  const V = cfg.cars.length;
  const H = cfg.cars.map((c) => c.h), L = cfg.cars.map((c) => c.len), F = cfg.cars.map((c) => c.fixed);
  const wallGrid = new Int8Array(36);
  for (const w of cfg.walls) wallGrid[w] = 1;
  let store = new Uint8Array(V * 4096);
  const keyIdx = new Map();
  let count = 0;
  const push = (s) => {
    if ((count + 1) * V > store.length) { const n = new Uint8Array(store.length * 2); n.set(store); store = n; }
    store.set(s, count * V);
    return count++;
  };
  const enc = (s) => { let k = 0; for (let i = 0; i < V; i++) k += s[i] * P6[i]; return k; };
  const start = Uint8Array.from(cfg.cars.map((c) => c.pos));
  keyIdx.set(enc(start), 0); push(start);
  let adjStart = new Int32Array(4096), adj = new Int32Array(1 << 16), adjLen = 0;
  const g = new Int8Array(36);
  const s = new Uint8Array(V);
  for (let q = 0; q < count; q++) {
    if (count > cap) return null;
    for (let i = 0; i < V; i++) s[i] = store[q * V + i];
    g.set(wallGrid);
    for (let i = 0; i < V; i++) {
      const p = s[i];
      for (let k = 0; k < L[i]; k++) g[H[i] ? F[i] * N + p + k : (p + k) * N + F[i]] = 1;
    }
    if (q >= adjStart.length - 1) { const n = new Int32Array(adjStart.length * 2); n.set(adjStart); adjStart = n; }
    adjStart[q] = adjLen;
    for (let i = 0; i < V; i++) {
      const p = s[i];
      const at = H[i] ? (x) => F[i] * N + x : (x) => x * N + F[i];
      const orig = p;
      for (let dir = -1; dir <= 1; dir += 2) {
        let np = orig;
        while (true) {
          const nxt = dir < 0 ? np - 1 : np + L[i];
          if (nxt < 0 || nxt >= N || g[at(nxt)]) break;
          np += dir;
          s[i] = np;
          const k = enc(s);
          let id = keyIdx.get(k);
          if (id === undefined) { id = push(s); keyIdx.set(k, id); }
          if (adjLen >= adj.length) { const n = new Int32Array(adj.length * 2); n.set(adj); adj = n; }
          adj[adjLen++] = id;
        }
        s[i] = orig;
      }
    }
  }
  adjStart[count] = adjLen;
  // distances depuis les états gagnants (rouge en colonne 4)
  const dist = new Int32Array(count).fill(-1);
  let frontier = [];
  for (let i = 0; i < count; i++) if (store[i * V] === N - 2) { dist[i] = 0; frontier.push(i); }
  if (!frontier.length) return null;
  while (frontier.length) {
    const next = [];
    for (const i of frontier) for (let e = adjStart[i]; e < adjStart[i + 1]; e++) {
      const j = adj[e]; if (dist[j] < 0) { dist[j] = dist[i] + 1; next.push(j); }
    }
    frontier = next;
  }
  let best = 0;
  for (let i = 1; i < count; i++) if (dist[i] > dist[best]) best = i;
  // véhicules distincts déplacés sur un chemin optimal
  const used = new Set();
  let cur = best;
  while (dist[cur] > 0) {
    for (let e = adjStart[cur]; e < adjStart[cur + 1]; e++) {
      const j = adj[e];
      if (dist[j] === dist[cur] - 1) {
        for (let i = 0; i < V; i++) if (store[j * V + i] !== store[cur * V + i]) used.add(i);
        cur = j; break;
      }
    }
  }
  const pos = Array.from(store.subarray(best * V, best * V + V));
  return { moves: dist[best], pos, used: used.size, states: count };
}

function toBoard(cfg, pos) {
  const b = new Array(36).fill('.');
  for (const w of cfg.walls) b[w] = 'x';
  const letters = 'ABCDEFGHIJKLMNOPQRS';
  cfg.cars.forEach((c, i) => { for (const x of cellsOf(c, pos[i])) b[x] = letters[i]; });
  return b.join('');
}

function randomCar() {
  const len = rand() < 0.3 ? 3 : 2, h = rand() < 0.5;
  return { h, len, fixed: ri(N), pos: ri(N - len + 1) };
}
function randomCfg() {
  for (;;) {
    const cfg = { cars: [{ h: true, len: 2, fixed: ROW, pos: ri(4) }], walls: [] };
    const target = 5 + ri(6);
    let tries = 0;
    while (cfg.cars.length < target && tries++ < 200) {
      cfg.cars.push(randomCar());
      if (!valid(cfg)) cfg.cars.pop();
    }
    if (valid(cfg)) return cfg;
  }
}
const clone = (cfg) => ({ cars: cfg.cars.map((c) => ({ ...c })), walls: cfg.walls.slice() });

function mutate(cfg) {
  for (let t = 0; t < 50; t++) {
    const m = clone(cfg);
    const r = rand();
    if (r < 0.25 && m.cars.length < 15) m.cars.push(randomCar());
    else if (r < 0.4 && m.cars.length > 4) m.cars.splice(1 + ri(m.cars.length - 1), 1);
    else if (r < 0.75 && m.cars.length > 1) { const i = 1 + ri(m.cars.length - 1); m.cars[i] = randomCar(); }
    else if (r < 0.85 && m.cars.length > 1) { const i = 1 + ri(m.cars.length - 1); m.cars[i].pos = ri(N - m.cars[i].len + 1); }
    else if (r < 0.95 && m.walls.length < 2) m.walls.push(ri(36));
    else if (m.walls.length) m.walls.splice(ri(m.walls.length), 1);
    else continue;
    if (valid(m)) return m;
  }
  return clone(cfg);
}

const seen = new Set();
function emit(cfg, r) {
  if (r.moves < 6) return;
  const b = toBoard(cfg, r.pos);
  if (seen.has(b)) return;
  seen.add(b);
  process.stdout.write(JSON.stringify({ b, r: restarts, m: r.moves, v: r.used, n: cfg.cars.length, w: cfg.walls.length }) + '\n');
}

const t0 = Date.now();
let restarts = 0, bestEver = 0;
while (Date.now() - t0 < SECONDS * 1000) {
  restarts++;
  let cur = randomCfg(), curR = evaluate(cur, 150000);
  let stall = 0;
  if (curR) emit(cur, curR);
  while (stall < 150 && Date.now() - t0 < SECONDS * 1000) {
    const m = mutate(cur);
    const r = evaluate(m, 150000);
    if (!r) { stall++; continue; }
    emit(m, r);
    const score = r.moves * 10 + r.used;
    const curScore = curR ? curR.moves * 10 + curR.used : -1;
    if (score >= curScore) {
      if (score > curScore) stall = 0; else stall++;
      cur = m; curR = r;
      if (r.moves > bestEver) bestEver = r.moves;
    } else stall++;
  }
}
process.stderr.write(`graine ${process.argv[3]} : ${restarts} départs, ${seen.size} puzzles, max ${bestEver}\n`);
