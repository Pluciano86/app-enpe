import { supabase } from '../shared/supabaseClient.js';

const ACTIVE_STATUS = new Set(['confirmed', 'preparing', 'ready', 'paid']);
const STATUS_LABELS = {
  pending: 'Recibida',
  sent: 'Recibida',
  open: 'Recibida',
  confirmed: 'Confirmada',
  preparing: 'En preparación',
  ready: 'Lista para recoger',
  paid: 'Pagada',
};

const tituloComercio = document.getElementById('tituloComercio');
const btnEnableSound = document.getElementById('btnEnableSound');
const btnMuteAlarm = document.getElementById('btnMuteAlarm');
const btnRefreshOrders = document.getElementById('btnRefreshOrders');
const alarmBanner = document.getElementById('alarmBanner');
const ordersContainer = document.getElementById('ordersContainer');
const ordersEmpty = document.getElementById('ordersEmpty');
const ordersLoading = document.getElementById('ordersLoading');
const statActivas = document.getElementById('statActivas');
const statNuevas = document.getElementById('statNuevas');
const statPreparando = document.getElementById('statPreparando');
const statListas = document.getElementById('statListas');

const params = new URLSearchParams(window.location.search);
const idComercio = Number(params.get('id') || params.get('idComercio') || 0);

let realtimeChannel = null;
let reloadTimer = null;
let pollTimer = null;
let timerInterval = null;

let hasLoadedOnce = false;
let knownOrderIds = new Set();
let newOrdersCount = 0;

let audioCtx = null;
let soundEnabled = false;
let soundMuted = false;
let alarmInterval = null;

function setLoading(isLoading) {
  ordersLoading?.classList.toggle('hidden', !isLoading);
}

function setEmpty(isEmpty) {
  ordersEmpty?.classList.toggle('hidden', !isEmpty);
}

function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '$0.00';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-PR', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatElapsed(createdAt) {
  const created = createdAt ? new Date(createdAt).getTime() : NaN;
  if (!Number.isFinite(created)) return '00:00:00';
  const diff = Math.max(0, Math.floor((Date.now() - created) / 1000));
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function waitClass(createdAt) {
  const created = createdAt ? new Date(createdAt).getTime() : NaN;
  if (!Number.isFinite(created)) return 'text-gray-700';
  const minutes = (Date.now() - created) / 60000;
  if (minutes >= 25) return 'text-red-600';
  if (minutes >= 12) return 'text-amber-600';
  return 'text-emerald-600';
}

function statusClass(status) {
  if (status === 'preparing') return 'ticket-border-warm';
  if (status === 'ready' || status === 'paid') return 'ticket-border-cool';
  return 'ticket-border';
}

function isActive(status) {
  const s = String(status || '').toLowerCase();
  if (!s) return true;
  return ACTIVE_STATUS.has(s);
}

function getStatusLabel(status) {
  const s = String(status || '').toLowerCase();
  return STATUS_LABELS[s] || 'En proceso';
}

function parseOrderModifiers(raw) {
  if (!raw || typeof raw !== 'object') return { grouped: [], note: null };
  const list = Array.isArray(raw.items) ? raw.items : [];
  const grouped = new Map();
  list.forEach((mod) => {
    const groupName = String(mod?.grupo || mod?.grupo_nombre || 'Opciones').trim() || 'Opciones';
    const items = grouped.get(groupName) || [];
    items.push(mod);
    grouped.set(groupName, items);
  });
  return { grouped: Array.from(grouped.entries()), note: raw.nota || null };
}

function renderOrderItem(item) {
  const parsed = parseOrderModifiers(item.modifiers);
  const modifiersHtml = parsed.grouped.map(([group, mods]) => {
    const lines = mods.map((m) => {
      const extra = Number(m?.precio_extra);
      const extraLabel = Number.isFinite(extra) && extra > 0 ? ` (+$${extra.toFixed(2)})` : '';
      return `<div class="text-xs text-gray-600">• ${m?.nombre || 'Opción'}${extraLabel}</div>`;
    }).join('');
    return `<div class="mt-1"><div class="text-xs font-semibold text-gray-700">${group}:</div>${lines}</div>`;
  }).join('');

  const noteHtml = parsed.note ? `<div class="text-xs text-gray-600 mt-1">Nota: ${parsed.note}</div>` : '';

  return `
    <div class="py-2 border-b border-dashed border-gray-200 last:border-b-0">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-sm font-semibold text-gray-900">${Number(item.qty) || 1} x ${item.nombre}</div>
          ${modifiersHtml}
          ${noteHtml}
        </div>
        <div class="text-sm font-semibold text-gray-900">${formatMoney(item.lineTotal)}</div>
      </div>
    </div>
  `;
}

function renderOrders(orders, itemsByOrder) {
  ordersContainer.innerHTML = '';
  if (!orders.length) {
    setEmpty(true);
    return;
  }
  setEmpty(false);

  orders.forEach((order) => {
    const status = String(order.status || 'pending').toLowerCase();
    const label = getStatusLabel(status);
    const items = itemsByOrder.get(order.id) || [];
    const totalFromItems = items.reduce((acc, i) => acc + i.lineTotal, 0);
    const total = Number(order.total);
    const totalFinal = Number.isFinite(total) ? total : totalFromItems;
    const created = formatDate(order.created_at);

    const card = document.createElement('article');
    card.className = `bg-white border border-gray-200 rounded-2xl shadow-sm p-4 ${statusClass(status)}`;
    card.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-gray-500">Ticket</p>
          <h2 class="text-lg font-semibold text-gray-900">#${order.id}</h2>
          <p class="text-xs text-gray-500">${created}</p>
          <p class="text-xs text-gray-500">${order.clover_order_id ? `Clover: ${order.clover_order_id}` : 'Clover ID pendiente'}</p>
        </div>
        <div class="text-left sm:text-right">
          <div class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">${label}</div>
          <div class="mt-2 text-xs text-gray-500">Tiempo abierto</div>
          <div class="text-2xl font-bold ${waitClass(order.created_at)}" data-elapsed="${order.created_at || ''}">${formatElapsed(order.created_at)}</div>
        </div>
      </div>
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
        <div><span class="font-semibold">Tipo:</span> ${order.order_type || 'pickup'}</div>
        <div><span class="font-semibold">Canal:</span> ${order.source || 'app'}</div>
        <div><span class="font-semibold">Mesa:</span> ${order.mesa || '—'}</div>
      </div>
      <div class="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
        <div class="text-xs font-semibold text-gray-700">Cliente</div>
        <div class="text-sm text-gray-900">${order.customer_name || 'Sin nombre'}</div>
        <div class="text-xs text-gray-600">${order.customer_phone || order.customer_email || 'Sin contacto'}</div>
      </div>
      <div class="mt-3">
        ${items.length ? items.map(renderOrderItem).join('') : '<div class="text-sm text-gray-500">Sin items cargados.</div>'}
      </div>
      <div class="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
        <div class="text-sm font-semibold text-gray-700">Total</div>
        <div class="text-xl font-bold text-gray-900">${formatMoney(totalFinal)}</div>
      </div>
    `;
    ordersContainer.appendChild(card);
  });
}

function updateElapsedTimers() {
  document.querySelectorAll('[data-elapsed]').forEach((el) => {
    const createdAt = el.getAttribute('data-elapsed');
    el.textContent = formatElapsed(createdAt);
    el.classList.remove('text-gray-700', 'text-emerald-600', 'text-amber-600', 'text-red-600');
    el.classList.add(waitClass(createdAt));
  });
}

function beep(duration = 220, frequency = 900) {
  if (!audioCtx) return;
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.type = 'square';
  oscillator.frequency.value = frequency;
  gainNode.gain.value = 0.06;
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
  setTimeout(() => oscillator.stop(), duration);
}

function playAlarmPulse() {
  beep(180, 960);
  setTimeout(() => beep(180, 760), 230);
}

function startAlarm(message) {
  if (message && alarmBanner) {
    alarmBanner.textContent = message;
  }
  alarmBanner?.classList.remove('hidden');
  btnMuteAlarm?.classList.remove('hidden');
  if (!soundEnabled || soundMuted) return;
  if (alarmInterval) return;
  playAlarmPulse();
  alarmInterval = setInterval(playAlarmPulse, 1800);
}

function stopAlarm(resetCount = false) {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if (resetCount) {
    newOrdersCount = 0;
    if (statNuevas) statNuevas.textContent = '0';
    alarmBanner?.classList.add('hidden');
    btnMuteAlarm?.classList.add('hidden');
  }
}

async function unlockSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    soundEnabled = true;
    soundMuted = false;
    btnEnableSound.innerHTML = '<i class="fa-solid fa-volume-high"></i> Sonido activo';
    playAlarmPulse();
  } catch (err) {
    console.warn('No se pudo activar audio', err);
    alert('No se pudo activar el sonido en este navegador.');
  }
}

async function validateAccessOrRedirect() {
  if (!Number.isFinite(idComercio) || idComercio <= 0) {
    window.location.href = './index.html';
    return null;
  }

  const { data: userResp, error: userErr } = await supabase.auth.getUser();
  const user = userResp?.user;
  if (userErr || !user) {
    window.location.href = './login.html';
    return null;
  }

  const relResp = await supabase
    .from('UsuarioComercios')
    .select('idComercio')
    .eq('idUsuario', user.id)
    .eq('idComercio', idComercio)
    .limit(1);

  const hasRelation = Array.isArray(relResp.data) && relResp.data.length > 0;
  if (!hasRelation) {
    const ownerResp = await supabase
      .from('Comercios')
      .select('id')
      .eq('id', idComercio)
      .eq('owner_user_id', user.id)
      .maybeSingle();
    if (ownerResp.error || !ownerResp.data) {
      alert('No tienes acceso a este comercio.');
      window.location.href = './index.html';
      return null;
    }
  }

  const comercioResp = await supabase
    .from('Comercios')
    .select('id, nombre')
    .eq('id', idComercio)
    .maybeSingle();

  if (comercioResp.data?.nombre && tituloComercio) {
    tituloComercio.textContent = `Órdenes activas · ${comercioResp.data.nombre}`;
  }

  return { user };
}

async function fetchOrdersForComercio() {
  const fullSelect = 'id,idcomercio,clover_order_id,total,status,created_at,order_type,mesa,source,customer_name,customer_email,customer_phone';
  const baseSelect = 'id,idcomercio,clover_order_id,total,status,created_at,order_type,mesa,source';

  let resp = await supabase
    .from('ordenes')
    .select(fullSelect)
    .eq('idcomercio', idComercio)
    .order('created_at', { ascending: true });
  if (!resp.error) return resp.data || [];

  const msg = String(resp.error?.message || '').toLowerCase();
  const missingIdComercio = msg.includes('column') && msg.includes('idcomercio') && msg.includes('does not exist');
  const missingCustomerCols =
    msg.includes('column') &&
    (msg.includes('customer_name') || msg.includes('customer_email') || msg.includes('customer_phone')) &&
    msg.includes('does not exist');

  if (missingCustomerCols) {
    resp = await supabase
      .from('ordenes')
      .select(baseSelect)
      .eq('idcomercio', idComercio)
      .order('created_at', { ascending: true });
    if (!resp.error) return resp.data || [];
  }

  if (!missingIdComercio) {
    throw resp.error;
  }

  resp = await supabase
    .from('ordenes')
    .select(fullSelect.replaceAll('idcomercio', 'idComercio'))
    .eq('idComercio', idComercio)
    .order('created_at', { ascending: true });

  if (resp.error) {
    const msg2 = String(resp.error?.message || '').toLowerCase();
    const missingCustomerCols2 =
      msg2.includes('column') &&
      (msg2.includes('customer_name') || msg2.includes('customer_email') || msg2.includes('customer_phone')) &&
      msg2.includes('does not exist');
    if (!missingCustomerCols2) throw resp.error;

    resp = await supabase
      .from('ordenes')
      .select(baseSelect.replaceAll('idcomercio', 'idComercio'))
      .eq('idComercio', idComercio)
      .order('created_at', { ascending: true });
    if (resp.error) throw resp.error;
  }

  return (resp.data || []).map((row) => ({ ...row, idcomercio: row.idComercio }));
}

async function fetchOrderItemsMap(orderIds) {
  if (!orderIds.length) return new Map();

  const itemsResp = await supabase
    .from('orden_items')
    .select('idorden,idproducto,qty,price_snapshot,modifiers')
    .in('idorden', orderIds);
  if (itemsResp.error) throw itemsResp.error;
  const orderItems = itemsResp.data || [];

  const productIds = [...new Set(orderItems.map((item) => item.idproducto).filter(Boolean))];
  const prodResp = productIds.length
    ? await supabase.from('productos').select('id,nombre').in('id', productIds)
    : { data: [], error: null };
  if (prodResp.error) throw prodResp.error;

  const productMap = new Map((prodResp.data || []).map((p) => [p.id, p]));
  const itemsByOrder = new Map();

  orderItems.forEach((item) => {
    const product = productMap.get(item.idproducto);
    const unit = Number(item.price_snapshot) || 0;
    const qty = Number(item.qty) || 1;
    const row = {
      nombre: product?.nombre || `Producto ${item.idproducto}`,
      qty,
      lineTotal: unit * qty,
      modifiers: item.modifiers || null,
    };
    const list = itemsByOrder.get(item.idorden) || [];
    list.push(row);
    itemsByOrder.set(item.idorden, list);
  });

  return itemsByOrder;
}

function updateStats(orders) {
  const preparing = orders.filter((o) => String(o.status || '').toLowerCase() === 'preparing').length;
  const ready = orders.filter((o) => String(o.status || '').toLowerCase() === 'ready').length;
  if (statActivas) statActivas.textContent = String(orders.length);
  if (statPreparando) statPreparando.textContent = String(preparing);
  if (statListas) statListas.textContent = String(ready);
  if (statNuevas) statNuevas.textContent = String(newOrdersCount);
}

async function loadOrders(notifyNew = false) {
  setLoading(true);
  try {
    const allOrders = await fetchOrdersForComercio();
    const orders = allOrders.filter((o) => isActive(o.status));

    const incomingIds = new Set(orders.map((o) => o.id));
    if (notifyNew && hasLoadedOnce) {
      const newOnes = orders.filter((o) => !knownOrderIds.has(o.id));
      if (newOnes.length) {
        newOrdersCount += newOnes.length;
        const msg = `${newOnes.length} orden(es) nueva(s) recibida(s).`;
        startAlarm(msg);
      }
    }
    knownOrderIds = incomingIds;
    hasLoadedOnce = true;

    const itemsByOrder = await fetchOrderItemsMap(orders.map((o) => o.id));
    renderOrders(orders, itemsByOrder);
    updateStats(orders);
  } catch (err) {
    console.error('Error cargando órdenes pickup', err);
    alert(`No se pudo cargar órdenes: ${err.message || err}`);
  } finally {
    setLoading(false);
  }
}

function scheduleReload(notifyNew = true) {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => loadOrders(notifyNew), 500);
}

function subscribeRealtime() {
  realtimeChannel = supabase
    .channel(`ordenes-pickup-${idComercio}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes' }, (payload) => {
      const row = payload?.new || payload?.old || {};
      const rowComercio = Number(row.idcomercio ?? row.idComercio ?? 0);
      if (rowComercio !== idComercio) return;
      scheduleReload(true);
    })
    .subscribe();
}

function startPolling() {
  pollTimer = setInterval(() => loadOrders(true), 15000);
}

function startTimers() {
  timerInterval = setInterval(updateElapsedTimers, 1000);
}

function bindEvents() {
  btnEnableSound?.addEventListener('click', unlockSound);
  btnMuteAlarm?.addEventListener('click', () => {
    soundMuted = true;
    stopAlarm(true);
    btnEnableSound.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> Reactivar sonido';
  });
  btnRefreshOrders?.addEventListener('click', () => loadOrders(false));
}

async function init() {
  const access = await validateAccessOrRedirect();
  if (!access) return;

  bindEvents();
  startTimers();
  await loadOrders(false);
  subscribeRealtime();
  startPolling();
}

window.addEventListener('beforeunload', () => {
  stopAlarm(false);
  if (timerInterval) clearInterval(timerInterval);
  if (pollTimer) clearInterval(pollTimer);
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
});

init();
