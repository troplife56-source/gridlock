#!/usr/bin/env node
/*
 * Construit js/levels.js à partir des résultats de tools/search-hard.js.
 * Choisit 150 niveaux qui suivent une courbe de difficulté régulière,
 * en évitant les niveaux trop semblables (issus de la même recherche).
 *
 * Usage : node tools/build-levels.js resultats1.jsonl resultats2.jsonl ... > js/levels.js
 */
const fs = require('fs');
const S = require('../js/solver.js');
const COUNT = 150;

const cands = [];
const seen = new Set();
process.argv.slice(2).forEach((file, f) => {
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    if (seen.has(o.b)) continue;
    seen.add(o.b);
    o.lineage = f + ':' + o.r;
    cands.push(o);
  }
});
const maxM = Math.max(...cands.map((c) => c.m));

// Courbe : deux niveaux d'échauffement, puis montée régulière jusqu'au maximum trouvé
function target(i) {
  if (i === 0) return 6;
  if (i === 1) return 8;
  const t = (i - 2) / (COUNT - 3);
  return 10 + (maxM - 10) * Math.pow(t, 1.15);
}

const usedLineage = new Map();
const chosen = [];
let lastLineage = null;
for (let i = 0; i < COUNT; i++) {
  const tg = target(i);
  const chapter = Math.floor(i / 30);
  let best = null, bestScore = Infinity;
  for (const c of cands) {
    if (c.taken) continue;
    if (chapter === 0 && c.w > 0) continue;            // les cônes arrivent au chapitre 2
    if (c.lineage === lastLineage && tg <= 26) continue;
    const lu = usedLineage.get(c.lineage) || 0;
    const hard = tg > 26;
    if (lu >= (hard ? 6 : 2)) continue;
    let score = Math.abs(c.m - tg) * 10 - c.v * 2 + lu * (hard ? 4 : 15);
    if (chapter >= 1 && i % 3 === 0 && c.w === 0) score += 12; // un niveau sur trois avec cônes
    if (score < bestScore) { bestScore = score; best = c; }
  }
  best.taken = true;
  usedLineage.set(best.lineage, (usedLineage.get(best.lineage) || 0) + 1);
  lastLineage = best.lineage;
  chosen.push(best);
}

// Garder l'ordre croissant de difficulté à l'intérieur de chaque chapitre
const levels = [];
for (let ch = 0; ch < COUNT / 30; ch++) {
  const part = chosen.slice(ch * 30, ch * 30 + 30).sort((a, b) => a.m - b.m);
  levels.push(...part);
}

// Vérification avec le solveur du jeu
for (const l of levels) {
  const V = S.parse(l.b);
  const p = S.solve(V, V.map((v) => v.pos), 2e6);
  if (!p || p.length !== l.m) throw new Error('Niveau incohérent : ' + l.b + ' attendu ' + l.m + ' obtenu ' + (p && p.length));
}

process.stderr.write('coups par chapitre : ' + [0, 1, 2, 3, 4].map((c) => {
  const p = levels.slice(c * 30, c * 30 + 30).map((l) => l.m);
  return Math.min(...p) + '–' + Math.max(...p);
}).join(', ') + '\n');
process.stdout.write('// Généré par tools/build-levels.js — [plateau, coups optimaux]. x = cône fixe.\n');
process.stdout.write('window.LEVELS = [\n' + levels.map((l) => JSON.stringify([l.b, l.m])).join(',\n') + '\n];\n');
