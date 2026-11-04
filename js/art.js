/* Gridlock — illustrations des véhicules et des plots, vue de dessus, en SVG */
(function (root) {
  'use strict';
  let uid = 0;

  // Dessins en orientation horizontale, avant du véhicule vers la droite.
  // Une case = 50 unités ; hauteur 50.
  function glass(id) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2a4058"/><stop offset=".55" stop-color="#17253a"/><stop offset="1" stop-color="#3a5878"/></linearGradient>`;
  }
  function paint(id, c1, c2) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
  }
  const wheels = (xs) => xs.map((x) =>
    `<rect x="${x}" y="3.5" width="15" height="7" rx="2.5" fill="#15171c"/><rect x="${x}" y="39.5" width="15" height="7" rx="2.5" fill="#15171c"/>`).join('');

  const DRAW = {
    sedan(p, c) {
      return `${wheels([15, 68])}
      <rect x="5" y="7" width="90" height="36" rx="13" fill="url(#${p}b)" stroke="${c[2]}" stroke-width="1.2"/>
      <rect x="72" y="11" width="18" height="28" rx="8" fill="#fff" opacity=".13"/>
      <path d="M57 11.5 L69 9.5 Q72 25 69 40.5 L57 38.5 Q59.5 25 57 11.5Z" fill="url(#${p}g)"/>
      <rect x="29" y="12" width="27" height="26" rx="6" fill="#fff" opacity=".16"/>
      <path d="M20 13 L28 12 L28 38 L20 37 Q18 25 20 13Z" fill="url(#${p}g)"/>
      <rect x="55" y="3.6" width="6" height="4" rx="1.5" fill="${c[2]}"/><rect x="55" y="42.4" width="6" height="4" rx="1.5" fill="${c[2]}"/>
      <rect x="89.5" y="10" width="4.5" height="7" rx="2" fill="#fff7cf"/><rect x="89.5" y="33" width="4.5" height="7" rx="2" fill="#fff7cf"/>
      <rect x="5.5" y="10.5" width="3" height="7" rx="1.2" fill="#ff3d3d"/><rect x="5.5" y="32.5" width="3" height="7" rx="1.2" fill="#ff3d3d"/>`;
    },
    taxi(p, c) {
      return DRAW.sedan(p, c) + `
      <rect x="36" y="19" width="13" height="12" rx="2.5" fill="#fff"/>
      <rect x="37.5" y="20.5" width="10" height="9" rx="1.5" fill="#1f2430"/>
      <path d="M40 22h2.5v2.5H40zM42.5 24.5H45V27h-2.5zM45 22h1.5v2.5H45zM38.5 24.5H40V27h-1.5z" fill="#ffd23f"/>`;
    },
    van(p, c) {
      return `${wheels([14, 70])}
      <rect x="5" y="6.5" width="90" height="37" rx="8" fill="url(#${p}b)" stroke="${c[2]}" stroke-width="1.2"/>
      <path d="M78 10 L88 11.5 Q91 25 88 38.5 L78 40 Q80 25 78 10Z" fill="url(#${p}g)"/>
      <rect x="10" y="10" width="64" height="30" rx="5" fill="#fff" opacity=".15"/>
      <path d="M14 15H70M14 35H70" stroke="${c[2]}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
      <rect x="76" y="3.2" width="6" height="4" rx="1.5" fill="${c[2]}"/><rect x="76" y="42.8" width="6" height="4" rx="1.5" fill="${c[2]}"/>
      <rect x="90" y="9.5" width="4.5" height="7" rx="2" fill="#fff7cf"/><rect x="90" y="33.5" width="4.5" height="7" rx="2" fill="#fff7cf"/>
      <rect x="5.5" y="10" width="3" height="6" rx="1.2" fill="#ff3d3d"/><rect x="5.5" y="34" width="3" height="6" rx="1.2" fill="#ff3d3d"/>`;
    },
    hero(p, c) {
      const stripe = c[3] || '#fff';
      return `${wheels([16, 67])}
      <rect x="2.5" y="8" width="6" height="34" rx="2" fill="${c[2]}"/>
      <path d="M7 12 Q7 7 14 7 L80 7 Q96 9 96 25 Q96 41 80 43 L14 43 Q7 43 7 38Z" fill="url(#${p}b)" stroke="${c[2]}" stroke-width="1.2"/>
      <path d="M8 20.5H95M8 29.5H95" stroke="${stripe}" stroke-width="3.6" opacity=".92"/>
      <path d="M55 12 L67 10 Q71 25 67 40 L55 38 Q58 25 55 12Z" fill="url(#${p}g)"/>
      <rect x="31" y="13" width="23" height="24" rx="6" fill="#fff" opacity=".1"/>
      <path d="M20 14 L29 13 L29 37 L20 36 Q18.5 25 20 14Z" fill="url(#${p}g)"/>
      <rect x="54" y="4" width="6" height="4" rx="1.5" fill="${c[2]}"/><rect x="54" y="42" width="6" height="4" rx="1.5" fill="${c[2]}"/>
      <path d="M90 11 l4.5 2 v5 l-4.5 -1z M90 39 l4.5 -2 v-5 l-4.5 1z" fill="#fff7cf"/>`;
    },
    retro(p, c) {
      return `<rect x="15" y="3" width="14" height="8" rx="3.5" fill="#15171c"/><rect x="15" y="39" width="14" height="8" rx="3.5" fill="#15171c"/>
      <rect x="69" y="3" width="14" height="8" rx="3.5" fill="#15171c"/><rect x="69" y="39" width="14" height="8" rx="3.5" fill="#15171c"/>
      <path d="M6 25 Q6 6 30 6 L72 6 Q95 6 95 25 Q95 44 72 44 L30 44 Q6 44 6 25Z" fill="url(#${p}b)" stroke="${c[2]}" stroke-width="1.2"/>
      <ellipse cx="44" cy="25" rx="22" ry="15" fill="#fff" opacity=".2"/>
      <path d="M63 12 Q72 25 63 38 L58 36 Q64 25 58 14Z" fill="url(#${p}g)"/>
      <path d="M24 15 Q19 25 24 35 L28 33 Q25 25 28 17Z" fill="url(#${p}g)"/>
      <path d="M76 12 Q90 25 76 38" fill="none" stroke="${c[2]}" stroke-width="1.4" opacity=".6"/>
      <circle cx="90" cy="13" r="3.6" fill="#fff7cf" stroke="${c[2]}"/><circle cx="90" cy="37" r="3.6" fill="#fff7cf" stroke="${c[2]}"/>
      <rect x="6" y="12" width="3" height="5" rx="1.2" fill="#ff3d3d"/><rect x="6" y="33" width="3" height="5" rx="1.2" fill="#ff3d3d"/>`;
    },
    police(p, c) {
      return DRAW.sedan(p, c) + `
      <rect x="72" y="8" width="21" height="34" rx="9" fill="#1d2230"/>
      <rect x="6" y="8" width="13" height="34" rx="8" fill="#1d2230"/>
      <rect x="38" y="9" width="8" height="32" rx="3" fill="#2a2f3b"/>
      <rect x="39" y="10.5" width="6" height="14" rx="2" fill="#ff3b30"/><rect x="39" y="25.5" width="6" height="14" rx="2" fill="#2f7bff"/>
      <rect x="89.5" y="10" width="4.5" height="7" rx="2" fill="#fff7cf"/><rect x="89.5" y="33" width="4.5" height="7" rx="2" fill="#fff7cf"/>`;
    },
    f1(p, c) {
      const accent = c[3] || '#fff';
      return `<rect x="10" y="1.5" width="19" height="11" rx="3" fill="#15171c"/><rect x="10" y="37.5" width="19" height="11" rx="3" fill="#15171c"/>
      <rect x="68" y="3" width="16" height="9" rx="3" fill="#15171c"/><rect x="68" y="38" width="16" height="9" rx="3" fill="#15171c"/>
      <rect x="2" y="8" width="9" height="34" rx="2" fill="${c[2]}"/><rect x="2" y="21" width="9" height="8" fill="${accent}"/>
      <rect x="88" y="5" width="8" height="40" rx="2" fill="${c[2]}"/><rect x="88" y="22" width="8" height="6" fill="${accent}"/>
      <path d="M12 18 L32 14 L58 13 Q64 13 64 18 L64 32 Q64 37 58 37 L32 36 L12 32Z" fill="url(#${p}b)" stroke="${c[2]}" stroke-width="1"/>
      <path d="M60 19 L91 22 L91 28 L60 31Z" fill="url(#${p}b)" stroke="${c[2]}" stroke-width="1"/>
      <path d="M14 23.5H90M14 26.5H90" stroke="${accent}" stroke-width="1.6"/>
      <circle cx="46" cy="25" r="6.5" fill="${accent}" stroke="${c[2]}"/>
      <path d="M48.5 20.5 Q53 25 48.5 29.5" fill="none" stroke="#17253a" stroke-width="3" stroke-linecap="round"/>`;
    },
    truck(p, c) {
      let ribs = '';
      for (let x = 17; x < 100; x += 12) ribs += `<path d="M${x} 7.5V42.5" stroke="#b9c2cd" stroke-width="1.3"/>`;
      return `${wheels([14, 34, 78, 118])}
      <rect x="4" y="5" width="101" height="40" rx="4" fill="#eef1f5" stroke="#a7b1bd" stroke-width="1.2"/>
      ${ribs}
      <rect x="4" y="21" width="101" height="8" fill="${c[0]}" opacity=".9"/>
      <rect x="108" y="7.5" width="38" height="35" rx="9" fill="url(#${p}b)" stroke="${c[2]}" stroke-width="1.2"/>
      <path d="M129 11 L138 12.5 Q141 25 138 37.5 L129 39 Q131 25 129 11Z" fill="url(#${p}g)"/>
      <rect x="112" y="12" width="14" height="26" rx="4" fill="#fff" opacity=".16"/>
      <rect x="126" y="3.2" width="6" height="4" rx="1.5" fill="${c[2]}"/><rect x="126" y="42.8" width="6" height="4" rx="1.5" fill="${c[2]}"/>
      <rect x="141.5" y="10.5" width="4" height="6" rx="2" fill="#fff7cf"/><rect x="141.5" y="33.5" width="4" height="6" rx="2" fill="#fff7cf"/>`;
    },
    bus(p, c) {
      let vents = '';
      for (let x = 22; x < 120; x += 26) vents += `<rect x="${x}" y="16" width="16" height="18" rx="3" fill="#fff" opacity=".22"/><path d="M${x + 4} 20.5h8M${x + 4} 25h8M${x + 4} 29.5h8" stroke="${c[2]}" stroke-width="1.4" opacity=".6"/>`;
      return `${wheels([18, 38, 112])}
      <rect x="4" y="6" width="142" height="38" rx="9" fill="url(#${p}b)" stroke="${c[2]}" stroke-width="1.2"/>
      <rect x="8" y="9.5" width="122" height="31" rx="6" fill="#fff" opacity=".1"/>
      ${vents}
      <path d="M131 10 L140 11.5 Q143 25 140 38.5 L131 40 Q133 25 131 10Z" fill="url(#${p}g)"/>
      <rect x="141.5" y="10" width="4" height="6" rx="2" fill="#fff7cf"/><rect x="141.5" y="34" width="4" height="6" rx="2" fill="#fff7cf"/>
      <rect x="4.5" y="10" width="3" height="7" rx="1.2" fill="#ff3d3d"/><rect x="4.5" y="33" width="3" height="7" rx="1.2" fill="#ff3d3d"/>`;
    },
  };

  // facing : 'right' | 'left' (horizontal) ou 'down' | 'up' (vertical)
  function vehicle(kind, len, horiz, facing, colors) {
    const p = 'v' + (uid++);
    const W = 50 * len;
    let t;
    if (horiz) t = facing === 'left' ? `translate(${W} 50) rotate(180)` : '';
    else t = facing === 'up' ? `translate(0 ${W}) rotate(-90)` : `translate(50 0) rotate(90)`;
    const vb = horiz ? `0 0 ${W} 50` : `0 0 50 ${W}`;
    return `<svg viewBox="${vb}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      <defs>${paint(p + 'b', colors[0], colors[1])}${glass(p + 'g')}</defs>
      <g transform="${t}">${DRAW[kind](p, colors)}</g></svg>`;
  }

  function cone() {
    const p = 'c' + (uid++);
    return `<svg viewBox="0 0 50 50" width="100%" height="100%" aria-hidden="true">
      <defs><radialGradient id="${p}" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffb066"/><stop offset=".6" stop-color="#ff6d12"/><stop offset="1" stop-color="#d94e05"/></radialGradient></defs>
      <rect x="8" y="10" width="34" height="34" rx="7" fill="#000" opacity=".28"/>
      <rect x="7" y="7" width="36" height="36" rx="7" fill="#c9410a"/>
      <rect x="9" y="9" width="32" height="32" rx="6" fill="#e8560f"/>
      <circle cx="25" cy="25" r="13.5" fill="url(#${p})"/>
      <circle cx="25" cy="25" r="8.6" fill="none" stroke="#fff" stroke-width="3.2"/>
      <circle cx="25" cy="25" r="3.6" fill="#ff8a3a"/>
      <circle cx="22.5" cy="22" r="1.4" fill="#fff" opacity=".8"/></svg>`;
  }

  root.Art = { vehicle, cone };
})(this);
