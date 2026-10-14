/* Chân Kinh Lộ · mountain: the climb. Four ridges are the four stages (front: Nhập Môn, back: Tông Sư),
   fourteen waypoints are the realms. The climber sits between its realm and the next by EXP progress. */
(function () {
  const CKL = (window.CKL = window.CKL || {});
  const W = 400, H = 600;
  const PTS = [[62, 548], [150, 516], [238, 474], [302, 432], [232, 402], [152, 378], [100, 344], [170, 302], [240, 264], [292, 226], [256, 172], [226, 126], [211, 86], [205, 50]];
  const RIDGES = [ // back to front: [path, top colour, bottom colour]
    ['M-60 300 Q0 270 40 250 L80 222 Q100 212 118 198 L150 150 Q165 128 178 98 L205 42 L226 78 Q240 96 250 104 L270 134 Q284 148 300 160 L330 196 Q360 216 390 240 L460 282 L460 600 L-60 600Z', '#3F3D37', '#22211D'],
    ['M-60 392 Q30 352 90 330 L140 296 Q160 290 180 300 L220 262 Q258 226 292 212 L320 236 Q350 262 380 282 L460 318 L460 600 L-60 600Z', '#35332E', '#1F1E1A'],
    ['M-60 462 Q0 420 50 372 L98 328 Q120 340 150 360 L200 382 L250 390 Q290 400 320 418 L460 452 L460 600 L-60 600Z', '#2C2A26', '#1C1B18'],
    ['M-60 560 Q20 520 70 512 Q120 500 160 498 Q210 484 262 446 Q300 460 340 482 Q400 505 460 520 L460 600 L-60 600Z', '#252420', '#191815']
  ];
  const LABELS = [[426, 556, 'end'], [426, 448, 'end'], [426, 318, 'end'], [426, 196, 'end']]; // stage 1..4, an altitude scale on the right

  /* Catmull-Rom through the waypoints, sampled; lengths are measured in JS (no DOM reads). */
  function trail() {
    const P = PTS, out = [], at = [0]; let len = 0, prev = P[0];
    out.push(P[0]);
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (let k = 1; k <= 16; k++) {
        const t = k / 16, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        const q = [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
        len += Math.hypot(q[0] - prev[0], q[1] - prev[1]); out.push(q); prev = q;
      }
      at.push(len);
    }
    return { pts: out, at, len };
  }
  const T = trail();
  function pointAt(L) { let acc = 0; for (let i = 1; i < T.pts.length; i++) { const a = T.pts[i - 1], b = T.pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc + d >= L) { const u = (L - acc) / d; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; } acc += d; } return T.pts[T.pts.length - 1]; }

  function draw(svg, st, R, onPick) {
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const reach = st.idx >= R.levels.length - 1 ? T.len : T.at[st.idx] + (T.at[st.idx + 1] - T.at[st.idx]) * Math.max(0, Math.min(1, st.frac));
    const me = pointAt(reach), d = 'M' + T.pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    let h = `<defs>${RIDGES.map((r, i) => `<linearGradient id="rg${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${r[1]}"/><stop offset=".55" stop-color="${r[2]}"/></linearGradient>`).join('')}
      <radialGradient id="mistG"><stop offset="0" stop-color="#E4E0D6" stop-opacity=".13"/><stop offset="1" stop-color="#E4E0D6" stop-opacity="0"/></radialGradient>
      <radialGradient id="meG"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".25" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <radialGradient id="sky" cx=".5" cy=".05" r=".7"><stop offset="0" stop-color="#E4E0D6" stop-opacity=".12"/><stop offset="1" stop-color="#E4E0D6" stop-opacity="0"/></radialGradient>
      <linearGradient id="fadeH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".14" stop-color="#fff"/><stop offset=".86" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="fadeV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".1" stop-color="#fff"/><stop offset=".78" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="mH" maskUnits="userSpaceOnUse" x="-30" y="0" width="460" height="600"><rect x="-30" y="0" width="460" height="600" fill="url(#fadeH)"/></mask>
      <mask id="mV" maskUnits="userSpaceOnUse" x="-30" y="0" width="460" height="600"><rect x="-30" y="0" width="460" height="600" fill="url(#fadeV)"/></mask></defs>
      <g mask="url(#mH)"><g mask="url(#mV)"><rect x="-60" y="0" width="520" height="600" fill="url(#sky)"/>
      <text x="205" y="24" text-anchor="middle" class="mt-sum" lang="zh-Hans">天人合一</text>`;
    RIDGES.forEach((r, i) => {
      h += `<path d="${r[0]}" fill="url(#rg${i})"/><path d="${r[0].split(' L460 600')[0]}" fill="none" stroke="#E4E0D6" stroke-opacity="${0.16 - i * 0.025}" stroke-width=".8"/>`;
      if (i < 3) h += `<g class="mist m${i}"><ellipse cx="${[120, 300, 90][i]}" cy="${[300, 380, 450][i]}" rx="190" ry="26" fill="url(#mistG)"/><ellipse cx="${[330, 80, 300][i]}" cy="${[318, 396, 470][i]}" rx="150" ry="18" fill="url(#mistG)"/></g>`;
    });
    h += `</g></g>`;
    R.stages.forEach((s, i) => { const [x, y, a] = LABELS[i], on = st.level.stage === s.n; h += `<text x="${x}" y="${y}" text-anchor="${a}" class="mt-stage ${on ? 'on' : ''}">${['I', 'II', 'III', 'IV'][i]} · ${esc(s.name.toUpperCase())}</text>`; });
    h += `<path d="${d}" class="mt-trail"/><path d="${d}" class="mt-done" style="stroke-dasharray:${reach.toFixed(1)} ${T.len.toFixed(0)};--reach:${reach.toFixed(1)}"/>`;
    R.levels.forEach((l, i) => {
      const [x, y] = PTS[i], done = i <= st.idx, gate = i > 0 && R.levels[i - 1].stage !== l.stage, cur = i === st.idx;
      h += `<g class="wp ${done ? 'done' : ''} ${cur ? 'cur' : ''}" data-i="${i}" tabindex="0" role="button" aria-label="${esc(l.name)}, cần ${l.exp} EXP">`
        + `<circle cx="${x}" cy="${y}" r="13" fill="transparent"/>`
        + (gate ? `<rect x="${x - 4.2}" y="${y - 4.2}" width="8.4" height="8.4" transform="rotate(45 ${x} ${y})" class="dot"/>` : `<circle cx="${x}" cy="${y}" r="${i === R.levels.length - 1 ? 4.5 : 3.4}" class="dot"/>`) + `</g>`;
    });
    const [lx, ly] = PTS[st.idx], side = lx > 200 ? 'end' : 'start', dx = lx > 200 ? -16 : 16;
    h += `<text x="${lx + dx}" y="${ly + 4}" text-anchor="${side}" class="mt-cur">${esc(st.level.name)}</text>`;
    h += `<g class="climber ${st.decaying ? 'decay' : ''}"><circle cx="${me[0].toFixed(1)}" cy="${me[1].toFixed(1)}" r="26" fill="url(#meG)" class="halo"/><circle cx="${me[0].toFixed(1)}" cy="${me[1].toFixed(1)}" r="3.6" fill="#fff"/></g>`;
    svg.innerHTML = h;
    svg.querySelectorAll('.wp').forEach(g => { const pick = () => onPick && onPick(+g.dataset.i); g.onclick = pick; g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }; });
  }
  CKL.mountain = { draw, W, H };
})();
