/* Chân Kinh Lộ · fx: living background and the big moments. Classic script, attaches to window.CKL. */
(function () {
  const CKL = (window.CKL = window.CKL || {});
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bg = document.getElementById('bg'), fxc = document.getElementById('fx');
  const bx = bg.getContext('2d'), fx = fxc.getContext('2d');
  let W = 0, H = 0, cols = [], sparks = [], fog = [], px = 0, py = 0, tpx = 0, tpy = 0;
  let POOL = '道光生命真理约圣灵天国爱恩信望恒新逾越羔羊血永锡安母父粮经';

  function setPool(text) { const s = (text || '').replace(/[，。；：「」『』！？、\s“”‘’（）《》·\-—]/g, ''); if (s.length > 20) POOL = s; buildCols(); }
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    for (const c of [bg, fxc]) { c.width = innerWidth * dpr; c.height = innerHeight * dpr; c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); }
    W = innerWidth; H = innerHeight; buildCols();
    fog = Array.from({ length: 7 }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, r: (0.35 + Math.random() * 0.45) * Math.max(W, H), vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 4, a: 0.025 + Math.random() * 0.03, d: 0.2 + i * 0.12 }));
  }
  function buildCols() {
    cols = []; const n = Math.max(5, Math.round(W / 64));
    for (let i = 0; i < n; i++) {
      const s = 12 + Math.random() * 12;
      cols.push({ x: (i + 0.5) * W / n + (Math.random() - 0.5) * 18, y: Math.random() * H, v: 5 + Math.random() * 11, s, a: 0.02 + Math.random() * 0.05, d: s / 24, t: Array.from({ length: 42 }, () => POOL[(Math.random() * POOL.length) | 0]) });
    }
  }
  const newSpark = any => ({ x: Math.random() * W, y: any ? Math.random() * H : H + 10, v: 8 + Math.random() * 26, r: 0.5 + Math.random() * 1.6, a: 0.2 + Math.random() * 0.6, w: Math.random() * 6.28 });
  addEventListener('resize', size); size();
  for (let i = 0; i < 70; i++) sparks.push(newSpark(true));
  addEventListener('pointermove', e => { tpx = (e.clientX / W - 0.5); tpy = (e.clientY / H - 0.5); }, { passive: true });

  let last = performance.now();
  function bgLoop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t; px += (tpx - px) * 0.04; py += (tpy - py) * 0.04;
    bx.clearRect(0, 0, W, H);
    const halo = bx.createRadialGradient(W / 2, H * 0.16, 0, W / 2, H * 0.16, Math.max(W, H) * 0.8);
    halo.addColorStop(0, 'rgba(255,255,255,.08)'); halo.addColorStop(1, 'rgba(0,0,0,0)'); bx.fillStyle = halo; bx.fillRect(0, 0, W, H);
    for (const f of fog) {
      if (!RM) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.x < -f.r) f.x = W + f.r; if (f.x > W + f.r) f.x = -f.r; if (f.y < -f.r) f.y = H + f.r; if (f.y > H + f.r) f.y = -f.r; }
      const x = f.x - px * 40 * f.d, y = f.y - py * 30 * f.d; const g = bx.createRadialGradient(x, y, 0, x, y, f.r);
      g.addColorStop(0, 'rgba(235,232,224,' + f.a + ')'); g.addColorStop(1, 'rgba(235,232,224,0)'); bx.fillStyle = g; bx.fillRect(x - f.r, y - f.r, f.r * 2, f.r * 2);
    }
    bx.textAlign = 'center';
    for (const c of cols) {
      if (!RM) c.y -= c.v * dt; if (c.y < -c.s * 52) c.y = H + 20;
      bx.font = c.s + "px 'Ma Shan Zheng', serif"; bx.fillStyle = 'rgba(239,236,227,' + c.a + ')';
      const ox = -px * 24 * c.d;
      for (let k = 0; k < 42; k++) { const y = c.y + k * c.s * 1.25; if (y > -20 && y < H + 20) bx.fillText(c.t[k], c.x + ox, y); }
    }
    for (const s of sparks) {
      if (!RM) { s.y -= s.v * dt; s.w += dt; s.x += Math.sin(s.w) * 0.25; } if (s.y < -10) Object.assign(s, newSpark(false));
      bx.beginPath(); bx.arc(s.x - px * 12, s.y, s.r, 0, 6.28); bx.fillStyle = 'rgba(255,255,255,' + s.a * (0.6 + 0.4 * Math.sin(s.w * 3)) + ')'; bx.shadowColor = '#fff'; bx.shadowBlur = 8; bx.fill(); bx.shadowBlur = 0;
    }
    const v = bx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); bx.fillStyle = v; bx.fillRect(0, 0, W, H);
    requestAnimationFrame(bgLoop);
  }
  requestAnimationFrame(bgLoop);

  /* ---------- effect particles ---------- */
  let parts = [], rings = [], ribbon = null, running = false;
  function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }
  function burst(x, y, n, spd, life, size) { if (RM) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = spd * (0.25 + Math.random()); parts.push({ k: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.15, l: life * (0.6 + Math.random() * 0.6), m: 0, r: size * (0.4 + Math.random()), g: -30 }); } kick(); }
  function splash(x, y) { if (RM) return; for (let i = 0; i < 46; i++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 260; parts.push({ k: 'ink', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 0.9 + Math.random() * 0.6, m: 0, r: 2 + Math.random() * 7, g: 0, drag: 0.9 }); } kick(); }
  function ash() { if (RM) return; for (let i = 0; i < 80; i++) parts.push({ k: 'ash', x: Math.random() * W, y: -20 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 50, l: 4, m: 0, r: 1 + Math.random() * 2.4, g: 0 }); kick(); }
  function slips(n) { if (RM) return; for (let i = 0; i < n; i++) parts.push({ k: 'slip', x: Math.random() * W, y: H + 30 + Math.random() * 260, vx: (Math.random() - 0.5) * 70, vy: -(90 + Math.random() * 170), l: 5.2, m: 0, r: 10 + Math.random() * 16, g: 0, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 4 }); kick(); }
  function ring(x, y, max, life) { if (RM) return; rings.push({ x, y, max, l: life, m: 0 }); kick(); }
  function startRibbon(text, life) { if (RM) return; const g = Array.from((text || POOL).replace(/[，。；：「」！？、\s“”]/g, '')).slice(0, 48); ribbon = { g, m: 0, l: life }; kick(); }

  function loop() {
    const dt = 1 / 60; fx.clearRect(0, 0, W, H);
    parts = parts.filter(p => (p.m += dt) < p.l); rings = rings.filter(r => (r.m += dt) < r.l);
    if (ribbon) drawRibbon(dt);
    for (const p of parts) {
      if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
      p.vy += -p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; const k = 1 - p.m / p.l;
      if (p.k === 'dot') { fx.beginPath(); fx.arc(p.x, p.y, p.r * k + 0.3, 0, 6.28); fx.fillStyle = 'rgba(255,255,255,' + k + ')'; fx.shadowColor = '#fff'; fx.shadowBlur = 12; fx.fill(); fx.shadowBlur = 0; }
      else if (p.k === 'ink') { fx.beginPath(); fx.arc(p.x, p.y, p.r * (0.6 + 0.4 * k), 0, 6.28); fx.fillStyle = 'rgba(245,243,236,' + (0.85 * k) + ')'; fx.fill(); }
      else if (p.k === 'ash') { fx.beginPath(); fx.arc(p.x, p.y, p.r, 0, 6.28); fx.fillStyle = 'rgba(138,135,127,' + (0.7 * k) + ')'; fx.fill(); }
      else { p.rot += p.vr * dt; fx.save(); fx.translate(p.x, p.y); fx.rotate(p.rot); fx.fillStyle = 'rgba(245,243,236,' + Math.min(1, k * 1.4) + ')'; fx.shadowColor = '#fff'; fx.shadowBlur = 16; fx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2); fx.shadowBlur = 0; fx.fillStyle = 'rgba(20,20,18,' + (0.5 * k) + ')'; for (let j = 0; j < 3; j++) fx.fillRect(-p.r * 0.7, -p.r * 0.35 + j * p.r * 0.32, p.r * 1.4, 1); fx.restore(); }
    }
    for (const r of rings) { const k = r.m / r.l; fx.beginPath(); fx.arc(r.x, r.y, r.max * Math.pow(k, 0.6), 0, 6.28); fx.strokeStyle = 'rgba(255,255,255,' + (1 - k) + ')'; fx.lineWidth = 3 * (1 - k) + 0.5; fx.shadowColor = '#fff'; fx.shadowBlur = 18; fx.stroke(); fx.shadowBlur = 0; }
    if (parts.length || rings.length || ribbon) requestAnimationFrame(loop); else { running = false; fx.clearRect(0, 0, W, H); }
  }

  /* A glowing scroll ribbon spiralling upward, carrying the verse's characters (front bright, back faint). */
  function drawRibbon(dt) {
    const R = ribbon; R.m += dt; const k = R.m / R.l; if (k >= 1) { ribbon = null; return; }
    const cx = W / 2, cy = H * 0.5, rad = Math.min(W, H) * 0.34, turns = 2.2, grow = Math.min(1, R.m / 1.4), fade = Math.min(1, (1 - k) * 3);
    const N = 160, pts = [];
    for (let i = 0; i <= N; i++) { const u = i / N * grow; const th = u * turns * 6.28 + R.m * 0.9; const y = cy + (0.5 - u) * H * 0.62 - R.m * 10; pts.push({ x: cx + Math.cos(th) * rad * (0.75 + 0.25 * u), y: y + Math.sin(th) * rad * 0.16, z: Math.sin(th) }); }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], front = (a.z + b.z) / 2;
      fx.beginPath(); fx.moveTo(a.x, a.y - 12); fx.lineTo(b.x, b.y - 12); fx.lineTo(b.x, b.y + 12); fx.lineTo(a.x, a.y + 12); fx.closePath();
      fx.fillStyle = 'rgba(245,243,236,' + ((front > 0 ? 0.16 : 0.05) * fade) + ')'; fx.fill();
      fx.strokeStyle = 'rgba(255,255,255,' + ((front > 0 ? 0.55 : 0.15) * fade) + ')'; fx.lineWidth = 1; fx.beginPath(); fx.moveTo(a.x, a.y - 12); fx.lineTo(b.x, b.y - 12); fx.moveTo(a.x, a.y + 12); fx.lineTo(b.x, b.y + 12); fx.stroke();
    }
    fx.textAlign = 'center'; fx.textBaseline = 'middle';
    const step = Math.max(2, Math.floor(pts.length / Math.max(1, R.g.length)));
    R.g.forEach((ch, i) => { const p = pts[Math.min(pts.length - 1, i * step + 2)]; if (!p) return; const front = p.z > 0; fx.font = (front ? 20 : 14) + "px 'Ma Shan Zheng', serif"; fx.fillStyle = 'rgba(255,255,255,' + ((front ? 1 : 0.35) * fade) + ')'; fx.shadowColor = '#fff'; fx.shadowBlur = front ? 16 : 4; fx.fillText(ch, p.x, p.y); });
    fx.shadowBlur = 0;
  }

  /* ---------- the moments, staged in #stage ---------- */
  const stage = document.getElementById('stage'); let timers = [];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function close() { timers.forEach(clearTimeout); timers = []; stage.innerHTML = ''; stage.classList.remove('on'); ribbon = null; }
  function verseCols(zh) {
    const chars = Array.from(zh.replace(/[「」『』]/g, '')); const per = 12; const cols = [];
    for (let i = 0; i < chars.length; i += per) cols.push(chars.slice(i, i + per));
    let n = 0; return '<div class="versecol" aria-hidden="true">' + cols.slice(0, 6).map(c => '<div class="col">' + c.map(ch => '<span style="animation-delay:' + ((n++) * 0.045).toFixed(2) + 's">' + esc(ch) + '</span>').join('') + '</div>').join('') + '</div>';
  }
  function skipBtn(label) { const b = document.createElement('button'); b.className = 'skip'; b.type = 'button'; b.textContent = label || 'BỎ QUA'; b.onclick = close; return b; }

  /* kind: 'pass' (>=80), 'full' (100), 'fail'. verse: {zh, zhRef, vi, viRef}. rankUp: new rank name or null. */
  function moment(kind, verse, rankUp) {
    close(); if (kind === 'fail') { ash(); return; }
    stage.classList.add('on'); const v = verse || { zh: '', vi: '', zhRef: '', viRef: '' };
    if (kind === 'pass') {
      stage.innerHTML = '<div class="veil"></div><svg class="brush" viewBox="0 0 300 300" role="img" aria-label="Thông quan"><text x="150" y="232" text-anchor="middle">通</text></svg>';
      stage.appendChild(skipBtn());
      requestAnimationFrame(() => stage.querySelector('.veil').classList.add('on'));
      later(() => { ring(W / 2, H / 2, Math.max(W, H) * 0.6, 1.1); splash(W / 2, H / 2); burst(W / 2, H / 2, 90, 380, 1.3, 3); document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 400); }, 1050);
      later(() => { const c = document.createElement('div'); c.className = 'caption'; c.innerHTML = '<span class="eyebrow">Thông quan</span><h2>' + esc(v.zhRef || '') + '</h2><p>' + esc(v.vi || '') + '</p><span class="eyebrow">' + esc(v.viRef || '') + '</span>'; stage.appendChild(c); }, 1500);
      later(() => (rankUp ? breakthrough(rankUp) : close()), 4800);
    } else {
      stage.innerHTML = '<div class="veil"></div><div class="door"></div>';
      stage.appendChild(skipBtn());
      requestAnimationFrame(() => stage.querySelector('.veil').classList.add('on'));
      startRibbon(v.zh, 5.2); slips(30);
      later(() => { ring(W / 2, H / 2, Math.max(W, H) * 0.8, 1.5); burst(W / 2, H / 2, 160, 520, 1.8, 3.4); splash(W / 2, H / 2); const s = document.createElement('div'); s.className = 'seal wide'; s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Viên mãn'); s.textContent = '圆满'; stage.appendChild(s); }, 2600);
      later(() => { const s = stage.querySelector('.seal'); if (s) s.remove(); stage.insertAdjacentHTML('beforeend', verseCols(v.zh)); }, 4200);
      later(() => { const c = document.createElement('div'); c.className = 'caption'; c.innerHTML = '<span class="eyebrow">Tuyệt đối · 100 điểm</span><h2>Viên Mãn</h2><p>' + esc(v.vi || '') + '</p><span class="eyebrow">' + esc(v.zhRef || '') + ' · ' + esc(v.viRef || '') + '</span>'; stage.appendChild(c); }, 4600);
      later(() => (rankUp ? breakthrough(rankUp) : close()), 9800);
    }
  }
  function breakthrough(name) {
    timers.forEach(clearTimeout); timers = []; ribbon = null;
    stage.innerHTML = '<div class="veil on"></div><div class="caption" style="bottom:auto;top:36%"><span class="eyebrow">Đột phá cảnh giới</span><h2>' + esc(name) + '</h2></div>';
    stage.appendChild(skipBtn('ĐÓNG')); stage.classList.add('on');
    ring(W / 2, H * 0.42, Math.max(W, H) * 0.85, 1.6); burst(W / 2, H * 0.42, 150, 400, 1.8, 3); slips(14);
    later(close, 4200);
  }

  CKL.fx = { burst, ring, splash, ash, slips, moment, close, setPool, reduced: RM };
})();
