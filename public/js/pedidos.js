import { supabase } from '../shared/supabaseClient.js';

const ORDER_HISTORY_KEY = 'findixi_orders';
const tabActivos = document.getElementById('tabActivos');
const tabPasados = document.getElementById('tabPasados');
const ordersContainer = document.getElementById('ordersContainer');
const ordersEmpty = document.getElementById('ordersEmpty');
const ordersLoading = document.getElementById('ordersLoading');
const btnRefresh = document.getElementById('btnRefresh');

const STATUS_ACTIVE = new Set([
  'pending',
  'sent',
  'open',
  'confirmed',
  'preparing',
  'ready',
  'paid',
]);
const STATUS_PAST = new Set([
  'cancelled',
  'canceled',
  'completed',
  'delivered',
  'refunded',
]);

const statusLabels = {
  pending: 'Recibida',
  sent: 'Recibida',
  open: 'Recibida',
  confirmed: 'Confirmada',
  preparing: 'En preparación',
  ready: 'Lista para recoger',
  paid: 'Pagada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  canceled: 'Cancelada',
  refunded: 'Reembolsada',
};

function loadOrderHistory() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => {
        if (typeof item === 'number' || typeof item === 'string') return { id: Number(item) };
        return item && typeof item === 'object' ? item : null;
      })
      .filter((item) => item && Number.isFinite(Number(item.id)));
  } catch {
    return [];
  }
}

function getTokenParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || '';
}

async function fetchOrdersByToken(token) {
  if (!token) return [];
  const { data, error } = await supabase
    .from('ordenes')
    .select('id, idcomercio, clover_order_id, checkout_url, total, status, created_at, order_type, mesa, source, order_link_expires_at')
    .eq('order_link_token', token)
    .maybeSingle();
  if (error || !data) return [];
  const expired = data.order_link_expires_at && new Date(data.order_link_expires_at).getTime() < Date.now();
  const status = String(data.status || '').toLowerCase();
  if (expired || STATUS_PAST.has(status)) {
    return [{ ...data, link_expired: true }];
  }
  return [data];
}

async function fetchOrdersByEmail(email) {
  if (!email) return [];
  const { data, error } = await supabase
    .from('ordenes')
    .select('id, idcomercio, clover_order_id, checkout_url, total, status, created_at, order_type, mesa, source')
    .eq('customer_email', email)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data;
}

function setLoading(isLoading) {
  if (ordersLoading) {
    ordersLoading.classList.toggle('hidden', !isLoading);
  }
}

function setEmpty(isEmpty) {
  if (ordersEmpty) {
    ordersEmpty.classList.toggle('hidden', !isEmpty);
  }
}

function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '$0.00';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-PR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusToStep(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'ready') return 3;
  if (s === 'preparing') return 2;
  return 1;
}

function isActiveStatus(status) {
  const s = String(status || '').toLowerCase();
  if (STATUS_PAST.has(s)) return false;
  if (STATUS_ACTIVE.has(s)) return true;
  return true;
}

function buildMapsUrl(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

function buildWazeUrl(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
}

function buildOrderCard(order, commerce, items) {
  const status = String(order.status || 'pending').toLowerCase();
  const step = statusToStep(status);
  const statusLabel = statusLabels[status] || 'En proceso';
  const created = formatDate(order.created_at || order.created_at_local);
  const total = Number(order.total) || items.reduce((sum, item) => sum + item.lineTotal, 0);
  const lat = Number(commerce?.latitud);
  const lon = Number(commerce?.longitud);
  const mapUrl = buildMapsUrl(lat, lon);
  const wazeUrl = buildWazeUrl(lat, lon);

  const card = document.createElement('div');
  card.className = 'bg-white border border-gray-100 shadow-sm rounded-2xl p-4 space-y-3';

  const logoUrl = commerce?.logoUrl;
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${commerce?.nombre || 'Comercio'}" class="w-full h-full object-cover">`
    : `<div class="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">Sin logo</div>`;

  const itemsHtml = items.map((item) => {
    const mods = item.modifiers?.items || [];
    const modsHtml = mods.length
      ? `<div class="text-xs text-gray-500">${mods.map((m) => {
        const extra = Number(m.precio_extra);
        const extraLabel = Number.isFinite(extra) && extra > 0 ? ` (+$${extra.toFixed(2)})` : '';
        return `${m.nombre || 'Opción'}${extraLabel}`;
      }).join(', ')}</div>`
      : '';
    const noteHtml = item.modifiers?.nota ? `<div class="text-xs text-gray-500">Nota: ${item.modifiers.nota}</div>` : '';
    return `
      <div class="flex justify-between gap-2">
        <div>
          <div class="text-sm font-semibold">${item.nombre}</div>
          ${modsHtml}
          ${noteHtml}
        </div>
        <div class="text-sm font-semibold">${formatMoney(item.lineTotal)}</div>
      </div>
    `;
  }).join('');

  const steps = [
    { icon: 'fa-circle-check', label: 'Confirmado' },
    { icon: 'fa-kitchen-set', label: 'En preparación' },
    { icon: 'fa-bag-shopping', label: 'Lista para recoger' },
  ];

  const stepsHtml = steps.map((s, index) => {
    const active = step >= index + 1;
    const iconClass = active ? 'text-green-600' : 'text-gray-400';
    const textClass = active ? 'text-green-700' : 'text-gray-500';
    const circleClass = active ? 'bg-green-100 border-green-200' : 'bg-gray-100 border-gray-200';
    return `
      <div class="flex flex-col items-center text-center gap-2">
        <div class="w-10 h-10 rounded-full border ${circleClass} flex items-center justify-center">
          <i class="fa-solid ${s.icon} ${iconClass}"></i>
        </div>
        <div class="text-[11px] leading-tight ${textClass}">${s.label}</div>
      </div>
    `;
  }).join('');

  card.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="w-14 h-14 rounded-xl overflow-hidden border border-gray-100">${logoHtml}</div>
      <div class="flex-1">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold">${commerce?.nombre || 'Comercio'}</div>
          <div class="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">${statusLabel}</div>
        </div>
        <div class="text-xs text-gray-500">${created}</div>
        ${order.order_type === 'mesa' && order.mesa ? `<div class="text-xs text-gray-500">Mesa ${order.mesa}</div>` : ''}
      </div>
    </div>
    <div class="flex items-center gap-3 text-xs text-gray-500">
      ${commerce?.telefono ? `<a href="tel:${commerce.telefono}" class="inline-flex items-center gap-1 text-gray-600"><i class="fa-solid fa-phone"></i> ${commerce.telefono}</a>` : ''}
      ${commerce?.direccion ? `<span class="inline-flex items-center gap-1"><i class="fa-solid fa-location-dot"></i>${commerce.direccion}</span>` : ''}
    </div>
    <div class="flex items-center gap-4">
      ${mapUrl ? `<a href="${mapUrl}" target="_blank" aria-label="Google Maps" class="inline-flex items-center justify-center">
        <img src="https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios//google%20map.jpg" alt="Google Maps" class="h-12 w-16 object-contain">
      </a>` : ''}
      ${wazeUrl ? `<a href="${wazeUrl}" target="_blank" aria-label="Waze" class="inline-flex items-center justify-center">
        <img src="https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios//waze.jpg" alt="Waze" class="h-12 w-16 object-contain">
      </a>` : ''}
    </div>
    <div class="space-y-3">
      <div class="text-sm font-semibold text-gray-800">Status de la Orden:</div>
      <div class="grid grid-cols-3 gap-2">${stepsHtml}</div>
    </div>
    <div class="border-t border-gray-100 pt-3 space-y-2">
      ${itemsHtml || '<div class="text-xs text-gray-400">Sin detalles de items.</div>'}
      <div class="flex items-center justify-between text-sm font-semibold pt-2">
        <span>Total</span>
        <span>${formatMoney(total)}</span>
      </div>
    </div>
  `;

  return card;
}

async function loadOrders() {
  setLoading(true);
  setEmpty(false);
  if (ordersContainer) ordersContainer.innerHTML = '';

  const token = getTokenParam();
  let orders = [];
  if (token) {
    orders = await fetchOrdersByToken(token);
  }

  if (!orders.length) {
    const history = loadOrderHistory();
    const orderIds = history.map((h) => Number(h.id)).filter((id) => Number.isFinite(id));
    if (orderIds.length) {
      const resp = await supabase
        .from('ordenes')
        .select('id, idcomercio, clover_order_id, checkout_url, total, status, created_at, order_type, mesa, source')
        .in('id', orderIds)
        .order('created_at', { ascending: false });
      if (!resp.error && resp.data) {
        orders = resp.data;
      }
    }
  }

  if (!orders.length) {
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || '';
    if (userEmail) {
      orders = await fetchOrdersByEmail(userEmail);
    }
  }

  if (!orders.length) {
    setLoading(false);
    setEmpty(true);
    return;
  }

  const comercioIds = [...new Set(orders.map((o) => o.idcomercio).filter(Boolean))];
  const { data: comercios } = await supabase
    .from('Comercios')
    .select('id, nombre, direccion, telefono, latitud, longitud, logo')
    .in('id', comercioIds);

  const comercioLogoMap = new Map();
  if (comercioIds.length) {
    const { data: logosData } = await supabase
      .from('imagenesComercios')
      .select('idComercio, imagen')
      .in('idComercio', comercioIds)
      .eq('logo', true);

    (logosData || []).forEach((entry) => {
      const { data: publicData } = supabase.storage
        .from('galeriacomercios')
        .getPublicUrl(entry.imagen);
      comercioLogoMap.set(entry.idComercio, publicData?.publicUrl || null);
    });
  }

  const comercioMap = new Map();
  (comercios || []).forEach((c) => {
    let logoUrl = null;
    if (c.logo) {
      logoUrl = supabase.storage.from('galeriacomercios').getPublicUrl(c.logo).data?.publicUrl || null;
    } else if (comercioLogoMap.has(c.id)) {
      logoUrl = comercioLogoMap.get(c.id);
    }
    comercioMap.set(c.id, { ...c, logoUrl });
  });

  const { data: orderItems } = await supabase
    .from('orden_items')
    .select('idorden, idproducto, qty, price_snapshot, modifiers')
    .in('idorden', orders.map((o) => o.id));

  const productIds = [...new Set((orderItems || []).map((i) => i.idproducto).filter(Boolean))];
  const { data: products } = await supabase
    .from('productos')
    .select('id, nombre, imagen')
    .in('id', productIds);

  const productMap = new Map();
  (products || []).forEach((p) => productMap.set(p.id, p));

  const itemsByOrder = new Map();
  (orderItems || []).forEach((item) => {
    const list = itemsByOrder.get(item.idorden) || [];
    const product = productMap.get(item.idproducto);
    const unitPrice = Number(item.price_snapshot) || 0;
    const qty = Number(item.qty) || 0;
    list.push({
      nombre: product?.nombre || `Producto ${item.idproducto}`,
      lineTotal: unitPrice * qty,
      modifiers: item.modifiers || null,
    });
    itemsByOrder.set(item.idorden, list);
  });

  const currentTab = getCurrentTab();
  const filtered = orders.filter((order) => {
    const active = isActiveStatus(order.status);
    return currentTab === 'activos' ? active : !active;
  });

  if (!filtered.length) {
    setLoading(false);
    setEmpty(true);
    return;
  }

  filtered.forEach((order) => {
    const commerce = comercioMap.get(order.idcomercio) || {};
    const items = itemsByOrder.get(order.id) || [];
    const card = buildOrderCard(order, commerce, items);
    if (order.link_expired) {
      const msg = document.createElement('div');
      msg.className = 'text-xs text-red-500 font-semibold mt-2';
      msg.textContent = 'Este enlace de pedido ya expiró.';
      card.appendChild(msg);
    }
    ordersContainer.appendChild(card);
  });

  setLoading(false);
}

function setActiveTab(tab) {
  if (tabActivos) {
    tabActivos.classList.toggle('bg-black', tab === 'activos');
    tabActivos.classList.toggle('text-white', tab === 'activos');
  }
  if (tabPasados) {
    tabPasados.classList.toggle('bg-black', tab === 'pasados');
    tabPasados.classList.toggle('text-white', tab === 'pasados');
  }
  if (tabActivos) {
    tabActivos.classList.toggle('text-gray-700', tab !== 'activos');
  }
  if (tabPasados) {
    tabPasados.classList.toggle('text-gray-700', tab !== 'pasados');
  }
}

function getCurrentTab() {
  const params = new URLSearchParams(window.location.search);
  return params.get('tab') === 'pasados' ? 'pasados' : 'activos';
}

function updateTab(tab) {
  const params = new URLSearchParams(window.location.search);
  params.set('tab', tab);
  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', next);
  setActiveTab(tab);
  loadOrders();
}

tabActivos?.addEventListener('click', () => updateTab('activos'));
tabPasados?.addEventListener('click', () => updateTab('pasados'));
btnRefresh?.addEventListener('click', loadOrders);

setActiveTab(getCurrentTab());
loadOrders();
