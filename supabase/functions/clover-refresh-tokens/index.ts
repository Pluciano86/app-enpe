// Edge Function: clover-refresh-tokens
// Refresca tokens Clover de comercios antes de expirar.

import { createClient } from "npm:@supabase/supabase-js@2.45.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CLOVER_CLIENT_ID = Deno.env.get("CLOVER_CLIENT_ID") ?? "";
const CLOVER_CLIENT_SECRET = Deno.env.get("CLOVER_CLIENT_SECRET") ?? "";
const CLOVER_REDIRECT_URI = Deno.env.get("CLOVER_REDIRECT_URI") ?? "";
const CLOVER_OAUTH_BASE = Deno.env.get("CLOVER_OAUTH_BASE") ?? "https://sandbox.dev.clover.com";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const REFRESH_WINDOW_MS = Number(Deno.env.get("CLOVER_REFRESH_WINDOW_MS") || 6 * 60 * 60 * 1000); // 6h
const PAGE_SIZE = Number(Deno.env.get("CLOVER_REFRESH_PAGE_SIZE") || 500);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isAuthorized(req: Request) {
  if (!CRON_SECRET) return true;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = req.headers.get("x-cron-secret") || "";
  return bearer === CRON_SECRET || headerSecret === CRON_SECRET;
}

async function refreshToken(refresh_token: string) {
  const tokenUrl = new URL("/oauth/v2/token", CLOVER_OAUTH_BASE);
  const payload = {
    grant_type: "refresh_token",
    refresh_token,
    client_id: CLOVER_CLIENT_ID,
    client_secret: CLOVER_CLIENT_SECRET,
    redirect_uri: CLOVER_REDIRECT_URI,
  };
  const formBody = new URLSearchParams(payload).toString();
  const jsonBody = JSON.stringify(payload);
  const preferJson = CLOVER_OAUTH_BASE.includes("auth-token");
  const firstType = preferJson ? "application/json" : "application/x-www-form-urlencoded";
  const secondType = preferJson ? "application/x-www-form-urlencoded" : "application/json";
  const doRequest = (contentType: string) =>
    fetch(tokenUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": contentType, "Accept": "application/json" },
      body: contentType === "application/json" ? jsonBody : formBody,
    });

  let resp = await doRequest(firstType);
  if (resp.ok) return await resp.json();

  if (resp.status === 415) {
    resp = await doRequest(secondType);
    if (resp.ok) return await resp.json();
  }

  throw new Error(`Refresh token failed ${resp.status}: ${await resp.text()}`);
}

async function processBatch(offset: number, failures: Array<{ idComercio: number | null; error: string }>) {
  const { data, error } = await supabase
    .from("clover_conexiones")
    .select("id, idComercio, refresh_token, expires_at")
    .range(offset, offset + PAGE_SIZE - 1);
  if (error) throw error;
  const rows = data ?? [];
  const now = Date.now();

  let refreshed = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const refreshTokenVal = row.refresh_token;
    if (!refreshTokenVal) {
      skipped++;
      continue;
    }
    const expMs = row.expires_at ? Date.parse(row.expires_at) : NaN;
    const shouldRefresh = !row.expires_at || Number.isNaN(expMs) || expMs - now < REFRESH_WINDOW_MS;
    if (!shouldRefresh) {
      skipped++;
      continue;
    }
    try {
      const tokenData = await refreshToken(refreshTokenVal);
      const accessToken = tokenData.access_token ?? null;
      const newRefresh = tokenData.refresh_token ?? refreshTokenVal;
      const expires_in = Number(tokenData.expires_in ?? tokenData.expires) || null;
      const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : row.expires_at;
      await supabase.from("clover_conexiones").update({
        access_token: accessToken,
        refresh_token: newRefresh,
        expires_at: expiresAt,
      }).eq("id", row.id);
      refreshed++;
    } catch (err) {
      console.warn("[clover-refresh] failed", { idComercio: row.idComercio, err: err instanceof Error ? err.message : String(err) });
      failed++;
      if (failures.length < 10) {
        failures.push({
          idComercio: row.idComercio ?? null,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return { count: rows.length, refreshed, skipped, failed };
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return jsonResponse({ ok: true });
  if (!isAuthorized(req)) return jsonResponse({ error: "Unauthorized" }, 401);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return jsonResponse({ error: "Supabase env missing" }, 500);
  if (!CLOVER_CLIENT_ID || !CLOVER_CLIENT_SECRET) return jsonResponse({ error: "Clover env missing" }, 500);

  let offset = 0;
  let total = 0;
  let refreshed = 0;
  let skipped = 0;
  let failed = 0;
  const failures: Array<{ idComercio: number | null; error: string }> = [];

  while (true) {
    const batch = await processBatch(offset, failures);
    total += batch.count;
    refreshed += batch.refreshed;
    skipped += batch.skipped;
    failed += batch.failed;
    if (batch.count < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return jsonResponse({ ok: true, total, refreshed, skipped, failed, failures });
}

Deno.serve(handler);
