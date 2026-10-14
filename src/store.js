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
  const slim = e => ({ kind: e.kind, ref: e.ref, mode: e.mode, difficulty: e.difficulty, topic: e.topic, score: e.score, correct: e.correct, total: e.total, exp: e.exp, at: e.at });
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

  async function init() {
    readLocal(); derive();
    if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
      sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      const { data } = await sb.auth.getSession(); S.user = data.session ? data.session.user : null; S.mode = 'supabase';
      sb.auth.onAuthStateChange((_e, session) => { S.user = session ? session.user : null; pull(); });
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
    if (!sb || !S.user) { S.onChange(); return; }
    const { data, error } = await sb.from('attempts').select('kind,ref,mode,difficulty,topic,score,correct,total,exp,created_at').order('created_at').limit(10000);
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
  async function signOut() { if (sb) await sb.auth.signOut(); }
  async function token() { if (!sb) return null; const { data } = await sb.auth.getSession(); return data.session ? data.session.access_token : null; }

  Object.assign(S, { init, record, signIn, signOut, token, get supabaseReady() { return !!sb; } });
  CKL.store = S;
})();
