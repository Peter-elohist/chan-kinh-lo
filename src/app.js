/* Chân Kinh Lộ · app: Gốc Lẽ Thật (tree, tiers, lessons, rootlets, trials). */
(async function () {
  const CKL = window.CKL; const fx = CKL.fx; const store = CKL.store; const RM = fx.reduced;
  const sfx = (n, o) => CKL.sfx && CKL.sfx.play(n, o);
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PASS = 80;
  const RANKS = ['Nhập Môn', 'Tiểu Thành', 'Đại Thành', 'Lô Hoả Thuần Thanh', 'Đăng Phong Tạo Cực', 'Phản Phác Quy Chân'];

  async function load() {
    if (window.CKL_DATA) return window.CKL_DATA;
    const j = p => fetch(p).then(r => r.json());
    const [tiers, lessons, rootlets, questions, verses] = await Promise.all(['data/goc/tiers.json', 'data/goc/lessons.json', 'data/goc/rootlets.json', 'data/goc/questions.json', 'data/bible/keyverses.json'].map(j));
    return { tiers, lessons, rootlets, questions, verses };
  }
  const D = await load();
  fx.setPool(Object.values(D.verses).map(v => v.zh).join(''));

  /* ---------- derived ---------- */
  const best = id => (store.best.lesson[id] || {}).best;
  const rbest = t => (store.best.rootlet[t] || {}).best;
  const tierLessons = n => Object.values(D.lessons).filter(l => l.id.split('.')[0] == String(n)).sort((a, b) => +a.id.split('.')[1] - +b.id.split('.')[1]);
  const tierDone = n => { const ls = tierLessons(n); return ls.length > 0 && ls.every(l => (best(l.id) || 0) >= PASS); };
  function rankIndex() {
    let r = -1; for (let n = 1; n <= 5; n++) { const ls = tierLessons(n); if (!ls.length) continue; if (tierDone(n)) r = n - 1; else break; }
    if (r === 4 && Object.keys(D.rootlets).every(t => (rbest(t) || 0) >= PASS)) return 5; return r;
  }
  const rankName = () => { const i = rankIndex(); return i < 0 ? 'Sơ Nhập Giang Hồ' : RANKS[i]; };
  const status = id => { const b = best(id); if (b === undefined) return 'open'; if (b >= 100) return 'full'; if (b >= PASS) return 'pass'; return 'open'; };
  const verseOf = id => D.verses[id] || null;

  /* ---------- routing ---------- */
  let route = { v: 'goc' }, test = null;
  function go(r) { route = r; render(); scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); }
  /* Leave the current view by easing toward the point that was tapped, then enter the next. */
  function goFrom(r, x, y) {
    const a = $('#app'); if (RM) return go(r);
    const b = a.getBoundingClientRect(); a.style.transformOrigin = (x - b.left) + 'px ' + (y - b.top) + 'px'; a.classList.add('leave');
    setTimeout(() => { a.classList.remove('leave'); a.style.transformOrigin = ''; go(r); }, 340);
  }
  function render() {
    const a = $('#app'); const v = route.v;
    a.innerHTML = v === 'goc' ? vGoc() : v === 'tier' ? vTier(route.n) : v === 'lesson' ? vLesson(route.id) : v === 'rootlet' ? vRootlet(route.t) : v === 'test' ? vTest() : vResult();
    bind(); if (v === 'goc') drawTree();
  }
  store.onChange = () => { if (route.v !== 'test') render(); };

  /* ---------- Gốc overview ---------- */
  function saveLine() {
    if (store.mode === 'supabase') return store.user ? `<div class="save">Đang lưu lên máy chủ · ${esc(store.user.email || '')} <button type="button" data-signout>Đăng xuất</button></div>`
      : `<div class="save"><form data-signin><label class="eyebrow" for="email" style="position:absolute;left:-9999px">Email</label><input id="email" type="email" required placeholder="Email để nhận link đăng nhập"><button type="submit">Gửi link</button></form><span data-msg>Đăng nhập để lưu điểm lên máy chủ.</span></div>`;
    return `<div class="save">${store.mode === 'artifact' ? 'Điểm được lưu trong bản xem trước này.' : 'Điểm chỉ lưu trên trình duyệt này.'}</div>`;
  }
  function vGoc() {
    const ls = Object.values(D.lessons), passed = ls.filter(l => (best(l.id) || 0) >= PASS).length;
    const rt = Object.keys(D.rootlets), rp = rt.filter(t => (rbest(t) || 0) >= PASS).length, ri = rankIndex();
    return `<section class="view"><header class="head"><span class="bigglyph glyph" aria-hidden="true">根</span><span class="eyebrow">Chân Kinh Lộ · Gốc Lẽ Thật</span>
    <h1 class="rank">${esc(rankName())}</h1><span class="meta">${passed}/${ls.length} bài EA thông quan · ${rp}/${rt.length} rễ phụ</span>${saveLine()}${CKL.sfx ? `<div class="sounds"><button class="sound" type="button" data-sound aria-pressed="${CKL.sfx.on}">Âm thanh · ${CKL.sfx.on ? 'Bật' : 'Tắt'}</button><button class="sound" type="button" data-ambient aria-pressed="${CKL.sfx.ambient}">Linh khí · ${CKL.sfx.ambient ? 'Bật' : 'Tắt'}</button></div>` : ''}</header>
    <div class="treewrap"><svg id="tree" viewBox="0 0 390 740" role="img" aria-label="Cây Gốc Lẽ Thật: 5 tầng EA"></svg></div>
    <div class="ranks" aria-label="Thang cảnh giới">${D.tiers.map((t, i) => `<div class="${i <= ri ? 'on' : ''}"><b>${t.g}</b>${esc(t.rank)}</div>`).join('')}</div>
    <div class="legend"><span><i class="dot d-full"></i>100 điểm</span><span><i class="dot d-pass"></i>Thông quan</span><span><i class="dot d-open"></i>Chưa đạt</span><span><i class="dot d-none"></i>Chưa có ghi chú</span></div>
    <p class="note">Rễ lớn là bài EA, chia 5 tầng. Rễ nhỏ mọc từ mỗi bài là ghi chú liên quan trong Brain. Ánh sáng chạy dọc rễ nhanh hơn khi tầng đã thông quan. Chạm vào ấn tầng để mở.</p></section>`;
  }
  const PATHS = ['M195 96 C150 130 70 140 58 232', 'M195 96 C250 150 330 190 332 332', 'M195 96 C170 250 120 310 70 452', 'M195 96 C230 280 300 420 320 562', 'M195 96 C204 300 170 480 195 650'];
  const rnd = seed => () => ((seed = Math.sin(seed) * 10000) - Math.floor(seed));
  function tierVerse(n) { const l = tierLessons(n)[0]; const v = l && verseOf(l.id); return v ? v.zh.replace(/[「」]/g, '') : '待 补 · 此 层 尚 无 经 文 · 待 补 · 此 层 尚 无 经 文'; }
  function drawTree() {
    const svg = $('#tree'); if (!svg) return;
    let h = `<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></linearGradient>
      <radialGradient id="mist"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="195" cy="96" rx="190" ry="26" fill="url(#mist)"/><line x1="16" y1="96" x2="374" y2="96" stroke="#EFECE3" stroke-opacity=".3" stroke-dasharray="1 7"/>
      <path class="root-core lit" d="M195 26 L195 96" stroke="#fff" stroke-width="6"/><text x="195" y="16" fill="#8A877F" font-size="10" text-anchor="middle" letter-spacing="3">MẶT ĐẤT</text>`;
    PATHS.forEach((d, i) => { const done = tierDone(i + 1); h += `<path class="root-halo" d="${d}" stroke-width="${12 - i}"/><path class="root-core ${done ? 'lit' : ''}" data-i="${i}" d="${d}" stroke="url(#fade)" stroke-width="${3.6 - i * 0.28}"/>`; });
    svg.innerHTML = h;
    const cores = [...svg.querySelectorAll('.root-core[data-i]')]; let ex = '';
    cores.forEach((p, i) => {
      const L = p.getTotalLength(), n = i + 1, r = rnd(n * 7.3), done = tierDone(n);
      ex += `<path class="root-flow ${done ? 'hot' : ''}" d="${PATHS[i]}" style="--L:${L.toFixed(0)};animation-delay:${(i * 0.7).toFixed(1)}s" stroke-width="${done ? 2.4 : 1.6}"/>`;
      for (let k = 0; k < 8; k++) { const s = p.getPointAtLength(L * (0.15 + 0.1 * k)); const dir = r() < 0.5 ? -1 : 1, len = 24 + r() * 52; ex += `<path class="hair" d="M${s.x.toFixed(1)} ${s.y.toFixed(1)} q${(dir * len * 0.5).toFixed(1)} ${(len * 0.3).toFixed(1)} ${(dir * len).toFixed(1)} ${len.toFixed(1)}" stroke-opacity=".16" stroke-width=".7"/>`; }
      for (let j = 1; j <= 10; j++) {
        const id = n + '.' + j, pt = p.getPointAtLength(L * (0.1 + 0.072 * (j - 1))), l = D.lessons[id];
        if (!l) { ex += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="2.3" fill="#0A0A09" stroke="#8A877F" stroke-width=".8" stroke-dasharray="1.5 1.5"/>`; continue; }
        const st = status(id), rr = rnd(j * 13 + n);
        l.roots.forEach(t => { const ang = (rr() - 0.5) * 2.2 + (pt.x < 195 ? 2.6 : 0.5), len = 12 + rr() * 22, ok = (rbest(t) || 0) >= PASS;
          ex += `<path class="hair ${ok ? 'lit' : ''}" d="M${pt.x.toFixed(1)} ${pt.y.toFixed(1)} q${(Math.cos(ang) * len * 0.6).toFixed(1)} ${(Math.sin(ang) * len * 0.2 + len * 0.3).toFixed(1)} ${(Math.cos(ang) * len).toFixed(1)} ${(Math.abs(Math.sin(ang)) * len + 6).toFixed(1)}" stroke-opacity="${ok ? 0.95 : 0.32}" stroke-width="${ok ? 1.1 : 0.6}"/>`; });
        const c = `cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}"`;
        if (st === 'full') ex += `<circle class="pulse" ${c} r="10" fill="none" stroke="#fff" stroke-opacity=".7"/><circle class="lit" ${c} r="4.8" fill="#fff"/>`;
        else if (st === 'pass') ex += `<circle class="lit" ${c} r="4.2" fill="#EFECE3"/>`;
        else ex += `<circle ${c} r="3.8" fill="#0A0A09" stroke="#EFECE3" stroke-width="1.1"/>`;
      }
      const e = p.getPointAtLength(L), t = D.tiers[i], ls = tierLessons(n), pc = ls.filter(l => (best(l.id) || 0) >= PASS).length;
      const ax = e.x < 120 ? 26 : e.x > 270 ? 364 : e.x, an = e.x < 120 ? 'start' : e.x > 270 ? 'end' : 'middle';
      const ringId = 'ring' + n, rr2 = 37;
      ex += `<g class="med" data-tier="${n}" style="transform-box:view-box;transform-origin:${e.x}px ${e.y}px" tabindex="0" role="button" aria-label="Tầng ${n}, ${esc(t.rank)}, ${pc} trên ${ls.length} bài">
        <path id="${ringId}" d="M${e.x - rr2} ${e.y} a${rr2} ${rr2} 0 1 1 ${rr2 * 2} 0 a${rr2} ${rr2} 0 1 1 ${-rr2 * 2} 0" fill="none"/>
        <g class="spin ${n % 2 ? '' : 'rev'}" style="transform-box:view-box;transform-origin:${e.x}px ${e.y}px"><text font-size="7.4" fill="#EFECE3" fill-opacity="${done ? 0.9 : 0.42}" font-family="'Ma Shan Zheng', serif" letter-spacing="1.6"><textPath href="#${ringId}">${esc(tierVerse(n).slice(0, 40))}</textPath></text></g>
        <circle class="medring ${done ? 'lit' : ''}" cx="${e.x}" cy="${e.y}" r="29" fill="#0A0A09" stroke="#EFECE3" stroke-opacity="${done ? 1 : 0.55}" stroke-width="1.2"/>
        <circle cx="${e.x}" cy="${e.y}" r="24" fill="none" stroke="#EFECE3" stroke-opacity=".22"/>
        <text x="${e.x}" y="${e.y + 10}" text-anchor="middle" font-size="28" fill="#fff" font-family="'Ma Shan Zheng', serif" class="${done ? 'lit' : ''}">${t.g}</text>
        <text x="${ax}" y="${e.y + 56}" text-anchor="${an}" font-size="15" fill="#EFECE3" stroke="#0A0A09" stroke-width="5" paint-order="stroke" style="font-family:var(--f-display)" font-weight="600">${esc(t.rank)}</text>
        <text x="${ax}" y="${e.y + 71}" text-anchor="${an}" font-size="10" fill="#9A978F" stroke="#0A0A09" stroke-width="4" paint-order="stroke" letter-spacing="1">TẦNG ${n} · ${ls.length ? pc + '/' + ls.length : 'CHƯA CÓ BÀI'}</text></g>`;
    });
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.innerHTML = ex; svg.appendChild(g);
    if (!RM) {
      cores.forEach((p, i) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect(); p.style.transition = `stroke-dashoffset 1.9s cubic-bezier(.4,.1,.2,1) ${i * 0.18}s`; p.style.strokeDashoffset = 0; });
      g.style.opacity = 0; g.style.transition = 'opacity 1.1s ease 1.5s'; requestAnimationFrame(() => requestAnimationFrame(() => (g.style.opacity = 1)));
      setTimeout(() => { const b = svg.getBoundingClientRect(); fx.burst(b.left + b.width / 2, b.top + b.height * (96 / 740), 24, 120, 1.2, 2); }, 300);
    }
    svg.querySelectorAll('.med').forEach(m => {
      const open = () => {
        if (m.classList.contains('press')) return;
        const b = m.querySelector('.medring').getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
        m.classList.add('press'); sfx('open', { n: +m.dataset.tier }); fx.ripple(x, y);
        setTimeout(() => m.classList.remove('press'), 180);
        setTimeout(() => goFrom({ v: 'tier', n: +m.dataset.tier }, x, y), RM ? 0 : 160);
      };
      m.onclick = open; m.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
    });
  }

  /* ---------- Tier ---------- */
  function vTier(n) {
    const t = D.tiers[n - 1], ls = tierLessons(n), rows = [];
    for (let j = 1; j <= 10; j++) {
      const id = n + '.' + j, l = D.lessons[id];
      if (!l) { rows.push(`<div class="row" aria-disabled="true"><i class="node d-none"></i><span class="t"><small>EA ${id}</small><span>Chưa có ghi chú</span></span><span class="s">thêm vào Brain</span></div>`); continue; }
      const st = status(id), b = best(id);
      rows.push(`<button class="row" type="button" data-lesson="${id}"><i class="node ${st === 'full' ? 'd-full' : st === 'pass' ? 'd-pass' : 'd-open'}"></i><span class="t"><small>EA ${id}${l.roots.length ? ' · ' + l.roots.length + ' rễ phụ' : ''}</small><span>${esc(l.title)}</span></span><span class="s">${b === undefined ? 'chưa thí luyện' : b + ' điểm'}</span></button>`);
    }
    return `<section class="view"><button class="back" type="button" data-go="goc">← Gốc</button><header class="head"><span class="bigglyph glyph" aria-hidden="true">${t.g}</span><span class="eyebrow">Tầng ${n} · EA ${n}.1 đến ${n}.10</span><h1 class="rank">${esc(t.rank)}</h1>
    <span class="meta">${ls.filter(l => (best(l.id) || 0) >= PASS).length}/${ls.length} bài thông quan · ${ls.length} trên 10 bài có trong Brain</span></header>
    ${ls.length ? '' : `<p class="note">Tầng này chưa có bài EA nào trong Brain. Thêm ghi chú có tên bắt đầu bằng "EA ${n}." vào Obsidian rồi chạy lại scripts/build_goc.py.</p>`}
    <div class="list spine">${rows.join('')}</div></section>`;
  }

  /* ---------- Lesson ---------- */
  function zhCols(t, per = 9) {
    const ch = [...t.replace(/[「」『』\s]/g, '')], cols = [];
    for (let i = 0; i < ch.length; i += per) cols.push(ch.slice(i, i + per));
    return cols.slice(0, 5).map(c => `<span class="col" aria-hidden="true">${c.map(x => `<span>${esc(x)}</span>`).join('')}</span>`).join('');
  }
  function verseBlock(v) { return v ? `<div class="verse"><div class="zh" lang="zh-Hans" aria-label="${esc(v.zh)}">${zhCols(v.zh)}</div><div class="vi"><p>${esc(v.vi)}</p><small>${esc(v.viRef)} · ${esc(v.zhRef)} (和合本)</small></div></div>` : ''; }
  function vLesson(id) {
    const l = D.lessons[id], st = status(id), b = best(id), q = D.questions[id] || [];
    return `<section class="view"><button class="back" type="button" data-go="tier" data-n="${id.split('.')[0]}">← Tầng ${id.split('.')[0]}</button>
    <header class="lessonhead"><span class="eyebrow">EA ${id}${id === '4.1' ? ' · Notion ghi EA31' : ''}</span><h1>${esc(l.title)}</h1><span class="chip ${st !== 'open' ? 'on' : ''}">${st === 'full' ? 'Viên mãn · 100' : st === 'pass' ? 'Thông quan · ' + b : b !== undefined ? 'Cao nhất ' + b + ' điểm' : 'Chưa thí luyện'}</span></header>
    ${verseBlock(verseOf(id))}
    <div class="sec"><span class="eyebrow">Ý chính</span><ul>${l.y.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${l.why ? `<p class="why">${esc(l.why)}</p>` : ''}</div>
    ${l.img ? `<div class="sec"><span class="eyebrow">Hình dung</span><p class="img">${esc(l.img)}</p></div>` : ''}
    <button class="btn" type="button" data-test="${id}">Vào thí luyện · ${q.length} câu</button>
    ${l.roots.length ? `<div class="sec"><span class="eyebrow">Rễ phụ · ${l.roots.length}</span><div class="rootlets">${l.roots.map(t => { const rb = rbest(t); return `<button class="rl" type="button" data-rootlet="${esc(t)}"><span>${esc(t)}</span><em>${rb === undefined ? D.rootlets[t].qa.length + ' câu' : rb + ' điểm'}</em></button>`; }).join('')}</div></div>` : ''}
    <p class="note">Nguồn: ${esc(l.file)} trong Obsidian.</p></section>`;
  }

  /* ---------- Rootlet ---------- */
  function vRootlet(t) {
    const r = D.rootlets[t], l = D.lessons[r.lesson], b = rbest(t);
    return `<section class="view"><button class="back" type="button" data-lesson="${r.lesson}">← EA ${r.lesson}</button>
    <header class="lessonhead"><span class="eyebrow">Rễ phụ của EA ${r.lesson} · ${esc(l.title)}</span><h1>${esc(t)}</h1><span class="chip ${(b || 0) >= PASS ? 'on' : ''}">${b === undefined ? 'Chưa tự kiểm tra' : b + ' điểm'}</span></header>
    ${r.y.length ? `<div class="sec"><span class="eyebrow">Ý chính</span><ul>${r.y.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : r.why ? `<p class="why">${esc(r.why)}</p>` : ''}
    ${r.img ? `<div class="sec"><span class="eyebrow">Hình dung</span><p class="img">${esc(r.img)}</p></div>` : ''}
    ${r.qa.length ? `<button class="btn" type="button" data-self="${esc(t)}">Tự kiểm tra · ${r.qa.length} câu</button>` : ''}</section>`;
  }

  /* ---------- Trials ---------- */
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function startTest(id) { const l = D.lessons[id]; const pv = verseOf(id); if (pv) fx.prepare(pv.zh); test = { kind: 'lesson', id, verse: verseOf(id), title: l.title, items: shuffle(D.questions[id]).map(q => ({ q: q[0], right: q[1], opts: shuffle(q.slice(1, 5)), src: q[5] })), i: 0, ok: 0, pick: null, wrong: [] }; go({ v: 'test' }); }
  function startSelf(t) { const r = D.rootlets[t]; test = { kind: 'rootlet', id: t, verse: verseOf(r.lesson), title: t, items: r.qa.map(x => ({ q: x[0], a: x[1] })), i: 0, ok: 0, flip: false, wrong: [] }; go({ v: 'test' }); }
  function vTest() {
    const T = test, it = T.items[T.i], pct = (T.i / T.items.length) * 100;
    const top = `<button class="back" type="button" data-quit>← Dừng thí luyện</button><div class="qhead"><span>${T.kind === 'lesson' ? 'Thí luyện' : 'Tự kiểm tra'} · ${esc(T.title)}</span><span>${T.i + 1}/${T.items.length}</span></div><div class="bar"><i style="width:${pct}%"></i></div>`;
    if (T.kind === 'lesson') {
      const done = T.pick !== null;
      return `<section class="view">${top}<p class="q">${esc(it.q)}</p><div class="opts" id="opts">${it.opts.map((o, k) => { let c = ''; if (done) { if (o === it.right) c = 'right'; else if (k === T.pick) c = 'wrong'; } return `<button class="opt ${c}" type="button" data-opt="${k}" ${done ? 'disabled' : ''}>${esc(o)}</button>`; }).join('')}</div>
      ${done ? `<p class="src">Nguồn: ${esc(it.src)}</p><button class="btn" type="button" data-next>${T.i + 1 < T.items.length ? 'Câu tiếp' : 'Xem kết quả'}</button>` : ''}</section>`;
    }
    return `<section class="view">${top}<div class="card"><p class="q">${esc(it.q)}</p>${T.flip ? `<p class="a">${esc(it.a)}</p>` : ''}</div>
    ${T.flip ? `<div class="two"><button class="btn ghost" type="button" data-mark="0">Chưa nhớ</button><button class="btn" type="button" data-mark="1">Đã nhớ</button></div>` : `<button class="btn ghost" type="button" data-flip>Lật xem đáp án</button>`}</section>`;
  }
  async function finish() {
    const T = test, score = Math.round((T.ok / T.items.length) * 100), before = rankIndex();
    await store.record(T.kind, T.id, score, T.ok, T.items.length, T.wrong);
    T.score = score; const after = rankIndex(); go({ v: 'result' });
    setTimeout(() => fx.moment(score >= 100 ? 'full' : score >= PASS ? 'pass' : 'fail', T.verse, after > before ? RANKS[after] : null), 250);
  }
  function vResult() {
    const T = test, s = T.score;
    return `<section class="view"><span class="eyebrow">${T.kind === 'lesson' ? 'Kết quả thí luyện' : 'Kết quả tự kiểm tra'} · ${esc(T.title)}</span>
    <div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap"><span class="score">${s}</span><span class="verdict">${s >= 100 ? '<span class="glyph" lang="zh-Hans">圆满</span>Viên mãn' : s >= PASS ? '<span class="glyph" lang="zh-Hans">通</span>Thông quan' : 'Chưa thông quan'}</span></div>
    <p class="meta">${T.ok}/${T.items.length} câu đúng · cần từ ${PASS} điểm để thông quan</p>
    ${T.wrong.length ? `<div class="sec"><span class="eyebrow">Ôn lại</span><div class="miss">${T.wrong.map(w => `<div><b>${esc(w.q)}</b>${esc(w.a)}</div>`).join('')}</div></div>` : ''}
    <div class="two"><button class="btn ghost" type="button" data-again>Thử lại</button><button class="btn" type="button" ${T.kind === 'lesson' ? `data-lesson="${T.id}"` : `data-rootlet="${esc(T.id)}"`}>Xong</button></div></section>`;
  }

  /* ---------- events ---------- */
  function bind() {
    const a = $('#app'), on = (sel, fn) => a.querySelectorAll(sel).forEach(b => (b.onclick = () => fn(b)));
    on('[data-go]', b => go(b.dataset.go === 'tier' ? { v: 'tier', n: +b.dataset.n } : { v: b.dataset.go }));
    on('[data-lesson]', b => { if (route.v === 'tier') sfx('lesson'); go({ v: 'lesson', id: b.dataset.lesson }); });
    on('[data-rootlet]', b => go({ v: 'rootlet', t: b.dataset.rootlet }));
    on('[data-test]', b => { sfx('start'); startTest(b.dataset.test); });
    on('[data-sound]', b => { CKL.sfx.setOn(!CKL.sfx.on); b.setAttribute('aria-pressed', CKL.sfx.on); b.textContent = 'Âm thanh · ' + (CKL.sfx.on ? 'Bật' : 'Tắt'); if (CKL.sfx.on) sfx('tap'); });
    on('[data-ambient]', b => { CKL.sfx.setAmbient(!CKL.sfx.ambient); b.setAttribute('aria-pressed', CKL.sfx.ambient); b.textContent = 'Linh khí · ' + (CKL.sfx.ambient ? 'Bật' : 'Tắt'); });
    on('[data-self]', b => startSelf(b.dataset.self));
    on('[data-quit]', () => go(test.kind === 'lesson' ? { v: 'lesson', id: test.id } : { v: 'rootlet', t: test.id }));
    on('[data-opt]', b => {
      const T = test, it = T.items[T.i]; T.pick = +b.dataset.opt; const right = it.opts[T.pick] === it.right; const r = b.getBoundingClientRect();
      if (right) { sfx('right', { i: T.ok }); T.ok++; fx.burst(r.left + r.width / 2, r.top + r.height / 2, 28, 170, 0.8, 2); fx.ring(r.left + r.width / 2, r.top + r.height / 2, 110, 0.6); } else { sfx('wrong'); T.wrong.push({ q: it.q, a: it.right }); }
      render(); if (!right) { const o = $('#opts'); o && o.classList.add('shake'); }
    });
    on('[data-next]', () => { test.pick = null; if (++test.i < test.items.length) render(); else finish(); });
    on('[data-flip]', () => { test.flip = true; render(); });
    on('[data-mark]', b => { const T = test, it = T.items[T.i]; if (b.dataset.mark === '1') T.ok++; else T.wrong.push({ q: it.q, a: it.a }); T.flip = false; if (++T.i < T.items.length) render(); else finish(); });
    on('[data-again]', () => (test.kind === 'lesson' ? startTest(test.id) : startSelf(test.id)));
    on('[data-signout]', () => store.signOut());
    const f = a.querySelector('[data-signin]'); if (f) f.onsubmit = async e => { e.preventDefault(); const m = a.querySelector('[data-msg]'); const r = await store.signIn(a.querySelector('#email').value); m.textContent = r.error ? 'Không gửi được: ' + r.error : 'Đã gửi link đăng nhập. Mở email trên máy này để vào.'; };
  }

  render();
  store.init().then(render);
  if (document.fonts) document.fonts.ready.then(() => { if (route.v === 'goc') render(); });
})();
