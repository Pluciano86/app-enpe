// Edge Function: clover-oauth-callback
// Recibe el code de Clover, valida state y guarda tokens en clover_conexiones.

import { createClient } from "npm:@supabase/supabase-js@2.45.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CLOVER_CLIENT_ID = Deno.env.get("CLOVER_CLIENT_ID") ?? "";
const CLOVER_CLIENT_SECRET = Deno.env.get("CLOVER_CLIENT_SECRET") ?? "";
const CLOVER_REDIRECT_URI = Deno.env.get("CLOVER_REDIRECT_URI") ?? "";
const CLOVER_OAUTH_BASE = Deno.env.get("CLOVER_OAUTH_BASE") ?? "https://sandbox.dev.clover.com";
const CLOVER_API_BASE = Deno.env.get("CLOVER_API_BASE") ?? "https://apisandbox.dev.clover.com";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getTableColumns(table: string, schema = "public"): Promise<Set<string> | null> {
  try {
    const { data, error } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_schema", schema)
      .eq("table_name", table);
    if (error) {
      console.warn("[clover-callback] No se pudo obtener columnas de", table, error.message);
      return null;
    }
    const cols = new Set<string>();
    (data || []).forEach((r: any) => r?.column_name && cols.add(r.column_name));
    return cols;
  } catch (err) {
    console.warn("[clover-callback] Error inesperado obteniendo columnas", err);
    return null;
  }
}

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

function decodeJwtPayload(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payloadBytes = fromBase64Url(parts[1]);
    const json = new TextDecoder().decode(payloadBytes);
    return JSON.parse(json);
  } catch (_e) {
    return null;
  }
}

function errToJson(err: unknown) {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack };
  }
  try {
    return { message: "Unknown error", details: JSON.stringify(err) };
  } catch {
    return { message: "Unknown error", details: String(err) };
  }
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
  const tokenUrl = new URL("/oauth/v2/token", CLOVER_OAUTH_BASE);

  const resp = await fetch(tokenUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLOVER_CLIENT_ID,
      client_secret: CLOVER_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: CLOVER_REDIRECT_URI,
    }),
  });

  const raw = await resp.text();
  console.log("[clover-callback] token response", { status: resp.status, raw });
  if (!resp.ok) throw new Error(`Clover token error ${resp.status}: ${raw}`);

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Clover token non-JSON ${resp.status}: ${raw.slice(0, 200)}`);
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  let code = url.searchParams.get("code");
  let stateRaw = url.searchParams.get("state");
  let merchantId =
    url.searchParams.get("merchant_id") ??
    url.searchParams.get("merchantId") ??
    url.searchParams.get("merchant");
  let employeeId = url.searchParams.get("employee_id");

  // Si falta en query, intentar leer del cuerpo
  if ((code === null || stateRaw === null) && req.method !== "GET") {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => null);
      code = code ?? body?.code ?? null;
      stateRaw = stateRaw ?? body?.state ?? null;
      merchantId = merchantId ?? body?.merchant_id ?? null;
      employeeId = employeeId ?? body?.employee_id ?? null;
    }
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
  if (!merchantId) {
    return new Response(JSON.stringify({ error: "merchant_id requerido en callback" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return new Response("Supabase env missing", { status: 500 });
  if (!CLOVER_CLIENT_ID || !CLOVER_CLIENT_SECRET || !CLOVER_REDIRECT_URI) {
    return new Response("Clover env missing", { status: 500 });
  }

  let idComercio: number | null = null;
  const isNumericState = /^\d+$/.test(stateRaw);
  let returnTo: string | null = null;

  console.log("clover-oauth-callback stateRaw:", stateRaw, "isNumeric:", isNumericState);

  // Bypass numérico antes de cualquier HMAC
  if (isNumericState) {
    idComercio = Number(stateRaw);
    console.log("clover-oauth-callback bypass numeric state -> idComercio:", idComercio);
  } else {
    const parsedState = await verifyState(stateRaw);
    if (!parsedState) return new Response("Invalid state", { status: 400 });
    idComercio = Number(parsedState.idComercio);
    if (typeof parsedState.return_to === "string") {
      returnTo = parsedState.return_to;
    }
  }

  console.log("clover-oauth-callback resolved idComercio:", idComercio);

  if (!Number.isFinite(idComercio)) return new Response("Invalid state", { status: 400 });

  try {
    const tokenData = await exchangeToken(code);
    const access_token = tokenData.access_token as string | undefined;
    const refresh_token = tokenData.refresh_token as string | undefined;
    const token_type = (tokenData.token_type as string | undefined) ?? "Bearer";
    const scope = tokenData.scope as string | undefined;
    const merchant_id = (tokenData.merchant_id ?? tokenData.merchantId) as string | undefined;

    if (!access_token) throw new Error("No access_token en respuesta de Clover");

    const jwtPayload = decodeJwtPayload(access_token);
    const expSec = Number(jwtPayload?.exp);
    let expires_at: string | null = null;
    if (Number.isFinite(expSec) && expSec > 0) {
      expires_at = new Date(expSec * 1000).toISOString();
    } else {
      const expires_in = Number(tokenData.expires_in ?? tokenData.expires) || null;
      expires_at = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;
    }

    const upsertPayload = {
      idComercio,
      clover_merchant_id: merchant_id ?? merchantId,
      access_token,
      refresh_token: refresh_token ?? null,
      token_type: token_type ?? null,
      scope: scope ?? null,
      expires_at,
    };

    let payloadToSave = upsertPayload;
    const cols = await getTableColumns("clover_conexiones");
    if (cols) {
      payloadToSave = Object.fromEntries(
        Object.entries(upsertPayload).filter(([k]) => cols.has(k))
      ) as typeof upsertPayload;
      const skipped = Object.keys(upsertPayload).filter((k) => !cols.has(k));
      if (skipped.length) {
        console.warn("[clover-callback] Columnas no presentes en clover_conexiones, omitidas:", skipped);
      }
    }

    const { error: upsertError } = await supabase
      .from("clover_conexiones")
      .upsert(payloadToSave, { onConflict: "idComercio" });

    if (upsertError) {
      console.error("[clover-callback] Error upsert clover_conexiones:", upsertError?.message || upsertError);
      throw upsertError;
    }

    const fallback = "https://comercio.enpe-erre.com/adminMenuComercio.html";
    let redirectBase = fallback;
    try {
      if (returnTo) redirectBase = new URL(returnTo).toString();
    } catch (_e) {
      redirectBase = fallback;
    }
    const redirectUrl = new URL(redirectBase);
    redirectUrl.searchParams.set("id", String(idComercio));
    redirectUrl.searchParams.set("clover", "ok");
    return Response.redirect(redirectUrl.toString(), 302);
  } catch (err) {
    console.error("clover-oauth-callback error", err);
    const e = errToJson(err);
    return new Response(JSON.stringify({ error: e.message, details: e.details }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

Deno.serve(handler);
