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
  /* What the current tier of the mountain opens in Tàng Kinh Các: I → EA 1–10, II → EA 1–30, III → all 50, IV → whole vault. */
  const eaNum = id => { const [a, b] = id.split('.').map(Number); return (a - 1) * 10 + b; };
  const isOpen = id => eaNum(id) <= state().stage.ea;
  const openLessons = () => Object.keys(D.lessons).filter(isOpen);
  const topicOpen = t => t.lessons.some(isOpen);
  const openRootletsOf = t => t.lessons.filter(isOpen).flatMap(id => D.lessons[id].roots).filter(r => D.rootlets[r]);
  const openRootlets = () => openLessons().flatMap(id => D.lessons[id].roots).filter(r => D.rootlets[r]);
  const opensAt = ea => D.realms.stages.find(st => ea <= st.ea);
  const ROMAN = ['I', 'II', 'III', 'IV'];
  const lockTxt = ea => { const st = opensAt(ea); return st ? 'Mở ở tầng núi ' + ROMAN[st.n - 1] : 'Chưa mở'; };
  const fmt = n => Number(n).toLocaleString('vi-VN');
  const hrs = ms => { const h = Math.round(ms / 3600000); return h >= 24 ? Math.floor(h / 24) + ' ngày ' + (h % 24) + ' giờ' : h + ' giờ'; };

  /* ---------- routing ---------- */
  let route = { v: 'home' }, test = null, dbt = null, day = null, timer = null, pick = null;
  function go(r) { clearTimeout(timer); route = r; render(); scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); }
  function render() {
    const a = $('#app'), v = route.v;
    a.innerHTML = v === 'home' ? vHome() : v === 'library' ? vLibrary() : v === 'tier' ? vTier(route.n) : v === 'lesson' ? vLesson(route.id) : v === 'topic' ? vTopic(route.t) : v === 'rootlet' ? vRootlet(route.t)
      : v === 'pick' ? vPick(route.mode) : v === 'test' ? vTest() : v === 'debate' ? vDebate() : v === 'daily' ? vDaily()
      : v === 'boss' ? vBoss() : v === 'recall' ? vRecall() : v === 'duel' ? vDuel() : v === 'profile' ? vProfile() : vResult();
    if (v === 'test' && test && test.pick === null && test.shownI !== test.i) { test.shownI = test.i; test.shownAt = Date.now(); }
    bind(); if (v === 'home') drawMountain(); if (v === 'test') armTimer();
    if (v === 'profile') loadProfileData();
    if (v === 'duel' && duel && duel.phase === 'menu' && duel.mine === undefined && store.mode === 'supabase' && store.user) { duel.mine = null; rpc('my_duels', {}).then(m => { duel.mine = m || []; if (route.v === 'duel') render(); }).catch(() => {}); }
    if (v === 'duel' && duel && duel.phase === 'menu' && duel.week === undefined && store.mode === 'supabase' && store.user) { duel.week = null; rpc('duel_week_board', {}).then(w => { duel.week = w; if (route.v === 'duel') render(); }).catch(() => {}); }
  }
  let lastUid = null, prof = { hist: undefined, weak: undefined, msg: '' };
  store.onChange = () => { const uid = store.user ? store.user.id : null; if (uid !== lastUid) { lastUid = uid; prof = { hist: undefined, weak: undefined, msg: '' }; } if (!['test', 'debate', 'daily', 'boss', 'recall', 'duel'].includes(route.v)) render(); };
  DESKTOP.addEventListener('change', () => { if (route.v === 'home') render(); });

  /* ---------- Home: the climb ---------- */
  function saveLine() {
    if (store.mode === 'supabase') return store.user ? `<div class="save">Đang lưu lên máy chủ · ${esc(store.user.email || '')} <button type="button" data-signout>Đăng xuất</button></div>`
      : `<div class="save"><form data-signin><label for="email" style="position:absolute;left:-9999px">Email</label><input id="email" type="email" required placeholder="Email để nhận link đăng nhập"><button type="submit">Gửi link</button></form><span data-msg>Đăng nhập để lưu tu vi lên máy chủ và dùng AI.</span></div>`;
    return `<div class="save">${store.mode === 'artifact' ? 'Tu vi được lưu trong bản xem trước này.' : 'Tu vi chỉ lưu trên trình duyệt này.'}</div>`;
  }
  function soundLine() {
    if (!CKL.sfx) return '';
    return `<div class="sounds"><button class="sound" type="button" data-sound aria-pressed="${CKL.sfx.on}">Âm thanh · ${CKL.sfx.on ? 'Bật' : 'Tắt'}</button><button class="sound" type="button" data-ambient aria-pressed="${CKL.sfx.ambient}">Linh khí · ${CKL.sfx.ambient ? 'Bật' : 'Tắt'}</button></div>`;
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
        <button class="acct" type="button" data-go="profile">${store.user ? esc(store.displayName()) : store.mode === 'supabase' ? 'Đăng nhập' : 'Hồ sơ'}<span>${store.user ? esc(s.level.name) : ''}</span></button>
        <div class="brandline"><span class="eyebrow">Chân Kinh Lộ</span><span class="rule"></span><span class="glyph" aria-hidden="true">${s.stage.g}</span><span class="eyebrow">Tầng núi ${['I', 'II', 'III', 'IV'][s.stage.n - 1]} · ${esc(s.stage.level)}</span></div>
        <span class="eyebrow now">${esc(s.stage.name)} · Cảnh giới ${s.idx + 1}/${R.levels.length}</span>
        <h1 class="rank">${esc(s.level.name)}</h1>
        <span class="zhline" lang="zh-Hans">${s.level.zh}</span>
        <p class="desc">${esc(s.level.desc)}</p>
        <div class="nextrank"><div class="prog"><i style="width:${(s.frac * 100).toFixed(1)}%"></i></div>
          <span><b>${fmt(s.exp)} EXP</b>${s.next ? ` · còn ${fmt(s.toNext)} để lên <b>${esc(s.next.name)}</b>` : ' · đỉnh cao nhất'}</span></div>
        ${dropNote(s)}${statusLine(s)}
      </header>
      ${gateCard(s)}
      ${s.todayDaily ? `<div class="cont done"><span class="eyebrow">Nhiệm vụ hôm nay</span><strong>Đã mổ xẻ một hoàn cảnh hôm nay.</strong><em>Quay lại ngày mai.</em></div>`
        : `<button class="cont" type="button" data-daily><span class="eyebrow">Nhiệm vụ hôm nay · +${base.daily} EXP</span><strong>Mổ xẻ một hoàn cảnh trong đời sống</strong><em>Kể lại, tìm gốc rễ, nối với Lẽ thật, chọn một việc làm.</em><span class="go">Bắt đầu</span></button>`}
      <div class="modes" role="list">${MODES.map(m => `<button class="mode" type="button" role="listitem" data-pick="${m.mode}"><span class="lv lv${m.d}">${DIFF[m.d]}</span><span class="body"><b>${m.name}</b><small>${m.desc}</small></span><span class="xp">+${base[m.d]}</span></button>`).join('')}</div>
      <div class="home-tree mtwrap"><svg id="mountain" viewBox="-30 0 460 600" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Núi tu luyện: 14 cảnh giới trên 4 tầng núi"></svg><p class="mt-cap" aria-live="polite"></p></div>
      <button class="libline" type="button" data-go="library"><span class="eyebrow">Tàng Kinh Các · đang mở ${esc(s.stage.unlock)}</span><span>${openLessons().length}/${Object.keys(D.lessons).length} bài EA trong Brain · ${D.topics.filter(topicOpen).length}/${D.topics.length} chủ đề củng cố, mở rộng</span><span class="go">Mở</span></button>
      <button class="libline duelline" type="button" data-go="duel"><span class="eyebrow">Song đấu</span><span>Mời người khác cùng đánh một thí luyện, so điểm phân thắng thua</span><span class="go">Mở</span></button>
      <footer class="foot">${soundLine()}${store.mode === 'supabase' && !store.user ? saveLine() : ''}<p class="note">${esc(R.rules.decayNote)} Lặp lại cùng một thí luyện trong ngày cho ít EXP hơn.</p></footer>
    </section>`;
  }
  function gateCard(s) {
    const g = s.gate, B = D.realms.boss; if (!g) return '';
    if (!g.atCeiling) return '';
    if (!g.ready) return `<div class="cont gate done"><span class="eyebrow">Bình cảnh · ải tầng núi ${ROMAN[g.stage - 1]}</span><strong>Ải đang hồi phục</strong><em>Thử lại sau ${hrs(g.cooldown)}. EXP dừng ở bình cảnh cho tới khi vượt ải.</em></div>`;
    return `<button class="cont gate" type="button" data-boss><span class="eyebrow">Bình cảnh · EXP đã dừng</span><strong>Vượt ải lên tầng núi ${ROMAN[g.stage - 1]} · ${esc(g.name)}</strong><em>${B.minutes / 60} giờ · đủ 4 loại thí luyện · cần từ ${B.pass} điểm, mỗi phần từ ${B.partMin}. Thắng: +${B.reward} EXP và mở ${esc(D.realms.stages[g.stage - 1].unlock)}.</em><span class="go">Vào ải</span></button>`;
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
      if (!topicOpen(t)) return `<li><div class="lrow locked"><span class="num">${t.id.slice(1)}</span><span class="body"><span class="title">${esc(t.name)}</span><span class="sub">${lockTxt(Math.min(...t.lessons.map(eaNum)))}</span></span><span class="st"><small>Khoá</small></span></div></li>`;
      const n = mode === 'rootlet' ? openRootletsOf(t).length : mode === 'mix' ? t.lessons.filter(isOpen).reduce((a, id) => a + (D.questions[id] || []).length, 0) : t.claims.length;
      const unit = mode === 'rootlet' ? 'rễ phụ' : mode === 'mix' ? 'câu trong kho' : 'chủ trương';
      return `<li><button class="lrow" type="button" data-topic="${t.id}"><span class="num">${t.id.slice(1)}</span><span class="body"><span class="title">${esc(t.name)}</span><span class="sub">EA ${t.lessons.filter(isOpen).join(', ')} · ${n} ${unit}</span></span><span class="st"><small>Chọn</small></span></button></li>`;
    }).join('');
    return `<section class="view narrow"><button class="back" type="button" data-go="home">← Núi</button>
      <header class="lessonhead"><span class="eyebrow"><span class="lv lv${m.d}">${DIFF[m.d]}</span> · +${D.realms.rules.base[m.d]} EXP</span><h1>${m.name}</h1><p class="why">${m.desc}${mode === 'debate' ? ' Mỗi chủ đề có các chủ trương thường gặp; AI đóng vai người bảo vệ chủ trương để bạn rèn phản biện.' : ''}</p></header>
      ${mode === 'mix' ? `<button class="btn" type="button" data-mixall>Hỗn chiến mọi bài đang mở · 10 câu</button>` : ''}
      <ol class="lessons">${rows}</ol></section>`;
  }

  /* ---------- Library ---------- */
  function vLibrary(asMode) {
    const lsAll = Object.values(D.lessons);
    const tiers = D.tiers.map((t, i) => { const n = i + 1, ls = tierLessons(n), pc = ls.filter(l => passed(l.id)).length, first = (n - 1) * 10 + 1;
      if (first > state().stage.ea) return `<li><div class="lrow locked"><span class="num g" lang="zh-Hans">${t.g}</span><span class="body"><span class="title">EA ${first} – ${first + 9}</span><span class="sub">${lockTxt(first)} · ${ls.length} bài trong Brain</span></span><span class="st"><small>Khoá</small></span></div></li>`;
      return `<li><button class="lrow" type="button" data-go="tier" data-n="${n}"><span class="num g" lang="zh-Hans">${t.g}</span><span class="body"><span class="title">EA ${first} – ${first + 9}</span><span class="sub">${ls.length ? ls.length + ' bài trong Brain · ' + pc + ' thông quan' : 'Chưa có bài'}</span></span><span class="st"><small>${ls.length}/10</small></span></button></li>`; }).join('');
    const topics = D.topics.map(t => !topicOpen(t) ? `<li><div class="lrow locked"><span class="num">${t.id.slice(1)}</span><span class="body"><span class="title">${esc(t.name)}</span><span class="sub">${lockTxt(Math.min(...t.lessons.map(eaNum)))}</span></span><span class="st"><small>Khoá</small></span></div></li>` : `<li><button class="lrow" type="button" data-topic-open="${t.id}"><span class="num">${t.id.slice(1)}</span><span class="body"><span class="title">${esc(t.name)}</span><span class="sub">${openRootletsOf(t).length} rễ phụ · EA ${t.lessons.filter(isOpen).join(', ')}</span></span><span class="st"><small>Mở</small></span></button></li>`).join('');
    const vault = state().stage.vault ? `<li><div class="lrow"><span class="num">∞</span><span class="body"><span class="title">Toàn bộ Vault</span><span class="sub">Đã mở. Chạy scripts/build_goc.py với cả thư mục Brain để nạp.</span></span></div></li>`
      : `<li><div class="lrow locked"><span class="num">∞</span><span class="body"><span class="title">Toàn bộ kiến thức trong Vault</span><span class="sub">Mở ở tầng núi IV · Tông Sư</span></span><span class="st"><small>Khoá</small></span></div></li>`;
    return `<section class="view library"><button class="back" type="button" data-go="home">← Núi</button>
      <header class="lessonhead"><span class="eyebrow">${asMode ? `<span class="lv lv1">Sơ</span> · chọn một bài EA để học rồi thí luyện` : 'Tàng Kinh Các'}</span><h1>${asMode ? 'Thí luyện căn bản' : 'Kho Lẽ Thật'}</h1></header>
      <div class="libcols"><div class="sec"><span class="eyebrow">Lẽ thật cơ bản · đang mở ${esc(state().stage.unlock)} · ${lsAll.length}/50 bài có trong Brain</span><div class="prog"><i style="width:${(lsAll.length / 50 * 100).toFixed(0)}%"></i></div><ol class="lessons">${tiers}</ol></div>
      ${asMode ? '' : `<div class="sec"><span class="eyebrow">Củng cố · Nâng cao · Mở rộng</span><ol class="lessons">${topics}${vault}</ol></div>`}</div></section>`;
  }
  function vTier(n) {
    const t = D.tiers[n - 1], ls = tierLessons(n), pc = ls.filter(l => passed(l.id)).length, rows = [];
    let gap = null; const flush = () => { if (!gap) return; rows.push(`<li class="lgap"><span class="num">${gap[0] === gap[1] ? n + '.' + gap[0] : n + '.' + gap[0] + ' – ' + n + '.' + gap[1]}</span><span>Chưa có ghi chú trong Brain</span></li>`); gap = null; };
    for (let j = 1; j <= 10; j++) {
      const id = n + '.' + j, l = D.lessons[id];
      if (!l) { gap = gap ? [gap[0], j] : [j, j]; continue; } flush();
      const st = status(id), b = best(id);
      if (!isOpen(id)) { rows.push(`<li><div class="lrow locked"><span class="num">${eaNum(id)}</span><span class="body"><span class="title">${esc(l.title)}</span><span class="sub">${lockTxt(eaNum(id))}</span></span><span class="st"><small>Khoá</small></span></div></li>`); continue; }
      rows.push(`<li><button class="lrow ${st}" type="button" data-lesson="${id}"><span class="num">${eaNum(id)}</span><span class="body"><span class="title">${esc(l.title)}</span><span class="sub">${l.roots.length ? l.roots.length + ' rễ phụ · ' : ''}${(D.questions[id] || []).length} câu thí luyện</span></span><span class="st">${b === undefined ? '<small>Chưa thử</small>' : `<b>${b}</b><small>${st === 'full' ? 'Viên mãn' : st === 'pass' ? 'Thông quan' : 'Chưa đạt'}</small>`}</span></button></li>`);
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
    const t = D.topics.find(x => x.id === id), rs = openRootletsOf(t);
    return `<section class="view narrow"><button class="back" type="button" data-go="library">← Tàng Kinh Các</button>
      <header class="lessonhead"><span class="eyebrow">Chủ đề ${t.id.slice(1)} · EA ${t.lessons.join(', ')}</span><h1>${esc(t.name)}</h1></header>
      <div class="two"><button class="btn ghost" type="button" data-mix="${t.id}">Hỗn chiến chủ đề</button><button class="btn" type="button" data-debate="${t.id}">Luận chiến</button></div>
      <div class="sec"><span class="eyebrow">Bài EA</span><div class="rootlets">${t.lessons.map(l => isOpen(l) ? `<button class="rl" type="button" data-lesson="${l}"><span>EA ${eaNum(l)} · ${esc(D.lessons[l].title)}</span><em>${best(l) === undefined ? 'chưa thử' : best(l) + ' điểm'}</em></button>` : `<div class="rl locked"><span>EA ${eaNum(l)} · ${esc(D.lessons[l].title)}</span><em>${lockTxt(eaNum(l))}</em></div>`).join('')}</div></div>
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
        <header class="lessonhead"><span class="eyebrow">EA ${eaNum(id)}${t ? ' · ' + esc(t.name) : ''}</span><h1>${esc(l.title)}</h1><span class="chip ${st !== 'open' ? 'on' : ''}">${st === 'full' ? 'Viên mãn · 100' : st === 'pass' ? 'Thông quan · ' + b : b !== undefined ? 'Cao nhất ' + b + ' điểm' : 'Chưa thí luyện'}</span></header>
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
    const ids = (topicId ? D.topics.find(t => t.id === topicId).lessons : Object.keys(D.lessons)).filter(isOpen);
    const pool = shuffle(ids.flatMap(id => (D.questions[id] || []).map(q => ({ ...mcq(q), from: id })))).slice(0, 10);
    const pv = verseOf(shuffle(ids)[0]); if (pv) fx.prepare(pv.zh);
    test = { kind: 'mix', mode: 'mix', difficulty: 3, id: topicId || 'all', topic: topicId || null, verse: pv, title: topicId ? 'Hỗn chiến · ' + D.topics.find(t => t.id === topicId).name : 'Hỗn chiến mọi chủ đề', items: pool, i: 0, ok: 0, pick: null, wrong: [], timed: 25 };
    sfx('start'); go({ v: 'test' });
  }
  function answer(k) {
    const T = test, it = T.items[T.i]; if (T.pick !== null) return; clearTimeout(timer); T.pick = k; const right = k >= 0 && it.opts[k] === it.right;
    sfx('answer', { i: T.i, n: T.items.length, ok: right });
    const b = k >= 0 ? document.querySelector(`[data-opt="${k}"]`) : null;
    const ms = Date.now() - (T.shownAt || Date.now()), chose = k >= 0 ? it.opts[k] : '(hết giờ)';
    (T.log = T.log || []).push({ q: it.q, a: it.right, chose, ok: right, ms });
    if (right) { T.ok++; if (b) { const r = b.getBoundingClientRect(); fx.burst(r.left + r.width / 2, r.top + r.height / 2, 28, 170, 0.8, 2); fx.ring(r.left + r.width / 2, r.top + r.height / 2, 110, 0.6); } } else T.wrong.push({ q: it.q, a: it.right, chose, ms });
    render(); if (!right) { const o = $('#opts'); o && o.classList.add('shake'); }
  }
  function armTimer() {
    const T = test; if (!T || !T.timed || T.pick !== null || T.kind === 'rootlet') return;
    const bar = $('.qtime i'); if (bar) { bar.style.transition = 'none'; bar.style.width = '100%'; bar.getBoundingClientRect(); bar.style.transition = `width ${T.timed}s linear`; bar.style.width = '0%'; }
    timer = setTimeout(() => answer(-1), T.timed * 1000);
  }
  function vTest() {
    const T = test, it = T.items[T.i], pct = (T.i / T.items.length) * 100;
    const top = `<button class="back" type="button" data-quit>← Dừng thí luyện</button><div class="qhead"><span><span class="lv lv${T.difficulty}">${DIFF[T.difficulty]}</span> ${esc(T.title)}</span><span>${T.i + 1}/${T.items.length}</span></div><div class="bar"><i style="width:${pct}%"></i></div>${T.boss ? bossStrip() : ''}`;
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
    if (T.boss) return bossPartDone(score);
    const log = T.log || [], avg_ms = log.length ? Math.round(log.reduce((a, x) => a + x.ms, 0) / log.length) : null;
    if (T.duel) return duelDone(score, { correct: T.ok, total: T.items.length, log, avg_ms });
    res = await settle({ kind: T.kind, ref: T.id, mode: T.mode, difficulty: T.difficulty, topic: T.topic, score, correct: T.ok, total: T.items.length, wrong: T.wrong, detail: { log, avg_ms } }, T.verse, T.kind === 'lesson' ? { v: 'lesson', id: T.id } : T.kind === 'rootlet' ? { v: 'rootlet', t: T.id } : { v: 'home' });
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
    ${r.bossScores ? `<ol class="bparts">${D.realms.boss.parts.map((p, k) => `<li class="${r.bossScores[k] >= D.realms.boss.partMin ? 'done' : ''}"><span class="lv lv${p.d}">${DIFF[p.d]}</span><b>${p.name}</b><small>${r.bossScores[k]} điểm</small></li>`).join('')}</ol>` : ''}
    <div class="${r.again ? 'two' : ''}">${r.again ? '<button class="btn ghost" type="button" data-again>Thử lại</button>' : ''}<button class="btn" type="button" data-done>Xong</button></div></section>`;
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
      if (d.boss) { d.busy = false; return bossPartDone(score, j); }
      if (d.duel) { d.busy = false; return duelDone(score, { judge: j }); }
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

  /* ---------- Ghi nhớ (typed recall, graded by AI or by yourself) ---------- */
  let rc = null;
  const gradeSys = `Bạn chấm bài ghi nhớ. Với mỗi câu, so câu trả lời của người học với đáp án tham khảo: 2 = đúng ý chính, 1 = đúng một phần, 0 = sai hoặc bỏ trống. Không bắt bẻ câu chữ, chỉ xét ý.
Trả về DUY NHẤT JSON: {"diem":[số cho từng câu theo thứ tự],"nhan_xet":"1–2 câu"}.`;
  function startRecall(items, o) { rc = { items: items.map(x => ({ q: x[0], a: x[1], ans: '' })), i: 0, phase: 'ask', ...o }; go({ v: 'recall' }); }
  function vRecall() {
    const r = rc, it = r.items[r.i], top = `<button class="back" type="button" data-rquit>← ${r.boss ? 'Rời phần này' : 'Dừng'}</button><div class="qhead"><span><span class="lv lv2">Trung</span> ${esc(r.title)}</span><span>${Math.min(r.i + 1, r.items.length)}/${r.items.length}</span></div><div class="bar"><i style="width:${(r.i / r.items.length) * 100}%"></i></div>${r.boss ? bossStrip() : ''}`;
    if (r.phase === 'ask') return `<section class="view narrow">${top}<p class="q">${esc(it.q)}</p><textarea id="rans" rows="4" placeholder="Trả lời theo trí nhớ, ý chính là đủ">${esc(it.ans)}</textarea><button class="btn" type="button" data-rnext>${r.i + 1 < r.items.length ? 'Câu tiếp' : 'Nộp bài'}</button></section>`;
    if (r.phase === 'grading') return `<section class="view narrow">${top}<p class="status">Đang chấm…</p></section>`;
    return `<section class="view narrow">${top}<p class="why">${r.err ? esc(r.err) + ' ' : ''}Tự chấm: so câu trả lời với đáp án, chọn mức đúng cho từng câu.</p>
      ${r.items.map((x, k) => `<div class="card"><p class="q">${esc(x.q)}</p><p class="why">Bạn: ${esc(x.ans || '(bỏ trống)')}</p><p class="a">${esc(x.a)}</p><div class="chips">${[0, 1, 2].map(v => `<button type="button" class="chipbtn ${x.self === v ? 'on' : ''}" data-rself="${k}:${v}">${['Sai', 'Một phần', 'Đúng'][v]}</button>`).join('')}</div></div>`).join('')}
      <button class="btn" type="button" data-rdone>Chốt điểm</button></section>`;
  }
  async function recallSubmit() {
    const r = rc;
    if (!(aiMode === 'claude' || aiMode === 'server')) { r.phase = 'self'; return render(); }
    r.phase = 'grading'; render();
    try {
      const out = await ai.chat(gradeSys, [{ role: 'user', content: r.items.map((x, k) => `${k + 1}. Câu hỏi: ${x.q}\nĐáp án tham khảo: ${x.a}\nNgười học: ${x.ans || '(bỏ trống)'}`).join('\n\n') }], { maxTokens: 500, tier: 'quick' });
      const j = ai.parseJSON(out); if (!j || !Array.isArray(j.diem)) throw { message: 'Không chấm được tự động.' };
      recallScore(Math.round(j.diem.slice(0, r.items.length).reduce((a, b) => a + Math.max(0, Math.min(2, +b || 0)), 0) / (2 * r.items.length) * 100), j);
    } catch (e) { r.err = ai.errText(e); r.phase = 'self'; render(); }
  }
  function recallScore(score, j) {
    const r = rc; r.items.forEach((x, k) => { if ((j && j.diem ? j.diem[k] : x.self) < 2) (r.wrong = r.wrong || []).push({ q: x.q, a: x.a }); });
    if (r.boss) return bossPartDone(score);
    if (r.duel) return duelDone(score, { judge: j, log: r.items.map((x, k) => ({ q: x.q, a: x.a, chose: x.ans || '(bỏ trống)', ok: (j && j.diem ? j.diem[k] : x.self) >= 2 })) });
  }

  /* ---------- Vượt ải: the boss that guards each mountain tier ---------- */
  const BKEY = 'ckl-boss';
  let boss = null; try { const b = JSON.parse(localStorage.getItem(BKEY) || 'null'); if (b && !b.done) boss = b; } catch (e) {}
  const saveBoss = () => { try { localStorage.setItem(BKEY, JSON.stringify(boss)); } catch (e) {} };
  const clock = ms => { ms = Math.max(0, ms); const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), sec = Math.floor(ms % 60000 / 1000); return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0'); };
  const bossHP = b => 100 - b.scores.reduce((a, x, k) => a + (x || 0) * D.realms.boss.parts[k].w / 100, 0);
  function bossStrip() { const b = boss; return b ? `<div class="bstrip"><span>Ải tầng núi ${ROMAN[b.stage - 1]}</span><span class="btimer" data-deadline="${b.deadline}">${clock(b.deadline - Date.now())}</span></div>` : ''; }
  function startBoss() {
    const s = state(), B = D.realms.boss, ids = openLessons(); if (!s.gate || !s.gate.ready) return;
    const all = () => shuffle(ids.flatMap(id => (D.questions[id] || []).map((q, k) => [id, k])));
    let pool = all(); const take = n => { if (pool.length < n) pool = pool.concat(all()); return pool.splice(0, n); };
    const recall = shuffle(openRootlets().flatMap(r => D.rootlets[r].qa.map(x => x))).slice(0, B.parts[1].n);
    const tps = D.topics.filter(topicOpen), t = tps[(Math.random() * tps.length) | 0];
    boss = { stage: s.gate.stage, name: s.gate.name, startedAt: Date.now(), deadline: Date.now() + B.minutes * 60000, part: 0, scores: [null, null, null, null], done: false,
      spec: { mcq: take(B.parts[0].n), recall, mix: take(B.parts[2].n), debate: { topic: t.id, ci: (Math.random() * t.claims.length) | 0, level: Math.min(3, s.gate.stage - 1) } } };
    saveBoss(); sfx('rank'); go({ v: 'boss' });
  }
  function vBoss() {
    const s = state(), B = D.realms.boss, b = boss;
    if (!b) {
      const g = s.gate;
      return `<section class="view narrow boss"><button class="back" type="button" data-go="home">← Núi</button>
        <header class="lessonhead"><span class="eyebrow">Vượt ải${g ? ' · tầng núi ' + ROMAN[g.stage - 1] : ''}</span><h1>${g ? 'Ải ' + esc(g.name) : 'Đã ở tầng cao nhất'}</h1><p class="why">${esc(B.note)}</p></header>
        <ol class="bparts">${B.parts.map(p => `<li><span class="lv lv${p.d}">${DIFF[p.d]}</span><b>${p.name}</b><small>${p.n ? p.n + ' câu' : '3 lượt với AI'}${p.sec ? ' · ' + p.sec + ' giây mỗi câu' : ''} · ${p.w}%</small></li>`).join('')}</ol>
        <p class="note">Thắng khi tổng từ ${B.pass} điểm và mỗi phần từ ${B.partMin}. Thua thì ải hồi phục ${B.cooldownHours} giờ. Phần Luận chiến và Ghi nhớ cần AI (${esc(await0())}).</p>
        ${g && g.ready ? `<button class="btn" type="button" data-bstart ${aiMode === 'claude' || aiMode === 'server' ? '' : 'disabled'}>Vào ải · đồng hồ 2 giờ bắt đầu</button>` : `<p class="status">${g && g.atCeiling ? 'Ải đang hồi phục, thử lại sau ' + hrs(g.cooldown) + '.' : 'Chưa tới bình cảnh: cần ' + (g ? fmt(g.exp - 1) : '') + ' EXP.'}</p>`}</section>`;
    }
    const hp = bossHP(b);
    return `<section class="view narrow boss"><div class="bhead"><span class="eyebrow">Ải tầng núi ${ROMAN[b.stage - 1]} · ${esc(b.name)}</span><span class="btimer big" data-deadline="${b.deadline}">${clock(b.deadline - Date.now())}</span></div>
      <div class="hp"><span>Thủ quan</span><div class="prog"><i style="width:${hp.toFixed(1)}%"></i></div><b>${hp.toFixed(0)}</b></div>
      <ol class="bparts">${B.parts.map((p, k) => `<li class="${k < b.part ? 'done' : k === b.part ? 'cur' : ''}"><span class="lv lv${p.d}">${DIFF[p.d]}</span><b>${p.name}</b><small>${k < b.part ? b.scores[k] + ' điểm' : k === b.part ? 'Phần hiện tại' : 'Chờ'}</small></li>`).join('')}</ol>
      ${b.part < 4 ? `<button class="btn" type="button" data-bpart>Đánh phần ${b.part + 1}: ${B.parts[b.part].name}</button>` : ''}
      <button class="btn ghost" type="button" data-bgiveup>Bỏ cuộc</button></section>`;
  }
  function bossPart() {
    const b = boss, B = D.realms.boss, k = b.part, sp = b.spec;
    if (k === 0 || k === 2) { const list = k === 0 ? sp.mcq : sp.mix;
      test = { kind: 'mix', boss: true, difficulty: B.parts[k].d, title: 'Ải · ' + B.parts[k].name, items: list.map(([id, q]) => ({ ...mcq(D.questions[id][q]), from: id })), i: 0, ok: 0, pick: null, wrong: [], timed: B.parts[k].sec || 0 };
      sfx('start'); return go({ v: 'test' }); }
    if (k === 1) return startRecall(sp.recall, { boss: true, title: 'Ải · Ghi nhớ' });
    const t = D.topics.find(x => x.id === sp.debate.topic);
    dbt = { t, ci: sp.debate.ci, level: sp.debate.level, claim: t.claims[sp.debate.ci], msgs: [{ role: 'user', content: 'Hãy mở đầu bằng lập luận của bạn cho chủ trương này.' }], phase: 'talk', err: null, busy: false, boss: true };
    go({ v: 'debate' }); aiTurn();
  }
  function bossPartDone(score) {
    const b = boss; if (!b) return; b.scores[b.part] = score; b.part++; saveBoss();
    sfx(score >= D.realms.boss.partMin ? 'levelup' : 'wrong');
    if (b.part >= 4 || Date.now() > b.deadline) return bossFinish(); go({ v: 'boss' });
  }
  async function bossFinish() {
    const b = boss, B = D.realms.boss; b.scores = b.scores.map(x => x || 0); b.done = true; saveBoss();
    const total = Math.round(b.scores.reduce((a, x, k) => a + x * B.parts[k].w / 100, 0));
    const win = total >= B.pass && b.scores.every(x => x >= B.partMin) && Date.now() <= b.deadline + 60000;
    res = await settle({ kind: 'boss', ref: 'stage-' + b.stage, mode: win ? 'boss-pass' : 'boss-fail', difficulty: 4, score: total, wrong: [], detail: { scores: b.scores, minutes: Math.round((Date.now() - b.startedAt) / 60000) } }, verseOf(openLessons()[0]), { v: 'home' });
    res.title = 'Vượt ải tầng núi ' + ROMAN[b.stage - 1] + (win ? ' · thắng' : ' · chưa qua'); res.bossScores = b.scores; res.again = null;
    boss = null; try { localStorage.removeItem(BKEY); } catch (e) {}
    go({ v: 'result' });
    setTimeout(() => fx.moment(win ? 'full' : 'fail', res.verse, win ? (res.rankUp || { name: res.after.level.name, zh: res.after.level.zh, stage: res.after.stage.name }) : null), 250);
  }
  setInterval(() => {
    document.querySelectorAll('.btimer').forEach(el => { el.textContent = clock(+el.dataset.deadline - Date.now()); });
    if (boss && !boss.done && Date.now() > boss.deadline && !(dbt && dbt.busy)) { boss.scores = boss.scores.map(x => x || 0); boss.part = 4; bossFinish(); }
  }, 1000);

  /* ---------- Song đấu (duel): same seeded trial for everyone who holds the code ---------- */
  let duel = null;
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const sshuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const DMODES = [['basic', 1, 'Thí luyện căn bản'], ['rootlet', 2, 'Ghi nhớ'], ['mix', 3, 'Hỗn chiến'], ['debate', 4, 'Luận chiến']];
  const duelUrl = code => location.origin + location.pathname + '?duel=' + code;
  async function rpc(fn, args) { const { data, error } = await store.sb.rpc(fn, args); if (error) throw { message: error.message }; return data; }
  function vDuel() {
    const d = duel || (duel = { phase: 'menu', mode: 'mix', topic: '', err: null });
    const online = store.mode === 'supabase' && store.user;
    const head = `<button class="back" type="button" data-go="home">← Núi</button><header class="lessonhead"><span class="eyebrow">Song đấu</span><h1>${d.phase === 'room' ? esc(d.room.title) : 'Mời người khác cùng thí luyện'}</h1></header>`;
    if (!online) return `<section class="view narrow">${head}<p class="why">Song đấu cần webapp và đăng nhập, vì hai người phải cùng thấy một bộ đề và một bảng điểm. ${store.mode === 'supabase' ? 'Đăng nhập ở trang Núi trước.' : 'Bản xem trước trong Claude chưa hỗ trợ.'}</p></section>`;
    if (d.phase === 'room') {
      const r = d.room, me = r.entries.find(e => e.me), top = r.entries[0], tie = r.entries.length > 1 && r.entries[1].score === top.score;
      return `<section class="view narrow">${head}
        <div class="duelcode"><span class="eyebrow">Mã trận</span><b>${esc(r.code)}</b><button class="sound" type="button" data-dcopy>Chép link mời</button></div>
        <p class="why">${esc(DMODES.find(m => m[0] === r.mode)[2])} · cùng một bộ đề cho mọi người · hết hạn ${new Date(r.expires_at).toLocaleDateString('vi-VN')}</p>
        <ol class="board">${r.entries.length ? r.entries.map((e, k) => `<li class="${e.me ? 'me' : ''} ${k === 0 && r.entries.length > 1 && !tie ? 'win' : ''}"><span>${k + 1}</span><b>${esc(e.name)}${e.me ? ' (bạn)' : ''}</b><em>${e.score}</em></li>`).join('') : '<li><span>·</span><b>Chưa ai đánh</b><em></em></li>'}</ol>
        ${r.entries.length > 1 ? `<p class="status">${tie ? 'Hoà.' : `<b>${esc(top.name)}</b> thắng.`}</p>` : me ? '<p class="status">Đang chờ đối thủ. Gửi link mời cho họ.</p>' : ''}
        ${me ? `<button class="btn ghost" type="button" data-drefresh>Tải lại bảng điểm</button>` : `<button class="btn" type="button" data-dplay>Nhận chiến</button>`}
        ${d.err ? `<p class="status warn">${esc(d.err)}</p>` : ''}</section>`;
    }
    const tps = D.topics.filter(topicOpen);
    return `<section class="view narrow">${head}
      <p class="why">Tạo một trận, gửi link cho người kia. Cả hai làm cùng một bộ đề; ai điểm cao hơn thắng. Người được mời cần đăng nhập${'' /* AI */}; phần Luận chiến và Ghi nhớ cần email của họ trong ALLOWED_EMAILS.</p>
      <div class="sec"><span class="eyebrow">Loại thí luyện</span><div class="chips">${DMODES.map(m => `<button type="button" class="chipbtn ${d.mode === m[0] ? 'on' : ''}" data-dmode="${m[0]}">${DIFF[m[1]]} · ${m[2]}</button>`).join('')}</div></div>
      <div class="sec"><span class="eyebrow">Chủ đề</span><div class="chips">${d.mode === 'mix' ? `<button type="button" class="chipbtn ${!d.topic ? 'on' : ''}" data-dtopic="">Mọi bài đang mở</button>` : ''}${tps.map(t => `<button type="button" class="chipbtn ${d.topic === t.id ? 'on' : ''}" data-dtopic="${t.id}">${esc(t.name)}</button>`).join('')}</div></div>
      <button class="btn" type="button" data-dcreate>Tạo trận</button>
      <div class="sec"><span class="eyebrow">Hoặc nhập mã trận</span><div class="save"><form data-djoin><input id="dcode" type="text" maxlength="6" placeholder="VD: 7F3K2A" style="text-transform:uppercase"><button type="submit">Vào</button></form></div></div>
      ${weekBoard(d.week)}
      ${d.mine && d.mine.length ? `<div class="sec"><span class="eyebrow">Trận gần đây</span><div class="rootlets">${d.mine.map(m => `<button class="rl" type="button" data-dopen="${esc(m.code)}"><span>${esc(m.title)}</span><em>${esc(m.code)}</em></button>`).join('')}</div></div>` : ''}
      ${d.err ? `<p class="status warn">${esc(d.err)}</p>` : ''}</section>`;
  }
  function weekBoard(w) {
    if (!w) return '';
    const me = w.me, from = new Date(w.week), to = new Date(from.getTime() + 6 * 864e5), f = d => d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
    return `<div class="sec"><span class="eyebrow">Bảng song đấu tuần ${f(from)} – ${f(to)} · thắng 3, hoà 1, thua 0</span>
      ${me ? `<div class="weekme"><b>${me.points}</b><span>điểm · hạng ${me.rank} · ${me.wins} thắng ${me.draws} hoà ${me.losses} thua · điểm trung bình ${me.avg ?? 0}</span>${me.titles && me.titles.length ? `<div class="chips">${me.titles.map(t => `<span class="chipbtn on">${esc(t)}</span>`).join('')}</div>` : ''}</div>` : '<p class="note">Tuần này bạn chưa có trận nào được tính điểm.</p>'}
      ${w.board.length ? `<ol class="board">${w.board.map(r => `<li class="${r.me ? 'me' : ''} ${r.rank === 1 ? 'win' : ''}"><span>${r.rank}</span><b>${esc(r.name)}${r.me ? ' (bạn)' : ''}</b><em>${r.points}</em></li>`).join('')}</ol>` : ''}</div>`;
  }
  function duelSpec(mode, topicId) {
    const seed = (Math.random() * 2 ** 31) | 0, t = D.topics.find(x => x.id === topicId);
    if (mode === 'debate') { const tt = t || D.topics.filter(topicOpen)[0]; return { title: 'Luận chiến · ' + tt.name, spec: { seed, topic: tt.id, ci: seed % tt.claims.length, level: 2 } }; }
    if (mode === 'rootlet') { const tt = t || D.topics.filter(topicOpen)[0], qa = shuffle(openRootletsOf(tt).flatMap(r => D.rootlets[r].qa)).slice(0, 6); return { title: 'Ghi nhớ · ' + tt.name, spec: { seed, qa } }; }
    const ids = (t ? t.lessons : Object.keys(D.lessons)).filter(isOpen);
    const qs = shuffle(ids.flatMap(id => (D.questions[id] || []).map((q, k) => [id, k]))).slice(0, mode === 'basic' ? 8 : 10);
    return { title: (mode === 'basic' ? 'Căn bản · ' : 'Hỗn chiến · ') + (t ? t.name : 'mọi bài đang mở'), spec: { seed, q: qs, sec: mode === 'mix' ? 25 : 0 } };
  }
  async function duelOpen(code) { try { const r = await rpc('get_duel', { p_code: code.toUpperCase() }); if (!r) throw { message: 'Không tìm thấy trận ' + code + '.' }; duel = { phase: 'room', room: r, err: null }; } catch (e) { duel = { ...(duel || { phase: 'menu', mode: 'mix', topic: '' }), err: e.message }; } go({ v: 'duel' }); }
  function duelPlay() {
    const r = duel.room, sp = r.spec, R = rng(sp.seed || 1);
    if (r.mode === 'debate') { const t = D.topics.find(x => x.id === sp.topic); dbt = { t, ci: sp.ci, level: sp.level, claim: t.claims[sp.ci], msgs: [{ role: 'user', content: 'Hãy mở đầu bằng lập luận của bạn cho chủ trương này.' }], phase: 'talk', err: null, busy: false, duel: true }; go({ v: 'debate' }); return aiTurn(); }
    if (r.mode === 'rootlet') return startRecall(sp.qa, { duel: true, title: 'Song đấu · ' + r.title });
    test = { kind: 'mix', duel: true, difficulty: r.mode === 'basic' ? 1 : 3, title: 'Song đấu · ' + r.title, items: sp.q.map(([id, k]) => { const q = D.questions[id][k]; return { q: q[0], right: q[1], opts: sshuffle(q.slice(1, 5), R), src: q[5], from: id }; }), i: 0, ok: 0, pick: null, wrong: [], timed: sp.sec || 0 };
    sfx('start'); go({ v: 'test' });
  }
  async function duelDone(score, extra) {
    const r = duel.room, kind = { basic: 'mix', rootlet: 'rootlet', mix: 'mix', debate: 'debate' }[r.mode], d = { basic: 1, rootlet: 2, mix: 3, debate: 4 }[r.mode];
    await settle({ kind, ref: 'duel-' + r.code, mode: 'duel', difficulty: d, score, correct: extra.correct || 0, total: extra.total || 0, wrong: [], detail: { duel: r.code, judge: extra.judge || null } }, null, null);
    try { duel.room = await rpc('submit_duel', { p_code: r.code, p_name: store.displayName(), p_score: score, p_detail: { correct: extra.correct ?? null, total: extra.total ?? null, avg_ms: extra.avg_ms ?? null, log: extra.log || [], judge: extra.judge || null } }); } catch (e) { duel.err = e.message; }
    duel.phase = 'room'; go({ v: 'duel' });
    const meWin = duel.room.entries.length > 1 && duel.room.entries[0].me; setTimeout(() => fx.moment(meWin ? 'pass' : score >= PASS ? 'pass' : 'fail', null, null), 250);
  }

  /* ---------- Hồ sơ: account, Phong Thần Chiến, lịch sử rèn luyện ---------- */
  function loadProfileData() {
    if (prof.weak === undefined) { prof.weak = null; store.weakest().then(w => { prof.weak = w; if (route.v === 'profile') render(); }).catch(() => { prof.weak = []; }); }
    if (prof.hist === undefined && store.mode === 'supabase' && store.user) { prof.hist = null; rpc('my_duel_history', { p_limit: 30 }).then(h => { prof.hist = h || []; if (route.v === 'profile') render(); }).catch(() => { prof.hist = []; }); }
  }
  const secs = ms => ms == null ? '—' : (ms / 1000).toFixed(1).replace('.', ',') + ' giây';
  const SLOW = 15000;
  const OUT = { win: 'Thắng', draw: 'Hoà', loss: 'Thua', pending: 'Chờ đối thủ' };
  /* Why a duel was won or lost, in one or two plain sentences. */
  function duelReason(h) {
    const me = h.me, d = me.detail || {}, o = (h.others || [])[0], log = d.log || [];
    const wrong = log.filter(x => !x.ok).length, slow = log.filter(x => x.ms > SLOW).length;
    if (!o) return 'Chưa có đối thủ nộp bài.';
    const diff = me.score - o.score, parts = [];
    if (d.correct != null && o.correct != null) { const c = d.correct - o.correct; if (c) parts.push(`${c > 0 ? 'đúng hơn' : 'kém'} ${Math.abs(c)} câu`); }
    if (d.avg_ms && o.avg_ms) { const t = (d.avg_ms - o.avg_ms) / 1000; if (Math.abs(t) >= 1) parts.push(`${t > 0 ? 'chậm hơn' : 'nhanh hơn'} ${Math.abs(t).toFixed(1).replace('.', ',')} giây mỗi câu`); }
    if (d.judge && d.judge.thieu && d.judge.thieu.length && diff < 0) parts.push('giám khảo chỉ ra: ' + d.judge.thieu[0]);
    const head = diff > 0 ? `Thắng ${esc(o.name)} ${diff} điểm` : diff < 0 ? `Thua ${esc(o.name)} ${-diff} điểm` : `Hoà với ${esc(o.name)}`;
    return head + (parts.length ? ': ' + esc(parts.join(', ')) : '') + '.' + (wrong ? ` Sai ${wrong} câu` : '') + (slow ? `${wrong ? ',' : ' Có'} ${slow} câu chậm quá 15 giây` : '') + (wrong || slow ? '.' : '');
  }
  function qList(items, showMs) {
    return items.length ? `<div class="miss">${items.map(x => `<div><b>${esc(x.q)}</b>${x.chose !== undefined && !x.ok ? `Bạn: ${esc(x.chose)}<br>` : ''}Đáp án: ${esc(x.a)}${showMs && x.ms != null ? ` <em class="ms">${secs(x.ms)}</em>` : ''}</div>`).join('')}</div>` : '';
  }
  function trialTitle(e) {
    if (e.kind === 'lesson' && D.lessons[e.ref]) return 'Căn bản · EA ' + eaNum(e.ref) + ' · ' + D.lessons[e.ref].title;
    if (e.kind === 'rootlet') return 'Ôn rễ phụ · ' + e.ref;
    if (e.kind === 'debate') { const t = D.topics.find(x => x.id === (e.topic || String(e.ref).split('-')[0])); return 'Luận chiến · ' + (t ? t.name : e.ref); }
    if (e.kind === 'boss') return 'Vượt ải · ' + String(e.ref).replace('stage-', 'tầng núi ');
    if (String(e.ref).startsWith('duel-')) return 'Song đấu · mã ' + String(e.ref).slice(5);
    const t = D.topics.find(x => x.id === e.ref); return 'Hỗn chiến · ' + (t ? t.name : 'mọi bài đang mở');
  }
  function vProfile() {
    const s = state(), online = store.mode === 'supabase' && store.user;
    const head = `<button class="back" type="button" data-go="home">← Núi</button>`;
    if (store.mode === 'supabase' && !store.user) return `<section class="view narrow">${head}<header class="lessonhead"><span class="eyebrow">Hồ sơ</span><h1>Đăng nhập</h1><p class="why">Nhập email, mở link trong thư trên cùng thiết bị. Tu vi, song đấu và AI sẽ gắn với tài khoản này.</p></header>${saveLine()}</section>`;
    const weak = prof.weak, hist = prof.hist;
    return `<section class="view narrow profile">${head}
      <header class="lessonhead"><span class="eyebrow">Hồ sơ đạo hữu${online ? ' · ' + esc(store.user.email) : ''}</span>
        ${online ? `<form class="namef" data-name><input id="pname" type="text" maxlength="40" value="${esc(store.displayName())}" aria-label="Tên hiển thị"><button type="submit" class="sound">Lưu tên</button></form>${prof.msg ? `<span class="meta">${esc(prof.msg)}</span>` : ''}` : `<h1>Bản xem trước</h1>`}
        <div class="pstat"><span class="glyph" lang="zh-Hans">${s.level.zh}</span><div><b>${esc(s.level.name)}</b><small>Tầng núi ${ROMAN[s.stage.n - 1]} · ${esc(s.stage.name)} · ${fmt(s.exp)} EXP</small></div></div>
        <div class="prog"><i style="width:${(s.frac * 100).toFixed(1)}%"></i></div>
        ${online ? `<button class="btn ghost" type="button" data-signout>Đăng xuất</button>` : ''}</header>

      <div class="sec"><span class="eyebrow">Bảng Phong Thần Chiến · lịch sử song đấu</span>
        ${!online ? '<p class="note">Song đấu cần webapp và đăng nhập.</p>' : hist === null || hist === undefined ? '<p class="note">Đang tải…</p>' : !hist.length ? '<p class="note">Chưa có trận nào. Vào Song đấu ở trang Núi để mời người khác.</p>'
          : `<ol class="fight">${hist.map(h => { const log = (h.me.detail || {}).log || [], wr = log.filter(x => !x.ok), sl = log.filter(x => x.ok && x.ms > SLOW), j = (h.me.detail || {}).judge;
              return `<li class="${h.outcome}"><details><summary><span class="oc">${OUT[h.outcome] || h.outcome}</span><span class="t"><b>${esc(h.title)}</b><small>${new Date(h.at).toLocaleDateString('vi-VN')} · ${h.me.score}${h.others.length ? ' – ' + h.others.map(o => o.score).join(' – ') : ''}${h.points ? ' · +' + h.points + ' điểm tuần' : ''}</small></span></summary>
                <p class="why">${duelReason(h)}</p>
                ${wr.length ? `<span class="eyebrow">Câu sai · ${wr.length}</span>${qList(wr, true)}` : ''}
                ${sl.length ? `<span class="eyebrow">Đúng nhưng chậm (trên 15 giây) · ${sl.length}</span>${qList(sl, true)}` : ''}
                ${j ? `<span class="eyebrow">Giám khảo</span>${judgeBlock(j)}` : ''}</details></li>`; }).join('')}</ol>`}</div>

      <div class="sec"><span class="eyebrow">Lịch sử rèn thí luyện · 10 lần điểm thấp nhất</span>
        ${weak === null || weak === undefined ? '<p class="note">Đang tải…</p>' : !weak.length ? '<p class="note">Chưa có thí luyện nào.</p>'
          : `<ol class="fight">${weak.map(e => { const wr = e.wrong || [], j = e.detail && e.detail.judge;
              return `<li class="trial ${e.score >= PASS ? 'win' : 'low'}"><details><summary><span class="oc">${e.score}</span><span class="t"><b>${esc(trialTitle(e))}</b><small>${new Date(e.at).toLocaleDateString('vi-VN')}${e.total ? ' · ' + e.correct + '/' + e.total + ' câu đúng' : ''}</small></span></summary>
                ${wr.length ? `<span class="eyebrow">Câu trả lời sai · ${wr.length}</span>${qList(wr.map(x => ({ ...x, ok: false })), true)}` : j ? '' : '<p class="note">Không lưu câu sai cho lần này.</p>'}
                ${j ? judgeBlock(j) : ''}</details></li>`; }).join('')}</ol>`}</div>
    </section>`;
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
    on('[data-ambient]', b => { CKL.sfx.setAmbient(!CKL.sfx.ambient); b.setAttribute('aria-pressed', CKL.sfx.ambient); b.textContent = 'Linh khí · ' + (CKL.sfx.ambient ? 'Bật' : 'Tắt'); });
    on('[data-quit]', () => test.boss ? bossPartDone(Math.round(test.ok / test.items.length * 100)) : test.duel ? go({ v: 'duel' }) : go(test.kind === 'lesson' ? { v: 'lesson', id: test.id } : test.kind === 'rootlet' ? { v: 'rootlet', t: test.id } : { v: 'home' }));
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
    on('[data-dquit]', () => dbt.boss ? bossPartDone(0) : dbt.duel ? go({ v: 'duel' }) : go({ v: 'topic', t: dbt.t.id }));
    on('[data-dailygo]', () => sendDaily());
    on('[data-dailyself]', () => selfDaily());
    a.querySelectorAll('[data-selfc]').forEach(c => (c.onchange = () => { day.self[+c.dataset.selfc] = c.checked; }));
    on('[data-boss]', () => go({ v: 'boss' }));
    on('[data-bstart]', () => startBoss());
    on('[data-bpart]', () => bossPart());
    on('[data-bgiveup]', () => { if (boss) { boss.scores = boss.scores.map(x => x || 0); boss.part = 4; bossFinish(); } });
    on('[data-rnext]', () => { rc.items[rc.i].ans = ($('#rans') || {}).value || ''; if (++rc.i < rc.items.length) render(); else { rc.i = rc.items.length - 1; recallSubmit(); } });
    on('[data-rself]', b => { const [k, v] = b.dataset.rself.split(':').map(Number); rc.items[k].self = v; render(); });
    on('[data-rdone]', () => recallScore(Math.round(rc.items.reduce((a, x) => a + (x.self || 0), 0) / (2 * rc.items.length) * 100)));
    on('[data-rquit]', () => { if (rc.boss) recallScore(Math.round(rc.items.slice(0, rc.i).filter(x => x.ans.trim()).length / rc.items.length * 50)); else go({ v: 'duel' }); });
    on('[data-dmode]', b => { duel.mode = b.dataset.dmode; if (duel.mode !== 'mix' && !duel.topic) duel.topic = (D.topics.find(topicOpen) || {}).id || ''; render(); });
    on('[data-dtopic]', b => { duel.topic = b.dataset.dtopic; render(); });
    on('[data-dcreate]', async () => { try { const { title, spec } = duelSpec(duel.mode, duel.topic); const code = await rpc('create_duel', { p_mode: duel.mode, p_title: title, p_spec: spec }); await duelOpen(code); } catch (e) { duel.err = e.message; render(); } });
    on('[data-dopen]', b => duelOpen(b.dataset.dopen));
    on('[data-dplay]', () => duelPlay());
    on('[data-drefresh]', () => duelOpen(duel.room.code));
    on('[data-dcopy]', b => { const u = duelUrl(duel.room.code); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => (b.textContent = 'Đã chép link'), () => (b.textContent = u)); });
    const dj = a.querySelector('[data-djoin]'); if (dj) dj.onsubmit = e => { e.preventDefault(); const c = ($('#dcode') || {}).value || ''; if (c.trim()) duelOpen(c.trim()); };
    on('[data-signout]', async () => { await store.signOut(); prof = { hist: undefined, weak: undefined, msg: '' }; go({ v: 'home' }); });
    const nf = a.querySelector('[data-name]'); if (nf) nf.onsubmit = async e => { e.preventDefault(); const r = await store.saveName(($('#pname') || {}).value); prof.msg = r.error ? 'Không lưu được: ' + r.error : 'Đã lưu tên.'; render(); };
    const f = a.querySelector('[data-signin]'); if (f) f.onsubmit = async e => { e.preventDefault(); const btn = f.querySelector('button'); if (btn.disabled) return; btn.disabled = true; btn.textContent = 'Đang gửi…'; const m = a.querySelector('[data-msg]'); const r = await store.signIn(a.querySelector('#email').value); btn.disabled = false; btn.textContent = 'Gửi lại'; m.textContent = r.error ? 'Không gửi được: ' + r.error : 'Đã gửi link đăng nhập. Mở email trên máy này để vào.'; };
  }

  render();
  store.init().then(() => {
    ai.mode().then(m => { aiMode = m; if (['boss', 'debate', 'daily', 'recall'].includes(route.v)) render(); });
    if (CKL.sfx && CKL.sfx.setMusic) CKL.sfx.setMusic(() => store.musicUrl());
    const code = new URLSearchParams(location.search).get('duel');
    if (code && store.mode === 'supabase' && store.user) duelOpen(code); else if (code) { duel = { phase: 'menu', mode: 'mix', topic: '', err: 'Đăng nhập rồi nhập mã ' + code + ' để vào trận.' }; }
    else if (boss && !boss.done) go({ v: 'boss' }); else render();
  });
  if (document.fonts) document.fonts.ready.then(() => { if (route.v === 'home') render(); });
})();
