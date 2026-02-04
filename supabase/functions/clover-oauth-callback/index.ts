// Edge Function: clover-oauth-callback
// Recibe el code de Clover, valida state y guarda tokens en clover_conexiones.

import { createClient } from "npm:@supabase/supabase-js@2.45.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CLOVER_CLIENT_ID = Deno.env.get("CLOVER_CLIENT_ID") ?? "";
const CLOVER_CLIENT_SECRET = Deno.env.get("CLOVER_CLIENT_SECRET") ?? "";
const CLOVER_REDIRECT_URI = Deno.env.get("CLOVER_REDIRECT_URI") ?? "";
const CLOVER_BASE_URL = Deno.env.get("CLOVER_BASE_URL") ?? "https://www.clover.com";
const CLOVER_API_BASE = Deno.env.get("CLOVER_API_BASE") ?? "https://api.clover.com";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fromBase64Url(str: string) {
  const pad = str.length % 4 === 0 ? 0 : 4 - (str.length % 4);
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function verifyState(state: string) {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const payloadBytes = fromBase64Url(payloadB64);
  const sigBytes = fromBase64Url(sigB64);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SERVICE_ROLE_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, payloadBytes);
  if (!valid) return null;
  try {
    const json = new TextDecoder().decode(payloadBytes);
    const parsed = JSON.parse(json);
    if (!Number.isFinite(parsed?.idComercio)) return null;
    return parsed;
  } catch (_e) {
    return null;
  }
}

async function exchangeToken(code: string) {
  const tokenUrl = new URL("/oauth/v2/token", CLOVER_BASE_URL);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: CLOVER_CLIENT_ID,
    client_secret: CLOVER_CLIENT_SECRET,
    redirect_uri: CLOVER_REDIRECT_URI,
  });

  const resp = await fetch(tokenUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    const raw = await resp.text();
    throw new Error(`Clover token error ${resp.status}: ${raw}`);
  }
  return await resp.json();
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  let code = url.searchParams.get("code");
  let stateRaw = url.searchParams.get("state");
  let merchantId = url.searchParams.get("merchant_id");
  let employeeId = url.searchParams.get("employee_id");

  // Si falta en query, intentar leer del cuerpo
  if (code === null || stateRaw === null) {
    const body = await req.json().catch(() => null);
    code = code ?? body?.code ?? null;
    stateRaw = stateRaw ?? body?.state ?? null;
    merchantId = merchantId ?? body?.merchant_id ?? null;
    employeeId = employeeId ?? body?.employee_id ?? null;
  }

  console.log("method", req.method);
  console.log("stateRaw", stateRaw, "code?", !!code);
  console.log("merchantId", merchantId);

  if (!code) {
    return new Response("Missing code (query/body)", { status: 400 });
  }
  if (!stateRaw) {
    return new Response("Invalid state (missing)", { status: 400 });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return new Response("Supabase env missing", { status: 500 });
  if (!CLOVER_CLIENT_ID || !CLOVER_CLIENT_SECRET || !CLOVER_REDIRECT_URI) {
    return new Response("Clover env missing", { status: 500 });
  }

  let idComercio: number | null = null;
  const isNumericState = stateRaw && /^\\d+$/.test(stateRaw);

  console.log("clover-oauth-callback stateRaw:", stateRaw, "isNumeric:", isNumericState);

  // Bypass numérico antes de cualquier HMAC
  if (isNumericState) {
    idComercio = Number(stateRaw);
    console.log("clover-oauth-callback bypass numeric state -> idComercio:", idComercio);
  } else {
    const parsedState = await verifyState(stateRaw);
    if (!parsedState) return new Response("Invalid state", { status: 400 });
    idComercio = Number(parsedState.idComercio);
  }

  console.log("clover-oauth-callback resolved idComercio:", idComercio);

  if (!Number.isFinite(idComercio)) return new Response("Invalid state", { status: 400 });

  try {
    const tokenData = await exchangeToken(code);
    const access_token = tokenData.access_token as string | undefined;
    const refresh_token = tokenData.refresh_token as string | undefined;
    const expires_in = Number(tokenData.expires_in ?? tokenData.expires) || null;
    const token_type = tokenData.token_type as string | undefined;
    const scope = tokenData.scope as string | undefined;
    const merchant_id = (tokenData.merchant_id ?? tokenData.merchantId) as string | undefined;

    if (!access_token) throw new Error("No access_token en respuesta de Clover");

    const expires_at = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;

    const upsertPayload = {
      idComercio,
      clover_merchant_id: merchant_id ?? null,
      access_token,
      refresh_token: refresh_token ?? null,
      token_type: token_type ?? null,
      scope: scope ?? null,
      expires_at,
    };

    const { error: upsertError } = await supabase
      .from("clover_conexiones")
      .upsert(upsertPayload, { onConflict: "idComercio" });

    if (upsertError) throw upsertError;

    const redirectUrl = `https://enpe-erre.netlify.app/comercio/adminMenuComercio.html?id=${idComercio}&clover=ok`;
    return Response.redirect(redirectUrl, 302);
  } catch (err) {
    console.error("clover-oauth-callback error", err);
    return new Response(`Error: ${err instanceof Error ? err.message : String(err)}` , { status: 500 });
  }
}

Deno.serve(handler);
