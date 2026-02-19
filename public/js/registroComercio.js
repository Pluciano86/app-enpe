import { supabase } from '../shared/supabaseClient.js';
import { PLANES_PRELIMINARES, formatoPrecio, obtenerPlanPorNivel } from '../shared/planes.js';

const planesGrid = document.getElementById('planesGrid');
const planLabel = document.getElementById('planActualLabel');
const planInput = document.getElementById('planSeleccionado');
const loginModal = document.getElementById('loginModal');
const loginModalClose = document.getElementById('loginModalClose');
const formModal = document.getElementById('formModal');
const formModalClose = document.getElementById('formModalClose');
const planSeleccionadoLabel = document.getElementById('planSeleccionadoLabel');
const form = document.getElementById('comercioForm');
const submitRegistroBtn = document.getElementById('submitRegistroBtn');
const contactoNombre = document.getElementById('contactoNombre');
const contactoEmail = document.getElementById('contactoEmail');
const contactoTelefono = document.getElementById('contactoTelefono');
const logoInput = document.getElementById('logoInput');
const logoPreview = document.getElementById('logoPreview');
const logoPlaceholder = document.getElementById('logoPlaceholder');
const logoZoom = document.getElementById('logoZoom');
const selectCategoria = document.getElementById('selectCategoria');
const inputNombreComercio = document.getElementById('inputNombreComercio');
const inputMunicipio = document.getElementById('inputMunicipio');
const inputDireccion = document.getElementById('inputDireccion');
const inputLatitud = document.getElementById('inputLatitud');
const inputLongitud = document.getElementById('inputLongitud');
const matchResultsBox = document.getElementById('matchResultsBox');
const matchResultsList = document.getElementById('matchResultsList');
const formFeedback = document.getElementById('formFeedback');

const authState = {
  user: null,
  profile: null,
  loggedIn: false,
};

const CLAIMABLE_ESTADOS = new Set(['no_reclamado', 'reclamacion_pendiente']);

let selectedNivel = null;
let pendingMatches = [];
let isSubmitting = false;
let liveSearchTimer = null;
let liveSearchToken = 0;
let lastMatchCacheKey = '';
let lastMatchCacheResults = [];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeText(value).split(' ').filter(Boolean);
}

function overlapRatio(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const bSet = new Set(bTokens);
  let matches = 0;
  aTokens.forEach((token) => {
    if (bSet.has(token)) matches += 1;
  });
  return matches / Math.max(aTokens.length, bTokens.length);
}

function toFiniteNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function computeDistanceKm(lat1, lon1, lat2, lon2) {
  const la1 = toFiniteNumber(lat1);
  const lo1 = toFiniteNumber(lon1);
  const la2 = toFiniteNumber(lat2);
  const lo2 = toFiniteNumber(lon2);
  if ([la1, lo1, la2, lo2].some((value) => value === null)) return null;

  const rad = (degrees) => (degrees * Math.PI) / 180;
  const R = 6371;
  const dLat = rad(la2 - la1);
  const dLon = rad(lo2 - lo1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseMissingColumn(error) {
  const message = String(error?.message || '');
  const details = String(error?.details || '');
  const source = `${message} ${details}`;
  const patterns = [
    /column\s+"([a-zA-Z0-9_]+)"\s+does not exist/i,
    /column\s+'([a-zA-Z0-9_]+)'\s+does not exist/i,
    /Could not find the '([a-zA-Z0-9_]+)' column/i,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

async function insertComercioWithFallback(payload) {
  let body = { ...payload };

  for (let i = 0; i < 12; i += 1) {
    const { data, error } = await supabase
      .from('Comercios')
      .insert(body)
      .select('id, nombre')
      .single();

    if (!error) return { data, usedPayload: body };

    const missingColumn = parseMissingColumn(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(body, missingColumn)) {
      delete body[missingColumn];
      continue;
    }

    return { error };
  }

  return { error: new Error('No se pudo insertar el comercio con el esquema actual.') };
}

async function updateComercioWithFallback(idComercio, payload) {
  let body = { ...payload };

  for (let i = 0; i < 12; i += 1) {
    const { error } = await supabase
      .from('Comercios')
      .update(body)
      .eq('id', idComercio);

    if (!error) return { usedPayload: body };

    const missingColumn = parseMissingColumn(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(body, missingColumn)) {
      delete body[missingColumn];
      continue;
    }

    return { error };
  }

  return { error: new Error('No se pudo actualizar el comercio con el esquema actual.') };
}

function setSubmitState(loading, label) {
  isSubmitting = loading;
  if (!submitRegistroBtn) return;
  submitRegistroBtn.disabled = loading;
  submitRegistroBtn.textContent = label || (loading ? 'Procesando...' : 'Enviar solicitud');
}

function showFeedback(type, message) {
  if (!formFeedback) return;
  const classesByType = {
    success: 'bg-emerald-50 border border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border border-amber-200 text-amber-900',
    error: 'bg-red-50 border border-red-200 text-red-700',
    info: 'bg-sky-50 border border-sky-200 text-sky-800',
  };
  formFeedback.className = `text-xs rounded-lg px-3 py-2 ${classesByType[type] || classesByType.info}`;
  formFeedback.textContent = message;
  formFeedback.classList.remove('hidden');
}

function hideFeedback() {
  if (!formFeedback) return;
  formFeedback.classList.add('hidden');
  formFeedback.textContent = '';
}

function hideMatchResults() {
  if (liveSearchTimer) {
    clearTimeout(liveSearchTimer);
    liveSearchTimer = null;
  }
  liveSearchToken += 1;
  pendingMatches = [];
  if (matchResultsList) matchResultsList.innerHTML = '';
  if (matchResultsBox) matchResultsBox.classList.add('hidden');
}

function buildFeaturesList(features) {
  const list = Array.isArray(features) ? features : [];
  if (!list.length) return '<p class="text-xs text-gray-400">Sin beneficios definidos.</p>';
  return `
    <ul class="mt-3 space-y-1 text-sm text-gray-700 text-left inline-block">
      ${list.map((f) => `<li class="flex items-start gap-2"><span class="text-emerald-500 mt-[3px]">●</span>${f}</li>`).join('')}
    </ul>
  `;
}

const PLAN_COPY = {
  basic: {
    badge: 'Arranca hoy',
    tagline: 'Presencia esencial para comenzar',
    desc: 'Ideal para que te encuentren y te contacten rápidamente.',
    tone: 'gray',
  },
  regular: {
    badge: 'Más elegido',
    tagline: 'Tu perfil completo con galería y redes',
    desc: 'Aumenta visibilidad y confianza desde el primer día.',
    tone: 'sky',
  },
  plus: {
    badge: 'Impulsa ventas',
    tagline: 'Menú completo y especiales destacados',
    desc: 'Perfecto para restaurantes que quieren destacar su oferta.',
    tone: 'amber',
  },
  premium: {
    badge: 'Máxima exposición',
    tagline: 'Órdenes online y presencia total',
    desc: 'Para negocios listos para vender y recibir pedidos.',
    tone: 'emerald',
  },
};

const TONE_CLASSES = {
  gray: {
    card: 'border-gray-300 bg-white',
    badge: 'bg-gray-200 text-gray-700',
    price: 'text-gray-900',
  },
  sky: {
    card: 'border-sky-300 bg-sky-50',
    badge: 'bg-sky-200 text-sky-800',
    price: 'text-sky-700',
  },
  amber: {
    card: 'border-amber-300 bg-amber-50',
    badge: 'bg-amber-200 text-amber-800',
    price: 'text-amber-700',
  },
  emerald: {
    card: 'border-emerald-300 bg-emerald-50',
    badge: 'bg-emerald-200 text-emerald-800',
    price: 'text-emerald-700',
  },
};

function createPlanCard(plan, selectedPlanNivel) {
  const nivel = Number(plan.nivel ?? plan.plan_nivel ?? 0);
  const base = obtenerPlanPorNivel(nivel);
  const nombre = plan.nombre || base.nombre;
  const isGratis = Number(plan.precio ?? base.precio) <= 0;
  const precio = formatoPrecio(plan.precio ?? base.precio);
  const features = Array.isArray(plan.features) ? plan.features : base.features;
  const isSelected = Number(selectedPlanNivel) === Number(nivel);
  const slug = plan.slug || base.slug || '';
  const copy = PLAN_COPY[slug] || PLAN_COPY.basic;
  const tone = TONE_CLASSES[copy.tone] || TONE_CLASSES.gray;

  const card = document.createElement('button');
  card.type = 'button';
  card.className = `text-center border rounded-3xl p-5 transition shadow-md ${tone.card} ${
    isSelected ? 'ring-2 ring-gray-900/15' : 'hover:border-gray-400'
  }`;
  card.innerHTML = `
    <div class="flex flex-col items-center gap-2">
      <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${tone.badge}">
        ${copy.badge}
      </span>
      <h3 class="text-xl font-semibold text-gray-900">${nombre}</h3>
      <p class="text-base text-gray-700">${copy.tagline}</p>
      <p class="text-3xl font-semibold ${tone.price}">${precio}</p>
      ${isGratis ? '' : '<p class="text-[11px] uppercase tracking-[0.2em] text-gray-400">Plan mensual</p>'}
    </div>
    ${buildFeaturesList(features)}
    <p class="text-sm text-gray-700 mt-3 text-center">${copy.desc}</p>
  `;

  card.addEventListener('click', () => {
    selectPlan(plan);
  });

  return card;
}

function renderPlanes(selectedPlanNivel = null) {
  if (!planesGrid) return;
  planesGrid.innerHTML = '';
  PLANES_PRELIMINARES.forEach((plan) => {
    planesGrid.appendChild(createPlanCard(plan, selectedPlanNivel));
  });
}

function openFormModal() {
  if (!formModal) return;
  formModal.classList.remove('hidden');
  formModal.classList.add('flex');
}

function closeFormModal() {
  if (!formModal) return;
  formModal.classList.add('hidden');
  formModal.classList.remove('flex');
}

function selectPlan(plan) {
  if (!plan) return;

  if (!authState.loggedIn) {
    loginModal?.classList.remove('hidden');
    loginModal?.classList.add('flex');
    return;
  }

  const nivel = Number(plan.nivel ?? plan.plan_nivel ?? 0);
  const base = obtenerPlanPorNivel(nivel);
  const nombre = plan.nombre || base.nombre;
  const precio = formatoPrecio(plan.precio ?? base.precio);

  selectedNivel = nivel;
  if (planInput) planInput.value = String(nivel);
  if (planLabel) {
    planLabel.textContent = nombre;
    planLabel.classList.remove('hidden');
  }
  if (planSeleccionadoLabel) {
    planSeleccionadoLabel.textContent = `${nombre} · ${precio}`;
  }

  hideFeedback();
  hideMatchResults();
  openFormModal();
  renderPlanes(nivel);
}

function updateLogoPreview() {
  if (!logoPreview) return;
  const scale = Number(logoZoom?.value || 1);
  logoPreview.style.transform = `scale(${scale})`;
}

async function cargarCategorias() {
  if (!selectCategoria) return;

  try {
    const { data, error } = await supabase
      .from('Categorias')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (error) throw error;

    selectCategoria.innerHTML = '<option value="">Selecciona una categoría</option>';
    (data || []).forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.nombre || '';
      selectCategoria.appendChild(opt);
    });
  } catch (error) {
    console.warn('No se pudieron cargar categorías:', error?.message || error);
  }
}

async function cargarUsuario() {
  try {
    const { data: { session } = {} } = await supabase.auth.getSession();
    if (!session?.user) {
      authState.loggedIn = false;
      authState.user = null;
      authState.profile = null;
      return;
    }

    authState.loggedIn = true;
    authState.user = session.user;

    const { data: perfil, error } = await supabase
      .from('usuarios')
      .select('nombre, apellido, email, telefono')
      .eq('id', session.user.id)
      .maybeSingle();

    authState.profile = !error && perfil ? perfil : null;
  } catch (error) {
    console.warn('No se pudo cargar la sesión:', error?.message || error);
    authState.loggedIn = false;
    authState.user = null;
    authState.profile = null;
  }
}

function renderContacto() {
  if (!contactoNombre || !contactoEmail || !contactoTelefono) return;

  if (!authState.loggedIn) {
    contactoNombre.textContent = '-';
    contactoEmail.textContent = '-';
    contactoTelefono.textContent = '-';
    return;
  }

  const perfil = authState.profile || {};
  const nombreCompleto = [perfil.nombre, perfil.apellido].filter(Boolean).join(' ').trim();

  contactoNombre.textContent = nombreCompleto || authState.user?.user_metadata?.full_name || '—';
  contactoEmail.textContent = perfil.email || authState.user?.email || '—';
  contactoTelefono.textContent = perfil.telefono || '—';
}

function computeMatchScore(comercio, formValues) {
  const nombreInput = normalizeText(formValues.nombre);
  const municipioInput = normalizeText(formValues.municipio);
  const direccionInput = normalizeText(formValues.direccion);

  const nombreComercioNorm = normalizeText(comercio.nombre_normalizado || comercio.nombre);
  const municipioComercioNorm = normalizeText(comercio.municipio);
  const direccionComercioNorm = normalizeText(comercio.direccion);

  let score = 0;
  let distanceKm = null;

  if (!nombreComercioNorm || !nombreInput) return { score: 0, distanceKm: null };
  if (nombreComercioNorm === nombreInput) score += 70;
  if (nombreComercioNorm.includes(nombreInput) || nombreInput.includes(nombreComercioNorm)) score += 35;

  const nombreOverlap = overlapRatio(tokenize(nombreInput), tokenize(nombreComercioNorm));
  score += Math.round(nombreOverlap * 30);

  if (municipioInput && municipioComercioNorm) {
    if (municipioComercioNorm === municipioInput) score += 18;
    else if (
      municipioComercioNorm.includes(municipioInput) ||
      municipioInput.includes(municipioComercioNorm)
    ) {
      score += 10;
    }
  }

  if (direccionInput && direccionComercioNorm) {
    const direccionOverlap = overlapRatio(tokenize(direccionInput), tokenize(direccionComercioNorm));
    score += Math.round(direccionOverlap * 14);
  }

  const hasInputCoords =
    Number.isFinite(formValues.latitud) &&
    Number.isFinite(formValues.longitud);
  const comercioLat = toFiniteNumber(comercio.latitud);
  const comercioLon = toFiniteNumber(comercio.longitud);

  if (hasInputCoords && comercioLat !== null && comercioLon !== null) {
    distanceKm = computeDistanceKm(formValues.latitud, formValues.longitud, comercioLat, comercioLon);
    if (distanceKm !== null) {
      if (distanceKm <= 0.15) score += 22;
      else if (distanceKm <= 0.5) score += 18;
      else if (distanceKm <= 1) score += 14;
      else if (distanceKm <= 3) score += 8;
      else if (distanceKm <= 8) score += 3;
    }
  }

  return { score, distanceKm };
}

function canCurrentUserClaim(match) {
  const sameOwner = match.owner_user_id && authState.user?.id && match.owner_user_id === authState.user.id;
  const hasDifferentOwner = match.owner_user_id && authState.user?.id && match.owner_user_id !== authState.user.id;

  if (sameOwner) return true;
  if (hasDifferentOwner) return false;

  const estado = String(match.estado_propiedad || 'no_reclamado').toLowerCase();
  return CLAIMABLE_ESTADOS.has(estado);
}

function renderMatchResults(matches, formValues, options = {}) {
  const { showFeedbackWarning = true } = options;
  pendingMatches = matches;

  if (!matchResultsBox || !matchResultsList) return;
  matchResultsList.innerHTML = '';

  if (!Array.isArray(matches) || !matches.length) {
    matchResultsBox.classList.add('hidden');
    return;
  }

  matches.forEach((match) => {
    const estado = String(match.estado_propiedad || 'no_reclamado').toLowerCase();
    const claimable = canCurrentUserClaim(match);
    const row = document.createElement('article');
    row.className = 'rounded-xl border border-amber-200 bg-white p-3';

    row.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-semibold text-sm text-gray-900 truncate">${match.nombre || 'Comercio sin nombre'}</p>
          <p class="text-xs text-gray-600 mt-1">${match.municipio || 'Municipio no definido'}${match.direccion ? ` · ${match.direccion}` : ''}</p>
          ${
            match.telefono
              ? `<p class="text-xs text-gray-500 mt-1"><i class="fa-solid fa-phone mr-1"></i>${match.telefono}</p>`
              : ''
          }
          ${
            Number.isFinite(match._distanceKm)
              ? `<p class="text-[11px] text-gray-500 mt-1"><i class="fa-solid fa-location-dot mr-1"></i>~${match._distanceKm.toFixed(2)} km de la ubicación indicada</p>`
              : ''
          }
          <p class="text-[11px] uppercase tracking-[0.12em] mt-2 ${
            claimable ? 'text-amber-700' : 'text-red-600'
          }">Estado: ${estado.replaceAll('_', ' ')}</p>
        </div>
        <button
          type="button"
          data-claim-id="${match.id}"
          class="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
            claimable ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }"
          ${claimable ? '' : 'disabled'}
        >
          ${claimable ? 'Reclamar este comercio' : 'No disponible'}
        </button>
      </div>
    `;

    matchResultsList.appendChild(row);
  });

  matchResultsBox.classList.remove('hidden');

  if (showFeedbackWarning && formValues?.nombre) {
    showFeedback(
      'warning',
      `Encontramos ${matches.length} posible(s) coincidencia(s) para "${formValues.nombre}". Debes reclamar una antes de continuar.`
    );
  }
}

async function buscarPosiblesMatches(formValues) {
  const nombre = String(formValues.nombre || '').trim();
  const municipio = String(formValues.municipio || '').trim();

  if (!nombre || !municipio) return [];

  const municipioQuery = municipio.replace(/[%_]/g, '').slice(0, 60);

  const { data, error } = await supabase
    .from('Comercios')
    .select('id, nombre, municipio, direccion, telefono, latitud, longitud, nombre_normalizado, owner_user_id, estado_propiedad, estado_verificacion')
    .ilike('municipio', `%${municipioQuery}%`)
    .limit(200);

  if (error) throw error;

  const scored = (data || [])
    .map((comercio) => {
      const result = computeMatchScore(comercio, formValues);
      return {
        ...comercio,
        _score: result.score,
        _distanceKm: result.distanceKm,
      };
    })
    .filter((c) => c._score >= 42)
    .sort((a, b) => b._score - a._score)
    .slice(0, 5);

  return scored;
}

function buildMatchCacheKey(formValues) {
  const lat = Number.isFinite(formValues.latitud) ? formValues.latitud.toFixed(5) : '';
  const lon = Number.isFinite(formValues.longitud) ? formValues.longitud.toFixed(5) : '';
  return [
    normalizeText(formValues.nombre),
    normalizeText(formValues.municipio),
    normalizeText(formValues.direccion),
    lat,
    lon,
  ].join('|');
}

function shouldRunLiveMatchSearch(formValues) {
  return (
    normalizeText(formValues.nombre).length >= 3 &&
    normalizeText(formValues.municipio).length >= 2
  );
}

async function getMatchesWithCache(formValues, options = {}) {
  const { force = false } = options;
  const key = buildMatchCacheKey(formValues);
  if (!force && key && key === lastMatchCacheKey) {
    return lastMatchCacheResults;
  }

  const matches = await buscarPosiblesMatches(formValues);
  lastMatchCacheKey = key;
  lastMatchCacheResults = matches;
  return matches;
}

async function runLiveMatchSearch() {
  const formValues = getFormValues();

  if (!shouldRunLiveMatchSearch(formValues)) {
    hideMatchResults();
    return;
  }

  const currentToken = ++liveSearchToken;

  try {
    const matches = await getMatchesWithCache(formValues);
    if (currentToken !== liveSearchToken) return;

    if (matches.length) {
      renderMatchResults(matches, formValues, { showFeedbackWarning: false });
      return;
    }

    hideMatchResults();
  } catch (error) {
    if (currentToken !== liveSearchToken) return;
    console.warn('No se pudo ejecutar búsqueda en vivo:', error?.message || error);
  }
}

function scheduleLiveMatchSearch() {
  if (liveSearchTimer) {
    clearTimeout(liveSearchTimer);
  }
  liveSearchTimer = window.setTimeout(() => {
    runLiveMatchSearch();
  }, 420);
}

function getFormValues() {
  const latitud = toFiniteNumber(inputLatitud?.value);
  const longitud = toFiniteNumber(inputLongitud?.value);
  return {
    nombre: inputNombreComercio?.value?.trim() || '',
    municipio: inputMunicipio?.value?.trim() || '',
    direccion: inputDireccion?.value?.trim() || '',
    latitud,
    longitud,
    categoriaId: selectCategoria?.value ? Number(selectCategoria.value) : null,
    categoriaNombre: selectCategoria?.selectedOptions?.[0]?.textContent?.trim() || null,
  };
}

async function insertarCategoriaPrincipal(idComercio, categoriaId) {
  if (!idComercio || !categoriaId) return;

  try {
    const { error } = await supabase
      .from('ComercioCategorias')
      .insert([{ idComercio, idCategoria: categoriaId }]);
    if (error) {
      console.warn('No se pudo registrar categoría principal:', error.message);
    }
  } catch (error) {
    console.warn('Error insertando categoría principal:', error?.message || error);
  }
}

async function crearComercioPendiente(formValues) {
  const nivelSolicitado = Number(selectedNivel ?? 0);
  const plan = obtenerPlanPorNivel(nivelSolicitado);

  const payload = {
    nombre: formValues.nombre,
    municipio: formValues.municipio,
    direccion: formValues.direccion,
    latitud: Number.isFinite(formValues.latitud) ? formValues.latitud : null,
    longitud: Number.isFinite(formValues.longitud) ? formValues.longitud : null,
    telefono: authState.profile?.telefono || null,
    categoria: formValues.categoriaNombre || null,
    owner_user_id: authState.user?.id || null,
    estado_listing: 'borrador',
    estado_propiedad: 'no_reclamado',
    estado_verificacion: 'none',
    propietario_verificado: false,
    metodo_verificacion: null,
    telefono_verificado: false,
    bloqueo_datos_criticos: true,
    plan_nivel: nivelSolicitado,
    plan_nombre: plan.nombre,
    activo: false,
    permite_perfil: false,
    aparece_en_cercanos: false,
    permite_menu: false,
    permite_especiales: false,
    permite_ordenes: false,
  };

  const { data, error } = await insertComercioWithFallback(payload);
  if (error) throw error;

  if (data?.id && formValues.categoriaId) {
    await insertarCategoriaPrincipal(data.id, formValues.categoriaId);
  }

  return data;
}

async function reclamarComercioExistente(idComercio) {
  if (!authState.loggedIn) {
    loginModal?.classList.remove('hidden');
    loginModal?.classList.add('flex');
    return;
  }

  const match = pendingMatches.find((item) => String(item.id) === String(idComercio));
  if (!match) return;

  if (!canCurrentUserClaim(match)) {
    showFeedback(
      'error',
      'Este comercio ya tiene un administrador validado. Te recomendamos contactar soporte para iniciar disputa.'
    );
    return;
  }

  setSubmitState(true, 'Procesando reclamo...');
  hideFeedback();

  try {
    const nivelSolicitado = Number(selectedNivel ?? 0);
    const plan = obtenerPlanPorNivel(nivelSolicitado);

    const payload = {
      owner_user_id: authState.user?.id || null,
      estado_propiedad: 'reclamacion_pendiente',
      estado_verificacion: 'none',
      propietario_verificado: false,
      verificado_en: null,
      metodo_verificacion: null,
      telefono_verificado: false,
      bloqueo_datos_criticos: true,
      plan_nivel: nivelSolicitado,
      plan_nombre: plan.nombre,
      activo: false,
      permite_perfil: false,
      aparece_en_cercanos: false,
      permite_menu: false,
      permite_especiales: false,
      permite_ordenes: false,
    };

    const { error } = await updateComercioWithFallback(idComercio, payload);
    if (error) throw error;

    showFeedback(
      'success',
      'Reclamo enviado. Tu comercio quedó en estado "reclamación pendiente" hasta completar verificación.'
    );
    hideMatchResults();
  } catch (error) {
    console.error('Error reclamando comercio:', error);
    showFeedback('error', `No se pudo reclamar el comercio: ${error?.message || 'error desconocido'}`);
  } finally {
    setSubmitState(false);
  }
}

async function onSubmitRegistro(event) {
  event.preventDefault();
  if (isSubmitting) return;

  if (!authState.loggedIn) {
    loginModal?.classList.remove('hidden');
    loginModal?.classList.add('flex');
    return;
  }

  if (selectedNivel === null) {
    showFeedback('warning', 'Selecciona un paquete antes de enviar.');
    return;
  }

  const formValues = getFormValues();

  if (!formValues.nombre || !formValues.municipio || !formValues.direccion || !formValues.categoriaId) {
    showFeedback('warning', 'Completa nombre, municipio, dirección y categoría para continuar.');
    return;
  }

  if (!logoInput?.files?.[0]) {
    showFeedback('warning', 'Debes subir un logo para continuar.');
    return;
  }

  setSubmitState(true, 'Buscando coincidencias...');
  hideFeedback();

  try {
    const matches = await getMatchesWithCache(formValues, { force: true });

    if (matches.length) {
      renderMatchResults(matches, formValues);
      return;
    }

    hideMatchResults();
    setSubmitState(true, 'Creando solicitud...');
    const created = await crearComercioPendiente(formValues);

    showFeedback(
      'success',
      `Solicitud enviada para "${created?.nombre || formValues.nombre}". Próximo paso: verificación de propiedad.`
    );

    form?.reset();
    lastMatchCacheKey = '';
    lastMatchCacheResults = [];
    liveSearchToken += 1;
    if (planInput) planInput.value = String(selectedNivel);
    if (logoPreview) {
      logoPreview.src = '';
      logoPreview.classList.add('hidden');
      logoPreview.style.transform = 'scale(1)';
    }
    logoPlaceholder?.classList.remove('hidden');
    if (logoZoom) logoZoom.value = '1';
  } catch (error) {
    console.error('Error en registro de comercio:', error);
    showFeedback('error', `No se pudo completar la solicitud: ${error?.message || 'error desconocido'}`);
  } finally {
    setSubmitState(false);
  }
}

function wireEvents() {
  logoZoom?.addEventListener('input', updateLogoPreview);

  logoInput?.addEventListener('change', () => {
    const file = logoInput.files?.[0];
    if (!file) {
      logoPreview?.classList.add('hidden');
      logoPlaceholder?.classList.remove('hidden');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (logoPreview) {
        logoPreview.src = String(reader.result || '');
        logoPreview.classList.remove('hidden');
        logoPreview.style.transform = `scale(${logoZoom?.value || 1})`;
      }
      logoPlaceholder?.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  });

  const liveSearchInputs = [
    inputNombreComercio,
    inputMunicipio,
    inputDireccion,
    inputLatitud,
    inputLongitud,
  ];

  liveSearchInputs.forEach((el) => {
    el?.addEventListener('input', () => {
      hideFeedback();
      scheduleLiveMatchSearch();
    });
  });

  selectCategoria?.addEventListener('change', hideFeedback);

  form?.addEventListener('submit', onSubmitRegistro);

  matchResultsList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-claim-id]');
    if (!button) return;
    const { claimId } = button.dataset;
    if (!claimId) return;
    reclamarComercioExistente(claimId);
  });

  loginModal?.addEventListener('click', (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add('hidden');
      loginModal.classList.remove('flex');
    }
  });

  loginModalClose?.addEventListener('click', () => {
    loginModal?.classList.add('hidden');
    loginModal?.classList.remove('flex');
  });

  formModal?.addEventListener('click', (event) => {
    if (event.target === formModal) closeFormModal();
  });

  formModalClose?.addEventListener('click', closeFormModal);
}

async function init() {
  wireEvents();
  await cargarUsuario();
  renderContacto();
  await cargarCategorias();
  renderPlanes(selectedNivel);
}

init();
