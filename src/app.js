/* Chân Kinh Lộ · app: the climb (cảnh giới by EXP), trials by topic and difficulty, the library of Lẽ Thật,
   AI debate against false claims, and the daily mission of dissecting one real situation. */
(async function () {
  const CKL = window.CKL; const fx = CKL.fx, store = CKL.store, X = CKL.exp, ai = CKL.ai, RM = fx.reduced;
  const sfx = (n, o) => CKL.sfx && CKL.sfx.play(n, o);
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PASS = 80, DIFF = ['', 'Sơ', 'Trung', 'Cao', 'Tuyệt'];
  const DESKTOP = matchMedia('(min-width: 960px)');

  async function load() {
    if (window.CKL_DATA) return window.CKL_DATA;
    const j = p => fetch(p).then(r => r.json());
    const [tiers, lessons, rootlets, questions, verses, topics, realms] = await Promise.all(['data/goc/tiers.json', 'data/goc/lessons.json', 'data/goc/rootlets.json', 'data/goc/questions.json', 'data/bible/keyverses.json', 'data/goc/topics.json', 'data/realms.json'].map(j));
    return { tiers, lessons, rootlets, questions, verses, topics, realms };
  }
  const D = await load(); X.init(D.realms);
  fx.setPool(Object.values(D.verses).map(v => v.zh).join(''));

  /* ---------- derived ---------- */
  const best = id => (store.best.lesson[id] || {}).best;
  const rbest = t => (store.best.rootlet[t] || {}).best;
  const passed = id => (best(id) || 0) >= PASS;
  const tierLessons = n => Object.values(D.lessons).filter(l => l.id.split('.')[0] == String(n)).sort((a, b) => +a.id.split('.')[1] - +b.id.split('.')[1]);
  const status = id => { const b = best(id); if (b === undefined) return 'open'; if (b >= 100) return 'full'; if (b >= PASS) return 'pass'; return 'open'; };
  const verseOf = id => D.verses[id] || null;
  const topicOf = lessonId => D.topics.find(t => t.lessons.includes(lessonId));
  const topicRootlets = t => t.lessons.flatMap(id => D.lessons[id].roots).filter(r => D.rootlets[r]);
  const state = () => X.fold(store.events);
  const fmt = n => Number(n).toLocaleString('vi-VN');
  const hrs = ms => { const h = Math.round(ms / 3600000); return h >= 24 ? Math.floor(h / 24) + ' ngày ' + (h % 24) + ' giờ' : h + ' giờ'; };

  /* ---------- routing ---------- */
  let route = { v: 'home' }, test = null, dbt = null, day = null, timer = null, pick = null;
  function go(r) { clearTimeout(timer); route = r; render(); scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); }
  function render() {
    const a = $('#app'), v = route.v;
    a.innerHTML = v === 'home' ? vHome() : v === 'library' ? vLibrary() : v === 'tier' ? vTier(route.n) : v === 'lesson' ? vLesson(route.id) : v === 'topic' ? vTopic(route.t) : v === 'rootlet' ? vRootlet(route.t)
      : v === 'pick' ? vPick(route.mode) : v === 'test' ? vTest() : v === 'debate' ? vDebate() : v === 'daily' ? vDaily() : vResult();
    bind(); if (v === 'home') drawMountain(); if (v === 'test') armTimer();
  }
  store.onChange = () => { if (!['test', 'debate', 'daily'].includes(route.v)) render(); };
  DESKTOP.addEventListener('change', () => { if (route.v === 'home') render(); });

  /* ---------- Home: the climb ---------- */
  function saveLine() {
    if (store.mode === 'supabase') return store.user ? `<div class="save">Đang lưu lên máy chủ · ${esc(store.user.email || '')} <button type="button" data-signout>Đăng xuất</button></div>`
      : `<div class="save"><form data-signin><label for="email" style="position:absolute;left:-9999px">Email</label><input id="email" type="email" required placeholder="Email để nhận link đăng nhập"><button type="submit">Gửi link</button></form><span data-msg>Đăng nhập để lưu tu vi lên máy chủ và dùng AI.</span></div>`;
    return `<div class="save">${store.mode === 'artifact' ? 'Tu vi được lưu trong bản xem trước này.' : 'Tu vi chỉ lưu trên trình duyệt này.'}</div>`;
  }
  function soundLine() {
    if (!CKL.sfx) return '';
    return `<div class="sounds"><button class="sound" type="button" data-sound aria-pressed="${CKL.sfx.on}">Âm thanh · ${CKL.sfx.on ? 'Bật' : 'Tắt'}</button><button class="sound" type="button" data-ambient aria-pressed="${CKL.sfx.ambient}">Linh khí 40 Hz · ${CKL.sfx.ambient ? 'Bật' : 'Tắt'}</button></div>`;
  }
  function statusLine(s) {
    if (s.lastAt === null) return `<p class="status">Chưa có thí luyện nào. Mỗi lần thí luyện cho EXP để leo núi.</p>`;
    if (s.decaying) return `<p class="status warn"><b>Linh khí đang suy giảm.</b> Mất ${(s.ratePerDay * 100).toFixed(1)}% EXP mỗi ngày${s.lost ? ` · đã mất ${fmt(s.lost)} EXP` : ''}. Thí luyện để dừng tụt.</p>`;
    return `<p class="status">Linh khí ổn định · còn <b>${hrs(s.graceLeft)}</b> trước khi bắt đầu suy giảm${s.streak > 1 ? ` · ${s.streak} ngày liền` : ''}.</p>`;
  }
  function dropNote(s) {
    let prev = null; try { prev = +localStorage.getItem('ckl-seen-idx'); localStorage.setItem('ckl-seen-idx', s.idx); } catch (e) {}
    return prev !== null && !isNaN(prev) && prev > s.idx ? `<p class="status warn">Tụt cảnh giới: từ <b>${esc(D.realms.levels[prev].name)}</b> xuống <b>${esc(s.level.name)}</b> vì lâu không thí luyện.</p>` : '';
  }
  const MODES = [
    { mode: 'basic', d: 1, name: 'Thí luyện căn bản', desc: '8 câu trắc nghiệm theo từng bài EA.' },
    { mode: 'rootlet', d: 2, name: 'Ôn rễ phụ', desc: 'Tự kiểm tra các ghi chú củng cố theo chủ đề.' },
    { mode: 'mix', d: 3, name: 'Hỗn chiến', desc: '10 câu trộn nhiều bài, 25 giây mỗi câu.' },
    { mode: 'debate', d: 4, name: 'Luận chiến', desc: 'Tranh luận với AI, phản bác một chủ trương giả dối.' }
  ];
  function vHome() {
    const s = state(), R = D.realms, base = R.rules.base;
    return `<section class="home climb">
      <header class="hero">
        <div class="brandline"><span class="eyebrow">Chân Kinh Lộ</span><span class="rule"></span><span class="glyph" aria-hidden="true">${s.stage.g}</span><span class="eyebrow">Tầng núi ${['I', 'II', 'III', 'IV'][s.stage.n - 1]} · ${esc(s.stage.level)}</span></div>
        <span class="eyebrow now">${esc(s.stage.name)} · Cảnh giới ${s.idx + 1}/${R.levels.length}</span>
        <h1 class="rank">${esc(s.level.name)}</h1>
        <span class="zhline" lang="zh-Hans">${s.level.zh}</span>
        <p class="desc">${esc(s.level.desc)}</p>
        <div class="nextrank"><div class="prog"><i style="width:${(s.frac * 100).toFixed(1)}%"></i></div>
          <span><b>${fmt(s.exp)} EXP</b>${s.next ? ` · còn ${fmt(s.toNext)} để lên <b>${esc(s.next.name)}</b>` : ' · đỉnh cao nhất'}</span></div>
        ${dropNote(s)}${statusLine(s)}
      </header>
      ${s.todayDaily ? `<div class="cont done"><span class="eyebrow">Nhiệm vụ hôm nay</span><strong>Đã mổ xẻ một hoàn cảnh hôm nay.</strong><em>Quay lại ngày mai.</em></div>`
        : `<button class="cont" type="button" data-daily><span class="eyebrow">Nhiệm vụ hôm nay · +${base.daily} EXP</span><strong>Mổ xẻ một hoàn cảnh trong đời sống</strong><em>Kể lại, tìm gốc rễ, nối với Lẽ thật, chọn một việc làm.</em><span class="go">Bắt đầu</span></button>`}
      <div class="modes" role="list">${MODES.map(m => `<button class="mode" type="button" role="listitem" data-pick="${m.mode}"><span class="lv lv${m.d}">${DIFF[m.d]}</span><span class="body"><b>${m.name}</b><small>${m.desc}</small></span><span class="xp">+${base[m.d]}</span></button>`).join('')}</div>
      <div class="home-tree mtwrap"><svg id="mountain" viewBox="-30 0 460 600" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Núi tu luyện: 14 cảnh giới trên 4 tầng núi"></svg><p class="mt-cap" aria-live="polite"></p></div>
      <button class="libline" type="button" data-go="library"><span class="eyebrow">Tàng Kinh Các</span><span>Lẽ thật cơ bản ${Object.keys(D.lessons).length}/50 bài EA · ${D.topics.length} chủ đề củng cố, mở rộng</span><span class="go">Mở</span></button>
      <footer class="foot">${soundLine()}${saveLine()}<p class="note">${esc(R.rules.decayNote)} Lặp lại cùng một thí luyện trong ngày cho ít EXP hơn.</p></footer>
    </section>`;
  }
  function drawMountain() {
    const svg = $('#mountain'); if (!svg) return; const s = state(), cap = $('.mt-cap');
    const show = i => { const l = D.realms.levels[i]; cap.innerHTML = `<b>${esc(l.name)}</b> <span lang="zh-Hans">${l.zh}</span> · ${fmt(l.exp)} EXP<br>${esc(l.desc)}`; };
    CKL.mountain.draw(svg, s, D.realms, i => { sfx('tap'); show(i); });
    show(s.idx);
    if (!RM) setTimeout(() => { const c = svg.querySelector('.climber circle:last-child'); if (!c) return; const b = c.getBoundingClientRect(); fx.burst(b.left + b.width / 2, b.top + b.height / 2, 18, 90, 1.1, 2); }, 900);
  }

  /* ---------- Pick a topic for a mode ---------- */
  function vPick(mode) {
    const m = MODES.find(x => x.mode === mode);
    if (mode === 'basic') return vLibrary(m);
    const rows = D.topics.map(t => {
      const n = mode === 'rootlet' ? topicRootlets(t).length : mode === 'mix' ? t.lessons.reduce((a, id) => a + (D.questions[id] || []).length, 0) : t.claims.length;
      const unit = mode === 'rootlet' ? 'rễ phụ' : mode === 'mix' ? 'câu trong kho' : 'chủ trương';
      return `<li><button class="lrow" type="button" data-topic="${t.id}"><span class="num">${t.id.slice(1)}</span><span class="body"><span class="title">${esc(t.name)}</span><span class="sub">EA ${t.lessons.join(', ')} · ${n} ${unit}</span></span><span class="st"><small>Chọn</small></span></button></li>`;
    }).join('');
    return `<section class="view narrow"><button class="back" type="button" data-go="home">← Núi</button>
      <header class="lessonhead"><span class="eyebrow"><span class="lv lv${m.d}">${DIFF[m.d]}</span> · +${D.realms.rules.base[m.d]} EXP</span><h1>${m.name}</h1><p class="why">${m.desc}${mode === 'debate' ? ' Mỗi chủ đề có các chủ trương thường gặp; AI đóng vai người bảo vệ chủ trương để bạn rèn phản biện.' : ''}</p></header>
      ${mode === 'mix' ? `<button class="btn" type="button" data-mixall>Hỗn chiến mọi chủ đề · 10 câu</button>` : ''}
      <ol class="lessons">${rows}</ol></section>`;
  }

  /* ---------- Library ---------- */
  function vLibrary(asMode) {
    const lsAll = Object.values(D.lessons);
    const tiers = D.tiers.map((t, i) => { const n = i + 1, ls = tierLessons(n), pc = ls.filter(l => passed(l.id)).length;
      return `<li><button class="lrow" type="button" data-go="tier" data-n="${n}"><span class="num g" lang="zh-Hans">${t.g}</span><span class="body"><span class="title">EA ${n}.1 – ${n}.10</span><span class="sub">${ls.length ? ls.length + ' bài trong Brain · ' + pc + ' thông quan' : 'Chưa có bài'}</span></span><span class="st"><small>${ls.length}/10</small></span></button></li>`; }).join('');
    const topics = D.topics.map(t => `<li><button class="lrow" type="button" data-topic-open="${t.id}"><span class="num">${t.id.slice(1)}</span><span class="body"><span class="title">${esc(t.name)}</span><span class="sub">${topicRootlets(t).length} rễ phụ · EA ${t.lessons.join(', ')}</span></span><span class="st"><small>Mở</small></span></button></li>`).join('');
    return `<section class="view library"><button class="back" type="button" data-go="home">← Núi</button>
      <header class="lessonhead"><span class="eyebrow">${asMode ? `<span class="lv lv1">Sơ</span> · chọn một bài EA để học rồi thí luyện` : 'Tàng Kinh Các'}</span><h1>${asMode ? 'Thí luyện căn bản' : 'Kho Lẽ Thật'}</h1></header>
      <div class="libcols"><div class="sec"><span class="eyebrow">Lẽ thật cơ bản · ${lsAll.length}/50 bài EA</span><div class="prog"><i style="width:${(lsAll.length / 50 * 100).toFixed(0)}%"></i></div><ol class="lessons">${tiers}</ol></div>
      ${asMode ? '' : `<div class="sec"><span class="eyebrow">Củng cố · Nâng cao · Mở rộng</span><ol class="lessons">${topics}</ol></div>`}</div></section>`;
  }
  function vTier(n) {
    const t = D.tiers[n - 1], ls = tierLessons(n), pc = ls.filter(l => passed(l.id)).length, rows = [];
    let gap = null; const flush = () => { if (!gap) return; rows.push(`<li class="lgap"><span class="num">${gap[0] === gap[1] ? n + '.' + gap[0] : n + '.' + gap[0] + ' – ' + n + '.' + gap[1]}</span><span>Chưa có ghi chú trong Brain</span></li>`); gap = null; };
    for (let j = 1; j <= 10; j++) {
      const id = n + '.' + j, l = D.lessons[id];
      if (!l) { gap = gap ? [gap[0], j] : [j, j]; continue; } flush();
      const st = status(id), b = best(id);
      rows.push(`<li><button class="lrow ${st}" type="button" data-lesson="${id}"><span class="num">${id}</span><span class="body"><span class="title">${esc(l.title)}</span><span class="sub">${l.roots.length ? l.roots.length + ' rễ phụ · ' : ''}${(D.questions[id] || []).length} câu thí luyện</span></span><span class="st">${b === undefined ? '<small>Chưa thử</small>' : `<b>${b}</b><small>${st === 'full' ? 'Viên mãn' : st === 'pass' ? 'Thông quan' : 'Chưa đạt'}</small>`}</span></button></li>`);
    }
    flush();
    return `<section class="tierv"><aside class="tier-hero"><button class="back" type="button" data-go="library">← Tàng Kinh Các</button>
      <span class="tg" lang="zh-Hans" aria-hidden="true">${t.g}</span><span class="eyebrow">Lẽ thật cơ bản · EA ${n}.1 – ${n}.10</span><h1>Tầng ${n}</h1>
      <div class="prog"><i style="width:${ls.length ? (pc / ls.length * 100).toFixed(0) : 0}%"></i></div>
      <span class="meta">${pc}/${ls.length} bài thông quan · ${ls.length} trên 10 bài có trong Brain</span>
      ${ls.length ? '' : `<p class="note">Thêm ghi chú có tên bắt đầu bằng "EA ${n}." vào Obsidian rồi chạy lại scripts/build_goc.py.</p>`}</aside>
      <ol class="lessons">${rows.join('')}</ol></section>`;
  }
  function vTopic(id) {
    const t = D.topics.find(x => x.id === id), rs = topicRootlets(t);
    return `<section class="view narrow"><button class="back" type="button" data-go="library">← Tàng Kinh Các</button>
      <header class="lessonhead"><span class="eyebrow">Chủ đề ${t.id.slice(1)} · EA ${t.lessons.join(', ')}</span><h1>${esc(t.name)}</h1></header>
      <div class="two"><button class="btn ghost" type="button" data-mix="${t.id}">Hỗn chiến chủ đề</button><button class="btn" type="button" data-debate="${t.id}">Luận chiến</button></div>
      <div class="sec"><span class="eyebrow">Bài EA</span><div class="rootlets">${t.lessons.map(l => `<button class="rl" type="button" data-lesson="${l}"><span>EA ${l} · ${esc(D.lessons[l].title)}</span><em>${best(l) === undefined ? 'chưa thử' : best(l) + ' điểm'}</em></button>`).join('')}</div></div>
      <div class="sec"><span class="eyebrow">Rễ phụ · ${rs.length}</span><div class="rootlets">${rs.map(r => `<button class="rl" type="button" data-rootlet="${esc(r)}"><span>${esc(r)}</span><em>${rbest(r) === undefined ? D.rootlets[r].qa.length + ' câu' : rbest(r) + ' điểm'}</em></button>`).join('')}</div></div></section>`;
  }

  /* ---------- Lesson & rootlet ---------- */
  function zhCols(t, per = 9) {
    const ch = [...t.replace(/[「」『』\s]/g, '')], cols = [];
    for (let i = 0; i < ch.length; i += per) cols.push(ch.slice(i, i + per));
    return cols.slice(0, 6).map(c => `<span class="col" aria-hidden="true">${c.map(x => `<span>${esc(x)}</span>`).join('')}</span>`).join('');
  }
  function verseBlock(v) { return v ? `<div class="verse"><div class="zh" lang="zh-Hans" aria-label="${esc(v.zh)}">${zhCols(v.zh)}</div><div class="vi"><p>${esc(v.vi)}</p><small>${esc(v.viRef)} · <span lang="zh-Hans">${esc(v.zhRef)}</span> (和合本)</small></div></div>` : ''; }
  function vLesson(id) {
    const l = D.lessons[id], st = status(id), b = best(id), q = D.questions[id] || [], n = id.split('.')[0], t = topicOf(id);
    return `<section class="lessonv"><button class="back" type="button" data-go="tier" data-n="${n}">← Tầng ${n}</button>
      <div class="l-main">
        <header class="lessonhead"><span class="eyebrow">EA ${id}${t ? ' · ' + esc(t.name) : ''}</span><h1>${esc(l.title)}</h1><span class="chip ${st !== 'open' ? 'on' : ''}">${st === 'full' ? 'Viên mãn · 100' : st === 'pass' ? 'Thông quan · ' + b : b !== undefined ? 'Cao nhất ' + b + ' điểm' : 'Chưa thí luyện'}</span></header>
        <div class="sec points"><span class="eyebrow">Ý chính</span><ol>${l.y.map(x => `<li>${esc(x)}</li>`).join('')}</ol>${l.why ? `<p class="why">${esc(l.why)}</p>` : ''}</div>
        ${l.img ? `<div class="sec imgsec"><span class="eyebrow">Hình dung</span><p class="img">${esc(l.img)}</p></div>` : ''}
        ${l.roots.length ? `<div class="sec roots"><span class="eyebrow">Rễ phụ · ${l.roots.length}</span><div class="rootlets">${l.roots.map(r => `<button class="rl" type="button" data-rootlet="${esc(r)}"><span>${esc(r)}</span><em>${rbest(r) === undefined ? D.rootlets[r].qa.length + ' câu' : rbest(r) + ' điểm'}</em></button>`).join('')}</div></div>` : ''}
        <p class="note srcnote">Nguồn: ${esc(l.file)} trong Obsidian.</p>
      </div>
      <div class="l-aside">${verseBlock(verseOf(id))}<button class="btn cta" type="button" data-test="${id}">Thí luyện căn bản · ${q.length} câu · +${D.realms.rules.base[1]}</button>${t ? `<button class="btn ghost cta" type="button" data-debate="${t.id}">Luận chiến chủ đề này · +${D.realms.rules.base[4]}</button>` : ''}</div>
    </section>`;
  }
  function vRootlet(t) {
    const r = D.rootlets[t], l = D.lessons[r.lesson], b = rbest(t);
    return `<section class="view narrow"><button class="back" type="button" data-lesson="${r.lesson}">← EA ${r.lesson}</button>
    <header class="lessonhead"><span class="eyebrow">Rễ phụ của EA ${r.lesson} · ${esc(l.title)}</span><h1>${esc(t)}</h1><span class="chip ${(b || 0) >= PASS ? 'on' : ''}">${b === undefined ? 'Chưa tự kiểm tra' : b + ' điểm'}</span></header>
    ${r.y.length ? `<div class="sec points"><span class="eyebrow">Ý chính</span><ol>${r.y.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : r.why ? `<p class="why">${esc(r.why)}</p>` : ''}
    ${r.img ? `<div class="sec"><span class="eyebrow">Hình dung</span><p class="img">${esc(r.img)}</p></div>` : ''}
    ${r.qa.length ? `<button class="btn" type="button" data-self="${esc(t)}">Tự kiểm tra · ${r.qa.length} câu · +${D.realms.rules.base[2]}</button>` : ''}</section>`;
  }

  /* ---------- MCQ / recall trials ---------- */
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const mcq = q => ({ q: q[0], right: q[1], opts: shuffle(q.slice(1, 5)), src: q[5] });
  function startTest(id) { const pv = verseOf(id); if (pv) fx.prepare(pv.zh); test = { kind: 'lesson', mode: 'basic', difficulty: 1, id, topic: (topicOf(id) || {}).id, verse: pv, title: 'EA ' + id + ' · ' + D.lessons[id].title, items: shuffle(D.questions[id]).map(mcq), i: 0, ok: 0, pick: null, wrong: [] }; go({ v: 'test' }); }
  function startSelf(t) { const r = D.rootlets[t]; test = { kind: 'rootlet', mode: 'rootlet', difficulty: 2, id: t, topic: (topicOf(r.lesson) || {}).id, verse: verseOf(r.lesson), title: t, items: r.qa.map(x => ({ q: x[0], a: x[1] })), i: 0, ok: 0, flip: false, wrong: [] }; go({ v: 'test' }); }
  function startMix(topicId) {
    const ids = topicId ? D.topics.find(t => t.id === topicId).lessons : Object.keys(D.lessons);
    const pool = shuffle(ids.flatMap(id => (D.questions[id] || []).map(q => ({ ...mcq(q), from: id })))).slice(0, 10);
    const pv = verseOf(shuffle(ids)[0]); if (pv) fx.prepare(pv.zh);
    test = { kind: 'mix', mode: 'mix', difficulty: 3, id: topicId || 'all', topic: topicId || null, verse: pv, title: topicId ? 'Hỗn chiến · ' + D.topics.find(t => t.id === topicId).name : 'Hỗn chiến mọi chủ đề', items: pool, i: 0, ok: 0, pick: null, wrong: [], timed: 25 };
    sfx('start'); go({ v: 'test' });
  }
  function answer(k) {
    const T = test, it = T.items[T.i]; if (T.pick !== null) return; clearTimeout(timer); T.pick = k; const right = k >= 0 && it.opts[k] === it.right;
    sfx('answer', { i: T.i, n: T.items.length, ok: right });
    const b = k >= 0 ? document.querySelector(`[data-opt="${k}"]`) : null;
    if (right) { T.ok++; if (b) { const r = b.getBoundingClientRect(); fx.burst(r.left + r.width / 2, r.top + r.height / 2, 28, 170, 0.8, 2); fx.ring(r.left + r.width / 2, r.top + r.height / 2, 110, 0.6); } } else T.wrong.push({ q: it.q, a: it.right });
    render(); if (!right) { const o = $('#opts'); o && o.classList.add('shake'); }
  }
  function armTimer() {
    const T = test; if (!T || !T.timed || T.pick !== null || T.kind === 'rootlet') return;
    const bar = $('.qtime i'); if (bar) { bar.style.transition = 'none'; bar.style.width = '100%'; bar.getBoundingClientRect(); bar.style.transition = `width ${T.timed}s linear`; bar.style.width = '0%'; }
    timer = setTimeout(() => answer(-1), T.timed * 1000);
  }
  function vTest() {
    const T = test, it = T.items[T.i], pct = (T.i / T.items.length) * 100;
    const top = `<button class="back" type="button" data-quit>← Dừng thí luyện</button><div class="qhead"><span><span class="lv lv${T.difficulty}">${DIFF[T.difficulty]}</span> ${esc(T.title)}</span><span>${T.i + 1}/${T.items.length}</span></div><div class="bar"><i style="width:${pct}%"></i></div>`;
    if (T.kind !== 'rootlet') {
      const done = T.pick !== null;
      return `<section class="view narrow">${top}${T.timed && !done ? '<div class="qtime"><i></i></div>' : ''}<p class="q">${esc(it.q)}</p><div class="opts" id="opts">${it.opts.map((o, k) => { let c = ''; if (done) { if (o === it.right) c = 'right'; else if (k === T.pick) c = 'wrong'; } return `<button class="opt ${c}" type="button" data-opt="${k}" ${done ? 'disabled' : ''}>${esc(o)}</button>`; }).join('')}</div>
      ${done ? `${T.pick < 0 ? '<p class="src">Hết giờ.</p>' : ''}<p class="src">Nguồn: ${esc(it.src)}${it.from ? ' · EA ' + it.from : ''}</p><button class="btn" type="button" data-next>${T.i + 1 < T.items.length ? 'Câu tiếp' : 'Xem kết quả'}</button>` : ''}</section>`;
    }
    return `<section class="view narrow">${top}<div class="card"><p class="q">${esc(it.q)}</p>${T.flip ? `<p class="a">${esc(it.a)}</p>` : ''}</div>
    ${T.flip ? `<div class="two"><button class="btn ghost" type="button" data-mark="0">Chưa nhớ</button><button class="btn" type="button" data-mark="1">Đã nhớ</button></div>` : `<button class="btn ghost" type="button" data-flip>Lật xem đáp án</button>`}</section>`;
  }

  /* ---------- Settle any trial: EXP, ledger, moment ---------- */
  async function settle(ev, verse, back) {
    const before = state(); ev.at = Date.now(); ev.exp = X.earn(ev, store.events);
    await store.record(ev); const after = state();
    const rankUp = after.idx > before.idx ? { name: after.level.name, zh: after.level.zh, stage: after.level.stage !== before.level.stage ? after.stage.name : null } : null;
    try { localStorage.setItem('ckl-seen-idx', after.idx); } catch (e) {}
    return { ...ev, before, after, back, rankUp, verse };
  }
  let res = null;
  async function finish() {
    const T = test, score = Math.round((T.ok / T.items.length) * 100);
    res = await settle({ kind: T.kind, ref: T.id, mode: T.mode, difficulty: T.difficulty, topic: T.topic, score, correct: T.ok, total: T.items.length, wrong: T.wrong }, T.verse, T.kind === 'lesson' ? { v: 'lesson', id: T.id } : T.kind === 'rootlet' ? { v: 'rootlet', t: T.id } : { v: 'home' });
    res.title = T.title; res.again = T.kind === 'lesson' ? () => startTest(T.id) : T.kind === 'rootlet' ? () => startSelf(T.id) : () => startMix(T.topic);
    showResult();
  }
  function showResult() {
    const r = res; go({ v: 'result' });
    setTimeout(() => fx.moment(r.score >= 100 ? 'full' : r.score >= PASS ? 'pass' : r.rankUp ? 'pass' : 'fail', r.verse, r.rankUp), 250);
  }
  function vResult() {
    const r = res, s = r.score, a = r.after, j = r.judge;
    return `<section class="view narrow"><span class="eyebrow">Kết quả · ${esc(r.title)}</span>
    <div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap"><span class="score">${s}</span><span class="verdict">${s >= 100 ? '<span class="glyph" lang="zh-Hans">圆满</span>Viên mãn' : s >= PASS ? '<span class="glyph" lang="zh-Hans">通</span>Thông quan' : 'Chưa thông quan'}</span></div>
    <div class="gain"><b>+${r.exp} EXP</b><span>${esc(a.level.name)} · ${fmt(a.exp)} EXP${a.next ? ' · còn ' + fmt(a.toNext) + ' tới ' + esc(a.next.name) : ''}</span><div class="prog"><i style="width:${(a.frac * 100).toFixed(1)}%"></i></div></div>
    ${r.total ? `<p class="meta">${r.correct}/${r.total} câu đúng</p>` : ''}
    ${j ? judgeBlock(j) : ''}
    ${r.wrong && r.wrong.length ? `<div class="sec"><span class="eyebrow">Ôn lại</span><div class="miss">${r.wrong.map(w => `<div><b>${esc(w.q)}</b>${esc(w.a)}</div>`).join('')}</div></div>` : ''}
    <div class="two"><button class="btn ghost" type="button" data-again>Thử lại</button><button class="btn" type="button" data-done>Xong</button></div></section>`;
  }
  function judgeBlock(j) {
    const crit = [['kinh_thanh', 'Bằng chứng Kinh Thánh'], ['logic', 'Lý lẽ'], ['goc_re', 'Đi vào gốc rễ'], ['thai_do', 'Thái độ']].filter(([k]) => j[k] !== undefined);
    return `${crit.length ? `<div class="crit">${crit.map(([k, n]) => `<div><span>${n}</span><div class="prog"><i style="width:${Math.min(100, j[k] * 4)}%"></i></div><b>${j[k]}/25</b></div>`).join('')}</div>` : ''}
      ${j.nhan_xet ? `<p class="why">${esc(j.nhan_xet)}</p>` : ''}
      ${j.manh && j.manh.length ? `<div class="sec"><span class="eyebrow">Điểm mạnh</span><ul class="plain">${j.manh.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${j.thieu && j.thieu.length ? `<div class="sec"><span class="eyebrow">Còn thiếu</span><ul class="plain">${j.thieu.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${j.goc_re_text ? `<div class="sec"><span class="eyebrow">Gốc rễ</span><p class="img">${esc(j.goc_re_text)}</p></div>` : ''}
      ${j.nguyen_tac ? `<div class="sec"><span class="eyebrow">Nguyên tắc Lẽ thật</span><p class="why">${esc(j.nguyen_tac)}</p></div>` : ''}
      ${j.hanh_dong ? `<div class="sec"><span class="eyebrow">Việc làm trong 24 giờ</span><p class="why">${esc(j.hanh_dong)}</p></div>` : ''}
      ${j.hoi ? `<div class="sec"><span class="eyebrow">Câu hỏi đào sâu</span><p class="img">${esc(j.hoi)}</p></div>` : ''}
      ${j.goi_y ? `<div class="sec"><span class="eyebrow">Câu trả lời mẫu</span><p class="img">${esc(j.goi_y)}</p></div>` : ''}`;
  }

  /* ---------- Luận chiến (AI debate) ---------- */
  function refNotes(t, max = 3500) {
    let s = ''; for (const id of t.lessons) { const l = D.lessons[id]; s += `\n# EA ${id} · ${l.title}\n- ${l.y.join('\n- ')}\n${l.why || ''}\n${(l.qa || []).map(q => 'H: ' + q[0] + ' Đ: ' + q[1]).join('\n')}\n`; }
    for (const r of topicRootlets(t)) { const x = D.rootlets[r]; s += `\n## ${r}\n- ${(x.y || []).join('\n- ')}\n`; if (s.length > max) break; }
    return s.slice(0, max);
  }
  const LEVEL_TXT = ['', 'Mức Sơ: dùng một lý lẽ phổ biến, đơn giản.', 'Mức Trung: dùng 2–3 lý lẽ và trích dẫn Kinh Thánh mà người theo chủ trương này hay dùng.', 'Mức Cao: lập luận tinh vi, trích dẫn Kinh Thánh, chỉ thẳng vào điểm yếu trong câu trả lời trước của người học.'];
  const oppSys = d => `Đây là bài tập rèn phản biện cho một người đang học Kinh Thánh. Bạn đóng vai "Người chủ trương", bảo vệ chủ trương: «${d.claim}».
Hãy lập luận như một người thật sự tin chủ trương này, bằng những lý lẽ mà người theo nó thường dùng. ${LEVEL_TXT[d.level]}
Quy tắc: trả lời bằng tiếng Việt, tối đa 110 từ, lịch sự, không xúc phạm, không giảng giải ngoài vai. Chỉ thừa nhận một điểm khi người học đưa ra bằng chứng Kinh Thánh rõ ràng và lý lẽ chặt chẽ; khi thừa nhận thì chuyển sang lý lẽ khác. Không viết lời dẫn, chỉ viết lời của Người chủ trương.`;
  const judgeSys = `Bạn là giám khảo một buổi luyện phản biện Kinh Thánh. Chấm phần trả lời của NGƯỜI HỌC (không chấm Người chủ trương), dựa trên ghi chú học tập của người học ở cuối.
Trả về DUY NHẤT một JSON: {"kinh_thanh":0-25,"logic":0-25,"goc_re":0-25,"thai_do":0-25,"score":tổng 0-100,"nhan_xet":"2 câu","manh":["…"],"thieu":["…"],"goi_y":"câu trả lời mẫu ngắn gọn, có trích dẫn Kinh Thánh"}.
Tiêu chí: kinh_thanh = trích dẫn đúng chỗ và đúng ý; logic = lý lẽ chặt, không ngụy biện; goc_re = chỉ ra gốc rễ sai của chủ trương thay vì cãi ngọn; thai_do = bình tĩnh, tôn trọng. Nghiêm khắc: câu trả lời ngắn, không dẫn chứng thì dưới 40 điểm.`;
  function startDebate(topicId) { const t = D.topics.find(x => x.id === topicId); dbt = { t, claim: null, ci: 0, level: 2, msgs: [], phase: 'setup', err: null, busy: false }; go({ v: 'debate' }); }
  function bubbles(d) {
    return d.msgs.slice(1).map((m, i) => `<div class="bub ${m.role === 'assistant' ? 'them' : 'me'}"><span class="eyebrow">${m.role === 'assistant' ? 'Người chủ trương' : 'Bạn'}</span><p>${esc(m.content).replace(/\n/g, '<br>')}</p></div>`).join('');
  }
  function vDebate() {
    const d = dbt, t = d.t, mine = d.msgs.filter(m => m.role === 'user').length - 1;
    if (d.phase === 'setup') return `<section class="view narrow"><button class="back" type="button" data-go="home">← Núi</button>
      <header class="lessonhead"><span class="eyebrow"><span class="lv lv4">Tuyệt</span> Luận chiến · ${esc(t.name)}</span><h1>Chọn chủ trương để phản bác</h1><p class="why">AI đóng vai người bảo vệ chủ trương. Bạn có 3 lượt trả lời, rồi giám khảo chấm theo 4 tiêu chí: Kinh Thánh, lý lẽ, gốc rễ, thái độ.</p></header>
      <div class="opts">${t.claims.map((c, i) => `<button class="opt ${d.ci === i ? 'right' : ''}" type="button" data-claim="${i}">${esc(c)}</button>`).join('')}</div>
      <div class="sec"><span class="eyebrow">Độ khó của đối thủ</span><div class="chips">${[1, 2, 3].map(l => `<button type="button" class="chipbtn ${d.level === l ? 'on' : ''}" data-level="${l}">${DIFF[l]} · ×${[1, 1.2, 1.5][l - 1]} EXP</button>`).join('')}</div></div>
      <p class="note">${await0(d)}</p>
      <button class="btn" type="button" data-dstart>Bắt đầu luận chiến</button></section>`;
    return `<section class="view narrow"><button class="back" type="button" data-dquit>← Dừng</button>
      <div class="qhead"><span><span class="lv lv4">Tuyệt</span> ${esc(t.name)} · ${DIFF[d.level]}</span><span>Lượt ${Math.min(3, mine + 1)}/3</span></div>
      <p class="claim">«${esc(d.claim)}»</p>
      <div class="thread">${bubbles(d)}${d.busy ? `<div class="bub them typing"><span class="eyebrow">${d.phase === 'judging' ? 'Giám khảo' : 'Người chủ trương'}</span><p>${esc(d.stream || '…')}</p></div>` : ''}</div>
      ${d.err ? `<p class="status warn">${esc(d.err)}</p>` : ''}
      ${d.phase === 'talk' && !d.busy ? `<label class="eyebrow" for="reply">Phản bác của bạn</label><textarea id="reply" rows="5" placeholder="Dẫn Kinh Thánh, chỉ ra gốc rễ sai của chủ trương…"></textarea>
        <div class="two"><button class="btn ghost" type="button" data-djudge ${mine < 1 ? 'disabled' : ''}>Kết thúc và chấm</button><button class="btn" type="button" data-dsend>${mine >= 2 ? 'Gửi lượt cuối' : 'Gửi'}</button></div>` : ''}</section>`;
  }
  let aiMode = null; ai.mode().then(m => { aiMode = m; if (route.v === 'debate' || route.v === 'daily') render(); });
  const await0 = () => aiMode === 'claude' ? 'Dùng Claude ngay trong trang này (lần đầu sẽ hỏi quyền).' : aiMode === 'server' ? 'Dùng AI qua máy chủ Supabase.' : aiMode === 'signin' ? 'Cần đăng nhập ở trang Núi để dùng AI.' : 'AI chưa sẵn sàng ở bản này.';
  async function aiTurn() {
    const d = dbt; d.busy = true; d.stream = ''; d.err = null; render();
    try {
      const text = await ai.chat(oppSys(d), d.msgs, { onText: s => { d.stream = s; const el = document.querySelector('.typing p'); if (el) el.textContent = s; } });
      d.msgs.push({ role: 'assistant', content: text.trim() });
    } catch (e) { d.err = ai.errText(e); }
    d.busy = false; render(); const ta = $('#reply'); if (ta) ta.focus();
  }
  async function judgeDebate() {
    const d = dbt; d.phase = 'judging'; d.busy = true; d.stream = 'Đang chấm…'; d.err = null; render();
    const transcript = d.msgs.slice(1).map(m => (m.role === 'assistant' ? 'NGƯỜI CHỦ TRƯƠNG: ' : 'NGƯỜI HỌC: ') + m.content).join('\n\n');
    try {
      const out = await ai.chat(judgeSys, [{ role: 'user', content: `Chủ trương: «${d.claim}»\nĐộ khó: ${DIFF[d.level]}\n\nBIÊN BẢN:\n${transcript}\n\nGHI CHÚ HỌC TẬP CỦA NGƯỜI HỌC:\n${refNotes(d.t)}` }], { maxTokens: 1200, tier: 'complex' });
      const j = ai.parseJSON(out); if (!j) throw { message: 'Giám khảo trả lời không đúng định dạng, thử lại.' };
      const score = Math.max(0, Math.min(100, Math.round(j.score ?? ((j.kinh_thanh || 0) + (j.logic || 0) + (j.goc_re || 0) + (j.thai_do || 0)))));
      res = await settle({ kind: 'debate', ref: d.t.id + '-' + d.ci, mode: 'debate', difficulty: 4, mult: [1, 1.2, 1.5][d.level - 1], topic: d.t.id, score, correct: 0, total: 0, wrong: [], detail: { claim: d.claim, level: d.level, transcript: d.msgs, judge: j } }, verseOf(d.t.lessons[0]), { v: 'home' });
      res.judge = j; res.title = 'Luận chiến · ' + d.t.name; res.again = () => startDebate(d.t.id); d.busy = false; showResult();
    } catch (e) { d.busy = false; d.phase = 'talk'; d.err = ai.errText(e); render(); }
  }

  /* ---------- Nhiệm vụ hằng ngày ---------- */
  const dailySys = `Bạn là người thầy giúp một người tu luyện tư duy gốc rễ và áp dụng Lẽ thật Kinh Thánh vào đời sống. Người học kể một hoàn cảnh có thật hôm nay và tự phân tích.
Hãy: (1) dùng chuỗi "vì sao" để tìm nguyên nhân gốc thật sự, sâu hơn điều người học thấy; (2) nối với một nguyên tắc Lẽ thật cụ thể trong danh sách bài học ở cuối (ghi rõ bài); (3) đề xuất MỘT việc làm cụ thể trong 24 giờ; (4) đặt một câu hỏi đào sâu; (5) chấm độ sâu phần tự phân tích của người học.
Trả về DUY NHẤT JSON: {"goc_re":0-25,"logic":0-25,"kinh_thanh":0-25,"thai_do":0-25,"score":tổng 0-100,"nhan_xet":"2 câu","goc_re_text":"nguyên nhân gốc theo bạn","nguyen_tac":"…","hanh_dong":"…","hoi":"…"}.
Tiêu chí: goc_re = có đi tới nguyên nhân gốc không; logic = lập luận rõ; kinh_thanh = có nối với Lẽ thật đúng; thai_do = tự nhìn lại mình, không đổ lỗi. Ngắn gọn, ấm áp, thẳng thắn.`;
  function vDaily() {
    const d = day || (day = { busy: false, err: null, self: [false, false, false] });
    return `<section class="view narrow"><button class="back" type="button" data-go="home">← Núi</button>
      <header class="lessonhead"><span class="eyebrow">Nhiệm vụ hôm nay · +${D.realms.rules.base.daily} EXP</span><h1>Mổ xẻ một hoàn cảnh</h1><p class="why">Chọn một chuyện thật hôm nay: một va chạm, một quyết định, một cảm xúc mạnh. Viết ngắn, thật.</p></header>
      <label class="eyebrow" for="dsit">Hoàn cảnh</label><textarea id="dsit" rows="4" placeholder="Chuyện gì đã xảy ra? Ai, ở đâu, bạn đã phản ứng thế nào?">${esc(d.sit || '')}</textarea>
      <label class="eyebrow" for="droot">Tôi nghĩ gốc rễ là</label><textarea id="droot" rows="3" placeholder="Hỏi vì sao ít nhất 3 lần…">${esc(d.root || '')}</textarea>
      <label class="eyebrow" for="dact">Tôi sẽ làm</label><input id="dact" type="text" value="${esc(d.act || '')}" placeholder="Một việc cụ thể trong 24 giờ">
      ${d.err ? `<p class="status warn">${esc(d.err)}</p>` : ''}
      ${aiMode === 'claude' || aiMode === 'server' ? `<button class="btn" type="button" data-dailygo ${d.busy ? 'disabled' : ''}>${d.busy ? 'Thầy đang đọc…' : 'Gửi để mổ xẻ'}</button><p class="note">${await0()}</p>`
        : `<div class="sec"><span class="eyebrow">Tự chấm (AI chưa sẵn sàng: ${esc(await0())})</span>${['Tôi đã tìm tới nguyên nhân gốc, không dừng ở bề mặt', 'Tôi đã nối với một nguyên tắc Lẽ thật cụ thể', 'Tôi có một việc làm cụ thể trong 24 giờ'].map((x, i) => `<label class="check"><input type="checkbox" data-selfc="${i}" ${d.self[i] ? 'checked' : ''}> ${x}</label>`).join('')}</div><button class="btn" type="button" data-dailyself>Ghi lại</button>`}
</section>`;
  }
  function readDaily() { day.sit = ($('#dsit') || {}).value || ''; day.root = ($('#droot') || {}).value || ''; day.act = ($('#dact') || {}).value || ''; }
  async function sendDaily() {
    readDaily(); if (day.sit.trim().length < 20) { day.err = 'Kể hoàn cảnh cụ thể hơn một chút (ít nhất 20 ký tự).'; return render(); }
    day.busy = true; day.err = null; render();
    const ref = Object.values(D.lessons).map(l => `EA ${l.id} ${l.title}: ${l.y.join(' ')}`).join('\n').slice(0, 4000);
    try {
      const out = await ai.chat(dailySys, [{ role: 'user', content: `HOÀN CẢNH:\n${day.sit}\n\nTỰ PHÂN TÍCH GỐC RỄ:\n${day.root || '(chưa viết)'}\n\nVIỆC SẼ LÀM:\n${day.act || '(chưa viết)'}\n\nDANH SÁCH BÀI HỌC:\n${ref}` }], { maxTokens: 1100, tier: 'complex' });
      const j = ai.parseJSON(out); if (!j) throw { message: 'Câu trả lời không đúng định dạng, thử lại.' };
      const score = Math.max(0, Math.min(100, Math.round(j.score ?? 0)));
      res = await settle({ kind: 'daily', ref: new Date().toISOString().slice(0, 10), mode: 'daily', difficulty: 0, score, wrong: [], detail: { situation: day.sit, root: day.root, action: day.act, feedback: j } }, null, { v: 'home' });
      res.judge = j; res.title = 'Nhiệm vụ hôm nay'; res.again = () => { day = null; go({ v: 'daily' }); }; day = null; showResult();
    } catch (e) { day.busy = false; day.err = ai.errText(e); render(); }
  }
  async function selfDaily() {
    readDaily(); if (day.sit.trim().length < 20) { day.err = 'Kể hoàn cảnh cụ thể hơn một chút (ít nhất 20 ký tự).'; return render(); }
    const score = Math.round(day.self.filter(Boolean).length / 3 * 100);
    res = await settle({ kind: 'daily', ref: new Date().toISOString().slice(0, 10), mode: 'daily', difficulty: 0, score, wrong: [], detail: { situation: day.sit, root: day.root, action: day.act, self: day.self } }, null, { v: 'home' });
    res.title = 'Nhiệm vụ hôm nay'; res.again = () => { day = null; go({ v: 'daily' }); }; day = null; showResult();
  }

  /* ---------- events ---------- */
  function bind() {
    const a = $('#app'), on = (sel, fn) => a.querySelectorAll(sel).forEach(b => (b.onclick = () => fn(b)));
    on('[data-go]', b => go(b.dataset.go === 'tier' ? { v: 'tier', n: +b.dataset.n } : { v: b.dataset.go }));
    on('[data-lesson]', b => { sfx('lesson'); go({ v: 'lesson', id: b.dataset.lesson }); });
    on('[data-rootlet]', b => go({ v: 'rootlet', t: b.dataset.rootlet }));
    on('[data-topic-open]', b => go({ v: 'topic', t: b.dataset.topicOpen }));
    on('[data-pick]', b => { sfx('open', { n: 1 }); go({ v: 'pick', mode: b.dataset.pick }); });
    on('[data-topic]', b => { const m = route.mode, t = b.dataset.topic; if (m === 'mix') startMix(t); else if (m === 'debate') startDebate(t); else go({ v: 'topic', t }); });
    on('[data-mixall]', () => startMix(null));
    on('[data-mix]', b => startMix(b.dataset.mix));
    on('[data-debate]', b => startDebate(b.dataset.debate));
    on('[data-daily]', () => { sfx('open', { n: 2 }); day = null; go({ v: 'daily' }); });
    on('[data-test]', b => { sfx('start'); startTest(b.dataset.test); });
    on('[data-self]', b => { sfx('start'); startSelf(b.dataset.self); });
    on('[data-sound]', b => { CKL.sfx.setOn(!CKL.sfx.on); b.setAttribute('aria-pressed', CKL.sfx.on); b.textContent = 'Âm thanh · ' + (CKL.sfx.on ? 'Bật' : 'Tắt'); if (CKL.sfx.on) sfx('tap'); });
    on('[data-ambient]', b => { CKL.sfx.setAmbient(!CKL.sfx.ambient); b.setAttribute('aria-pressed', CKL.sfx.ambient); b.textContent = 'Linh khí 40 Hz · ' + (CKL.sfx.ambient ? 'Bật' : 'Tắt'); });
    on('[data-quit]', () => go(test.kind === 'lesson' ? { v: 'lesson', id: test.id } : test.kind === 'rootlet' ? { v: 'rootlet', t: test.id } : { v: 'home' }));
    on('[data-opt]', b => answer(+b.dataset.opt));
    on('[data-next]', () => { test.pick = null; if (++test.i < test.items.length) render(); else finish(); });
    on('[data-flip]', () => { test.flip = true; render(); });
    on('[data-mark]', b => { const T = test, it = T.items[T.i], ok = b.dataset.mark === '1'; sfx('answer', { i: T.i, n: T.items.length, ok }); if (ok) T.ok++; else T.wrong.push({ q: it.q, a: it.a }); T.flip = false; if (++T.i < T.items.length) render(); else finish(); });
    on('[data-again]', () => res && res.again && res.again());
    on('[data-done]', () => go(res && res.back ? res.back : { v: 'home' }));
    on('[data-claim]', b => { dbt.ci = +b.dataset.claim; render(); });
    on('[data-level]', b => { dbt.level = +b.dataset.level; render(); });
    on('[data-dstart]', () => { if (!(aiMode === 'claude' || aiMode === 'server')) { dbt.err = await0(); return render(); } sfx('start'); dbt.claim = dbt.t.claims[dbt.ci]; dbt.phase = 'talk'; dbt.msgs = [{ role: 'user', content: 'Hãy mở đầu bằng lập luận của bạn cho chủ trương này.' }]; aiTurn(); });
    on('[data-dsend]', () => { const v = ($('#reply') || {}).value || ''; if (v.trim().length < 15) { dbt.err = 'Viết phản bác cụ thể hơn (ít nhất 15 ký tự).'; return render(); } dbt.msgs.push({ role: 'user', content: v.trim() }); sfx('answer', { i: dbt.msgs.filter(m => m.role === 'user').length - 2, n: 3, ok: true }); if (dbt.msgs.filter(m => m.role === 'user').length - 1 >= 3) judgeDebate(); else aiTurn(); });
    on('[data-djudge]', () => judgeDebate());
    on('[data-dquit]', () => go({ v: 'topic', t: dbt.t.id }));
    on('[data-dailygo]', () => sendDaily());
    on('[data-dailyself]', () => selfDaily());
    a.querySelectorAll('[data-selfc]').forEach(c => (c.onchange = () => { day.self[+c.dataset.selfc] = c.checked; }));
    on('[data-signout]', () => store.signOut());
    const f = a.querySelector('[data-signin]'); if (f) f.onsubmit = async e => { e.preventDefault(); const m = a.querySelector('[data-msg]'); const r = await store.signIn(a.querySelector('#email').value); m.textContent = r.error ? 'Không gửi được: ' + r.error : 'Đã gửi link đăng nhập. Mở email trên máy này để vào.'; };
  }

  render();
  store.init().then(() => { ai.mode().then(m => { aiMode = m; }); render(); });
  if (document.fonts) document.fonts.ready.then(() => { if (route.v === 'home') render(); });
})();
