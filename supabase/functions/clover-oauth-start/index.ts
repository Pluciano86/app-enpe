// Edge Function: clover-oauth-start
// Inicia el flujo OAuth de Clover y redirige al usuario.

import { createClient } from "npm:@supabase/supabase-js@2.45.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CLOVER_CLIENT_ID = Deno.env.get("CLOVER_CLIENT_ID") ?? "";
const CLOVER_REDIRECT_URI = Deno.env.get("CLOVER_REDIRECT_URI") ?? "";
const CLOVER_BASE_URL = Deno.env.get("CLOVER_BASE_URL") ?? "https://sandbox.dev.clover.com";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toBase64Url(input: Uint8Array) {
  return btoa(String.fromCharCode(...input))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signState(payload: Record<string, unknown>) {
  const enc = new TextEncoder();
  const json = JSON.stringify(payload);
  const data = enc.encode(json);
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SERVICE_ROLE_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
  return `${toBase64Url(data)}.${toBase64Url(sig)}`;
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase env vars missing" }), { status: 500, headers: corsHeaders });
  }
  if (!CLOVER_CLIENT_ID || !CLOVER_REDIRECT_URI) {
    return new Response(JSON.stringify({ error: "Clover client env vars missing" }), { status: 500, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const idComercio = Number(url.searchParams.get("idComercio") || url.searchParams.get("id"));
  if (!Number.isFinite(idComercio) || idComercio <= 0) {
    return new Response(JSON.stringify({ error: "idComercio requerido" }), { status: 400, headers: corsHeaders });
  }

  // Valida que exista el comercio
  const { data: comercio, error } = await supabase
    .from("Comercios")
    .select("id")
    .eq("id", idComercio)
    .maybeSingle();

  if (error || !comercio) {
    console.warn("clover-oauth-start comercio no encontrado", { idComercio, error });
    return new Response(JSON.stringify({ error: "Comercio no encontrado" }), { status: 404, headers: corsHeaders });
  }

  const nonce = crypto.randomUUID();
  const statePayload = { idComercio, nonce, ts: Date.now() };
  const state = await signState(statePayload);

  // Sandbox authorize endpoint
  const authorizeUrl = new URL("/oauth/authorize", CLOVER_BASE_URL);
  authorizeUrl.searchParams.set("client_id", CLOVER_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", CLOVER_REDIRECT_URI);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);

  // Sandbox login with redirect to authorize
  const loginUrl = new URL("/login", CLOVER_BASE_URL);
  loginUrl.searchParams.set("webRedirectUrl", authorizeUrl.toString());

  return Response.redirect(loginUrl.toString(), 302);
}

Deno.serve(handler);
