/* Chân Kinh Lộ · fx: living background and the big moments. Classic script, attaches to window.CKL.
   Performance: every glow, fog patch, text column and bamboo slip is pre-rendered once to an offscreen
   sprite; per frame we only drawImage. The background pauses while a moment covers the screen. */
(function () {
  const CKL = (window.CKL = window.CKL || {});
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bg = document.getElementById('bg'), fxc = document.getElementById('fx');
  const bx = bg.getContext('2d'), fx = fxc.getContext('2d');
  const GLYPH = "'Ma Shan Zheng', 'STKaiti', 'Kaiti SC', serif";
  const sfx = (name, o) => CKL.sfx && CKL.sfx.play(name, o);
  let W = 0, H = 0, DPR = 1, cols = [], sparks = [], fog = [], px = 0, py = 0, tpx = 0, tpy = 0, paused = false;
  let POOL = '道光生命真理约圣灵天国爱恩信望恒新逾越羔羊血永锡安母父粮经';

  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };
  /* Soft white glow, reused for sparks, dots and glyph halos. */
  const GLOW = (() => { const c = mk(64, 64), g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,.55)'); r.addColorStop(0.5, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c; })();
  const FOG = (() => { const c = mk(128, 128), g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(235,232,224,1)'); r.addColorStop(0.6, 'rgba(235,232,224,.35)'); r.addColorStop(1, 'rgba(235,232,224,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return c; })();
  const glow = (ctx, x, y, r, a) => { ctx.globalAlpha = a; ctx.drawImage(GLOW, x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; };

  function setPool(text) { const s = (text || '').replace(/[，。；：「」『』！？、\s“”‘’（）《》·\-—]/g, ''); if (s.length > 20) POOL = s; buildCols(); }
  function size() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    bg.width = innerWidth * DPR; bg.height = innerHeight * DPR; bx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const fd = Math.min(DPR, 1.5); fxc.width = innerWidth * fd; fxc.height = innerHeight * fd; fx.setTransform(fd, 0, 0, fd, 0, 0);
    W = innerWidth; H = innerHeight; buildCols();
    fog = Array.from({ length: 6 }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, r: (0.35 + Math.random() * 0.45) * Math.max(W, H), vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 4, a: 0.03 + Math.random() * 0.035, d: 0.2 + i * 0.12 }));
  }
  /* Each falling calligraphy column is drawn once into a tall strip. */
  function buildCols() {
    cols = []; const n = Math.max(5, Math.round(W / 64));
    for (let i = 0; i < n; i++) {
      const s = 12 + Math.random() * 12, len = 30, c = mk(s * 1.6 * DPR, len * s * 1.25 * DPR + s * DPR), g = c.getContext('2d');
      g.scale(DPR, DPR); g.font = s + 'px ' + GLYPH; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#EFECE3';
      for (let k = 0; k < len; k++) g.fillText(POOL[(Math.random() * POOL.length) | 0], s * 0.8, k * s * 1.25);
      cols.push({ x: (i + 0.5) * W / n + (Math.random() - 0.5) * 18, y: Math.random() * H, v: 5 + Math.random() * 11, s, a: 0.025 + Math.random() * 0.05, d: s / 24, c, h: len * s * 1.25 });
    }
  }
  const newSpark = any => ({ x: Math.random() * W, y: any ? Math.random() * H : H + 10, v: 8 + Math.random() * 26, r: 0.5 + Math.random() * 1.6, a: 0.2 + Math.random() * 0.6, w: Math.random() * 6.28 });
  addEventListener('resize', size); size();
  if (document.fonts) document.fonts.ready.then(buildCols);
  for (let i = 0; i < 60; i++) sparks.push(newSpark(true));
  addEventListener('pointermove', e => { tpx = (e.clientX / W - 0.5); tpy = (e.clientY / H - 0.5); }, { passive: true });

  let last = performance.now();
  function bgLoop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t; requestAnimationFrame(bgLoop);
    if (paused || document.hidden) return;
    px += (tpx - px) * 0.04; py += (tpy - py) * 0.04;
    bx.clearRect(0, 0, W, H);
    for (const f of fog) {
      if (!RM) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.x < -f.r) f.x = W + f.r; if (f.x > W + f.r) f.x = -f.r; if (f.y < -f.r) f.y = H + f.r; if (f.y > H + f.r) f.y = -f.r; }
      bx.globalAlpha = f.a; bx.drawImage(FOG, f.x - px * 40 * f.d - f.r, f.y - py * 30 * f.d - f.r, f.r * 2, f.r * 2);
    }
    for (const c of cols) {
      if (!RM) c.y -= c.v * dt; if (c.y < -c.h) c.y = H + 20;
      bx.globalAlpha = c.a; bx.drawImage(c.c, c.x - px * 24 * c.d - c.s * 0.8, c.y, c.c.width / DPR, c.c.height / DPR);
    }
    for (const s of sparks) {
      if (!RM) { s.y -= s.v * dt; s.w += dt; s.x += Math.sin(s.w) * 0.25; } if (s.y < -10) Object.assign(s, newSpark(false));
      glow(bx, s.x - px * 12, s.y, s.r * 5, s.a * (0.6 + 0.4 * Math.sin(s.w * 3)));
    }
    bx.globalAlpha = 1;
  }
  requestAnimationFrame(bgLoop);

  /* ---------- bamboo slips (竹简): pre-rendered fronts with ink, plain backs, and blurred far copies ---------- */
  let SLIPS = null, slipText = null;
  function slipSprite(chars, w, h, back, blur) {
    const s = 2, c = mk((w + 8) * s, (h + 8) * s), g = c.getContext('2d'); g.scale(s, s); g.translate(4, 4);
    if (blur) g.filter = 'blur(' + blur + 'px)';
    const body = g.createLinearGradient(0, 0, w, 0);
    if (back) { body.addColorStop(0, '#5E5A52'); body.addColorStop(0.5, '#8C877C'); body.addColorStop(1, '#55514A'); }
    else { body.addColorStop(0, '#9C968A'); body.addColorStop(0.18, '#D9D3C5'); body.addColorStop(0.55, '#E6E1D4'); body.addColorStop(0.85, '#CFC8B9'); body.addColorStop(1, '#8F897D'); }
    g.fillStyle = body; g.beginPath(); g.roundRect ? g.roundRect(0, 0, w, h, 2.5) : g.rect(0, 0, w, h); g.fill();
    g.globalAlpha = 0.16; g.strokeStyle = back ? '#2a2824' : '#6f6a60';
    for (let i = 0; i < 7; i++) { const x = 2 + Math.random() * (w - 4); g.lineWidth = 0.4 + Math.random() * 0.6; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (Math.random() - 0.5) * 1.5, h); g.stroke(); }
    g.globalAlpha = 0.5; g.fillStyle = back ? '#2a2824' : '#5a554c';
    for (const y of [h * 0.14, h * 0.86]) g.fillRect(0, y, w, 1.6);
    g.globalAlpha = 1;
    if (!back) {
      g.textAlign = 'center'; g.textBaseline = 'middle'; const fs = w * 0.74, step = (h * 0.68) / chars.length;
      chars.forEach((ch, i) => { g.font = fs + 'px ' + GLYPH; g.fillStyle = 'rgba(22,20,17,' + (0.72 + Math.random() * 0.25) + ')'; g.fillText(ch, w / 2 + (Math.random() - 0.5) * 0.8, h * 0.18 + step * (i + 0.5)); });
    }
    return c;
  }
  function buildSlips(text) {
    slipText = text || null; const src = Array.from((text || POOL).replace(/[，。；：「」『』！？、\s“”]/g, '')); SLIPS = [];
    for (let v = 0; v < 8; v++) {
      const n = 4 + (v % 3), w = 15 + (v % 2) * 3, h = n * 15 + 30, chars = Array.from({ length: n }, (_, i) => src[(v * 5 + i) % src.length]);
      SLIPS.push({ w, h, front: slipSprite(chars, w, h, false, 0), back: slipSprite(chars, w, h, true, 0), frontB: slipSprite(chars, w, h, false, 1.8), backB: slipSprite(chars, w, h, true, 1.8) });
    }
  }

  /* ---------- effect particles ---------- */
  let parts = [], rings = [], ribbon = null, running = false, lastFx = 0;
  function kick() { if (!running) { running = true; lastFx = performance.now(); requestAnimationFrame(loop); } }
  function burst(x, y, n, spd, life, size) { if (RM) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = spd * (0.25 + Math.random()); parts.push({ k: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.15, l: life * (0.6 + Math.random() * 0.6), m: 0, r: size * (0.4 + Math.random()), g: -30, drag: 0.985 }); } kick(); }
  function splash(x, y) { if (RM) return; for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 260; parts.push({ k: 'ink', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 0.9 + Math.random() * 0.6, m: 0, r: 2 + Math.random() * 6, g: 0, drag: 0.9 }); } kick(); }
  function ash() { if (RM) return; for (let i = 0; i < 70; i++) parts.push({ k: 'ash', x: Math.random() * W, y: -20 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 50, l: 4, m: 0, r: 1 + Math.random() * 2.4, g: 0 }); kick(); }
  /* Slips burst from (x, y), slow down in the air, then drift upward, swaying and turning over. */
  function slips(n, x, y, text) {
    if (RM) return; if (!SLIPS || (text && text !== slipText)) buildSlips(text); x = x ?? W / 2; y = y ?? H / 2;
    const arr = [];
    for (let i = 0; i < n; i++) {
      const z = 0.45 + Math.random() * 0.75, a = Math.random() * 6.28, v = (160 + Math.random() * 380) * z;
      arr.push({ k: 'slip', sp: SLIPS[i % SLIPS.length], x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 30, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.8 - 60, l: 3.4 + Math.random() * 1.2, m: 0, g: 0,
        rot: (Math.random() - 0.5) * 1.2, vr: (Math.random() - 0.5) * 1.6, fl: Math.random() * 6.28, vf: (1.6 + Math.random() * 3.2) * (Math.random() < 0.5 ? -1 : 1), sw: Math.random() * 6.28 });
    }
    arr.sort((a, b) => a.z - b.z); parts = arr.filter(p => p.z < 0.75).concat(parts, arr.filter(p => p.z >= 0.75)); kick();
  }
  function ring(x, y, max, life, soft) { if (RM) return; rings.push({ x, y, max, l: life, m: 0, soft }); kick(); }
  /* A quiet ink ripple, for taps: two thin rings, no flash. */
  function ripple(x, y) { ring(x, y, 70, 0.75, true); setTimeout(() => ring(x, y, 46, 0.6, true), 90); }
  function startRibbon(text, life) { if (RM) return; const g = Array.from((text || POOL).replace(/[，。；：「」！？、\s“”]/g, '')).slice(0, 48); ribbon = { g, m: 0, l: life }; kick(); }

  function loop(now) {
    const dt = Math.min(0.05, Math.max(0.004, (now - lastFx) / 1000)); lastFx = now; fx.clearRect(0, 0, W, H);
    parts = parts.filter(p => (p.m += dt) < p.l); rings = rings.filter(r => (r.m += dt) < r.l);
    if (ribbon) drawRibbon(dt);
    for (const p of parts) {
      if (p.drag) { const d = Math.pow(p.drag, dt * 60); p.vx *= d; p.vy *= d; }
      p.vy += -p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; const k = 1 - p.m / p.l;
      if (p.k === 'dot') { glow(fx, p.x, p.y, p.r * 5 * (0.5 + k * 0.5), k); }
      else if (p.k === 'ink') { fx.globalAlpha = 0.8 * k; fx.fillStyle = '#F5F3EC'; fx.beginPath(); fx.arc(p.x, p.y, p.r * (0.6 + 0.4 * k), 0, 6.28); fx.fill(); fx.globalAlpha = 1; }
      else if (p.k === 'ash') { fx.globalAlpha = 0.7 * k; fx.fillStyle = '#8A877F'; fx.beginPath(); fx.arc(p.x, p.y, p.r, 0, 6.28); fx.fill(); fx.globalAlpha = 1; }
      else drawSlip(p, dt);
    }
    for (const r of rings) {
      const k = r.m / r.l, rad = r.max * (1 - Math.pow(1 - k, 2.4));
      fx.beginPath(); fx.arc(r.x, r.y, rad, 0, 6.28);
      if (r.soft) { fx.strokeStyle = 'rgba(239,236,227,' + 0.5 * (1 - k) + ')'; fx.lineWidth = 1; fx.stroke(); }
      else { fx.strokeStyle = 'rgba(255,255,255,' + 0.18 * (1 - k) + ')'; fx.lineWidth = 10 * (1 - k) + 2; fx.stroke(); fx.strokeStyle = 'rgba(255,255,255,' + (1 - k) + ')'; fx.lineWidth = 1.6 * (1 - k) + 0.5; fx.stroke(); }
    }
    if (parts.length || rings.length || ribbon) requestAnimationFrame(loop); else { running = false; fx.clearRect(0, 0, W, H); }
  }
  function drawSlip(p, dt) {
    // Air resistance first, then a slow upward drift with sway, like paper caught in a warm updraft.
    const d = Math.pow(0.955, dt * 60); p.vx *= d; p.vy *= d; p.vy -= 26 * p.z * dt; p.sw += dt * 1.4;
    p.x += Math.sin(p.sw) * 18 * p.z * dt; p.rot += (p.vr + Math.sin(p.sw * 0.7) * 0.4) * dt; p.fl += p.vf * dt;
    const cf = Math.cos(p.fl), sc = p.z * 1.05, fadeIn = Math.min(1, p.m / 0.15), fadeOut = Math.min(1, (p.l - p.m) / 1.3);
    const far = p.z < 0.75, sp = p.sp, img = cf >= 0 ? (far ? sp.frontB : sp.front) : (far ? sp.backB : sp.back);
    fx.globalAlpha = fadeIn * fadeOut * (0.45 + 0.55 * Math.min(1, p.z)) * (0.55 + 0.45 * Math.abs(cf));
    fx.setTransform(1, 0, 0, 1, 0, 0); const fd = Math.min(DPR, 1.5); fx.scale(fd, fd);
    fx.translate(p.x, p.y); fx.rotate(p.rot); fx.scale(Math.max(0.06, Math.abs(cf)) * sc, sc);
    fx.drawImage(img, -(sp.w + 8) / 2, -(sp.h + 8) / 2, sp.w + 8, sp.h + 8);
    fx.setTransform(fd, 0, 0, fd, 0, 0); fx.globalAlpha = 1;
  }

  /* A translucent scroll ribbon spiralling upward, carrying the verse (front bright, back faint).
     Drawn as two batched paths instead of hundreds of separate fills. */
  function drawRibbon(dt) {
    const R = ribbon; R.m += dt; const k = R.m / R.l; if (k >= 1) { ribbon = null; return; }
    const cx = W / 2, cy = H * 0.5, rad = Math.min(W, H) * 0.34, turns = 2.2, grow = Math.min(1, R.m / 1.4), fade = Math.min(1, (1 - k) * 3), hw = 11;
    const N = 120, pts = [];
    for (let i = 0; i <= N; i++) { const u = i / N * grow, th = u * turns * 6.28 + R.m * 0.9, y = cy + (0.5 - u) * H * 0.62 - R.m * 10; pts.push({ x: cx + Math.cos(th) * rad * (0.75 + 0.25 * u), y: y + Math.sin(th) * rad * 0.16, z: Math.sin(th) }); }
    for (const side of [false, true]) {
      const body = new Path2D(), edge = new Path2D();
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if ((a.z + b.z > 0) !== side) continue;
        body.moveTo(a.x, a.y - hw); body.lineTo(b.x, b.y - hw); body.lineTo(b.x, b.y + hw); body.lineTo(a.x, a.y + hw); body.closePath();
        edge.moveTo(a.x, a.y - hw); edge.lineTo(b.x, b.y - hw); edge.moveTo(a.x, a.y + hw); edge.lineTo(b.x, b.y + hw); }
      fx.fillStyle = 'rgba(232,227,214,' + ((side ? 0.17 : 0.05) * fade) + ')'; fx.fill(body);
      fx.strokeStyle = 'rgba(255,255,255,' + ((side ? 0.5 : 0.14) * fade) + ')'; fx.lineWidth = 0.8; fx.stroke(edge);
    }
    fx.textAlign = 'center'; fx.textBaseline = 'middle';
    const step = Math.max(2, Math.floor(pts.length / Math.max(1, R.g.length)));
    R.g.forEach((ch, i) => { const p = pts[Math.min(pts.length - 1, i * step + 2)]; if (!p) return; const front = p.z > 0;
      if (front) glow(fx, p.x, p.y, 22, 0.35 * fade);
      fx.font = (front ? 19 : 13) + 'px ' + GLYPH; fx.fillStyle = 'rgba(255,255,255,' + ((front ? 1 : 0.3) * fade) + ')'; fx.fillText(ch, p.x, p.y); });
  }

  /* ---------- the moments, staged in #stage ---------- */
  const stage = document.getElementById('stage'); let timers = [], closing = null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clear() { timers.forEach(clearTimeout); timers = []; clearTimeout(closing); stage.innerHTML = ''; stage.className = ''; ribbon = null; paused = false; document.body.classList.remove('moment'); }
  /* Fade the whole scene out instead of cutting it. */
  function close(fast) {
    if (CKL.sfx) CKL.sfx.stop(fast ? 0.3 : 1);
    if (fast || !stage.classList.contains('on')) return clear();
    timers.forEach(clearTimeout); timers = []; stage.classList.add('out'); closing = setTimeout(clear, 750);
  }
  /* Vertical verse sized to the space it has, so it never runs into the caption. */
  function verseCols(zh, maxH) {
    const chars = Array.from(zh.replace(/[「」『』\s]/g, '')); if (!chars.length) return '';
    let fs = Math.max(18, Math.min(28, W * 0.06)), per = Math.max(6, Math.floor(maxH / (fs * 1.18))), n = Math.ceil(chars.length / per);
    while (n * fs * 1.45 > W - 40 && fs > 16) { fs -= 1; per = Math.floor(maxH / (fs * 1.18)); n = Math.ceil(chars.length / per); }
    const colsArr = []; for (let i = 0; i < chars.length; i += per) colsArr.push(chars.slice(i, i + per));
    let k = 0; return '<div class="versecol" aria-hidden="true" style="font-size:' + fs + 'px">' + colsArr.map(c => '<div class="col">' + c.map(ch => '<span style="animation-delay:' + ((k++) * 0.05).toFixed(2) + 's">' + esc(ch) + '</span>').join('') + '</div>').join('') + '</div>';
  }
  function skipBtn(label) { const b = document.createElement('button'); b.className = 'skip'; b.type = 'button'; b.textContent = label || 'BỎ QUA'; b.onclick = () => close(true); return b; }
  function quake() { stage.classList.add('quake'); setTimeout(() => stage.classList.remove('quake'), 450); }

  /* kind: 'pass' (>=80), 'full' (100), 'fail'. verse: {zh, zhRef, vi, viRef}. rankUp: null, a name, or {name, zh, stage}. */
  function moment(kind, verse, rankUp) {
    clear(); if (kind === 'fail') { sfx('fail'); ash(); return; }
    stage.classList.add('on'); document.body.classList.add('moment'); const v = verse || { zh: '', vi: '', zhRef: '', viRef: '' };
    if (kind === 'pass') {
      sfx('pass');
      stage.innerHTML = '<div class="veil"></div><svg class="brush" viewBox="0 0 300 300" role="img" aria-label="Thông quan"><text x="150" y="232" text-anchor="middle">通</text></svg>';
      stage.appendChild(skipBtn());
      requestAnimationFrame(() => stage.querySelector('.veil').classList.add('on'));
      later(() => { paused = true; ring(W / 2, H * 0.42, Math.max(W, H) * 0.6, 1.1); splash(W / 2, H * 0.42); burst(W / 2, H * 0.42, 70, 360, 1.3, 3); quake(); }, 1050);
      later(() => { const c = document.createElement('div'); c.className = 'caption'; c.innerHTML = '<span class="eyebrow">Thông quan</span><p>' + esc(v.vi || '') + '</p><span class="eyebrow">' + esc(v.viRef || '') + ' · <span lang="zh-Hans">' + esc(v.zhRef || '') + '</span></span>'; stage.appendChild(c); }, 1500);
      later(() => (rankUp ? breakthrough(rankUp) : close()), 5200);
    } else {
      sfx('full');
      stage.innerHTML = '<div class="veil deep"></div><div class="door"></div>';
      stage.appendChild(skipBtn());
      requestAnimationFrame(() => stage.querySelector('.veil').classList.add('on'));
      later(() => { paused = true; }, 600);
      startRibbon(v.zh, 3.2);
      later(() => {
        ring(W / 2, H / 2, Math.max(W, H) * 0.8, 1.5); burst(W / 2, H / 2, 110, 480, 1.7, 3.2); slips(26, W / 2, H / 2, v.zh); quake();
        const s = document.createElement('div'); s.className = 'seal wide'; s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Viên mãn'); s.lang = 'zh-Hans'; s.textContent = '圆满'; stage.appendChild(s);
      }, 2600);
      later(() => { const d = stage.querySelector('.door'); if (d) d.remove(); }, 3300);
      later(() => { const s = stage.querySelector('.seal'); if (s) s.classList.add('rise'); }, 3700);
      later(() => {
        const s = stage.querySelector('.seal'); if (s) s.remove();
        for (const p of parts) if (p.k === 'slip') p.l = Math.min(p.l, p.m + 0.7); // clear the air before the verse
        const f = document.createElement('div'); f.className = 'finale';
        f.innerHTML = verseCols(v.zh, H * 0.4) + '<div class="caption"><span class="eyebrow">Tuyệt đối · 100 điểm</span><h2>Viên Mãn</h2><p>' + esc(v.vi || '') + '</p><span class="eyebrow">' + esc(v.viRef || '') + ' · <span lang="zh-Hans">' + esc(v.zhRef || '') + '</span></span></div>';
        stage.appendChild(f);
      }, 4200);
      later(() => (rankUp ? breakthrough(rankUp) : close()), 11000);
    }
  }
  /* up: a name, or {name, zh, stage}; stage is set when the climb reaches a new tier of the mountain. */
  function breakthrough(up) {
    const o = typeof up === 'string' ? { name: up } : up;
    timers.forEach(clearTimeout); timers = []; ribbon = null; sfx(o.stage ? 'rank' : 'levelup'); paused = true;
    stage.className = 'on'; document.body.classList.add('moment');
    stage.innerHTML = '<div class="veil deep on"></div><div class="finale"><div class="caption"><span class="eyebrow">' + (o.stage ? 'Đột phá · lên tầng núi ' + esc(o.stage) : 'Đột phá cảnh giới') + '</span>' + (o.zh ? '<span class="bt-zh" lang="zh-Hans">' + esc(o.zh) + '</span>' : '') + '<h2>' + esc(o.name) + '</h2></div></div>';
    stage.appendChild(skipBtn('ĐÓNG'));
    ring(W / 2, H * 0.5, Math.max(W, H) * 0.85, 1.6); burst(W / 2, H * 0.5, 120, 400, 1.8, 3); slips(14, W / 2, H * 0.55);
    later(close, 4600);
  }

  /* Build the slip sprites ahead of time (e.g. when a trial starts) so the big moment never stutters. */
  function prepare(text) { if (RM) return; const run = () => { if (text !== slipText || !SLIPS) buildSlips(text); }; if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 800 }); else setTimeout(run, 300); }
  CKL.fx = { prepare, burst, ring, ripple, splash, ash, slips, moment, close, setPool, reduced: RM };
})();
