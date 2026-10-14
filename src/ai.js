/* Chân Kinh Lộ · ai: one door to Claude for debate and daily missions.
   Inside the Claude preview it uses the page's `sample` capability. On the webapp it calls the Supabase Edge
   Function `ai`, which holds the API key server-side and only answers signed-in, allow-listed users. */
(function () {
  const CKL = (window.CKL = window.CKL || {});
  const cfg = window.CKL_CONFIG || {};
  let sample;
  async function viaSample() {
    if (sample === undefined) { try { sample = window.claude && window.claude.use ? await window.claude.use('sample') : null; } catch (e) { sample = null; } }
    return sample;
  }
  /* 'claude' | 'server' | 'signin' | null */
  async function mode() {
    if (await viaSample()) return 'claude';
    if (CKL.store.supabaseReady) return CKL.store.user ? 'server' : 'signin';
    return null;
  }
  /* messages: [{role, content}] alternating, starting and ending with 'user'. Returns the reply text. */
  async function chat(system, messages, o = {}) {
    const s = await viaSample();
    if (s) {
      const input = messages.map((m, i) => (i === 0 ? { role: 'user', content: system + '\n\n---\n\n' + m.content } : m));
      const r = await s(input, { cache: false, modelTier: o.tier || 'default', onText: o.onText ? ({ text }) => o.onText(text) : undefined });
      return r.text;
    }
    const tok = await CKL.store.token(); if (!tok) throw { code: 'signin', message: 'Cần đăng nhập để dùng AI.' };
    const r = await fetch(cfg.supabaseUrl + '/functions/v1/ai', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok, apikey: cfg.supabaseAnonKey }, body: JSON.stringify({ system, messages, max_tokens: o.maxTokens || 900 }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw { code: j.error || 'server', message: j.message || 'Máy chủ AI chưa sẵn sàng.' };
    if (o.onText) o.onText(j.text);
    return j.text;
  }
  function parseJSON(t) { try { const m = String(t).match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null; } catch (e) { return null; } }
  const errText = e => e && e.code === 'not_granted' ? 'Bạn chưa cho phép trang này hỏi Claude.' : e && e.code === 'missing_key' ? 'Máy chủ AI chưa có khoá API. Thêm ANTHROPIC_API_KEY trong Supabase.' : e && e.code === 'forbidden' ? 'Email này chưa được phép dùng AI.' : e && e.code === 'signin' ? 'Cần đăng nhập để dùng AI.' : e && e.code === 'rate_limited' ? 'AI đang bận, thử lại sau ít phút.' : (e && e.message) || 'Không gọi được AI.';
  CKL.ai = { mode, chat, parseJSON, errText };
})();
