// Edge Function: clover-webhook
// Recibe webhooks de Clover y asigna Order Type Pickup (Findixi) a la orden pagada.

import { createClient } from "npm:@supabase/supabase-js@2.45.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CLOVER_CLIENT_ID = Deno.env.get("CLOVER_CLIENT_ID") ?? "";
const CLOVER_CLIENT_SECRET = Deno.env.get("CLOVER_CLIENT_SECRET") ?? "";
const CLOVER_OAUTH_BASE = Deno.env.get("CLOVER_OAUTH_BASE") ?? "https://sandbox.dev.clover.com";
const CLOVER_API_BASE = Deno.env.get("CLOVER_API_BASE") ?? "https://apisandbox.dev.clover.com";
const CLOVER_WEBHOOK_SECRET = Deno.env.get("CLOVER_WEBHOOK_SECRET") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-findixi-secret",
};

const PICKUP_ORDER_TYPE_NAME = "Pickup (Findixi)";
const PICKUP_ORDER_TYPE_NAME_ALT = "Pick Up (Findixi)";

function normalizeName(value: string) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string) {
  return normalizeName(value).replace(/[^a-z0-9]/g, "");
}

function extractOrderTypeName(orderType: any) {
  return (
    orderType?.label ??
    orderType?.name ??
    orderType?.title ??
    orderType?.displayName ??
    orderType?.orderTypeName ??
    null
  );
}

function extractSystemOrderTypeId(systemType: any) {
  return (
    systemType?.id ??
    systemType?.systemOrderTypeId ??
    systemType?.systemOrderType ??
    systemType?.code ??
    null
  );
}

function isPickupSystemType(systemType: any) {
  const raw = [
    systemType?.id,
    systemType?.name,
    systemType?.label,
    systemType?.displayName,
    systemType?.type,
    systemType?.code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /pickup|pick\s*up|take\s*out|takeout|to-go|togo|carry\s*out/.test(raw);
}

function toArray(x: any) {
  if (Array.isArray(x)) return x;
  if (x && Array.isArray(x.elements)) return x.elements;
  return [];
}

function normalizeOauthApiBase(raw: string) {
  const fallback = "https://apisandbox.dev.clover.com";
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    if (url.pathname.startsWith("/auth-token")) {
      url.pathname = "/";
    }
    const host = url.host.toLowerCase();
    let mappedHost = host;
    if (host === "sandbox.dev.clover.com") mappedHost = "apisandbox.dev.clover.com";
    else if (host === "www.clover.com") mappedHost = "api.clover.com";
    else if (host === "www.eu.clover.com") mappedHost = "api.eu.clover.com";
    else if (host === "www.la.clover.com") mappedHost = "api.la.clover.com";
    url.host = mappedHost;
    url.pathname = "/";
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

const OAUTH_API_BASE = normalizeOauthApiBase(CLOVER_OAUTH_BASE);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

class CloverApiError extends Error {
  status: number;
  raw: string;
  url: string;

  constructor(status: number, url: string, raw: string) {
    super(`Clover API ${url} -> ${status}: ${raw}`);
    this.status = status;
    this.raw = raw;
    this.url = url;
  }
}

async function refreshToken(refresh_token: string) {
  const tokenUrl = new URL("/oauth/v2/refresh", OAUTH_API_BASE);
  const payload = {
    refresh_token,
    client_id: CLOVER_CLIENT_ID,
  };
  const formBody = new URLSearchParams(payload).toString();
  const jsonBody = JSON.stringify(payload);
  const doRequest = async (contentType: string, body: string) => {
    const resp = await fetch(tokenUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": contentType, "Accept": "application/json" },
      body,
    });
    const raw = await resp.text();
    return { resp, raw };
  };

  const first = await doRequest("application/json", jsonBody);
  if (first.resp.ok) return JSON.parse(first.raw);

  const shouldFallback =
    first.resp.status === 415 ||
    (first.raw.toLowerCase().includes("code") && first.raw.toLowerCase().includes("must not be null"));
  if (shouldFallback) {
    const second = await doRequest("application/x-www-form-urlencoded", formBody);
    if (second.resp.ok) return JSON.parse(second.raw);
    throw new Error(`Refresh token failed ${second.resp.status}: ${second.raw}`);
  }

  throw new Error(`Refresh token failed ${first.resp.status}: ${first.raw}`);
}

async function cloverRequest(
  path: string,
  token: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
) {
  const url = path.startsWith("http") ? new URL(path) : new URL(path, CLOVER_API_BASE);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers ?? {}),
  };
  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const resp = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers,
    body,
  });
  if (!resp.ok) {
    const raw = await resp.text();
    throw new CloverApiError(resp.status, url.pathname, raw);
  }
  if (resp.status === 204) return null;
  return await resp.json();
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return jsonResponse({ ok: true });
  const url = new URL(req.url);

  let body: any = null;
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "JSON invalido" }, 400);
    }
  }

  const providedSecret =
    req.headers.get("x-findixi-secret") ??
    url.searchParams.get("secret") ??
    body?.secret ??
    "";

  const verificationCode =
    body?.verificationCode ??
    body?.verification_code ??
    body?.verification_code_id ??
    url.searchParams.get("verificationCode") ??
    url.searchParams.get("verification_code") ??
    null;

  if (verificationCode) {
    console.log("[clover-webhook] verificationCode:", verificationCode);
    return jsonResponse({ ok: true, verificationCode });
  }

  if (CLOVER_WEBHOOK_SECRET) {
    if (providedSecret !== CLOVER_WEBHOOK_SECRET) {
      console.warn("[clover-webhook] Secret inválido", {
        hasSecret: Boolean(providedSecret),
        secretMatch: false,
      });
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  }

  if (req.method !== "POST") return jsonResponse({ error: "Metodo no permitido" }, 405);

  const eventType =
    body?.type ??
    body?.eventType ??
    body?.event?.type ??
    body?.event?.eventType ??
    body?.event?.name ??
    null;
  console.log("[clover-webhook] incoming", {
    merchantId: body?.merchant_id ?? body?.merchantId ?? body?.merchant?.id ?? null,
    objectId: body?.object_id ?? body?.objectId ?? body?.id ?? body?.data?.id ?? null,
    eventType,
    hasSecret: Boolean(providedSecret),
  });

  const merchantId =
    body?.merchant_id ??
    body?.merchantId ??
    body?.merchant?.id ??
    body?.event?.merchantId ??
    body?.event?.merchant_id ??
    null;
  if (!merchantId) return jsonResponse({ error: "merchantId requerido" }, 400);

  const objectId =
    body?.object_id ??
    body?.objectId ??
    body?.payment_id ??
    body?.paymentId ??
    body?.id ??
    body?.data?.id ??
    null;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return jsonResponse({ error: "Supabase env missing" }, 500);
  if (!CLOVER_CLIENT_ID || !CLOVER_CLIENT_SECRET) return jsonResponse({ error: "Clover env missing" }, 500);

  const { data: conn, error: connErr } = await supabase
    .from("clover_conexiones")
    .select("idComercio, access_token, refresh_token, expires_at, clover_order_type_id, clover_order_type_name")
    .eq("clover_merchant_id", merchantId)
    .maybeSingle();

  if (connErr) return jsonResponse({ error: connErr.message }, 500);
  if (!conn) return jsonResponse({ error: "Comercio no encontrado" }, 404);

  let accessToken: string | null = conn.access_token ?? null;
  let refreshTokenVal: string | null = conn.refresh_token ?? null;
  let expiresAt: string | null = conn.expires_at ?? null;
  if (!accessToken) return jsonResponse({ error: "access_token no disponible" }, 401);

  let refreshedAfter401 = false;

  const expMs = expiresAt ? Date.parse(expiresAt) : NaN;
  const shouldRefresh = !expiresAt || Number.isNaN(expMs) || expMs - Date.now() < 120_000;
  if (shouldRefresh && refreshTokenVal) {
    try {
      const tokenData = await refreshToken(refreshTokenVal);
      accessToken = tokenData.access_token ?? accessToken;
      refreshTokenVal = tokenData.refresh_token ?? refreshTokenVal;
      const expires_in = Number(tokenData.expires_in ?? tokenData.expires) || null;
      expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : expiresAt;
      await supabase.from("clover_conexiones").update({
        access_token: accessToken,
        refresh_token: refreshTokenVal,
        expires_at: expiresAt,
      }).eq("idComercio", conn.idComercio);
    } catch (e) {
      console.warn("[clover-webhook] No se pudo refrescar token", e);
    }
  }

  const fetchCloverWithAutoRefresh = async (
    path: string,
    options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
  ) => {
    try {
      return await cloverRequest(path, accessToken!, options);
    } catch (err) {
      if (err instanceof CloverApiError && err.status === 401 && refreshTokenVal && !refreshedAfter401) {
        refreshedAfter401 = true;
        try {
          const tokenData = await refreshToken(refreshTokenVal);
          accessToken = tokenData.access_token ?? accessToken;
          refreshTokenVal = tokenData.refresh_token ?? refreshTokenVal;
          const expires_in = Number(tokenData.expires_in ?? tokenData.expires) || null;
          expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : expiresAt;
          await supabase.from("clover_conexiones").update({
            access_token: accessToken,
            refresh_token: refreshTokenVal,
            expires_at: expiresAt,
          }).eq("idComercio", conn.idComercio);
        } catch (refreshErr) {
          console.warn("[clover-webhook] refresh after 401 failed", refreshErr);
          throw err;
        }
        return await cloverRequest(path, accessToken!, options);
      }
      throw err;
    }
  };

  const ensurePickupOrderType = async () => {
    const desiredKeys = new Set([
      normalizeKey(PICKUP_ORDER_TYPE_NAME),
      normalizeKey(PICKUP_ORDER_TYPE_NAME_ALT),
    ]);

    if (conn?.clover_order_type_id) {
      return { id: conn.clover_order_type_id, name: conn?.clover_order_type_name ?? PICKUP_ORDER_TYPE_NAME };
    }

    const orderTypesResp = await fetchCloverWithAutoRefresh(`/v3/merchants/${merchantId}/order_types?limit=200`);
    const orderTypes = toArray(orderTypesResp?.elements ?? orderTypesResp?.orderTypes ?? orderTypesResp);
    const existing = orderTypes.find((ot: any) => {
      const label = extractOrderTypeName(ot);
      return label && desiredKeys.has(normalizeKey(label));
    });

    let orderTypeId = existing?.id ?? null;
    let orderTypeName = extractOrderTypeName(existing) ?? null;

    if (!orderTypeId) {
      let pickupSystemId: string | null = null;
      try {
        const systemResp = await fetchCloverWithAutoRefresh(`/v3/merchants/${merchantId}/system_order_types`);
        const systemTypes = toArray(systemResp?.elements ?? systemResp?.systemOrderTypes ?? systemResp);
        const pickupSystem = systemTypes.find(isPickupSystemType);
        pickupSystemId = extractSystemOrderTypeId(pickupSystem);
      } catch (err) {
        console.warn("[clover-webhook] No se pudo leer system_order_types", err);
        pickupSystemId = null;
      }

      const payloadCandidates: Record<string, unknown>[] = [
        { label: PICKUP_ORDER_TYPE_NAME, ...(pickupSystemId ? { systemOrderTypeId: pickupSystemId } : {}) },
        { name: PICKUP_ORDER_TYPE_NAME, ...(pickupSystemId ? { systemOrderTypeId: pickupSystemId } : {}) },
        { label: PICKUP_ORDER_TYPE_NAME },
        { name: PICKUP_ORDER_TYPE_NAME },
      ];

      let created: any = null;
      let lastErr: unknown = null;
      for (const payload of payloadCandidates) {
        try {
          created = await fetchCloverWithAutoRefresh(`/v3/merchants/${merchantId}/order_types`, {
            method: "POST",
            body: payload,
          });
          if (created?.id) break;
        } catch (err) {
          lastErr = err;
        }
      }
      if (!created?.id) {
        if (lastErr instanceof Error) throw lastErr;
        throw new Error("No se pudo crear order type Pickup (Findixi)");
      }
      orderTypeId = created.id;
      orderTypeName = extractOrderTypeName(created) ?? PICKUP_ORDER_TYPE_NAME;
    }

    await supabase.from("clover_conexiones").update({
      clover_order_type_id: orderTypeId,
      clover_order_type_name: orderTypeName,
      order_type_ready_at: new Date().toISOString(),
    }).eq("idComercio", conn.idComercio);

    return { id: orderTypeId, name: orderTypeName };
  };

  if (!objectId) {
    return jsonResponse({ ok: true, ignored: true, reason: "No objectId" });
  }

  const paymentId = objectId;
  let orderId: string | null = null;

  try {
    const payment = await fetchCloverWithAutoRefresh(
      `/v3/merchants/${merchantId}/payments/${paymentId}?expand=order`,
    );
    orderId = payment?.order?.id ?? payment?.orderId ?? payment?.order_id ?? null;
  } catch (err) {
    console.warn("[clover-webhook] No se pudo leer payment", err);
  }

  let pickupOrderType: { id: string; name: string } | null = null;
  try {
    pickupOrderType = await ensurePickupOrderType();
  } catch (err) {
    return jsonResponse({
      error: "No se pudo asegurar order type Pickup",
      details: err instanceof Error ? err.message : String(err),
    }, 500);
  }

  if (!pickupOrderType?.id) {
    return jsonResponse({ ok: true, ignored: true, reason: "No pickup order type" });
  }

  // Si no obtuvimos orderId desde payment, intentamos usar el objectId como orderId.
  const targetOrderId = orderId ?? paymentId;
  if (!targetOrderId) {
    return jsonResponse({ ok: true, ignored: true, reason: "No orderId" });
  }

  try {
    await fetchCloverWithAutoRefresh(`/v3/merchants/${merchantId}/orders/${targetOrderId}`, {
      method: "POST",
      body: { orderType: { id: pickupOrderType.id } },
    });
  } catch (err) {
    if (err instanceof CloverApiError && err.status === 404) {
      return jsonResponse({ ok: true, ignored: true, reason: "Order not found" });
    }
    return jsonResponse({
      error: "No se pudo asignar order type",
      details: err instanceof Error ? err.message : String(err),
    }, 502);
  }

  return jsonResponse({
    ok: true,
    merchantId,
    paymentId,
    orderId: targetOrderId,
    orderTypeId: pickupOrderType.id,
    usedFallback: !orderId,
  });
}

Deno.serve(handler);
