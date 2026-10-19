// Chân Kinh Lộ · Edge Function "access": new sign-ups ask to enter, the owner is emailed, one click approves.
//   POST {action:"request"}               (signed-in user)  → records the request once; emails the owner the first time.
//   POST {action:"approve"|"deny", token} (anyone holding the emailed token) → decides; approval is permanent.
// Secrets: RESEND_API_KEY (required for email), ADMIN_EMAIL (default nguyenlqda2@gmail.com),
//          RESEND_FROM (default "Chân Kinh Lộ <onboarding@resend.dev>"). Tokens are signed with the service-role key.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SITE = "https://chan-kinh-lo.vercel.app";
const ORIGINS = [SITE];
const TTL = 7 * 24 * 3600 * 1000;
let cors: Record<string, string> = { "Access-Control-Allow-Origin": SITE, "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "content-type": "application/json" } });
const env = (k: string, d = "") => Deno.env.get(k) ?? d;

const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function hmac(data: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("ckl-access:" + env("SUPABASE_SERVICE_ROLE_KEY")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data))));
}
async function sign(email: string) {
  const p = b64u(new TextEncoder().encode(JSON.stringify({ e: email, x: Date.now() + TTL })));
  return p + "." + await hmac(p);
}
async function verify(token: string): Promise<string | null> {
  const [p, s] = String(token || "").split(".");
  if (!p || !s || s !== await hmac(p)) return null;
  try { const o = JSON.parse(new TextDecoder().decode(unb64u(p))); return o.x > Date.now() ? String(o.e) : null; } catch { return null; }
}
const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

async function mail(email: string, name: string) {
  const key = env("RESEND_API_KEY");
  if (!key) return "not_configured";
  const t = await sign(email);
  const btn = (href: string, label: string, bg: string) => `<a href="${href}" style="display:inline-block;padding:12px 22px;margin:4px 8px 4px 0;border-radius:8px;background:${bg};color:#fff;text-decoration:none;font-weight:600">${label}</a>`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;color:#222">
    <h2 style="margin:0 0 8px">Có người xin vào núi</h2>
    <p style="margin:0 0 16px"><b>${esc(name)}</b> &lt;${esc(email)}&gt; vừa đăng nhập Chân Kinh Lộ lần đầu và đang chờ duyệt.</p>
    ${btn(`${SITE}/#duyet=${t}&a=approve`, "Duyệt", "#2f7d4f")}${btn(`${SITE}/#duyet=${t}&a=deny`, "Từ chối", "#9b2c2c")}
    <p style="margin:18px 0 0;font-size:13px;color:#666">Bấm nút sẽ mở app và hỏi xác nhận một lần nữa. Duyệt một lần là xong: những lần đăng nhập sau họ vào thẳng.
    Link có hạn 7 ngày; sau đó duyệt tại <a href="${SITE}/#admin">${SITE}/#admin</a>.</p></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { authorization: "Bearer " + key, "content-type": "application/json" },
    body: JSON.stringify({ from: env("RESEND_FROM", "Chân Kinh Lộ <onboarding@resend.dev>"), to: [env("ADMIN_EMAIL", "nguyenlqda2@gmail.com")], subject: `Duyệt người mới: ${name} (${email})`, html }),
  });
  return r.ok ? "sent" : "failed:" + r.status + " " + (await r.text()).slice(0, 200);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  cors = { ...cors, "Access-Control-Allow-Origin": ORIGINS.includes(origin) || origin.startsWith("https://claude.ai") ? origin : SITE };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: { action?: string; token?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  if (body.action === "approve" || body.action === "deny") {
    const email = await verify(body.token ?? "");
    if (!email) return json({ error: "token", message: "Link không hợp lệ hoặc đã hết hạn. Duyệt tại trang #admin." }, 400);
    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    const { error } = await admin.rpc("decide_access", { p_email: email, p_approve: body.action === "approve" });
    return error ? json({ error: "db", message: error.message }, 500) : json({ ok: true, email, action: body.action });
  }

  if (body.action === "request") {
    const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "signin" }, 401);
    const { data, error } = await sb.rpc("request_access");
    if (error) return json({ error: "db", message: error.message }, 500);
    let sent: string | undefined;
    if (data?.new) sent = await mail(data.email, data.name || data.email);
    return json({ status: data?.status, mail: sent });
  }
  return json({ error: "bad_request" }, 400);
});
