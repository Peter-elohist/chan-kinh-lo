// Chân Kinh Lộ · Edge Function "ai": a thin, private proxy to Claude for debate and daily missions.
// Secrets (Supabase → Edge Functions → Secrets): ANTHROPIC_API_KEY (required), ALLOWED_EMAILS (optional extra list),
// AI_MODEL (optional, default claude-sonnet-5-5).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ORIGINS = ["https://chan-kinh-lo.vercel.app"];
let cors: Record<string, string> = {
  "Access-Control-Allow-Origin": ORIGINS[0],
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  cors = { ...cors, "Access-Control-Allow-Origin": ORIGINS.includes(origin) || origin.startsWith("https://claude.ai") ? origin : ORIGINS[0] };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: "signin", message: "Cần đăng nhập." }, 401);

  // Allowed = in the allowed_emails table (same list that unlocks the content), or in the ALLOWED_EMAILS secret.
  const { data: ok } = await sb.rpc("is_allowed");
  const extra = (Deno.env.get("ALLOWED_EMAILS") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (ok !== true && !extra.includes((user.email ?? "").toLowerCase())) return json({ error: "forbidden", message: "Email này chưa được phép dùng AI." }, 403);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "missing_key", message: "Chưa có ANTHROPIC_API_KEY." }, 503);

  let body: { system?: string; messages?: { role: string; content: string }[]; max_tokens?: number };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const messages = (body.messages ?? []).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string");
  const size = (body.system ?? "").length + messages.reduce((a, m) => a + m.content.length, 0);
  if (!messages.length || messages[messages.length - 1].role !== "user" || size > 30000) return json({ error: "bad_request" }, 400);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("AI_MODEL") ?? "claude-sonnet-5-5",
      max_tokens: Math.min(Math.max(body.max_tokens ?? 900, 200), 2000),
      system: body.system ?? "",
      messages,
    }),
  });
  const out = await r.json();
  if (!r.ok) return json({ error: r.status === 429 ? "rate_limited" : "upstream", message: out?.error?.message ?? "Lỗi AI." }, r.status === 429 ? 429 : 502);
  const text = (out.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
  return json({ text });
});
