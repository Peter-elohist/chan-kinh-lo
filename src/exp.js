/* Chân Kinh Lộ · exp: cảnh giới is earned by EXP from trials, and fades when training stops.
   The ledger of trials is the only source of truth; EXP is recomputed from it, so decay needs no cron job.

   Earning:  base(difficulty) × score/100   (100 điểm ×1.25; dưới 50 điểm chỉ ×0.15)
             the n-th repeat of the same trial on the same day earns 1/n (no farming).
             The daily mission earns fully once per day, ×0.2 after that.
   Decay:    3 days of grace after the last trial. Then each day loses (1% + 0.6% × level index) of current EXP,
             compounded day by day, so the higher the realm the faster the fall. */
(function () {
  const CKL = (window.CKL = window.CKL || {});
  const DAY = 86400000;
  let R = null; // realms data, set by init()

  const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function levelIndex(exp) { const L = R.levels; let i = 0; while (i + 1 < L.length && exp >= L[i + 1].exp) i++; return i; }
  const rate = idx => 0.01 + 0.006 * idx;

  /* EXP lost while idle from t0 to t1. */
  function decay(exp, t0, t1) {
    let days = (t1 - t0) / DAY - R.rules.graceDays; if (days <= 0 || exp <= 0) return exp;
    for (let d = 0; d < Math.floor(days) && d < 730; d++) exp *= 1 - rate(levelIndex(exp));
    exp *= 1 - rate(levelIndex(exp)) * (days % 1);
    return Math.max(0, exp);
  }

  /* EXP for a new trial, given the ledger so far. */
  function earn(ev, events) {
    const r = R.rules, key = ev.kind === 'daily' ? 'daily' : String(ev.difficulty || 1);
    const base = (r.base[key] || 30) * (ev.mult || 1);
    let f = ev.score >= 100 ? r.perfectBonus : ev.score >= r.passScore ? ev.score / 100 : r.failFactor;
    const today = dayKey(ev.at), same = events.filter(e => e.kind === ev.kind && dayKey(e.at) === today && (ev.kind === 'daily' || e.ref === ev.ref)).length;
    if (ev.kind === 'daily') f *= same ? 0.2 : 1; else f /= same + 1;
    return Math.round(base * f);
  }

  /* Replay the ledger with decay between trials and up to now. */
  function fold(events, now = Date.now()) {
    const ev = events.slice().sort((a, b) => a.at - b.at); let exp = 0, last = null;
    for (const e of ev) { if (last !== null) exp = decay(exp, last, e.at); exp += e.exp || 0; last = e.at; }
    const raw = exp; if (last !== null) exp = decay(exp, last, now);
    const idx = levelIndex(exp), L = R.levels, cur = L[idx], next = L[idx + 1] || null;
    const idle = last === null ? 0 : now - last, graceLeft = R.rules.graceDays * DAY - idle;
    return {
      exp: Math.floor(exp), lost: Math.floor(raw - exp), idx, level: cur, next,
      frac: next ? (exp - cur.exp) / (next.exp - cur.exp) : 1,
      toNext: next ? Math.ceil(next.exp - exp) : 0,
      stage: R.stages[cur.stage - 1], lastAt: last,
      decaying: last !== null && graceLeft <= 0, graceLeft: Math.max(0, graceLeft),
      ratePerDay: rate(idx), todayDaily: ev.some(e => e.kind === 'daily' && dayKey(e.at) === dayKey(now)),
      streak: (() => { let s = 0, d = now; const days = new Set(ev.map(e => dayKey(e.at))); while (days.has(dayKey(d))) { s++; d -= DAY; } return s; })()
    };
  }

  CKL.exp = { init(realms) { R = realms; }, earn, fold, levelIndex: e => levelIndex(e), get realms() { return R; }, DAY };
})();
