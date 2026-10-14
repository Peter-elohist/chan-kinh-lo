/* Chân Kinh Lộ · store: where test results live.
   1) Supabase (webapp on Vercel) when CKL_CONFIG has a URL and key, and the user is signed in.
   2) The artifact's own database (preview inside Claude) when available.
   3) This browser only, as a last resort. */
(function () {
  const CKL = (window.CKL = window.CKL || {});
  const cfg = window.CKL_CONFIG || {};
  const LS = 'ckl-goc-v1';
  const S = { mode: 'local', user: null, best: { lesson: {}, rootlet: {} }, onChange: () => {} };
  let sb = null, artDoc = null;

  function fold(rows) {
    const best = { lesson: {}, rootlet: {} };
    for (const r of rows) { const b = best[r.kind]; const e = b[r.ref] || { best: 0, attempts: 0 }; e.best = Math.max(e.best, r.best ?? r.score); e.attempts += r.attempts ?? 1; b[r.ref] = e; }
    return best;
  }
  function readLocal() { try { const s = localStorage.getItem(LS); if (s) S.best = JSON.parse(s); } catch (e) {} }
  function writeLocal() { try { localStorage.setItem(LS, JSON.stringify(S.best)); } catch (e) {} }

  async function init() {
    readLocal();
    if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
      sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      const { data } = await sb.auth.getSession(); S.user = data.session ? data.session.user : null; S.mode = 'supabase';
      sb.auth.onAuthStateChange((_e, session) => { S.user = session ? session.user : null; pull(); });
      await pull(); return;
    }
    try {
      const db = await (window.claude && window.claude.use ? window.claude.use('db') : null);
      if (db) { artDoc = db.doc('progress/main'); S.mode = 'artifact'; const snap = await artDoc.get(); if (snap.exists && snap.data().best) { S.best = JSON.parse(snap.data().best); S.onChange(); } }
    } catch (e) {}
  }
  async function pull() {
    if (!sb || !S.user) { S.onChange(); return; }
    const { data, error } = await sb.from('best_scores').select('kind,ref,best,attempts');
    if (!error && data) { S.best = fold(data); writeLocal(); }
    S.onChange();
  }
  async function record(kind, ref, score, correct, total, wrong) {
    const b = S.best[kind]; const e = b[ref] || { best: 0, attempts: 0 }; e.best = Math.max(e.best, score); e.attempts++; e.last = score; b[ref] = e; writeLocal();
    try {
      if (sb && S.user) await sb.from('attempts').insert({ kind, ref, score, correct, total, wrong });
      else if (artDoc) await artDoc.set({ best: JSON.stringify(S.best), updatedAt: new Date().toISOString() });
    } catch (err) { console.warn('save failed', err); }
  }
  async function signIn(email) {
    if (!sb) return { error: 'Chưa cấu hình Supabase' };
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } });
    return { error: error ? error.message : null };
  }
  async function signOut() { if (sb) await sb.auth.signOut(); }

  Object.assign(S, { init, record, signIn, signOut, get supabaseReady() { return !!sb; } });
  CKL.store = S;
})();
