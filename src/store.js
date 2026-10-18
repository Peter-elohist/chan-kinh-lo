/* Chân Kinh Lộ · store: the trial ledger.
   1) Supabase (webapp on Vercel) when CKL_CONFIG has a URL and key, and the user is signed in.
   2) The artifact's own database (preview inside Claude) when available.
   3) This browser only, as a last resort.
   Every trial is one event {kind, ref, mode, difficulty, topic, score, correct, total, exp, at}. Best scores and
   EXP are derived from the ledger. */
(function () {
  const CKL = (window.CKL = window.CKL || {});
  const cfg = window.CKL_CONFIG || {};
  const LS = 'ckl-ledger-v2', OLD = 'ckl-goc-v1';
  const S = { mode: 'local', user: null, events: [], best: { lesson: {}, rootlet: {} }, onChange: () => {} };
  let sb = null, artDoc = null;

  function derive() {
    const best = { lesson: {}, rootlet: {} };
    for (const e of S.events) { const b = best[e.kind]; if (!b) continue; const x = b[e.ref] || { best: 0, attempts: 0 }; x.best = Math.max(x.best, e.score); x.attempts++; b[e.ref] = x; }
    S.best = best;
  }
  const slim = e => ({ kind: e.kind, ref: e.ref, mode: e.mode, difficulty: e.difficulty, topic: e.topic, score: e.score, correct: e.correct, total: e.total, exp: e.exp, at: e.at, wrong: (e.wrong || []).slice(0, 15) });
  function readLocal() {
    try {
      const s = localStorage.getItem(LS); if (s) { S.events = JSON.parse(s); return; }
      const o = localStorage.getItem(OLD); if (o) { // carry over scores from v0.3 as one day-old events
        const b = JSON.parse(o), at = Date.now() - 86400000;
        for (const k of ['lesson', 'rootlet']) for (const [ref, v] of Object.entries(b[k] || {})) S.events.push({ kind: k, ref, mode: k === 'lesson' ? 'basic' : 'rootlet', difficulty: k === 'lesson' ? 1 : 2, score: v.best, exp: 0, at });
      }
    } catch (e) {}
  }
  function writeLocal() { try { localStorage.setItem(LS, JSON.stringify(S.events.map(slim))); } catch (e) {} }

  let inited = null;
  function init() { return inited || (inited = init0()); }
  async function init0() {
    readLocal(); derive();
    if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
      sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      { const h = new URLSearchParams(location.hash.slice(1)), q = new URLSearchParams(location.search), d = h.get('error_description') || q.get('error_description');
        if (d) { S.authError = /expired|invalid/i.test(d) ? 'Link đã dùng hoặc hết hạn. Gửi link mới.' : 'Đăng nhập lỗi: ' + d; history.replaceState(null, '', location.pathname); } }
      const { data } = await sb.auth.getSession(); S.user = data.session ? data.session.user : null; S.mode = 'supabase';
      sb.auth.onAuthStateChange((e, session) => { const had = !!S.user; S.user = session ? session.user : null; if (S.onAuth && (e === 'SIGNED_IN' && !had || e === 'SIGNED_OUT')) S.onAuth(e); pull(); });
      await pull(); return;
    }
    try {
      const db = await (window.claude && window.claude.use ? window.claude.use('db') : null);
      if (db) { artDoc = db.doc('progress/main'); S.mode = 'artifact'; const snap = await artDoc.get(); if (snap.exists && snap.data().events) { S.events = JSON.parse(snap.data().events); derive(); S.onChange(); }
        else if (snap.exists && snap.data().best && !S.events.length) { const b = JSON.parse(snap.data().best), at = Date.now() - 86400000; // scores from v0.3
          for (const k of ['lesson', 'rootlet']) for (const [ref, v] of Object.entries(b[k] || {})) S.events.push({ kind: k, ref, mode: k === 'lesson' ? 'basic' : 'rootlet', difficulty: k === 'lesson' ? 1 : 2, score: v.best, exp: 0, at });
          derive(); S.onChange(); } }
    } catch (e) {}
  }
  async function pull() {
    if (!sb || !S.user) { S.profile = null; S.onChange(); return; }
    const pr = await sb.from('profiles').select('name').eq('user_id', S.user.id).maybeSingle(); S.profile = pr.data || null;
    if (!S.profile && !pr.error) { // first sign-in: create the profile from the Google name or the email
      const m = S.user.user_metadata || {}, name = String(m.full_name || m.name || (S.user.email || 'Đạo hữu').split('@')[0]).slice(0, 40);
      const ins = await sb.from('profiles').upsert({ user_id: S.user.id, name }); if (!ins.error) S.profile = { name }; }
    const { data, error } = await sb.from('attempts').select('kind,ref,mode,difficulty,topic,score,correct,total,exp,wrong,created_at').order('created_at').limit(10000);
    if (!error && data) { S.events = data.map(r => ({ ...r, at: Date.parse(r.created_at) })); derive(); writeLocal(); }
    S.onChange();
  }
  /* Adds a trial to the ledger. ev.exp must already be computed. detail (transcripts) is kept only server-side. */
  async function record(ev) {
    ev.at = ev.at || Date.now(); S.events.push(slim(ev)); derive(); writeLocal();
    try {
      if (sb && S.user) await sb.from('attempts').insert({ kind: ev.kind, ref: ev.ref, mode: ev.mode, difficulty: ev.difficulty, topic: ev.topic || null, score: ev.score, correct: ev.correct || 0, total: ev.total || 0, exp: ev.exp, wrong: ev.wrong || [], detail: ev.detail || {} });
      else if (artDoc) await artDoc.set({ events: JSON.stringify(S.events.map(slim)), updatedAt: new Date().toISOString() });
    } catch (err) { console.warn('save failed', err); }
  }
  async function signIn(email) {
    if (!sb) return { error: 'Chưa cấu hình Supabase' };
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } });
    return { error: error ? error.message : null };
  }
  async function signInGoogle() {
    if (!sb) return { error: 'Chưa cấu hình Supabase' };
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } });
    return { error: error ? error.message : null };
  }
  async function signOut() { if (sb) await sb.auth.signOut(); try { localStorage.removeItem(LS); localStorage.removeItem(OLD); } catch (e) {} S.events = []; }
  /* Content (lessons, questions, verses…) lives in Supabase and is readable only by allowlisted accounts. */
  async function allowed() { if (!sb || !S.user) return false; const { data, error } = await sb.rpc('is_allowed'); return !error && data === true; }
  async function content() {
    const { data, error } = await sb.from('content').select('key,body'); if (error || !data || !data.length) return null;
    const o = {}; for (const r of data) o[r.key] = r.body; return o;
  }
  const displayName = () => (S.profile && S.profile.name) || (S.user && S.user.email ? S.user.email.split('@')[0] : 'Đạo hữu');
  async function saveName(name) {
    name = String(name || '').trim().slice(0, 40); if (!name || !sb || !S.user) return { error: 'Cần đăng nhập.' };
    const { error } = await sb.from('profiles').upsert({ user_id: S.user.id, name, updated_at: new Date().toISOString() });
    if (!error) S.profile = { name }; return { error: error ? error.message : null };
  }
  /* The 10 weakest trials, with what went wrong. */
  async function weakest() {
    const kinds = ['lesson', 'rootlet', 'mix', 'debate', 'boss'];
    if (sb && S.user) { const { data } = await sb.from('attempts').select('kind,ref,mode,score,correct,total,wrong,detail,created_at').in('kind', kinds).order('score').order('created_at', { ascending: false }).limit(10); return (data || []).map(r => ({ ...r, at: Date.parse(r.created_at) })); }
    return S.events.filter(e => kinds.includes(e.kind)).sort((a, b) => a.score - b.score || b.at - a.at).slice(0, 10);
  }
  async function token() { if (!sb) return null; const { data } = await sb.auth.getSession(); return data.session ? data.session.access_token : null; }

  /* Where the Linh khí music lives: the preview's own asset, a private Supabase bucket, or a local file. */
  async function musicUrl() {
    if (window.CKL_MUSIC_URL) return window.CKL_MUSIC_URL;
    if (sb && S.user) { const { data } = await sb.storage.from('media').createSignedUrl('linh-khi.m4a', 6 * 3600); if (data && data.signedUrl) return data.signedUrl; }
    try { const r = await fetch('assets/music/linh-khi.m4a', { method: 'HEAD' }); if (r.ok) return 'assets/music/linh-khi.m4a'; } catch (e) {}
    return null;
  }
  Object.assign(S, { init, allowed, content, record, signIn, signInGoogle, signOut, token, musicUrl, displayName, saveName, weakest, get sb() { return sb; }, get supabaseReady() { return !!sb; } });
  CKL.store = S;
})();
