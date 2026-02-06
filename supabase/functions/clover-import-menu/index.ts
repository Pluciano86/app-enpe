// Edge Function: clover-import-menu
// Importa categorías, items y modificadores desde Clover y los sincroniza con las tablas de menú.

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

function toArray(x: any) {
  if (Array.isArray(x)) return x;
  if (x && Array.isArray(x.elements)) return x.elements;
  return [];
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
  const tokenUrl = new URL("/oauth/v2/token", CLOVER_OAUTH_BASE);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
    client_id: CLOVER_CLIENT_ID,
    client_secret: CLOVER_CLIENT_SECRET,
    redirect_uri: CLOVER_REDIRECT_URI,
  });
  const resp = await fetch(tokenUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) throw new Error(`Refresh token failed ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

async function fetchClover(path: string, token: string) {
  const base =
    path.startsWith("/oauth/v2/token") ? CLOVER_OAUTH_BASE
      : path.startsWith("/v3/") ? CLOVER_API_BASE
      : CLOVER_API_BASE;
  const url = path.startsWith("http") ? new URL(path) : new URL(path, base);
  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const raw = await resp.text();
    throw new CloverApiError(resp.status, url.pathname, raw);
  }
  return await resp.json();
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return jsonResponse({ ok: true });
  const url = new URL(req.url);
  const idComercio = Number(url.searchParams.get("idComercio") || url.searchParams.get("id"));

  if (!Number.isFinite(idComercio) || idComercio <= 0) return jsonResponse({ error: "idComercio requerido" }, 400);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return jsonResponse({ error: "Supabase env missing" }, 500);
  if (!CLOVER_CLIENT_ID || !CLOVER_CLIENT_SECRET) return jsonResponse({ error: "Clover env missing" }, 500);
  console.log("[clover-import] CLOVER_API_BASE =", CLOVER_API_BASE);

  // Obtener conexión Clover
  const { data: conn, error: connErr } = await supabase
    .from("clover_conexiones")
    .select("*")
    .eq("idComercio", idComercio)
    .maybeSingle();

  if (connErr || !conn) return jsonResponse({ error: "Conexión Clover no encontrada para este comercio" }, 404);
  let accessToken: string = conn.access_token;
  let refreshTokenVal: string | null = conn.refresh_token ?? null;
  let expiresAt: string | null = conn.expires_at ?? null;
  const merchantId: string | null = conn.clover_merchant_id ?? null;
  let refreshedAfter401 = false;

  if (!merchantId) return jsonResponse({ error: "clover_merchant_id no guardado; vuelve a conectar Clover" }, 400);
  console.log("[clover-import] oauthBaseUsed=", CLOVER_OAUTH_BASE, "apiBaseUsed=", CLOVER_API_BASE, "merchantId=", merchantId);

  // Refresh token si expira en <=60s
  if (refreshTokenVal && expiresAt) {
    const expMs = Date.parse(expiresAt);
    if (!Number.isNaN(expMs) && expMs - Date.now() < 60_000) {
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
        }).eq("idComercio", idComercio);
      } catch (e) {
        console.warn("No se pudo refrescar token", e);
      }
    }
  }

  const fetchCloverWithAutoRefresh = async (path: string) => {
    try {
      return await fetchClover(path, accessToken);
    } catch (err) {
      if (err instanceof CloverApiError && err.status === 401 && refreshTokenVal && !refreshedAfter401) {
        refreshedAfter401 = true;
        console.warn("[clover-import] 401 from Clover, refreshing token");
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
          }).eq("idComercio", idComercio);
        } catch (refreshErr) {
          console.warn("[clover-import] refresh after 401 failed", refreshErr);
          throw err;
        }
        return await fetchClover(path, accessToken);
      }
      throw err;
    }
  };

  try {
    console.log("[clover-import] Fetching categories & items", { merchantId, idComercio });
    const catsJson = await fetchCloverWithAutoRefresh(`/v3/merchants/${merchantId}/categories`);
    const categories: any[] = toArray(catsJson?.elements ?? catsJson?.categories ?? catsJson);

    const itemsJson = await fetchCloverWithAutoRefresh(`/v3/merchants/${merchantId}/items?limit=1000&expand=modifierGroups,categories`);
    console.log("[clover-import] items keys:", Object.keys(itemsJson));
    console.log("[clover-import] items count:", (itemsJson?.elements?.length ?? itemsJson?.items?.length ?? 0));
    const itemsForModifiers: any[] = toArray(itemsJson?.elements ?? itemsJson?.items ?? itemsJson);

    const modGroupsJson = await fetchCloverWithAutoRefresh(`/v3/merchants/${merchantId}/modifier_groups?limit=500`);
    const modifierGroups: any[] = toArray(modGroupsJson?.elements ?? modGroupsJson?.modifierGroups ?? modGroupsJson);

    // 1) Upsert categorías -> menus
    const menuPayload = categories.map((c) => ({
      idComercio,
      clover_category_id: c?.id ?? null,
      clover_merchant_id: merchantId,
      titulo: c?.name ?? "Sin título",
      descripcion: c?.description ?? null,
      orden: Number(c?.sortOrder ?? c?.sequence) || 0,
      activo: true,
    })).filter((m) => m.clover_category_id);

    if (menuPayload.length) {
      const { error: menuErr } = await supabase
        .from("menus")
        .upsert(menuPayload, { onConflict: "clover_category_id,clover_merchant_id" });
      if (menuErr) throw menuErr;
    }

    // Map clover_category_id -> menu id
    const catIds = menuPayload.map((m) => m.clover_category_id);
    const { data: menusRows } = await supabase
      .from("menus")
      .select("id, clover_category_id")
      .eq("idComercio", idComercio)
      .in("clover_category_id", catIds);
    const menuMap = new Map<string, number>();
    (menusRows || []).forEach((row: any) => {
      if (row.clover_category_id) menuMap.set(row.clover_category_id, row.id);
    });

    // 2) Productos (por categoría)
    const itemsById = new Map<string, any>();
    const itemsByCategory = new Map<string, any[]>();
    for (const cat of categories) {
      const categoryId = cat?.id;
      if (!categoryId) continue;
      const catItemsJson = await fetchCloverWithAutoRefresh(`/v3/merchants/${merchantId}/categories/${categoryId}/items`);
      const catItems: any[] = toArray(catItemsJson?.elements ?? catItemsJson?.items ?? catItemsJson);
      itemsByCategory.set(categoryId, catItems);
      for (const item of catItems) {
        if (item?.id) itemsById.set(item.id, item);
      }
    }

    const itemIds = Array.from(itemsById.keys());
    const { data: existingProducts } = await supabase
      .from("productos")
      .select("id, clover_item_id, imagen, orden")
      .eq("clover_merchant_id", merchantId)
      .in("clover_item_id", itemIds.length ? itemIds : ["__none__"]);
    const existingMap = new Map<string, { id: number; imagen: string | null; orden: number | null }>();
    (existingProducts || []).forEach((p: any) => existingMap.set(p.clover_item_id, { id: p.id, imagen: p.imagen, orden: p.orden }));

    const productoPayload = [] as any[];
    let sampleLogged = false;
    for (const [categoryId, catItems] of itemsByCategory) {
      const idMenu = menuMap.get(categoryId);
      for (const item of catItems) {
        if (!sampleLogged) {
          console.log("[clover-import] sample item:", JSON.stringify(item).slice(0, 800));
          sampleLogged = true;
        }
        console.log("[clover-import] resolved idMenu:", idMenu, "itemId:", item?.id);
        if (!idMenu) continue; // sin categoría -> no se importa
        const itemId = item?.id;
        if (!itemId) continue;
        const prev = existingMap.get(itemId) || null;
        const rawPrice = item?.price ?? item?.priceWithVat;
        let itemResolved: any = item;
        if (rawPrice == null) {
          itemResolved = await fetchCloverWithAutoRefresh(`/v3/merchants/${merchantId}/items/${itemId}`);
        }
        const precioCents = Number(itemResolved?.price ?? itemResolved?.priceWithVat ?? 0);
        const disponible = itemResolved?.isDeleted === true ? false : true;

        productoPayload.push({
          idMenu,
          clover_item_id: itemId,
          clover_merchant_id: merchantId,
          nombre: itemResolved?.name ?? "Sin nombre",
          descripcion: itemResolved?.description ?? null,
          precio: precioCents ? precioCents / 100 : 0,
          orden: Number(itemResolved?.sortOrder ?? itemResolved?.sequence ?? prev?.orden ?? 0) || 0,
          activo: true,
          disponible_clover: disponible,
          imagen: prev?.imagen ?? null,
        });
      }
    }

    if (productoPayload.length) {
      const { error: prodErr } = await supabase
        .from("productos")
        .upsert(productoPayload, { onConflict: "clover_item_id,clover_merchant_id" });
      if (prodErr) throw prodErr;
    }

    // Map producto clover -> producto.id
    const { data: prodRows } = await supabase
      .from("productos")
      .select("id, clover_item_id")
      .eq("clover_merchant_id", merchantId)
      .in("clover_item_id", itemIds.length ? itemIds : ["__none__"]);
    const prodMap = new Map<string, number>();
    (prodRows || []).forEach((p: any) => prodMap.set(p.clover_item_id, p.id));

    // 3) Grupos de modificadores
    const modifierMap = new Map<string, any>();
    modifierGroups.forEach((g) => modifierMap.set(g.id, g));

    const grupoPayload: any[] = [];
    const gruposPorItem: Map<string, string[]> = new Map();

    for (const item of itemsForModifiers) {
      const productoId = prodMap.get(item.id);
      if (!productoId) continue;
      const groups = item?.modifierGroups ?? item?.modifier_groups ?? [];
      console.log("[clover-import] groups keys:", groups && Object.keys(groups || {}));
      const groupIds = toArray(groups).map((g: any) => g?.id).filter(Boolean);
      gruposPorItem.set(item.id, groupIds);
      for (const gid of groupIds) {
        const g = modifierMap.get(gid) ?? { id: gid };
        grupoPayload.push({
          idProducto: productoId,
          clover_modifier_group_id: gid,
          clover_merchant_id: merchantId,
          nombre: g?.name ?? g?.label ?? "Opciones",
          orden: Number(g?.sortOrder ?? g?.sequence ?? 0) || 0,
          requerido: g?.minRequired ? g.minRequired > 0 : false,
        });
      }
    }

    if (grupoPayload.length) {
      const { error: grpErr } = await supabase
        .from("producto_opcion_grupos")
        .upsert(grupoPayload, { onConflict: "idProducto,clover_modifier_group_id" });
      if (grpErr) throw grpErr;
    }

    // Map grupo Clover -> id grupo local por producto
    const { data: grpRows } = await supabase
      .from("producto_opcion_grupos")
      .select("id, idProducto, clover_modifier_group_id")
      .eq("clover_merchant_id", merchantId);
    const grpMap = new Map<string, number>(); // key `${productoId}:${cloverGid}`
    (grpRows || []).forEach((g: any) => grpMap.set(`${g.idProducto}:${g.clover_modifier_group_id}`, g.id));

    // 4) Modifiers
    const modifierPayload: any[] = [];
    for (const g of modifierGroups) {
      if (!g?.id) continue;
      const modsJson = await fetchCloverWithAutoRefresh(`/v3/merchants/${merchantId}/modifier_groups/${g.id}/modifiers?limit=500`);
      const mods: any[] = toArray(modsJson?.elements ?? modsJson?.modifiers ?? modsJson);
      for (const item of itemsForModifiers) {
        const productoId = prodMap.get(item.id);
        if (!productoId) continue;
        const groupIds = gruposPorItem.get(item.id) || [];
        if (!groupIds.includes(g.id)) continue;
        const idGrupo = grpMap.get(`${productoId}:${g.id}`);
        if (!idGrupo) continue;
        mods.forEach((m) => {
          modifierPayload.push({
            idGrupo,
            clover_modifier_id: m.id,
            nombre: m.name ?? "Opción",
            precio_extra: Number(m.price ?? m.priceWithVat ?? 0) / 100,
            activo: m.isDeleted === true ? false : true,
            orden: Number(m.sortOrder ?? m.sequence ?? 0) || 0,
          });
        });
      }
    }

    if (modifierPayload.length) {
      const { error: modErr } = await supabase
        .from("producto_opcion_items")
        .upsert(modifierPayload, { onConflict: "idGrupo,clover_modifier_id" });
      if (modErr) throw modErr;
    }

    await supabase.from("clover_conexiones").update({ last_imported_at: new Date().toISOString() }).eq("idComercio", idComercio);

    return jsonResponse({ ok: true, menus: menuPayload.length, productos: productoPayload.length, opciones: modifierPayload.length });
  } catch (err) {
    console.error("[clover-import] error", err);
    if (err instanceof CloverApiError) {
      return jsonResponse({
        baseUrlUsed: CLOVER_API_BASE,
        merchantId,
        status: err.status,
        raw: err.raw,
      }, err.status || 500);
    }
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}

Deno.serve(handler);
