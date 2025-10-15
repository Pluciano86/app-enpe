// public/js/cercaDeMi.js
import { supabase } from '../shared/supabaseClient.js';
import { calcularTiempoEnVehiculo } from '../shared/utils.js';
import { getDrivingDistance, formatTiempo } from '../shared/osrmClient.js';
import { cardComercio } from './CardComercio.js';

// 🧩 Muestra el marcador del usuario con su foto de perfil
async function crearIconoUsuario(idUsuario) {
  const crearIcono = (src) =>
    L.divIcon({
      className: 'user-marker',
      html: `
        <div style="
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid white;
          box-shadow: 0 0 10px rgba(0,0,0,0.3);
        ">
          <img src="${src}"
               style="width:100%;height:100%;object-fit:cover;" />
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 48],
      popupAnchor: [0, -40],
    });

  const FALLBACK_IMG = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  if (!idUsuario) return crearIcono(FALLBACK_IMG);

  const { data, error } = await supabase
    .from('usuarios')
    .select('imagen')
    .eq('id', idUsuario)
    .single();

  const imagenPerfil = typeof data?.imagen === 'string' ? data.imagen.trim() : '';

  if (error || !imagenPerfil) {
    return crearIcono(FALLBACK_IMG);
  }

  return crearIcono(imagenPerfil);
}
const PLACEHOLDER_LOGO =
  'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/imgLogoNoDisponible.jpg';

const PLACEHOLDER_PORTADA =
  'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/imgComercioNoDisponible.jpg';

const CATEGORY_COLORS = {
  1: '#2563eb',
  2: '#16a34a',
  3: '#f97316',
  4: '#ec4899',
  5: '#9333ea',
  6: '#facc15',
  7: '#0ea5e9',
};

let map, markersLayer, userMarker;
let userLat = null;
let userLon = null;
let userAccuracyCircle = null;



const $radio = document.getElementById('radioKm');
const $radioLabel = document.getElementById('radioKmLabel');
const $btnCentrarme = document.getElementById('btnCentrarme');
const $btnRecargar = document.getElementById('btnRecargar');
const $loader = document.getElementById('loader');
const $search = document.getElementById('searchNombre');
const $filtroAbierto = document.getElementById('filtroAbierto');
const $filtroActivos = document.getElementById('filtroActivos');
const $filtroFavoritos = document.getElementById('filtroFavoritos');
const $categoriaRow = document.getElementById('categoriaFiltrosRow');

let comerciosOriginales = [];
let horariosCache = [];
let searchDebounceId = null;
let favoritosUsuarioIds = new Set();
let favoritosPromise = null;
let selectedCategoryKeys = new Set();



let selectedCategory = null;

// 🧩 Relación entre IDs y claves de categorías
const CATEGORY_ID_TO_KEY = {
  1: 'restaurantes',
  2: 'coffee-shops',
  3: 'panaderias',
  4: 'food-trucks',
  5: 'bares',
  6: 'dispensarios',
};

// 🔧 Utilidades para normalizar y obtener categorías de los comercios
const _toArray = (v) => Array.isArray(v) ? v : (v == null ? [] : [v]);
const _norm = (s) => typeof s === 'string' ? s.trim().toLowerCase() : '';

function _keysFromNames(c) {
  const names = [
    c.categoria,
    c.categoria_nombre,
    c.categoriaPrincipal,
    ...(c.categoriasNombre || []),
  ].map(_norm).filter(Boolean);

  const keys = new Set();
  names.forEach(n => {
    CATEGORY_FILTERS.forEach(f => {
      const hit =
        n.includes(f.label.toLowerCase()) ||
        (f.matchers || []).some(m => n.includes(m.toLowerCase()));
      if (hit) keys.add(f.key);
    });
  });
  return keys;
}

function _keysFromIds(c) {
  const ids = _toArray(c.idCategoria);
  const keys = new Set();
  ids.forEach(id => {
    const num = Number(id);
    if (Number.isFinite(num) && CATEGORY_ID_TO_KEY[num]) {
      keys.add(CATEGORY_ID_TO_KEY[num]);
    }
  });
  return keys;
}

// 🔹 Obtiene todas las claves de categoría que aplican a un comercio
function getCategoryKeysFromComercio(c) {
  const keys = _keysFromNames(c);
  if (keys.size === 0) {
    _keysFromIds(c).forEach(k => keys.add(k));
  }
  return Array.from(keys);
}

// 🔹 Comprueba si el comercio coincide con las categorías seleccionadas
function comercioCoincideCategorias(comercio) {
  // Si no hay categorías seleccionadas, mostrar todo
  if (!selectedCategoryKeys.size) return true;

  // Normaliza los nombres de categoría del comercio
  const nombres = [
    comercio.categoria,
    comercio.categoria_nombre,
    comercio.categoriaNombre,
    comercio.categoriaPrincipal,
  ]
    .filter(Boolean)
    .map((x) => x.toLowerCase());

  // Compara con las categorías seleccionadas
  for (const catKey of selectedCategoryKeys) {
    const cat = CATEGORY_FILTERS.find((f) => f.key === catKey);
    if (!cat) continue;

    // Si alguna palabra clave de esa categoría aparece en el comercio, lo muestra
    const tieneCoincidencia = cat.matchers.some((matcher) =>
      nombres.some((n) => n.includes(matcher.toLowerCase()))
    );

    if (tieneCoincidencia) return true;
  }

  return false;
}

/*
// 🎯 Renderiza los botones de categorías
function renderCategoryButtons() {
  if (!$categoriaRow) return;
  $categoriaRow.innerHTML = '';

  // 🧩 Activar todas las categorías al inicio (solo la primera vez)
  if (selectedCategoryKeys.size === 0) {
    CATEGORY_FILTERS.forEach(cat => selectedCategoryKeys.add(cat.key));
  }

  const container = document.createElement('div');
  container.className = 'flex flex-wrap justify-center gap-3 mb-4 relative z-10';

  CATEGORY_FILTERS.forEach(cat => {
    const isActive = selectedCategoryKeys.has(cat.key);

    // 🔢 Conteo de comercios por categoría (según coincidencia flexible)
    const count = (comerciosOriginales || []).filter(c =>
      getCategoryKeysFromComercio(c).includes(cat.key)
    ).length;

    const btn = document.createElement('button');
    btn.dataset.key = cat.key;
    btn.className = `
      relative category-btn flex flex-col items-center justify-center w-16 text-[11px] font-light
      focus:outline-none transition-transform transform hover:scale-105 overflow-visible
    `;

    btn.innerHTML = `
      <div class="relative w-12 h-12 rounded-full overflow-visible shadow border-2 ${
        isActive ? 'border-[#23b4e9]' : 'border-gray-300'
      } flex items-center justify-center">
        <img
          src="${cat.image}"
          alt="${cat.label}"
          class="w-full h-full object-cover rounded-full ${
            isActive ? 'opacity-100' : 'opacity-60 grayscale'
          }"
        />
        <div class="absolute -top-[0.12rem] -right-[5px] ${
          count > 0 ? 'bg-red-400 text-white' : 'bg-gray-300 text-gray-600'
        } text-[9px] font-light rounded-full w-4 h-4 flex items-center justify-center shadow-md ring-2 ring-white z-20">
          ${count}
        </div>
      </div>
      <span class="mt-1 text-[11px] ${
        isActive ? 'text-[#23b4e9]' : 'text-gray-500'
      } block text-center">
        ${cat.label}
      </span>
    `;

    btn.addEventListener('click', () => {
      if (selectedCategoryKeys.has(cat.key)) {
        selectedCategoryKeys.delete(cat.key);
      } else {
        selectedCategoryKeys.add(cat.key);
      }

      renderCategoryButtons();
      aplicarFiltros();
    });

    container.appendChild(btn);
  });

  // 📊 Texto de cantidad seleccionada (centrado debajo)
  const info = document.createElement('div');
  info.className = 'text-center text-[12px] text-gray-500 w-full mt-2';
  const total = selectedCategoryKeys.size;
  info.textContent = `${total} ${
    total === 1 ? 'Categoría seleccionada' : 'Categorías seleccionadas para mostrar.'
  }`;

  // ✅ Contenedor principal
  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-col items-center w-full';
  wrapper.appendChild(container);
  wrapper.appendChild(info);

  $categoriaRow.innerHTML = '';
  $categoriaRow.appendChild(wrapper);
} */

// 📍 Filtra comercios según categoría visual
function filtrarPorCategoria(comercio) {
  if (!selectedCategory) return true;

  const nombreCategoria = (comercio.categoria || comercio.categoria_nombre || '').toLowerCase();
  const key = selectedCategory.toLowerCase();

  switch (key) {
    case 'restaurantes':
      return nombreCategoria.includes('restaurante');
    case 'food-trucks':
      return nombreCategoria.includes('food') || nombreCategoria.includes('truck');
    case 'coffee-shops':
      return nombreCategoria.includes('coffee') || nombreCategoria.includes('café');
    case 'panaderias':
      return nombreCategoria.includes('panader');
    case 'bares':
      return nombreCategoria.includes('bar');
    case 'dispensarios':
      return nombreCategoria.includes('dispens');
    default:
      return true;
  }
}

function toggleLoader(show) {
  if (!$loader) return;
  $loader.classList.toggle('hidden', !show);
  $loader.classList.toggle('flex', show);
}

function normalizarTextoPlano(valor) {
  if (valor == null) return '';
  return String(valor)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const CATEGORY_FILTERS = [
  {
    key: 'restaurantes',
    label: 'Restaurantes',
    image:
      'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/categorias/RESTAURANTES.jpg',
    matchers: ['restaurante', 'restaurantes'],
  },
  {
    key: 'food-trucks',
    label: 'Food Trucks',
    image:
      'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/categorias/FOOD%20TRUCK.jpg',
    matchers: ['food truck', 'food trucks'],
  },
  {
    key: 'coffee-shops',
    label: 'Coffee Shops',
    image:
      'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/categorias/COFFE%20SHOP.jpg',
    matchers: ['coffee shop', 'coffee shops', 'café', 'cafe'],
  },
  {
    key: 'panaderias',
    label: 'Panaderías',
    image:
      'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/categorias/panaderias.jpg',
    matchers: ['panaderia', 'panaderías', 'panaderia'],
  },
  {
    key: 'bares',
    label: 'Bares',
    image:
      'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/categorias/Bares.jpg',
    matchers: ['bar', 'bares'],
  },
  {
    key: 'dispensarios',
    label: 'Dispensarios',
    image:
      'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/categorias/Dispensario.jpg',
    matchers: ['dispensario', 'dispensarios'],
  },
];

const CATEGORY_FILTERS_MAP = CATEGORY_FILTERS.reduce((acc, filter) => {
  acc[filter.key] = {
    ...filter,
    normalizedMatchers: filter.matchers.map(normalizarTextoPlano),
  };
  return acc;
}, {});

function descomponerValoresMultiples(valor) {
  if (Array.isArray(valor)) return valor;
  if (valor === null || valor === undefined) return [];

  if (typeof valor === 'string') {
    const trimmed = valor.trim();
    if (!trimmed) return [];
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      const contenido = trimmed.slice(1, -1);
      if (!contenido) return [];
      return contenido.split(',').map(item => item.trim()).filter(Boolean);
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [trimmed];
  }

  return [valor];
}

function normalizarId(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }
  const texto = String(valor).trim();
  if (!texto) return null;
  const num = Number(texto);
  if (!Number.isNaN(num) && Number.isFinite(num)) return num;
  return texto.toLowerCase();
}

function setTieneId(conjunto, valor) {
  if (!conjunto || conjunto.size === 0) return false;
  const key = normalizarId(valor);
  if (key === null || key === '') return false;
  if (conjunto.has(key)) return true;
  if (typeof key === 'number') return conjunto.has(String(key));
  const num = Number(key);
  return !Number.isNaN(num) && conjunto.has(num);
}

function extraerIdsCategoria(comercio = {}) {
  const ids = new Set();

  const agregarId = (valor) => {
    const key = normalizarId(valor);
    if (key !== null && key !== '') {
      ids.add(key);
    }
  };

  descomponerValoresMultiples(comercio.idCategoria).forEach(agregarId);
  descomponerValoresMultiples(comercio.categoriasId).forEach(agregarId);

  if (Array.isArray(comercio.categorias)) {
    comercio.categorias.forEach(item => {
      if (item === null || item === undefined) return;
      if (typeof item === 'number' || typeof item === 'string') {
        agregarId(item);
      } else if (typeof item === 'object') {
        if ('idCategoria' in item) agregarId(item.idCategoria);
        if ('id' in item) agregarId(item.id);
      }
    });
  }

  return Array.from(ids);
}

function obtenerCategoriasNormalizadas(comercio = {}) {
  const etiquetas = new Set();

  const agregar = (valor) => {
    if (typeof valor !== 'string') return;
    const limpio = normalizarTextoPlano(valor);
    if (limpio) etiquetas.add(limpio);
  };

  [
    comercio.categoria,
    comercio.nombreCategoria,
    comercio.categoriaNombre,
    comercio.categoriaPrincipal,
  ].forEach(agregar);

  if (Array.isArray(comercio.categoriasNombre)) {
    comercio.categoriasNombre.forEach(agregar);
  }

  if (Array.isArray(comercio.categorias)) {
    comercio.categorias.forEach(cat => {
      if (typeof cat === 'string') agregar(cat);
      else if (typeof cat?.nombre === 'string') agregar(cat.nombre);
    });
  }

  return Array.from(etiquetas);
}

function obtenerCategoriasOriginales(comercio = {}) {
  const etiquetas = new Set();

  const agregar = (valor) => {
    if (typeof valor !== 'string') return;
    const limpio = valor.trim();
    if (limpio) etiquetas.add(limpio);
  };

  [
    comercio.categoria,
    comercio.nombreCategoria,
    comercio.categoriaNombre,
    comercio.categoriaPrincipal,
  ].forEach(agregar);

  if (Array.isArray(comercio.categoriasNombre)) {
    comercio.categoriasNombre.forEach(agregar);
  }

  if (Array.isArray(comercio.categorias)) {
    comercio.categorias.forEach(cat => {
      if (typeof cat === 'string') agregar(cat);
      else if (typeof cat?.nombre === 'string') agregar(cat.nombre);
    });
  }

  return Array.from(etiquetas);
}

function aplicarFiltros() {
  if (!Array.isArray(comerciosOriginales) || !comerciosOriginales.length) {
    markersLayer?.clearLayers();
    return;
  }

  let resultado = [...comerciosOriginales];

  // 🔍 Búsqueda por nombre o descripción
  const termino = normalizarTextoPlano($search?.value || '');
  if (termino) {
    resultado = resultado.filter(c => {
      const nombre = normalizarTextoPlano(c.nombre || '');
      const descripcion = normalizarTextoPlano(c.descripcion || '');
      return nombre.includes(termino) || descripcion.includes(termino);
    });
  }

  // 🎯 Nuevo filtro por categoría visual (botones)
  if (selectedCategory) {
    resultado = resultado.filter(filtrarPorCategoria);
  }

  // 🟩 Abierto ahora
  if ($filtroAbierto?.checked) {
    resultado = resultado.filter(c => c.abiertoAhora === true || c.abierto === true);
  }

  // 💜 Mis favoritos
  if ($filtroFavoritos?.checked && favoritosUsuarioIds.size > 0) {
    resultado = resultado.filter(c => setTieneId(favoritosUsuarioIds, c.id));
  }

  // ⚙️ (Si decides mantenerlo más adelante)
  if ($filtroActivos?.checked) {
    resultado = resultado.filter(c => c.activo === true || c.activoEnPeErre === true);
  }

  // 🗺️ Renderizar resultados en el mapa
  renderMarkers(resultado, { horariosAll: horariosCache });
}

async function obtenerIdUsuarioActual() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session?.user?.id || null;
  } catch (err) {
    console.warn('⚠️ No se pudo obtener la sesión del usuario actual:', err?.message || err);
    return null;
  }
}

async function obtenerFavoritosUsuarioIds() {
  if (favoritosPromise) {
    try {
      const ids = await favoritosPromise;
      favoritosUsuarioIds = ids;
      return favoritosUsuarioIds;
    } catch (err) {
      favoritosPromise = null;
    }
  }

  favoritosPromise = (async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const userId = sessionData?.session?.user?.id;
      if (!userId) return new Set();

      const { data, error } = await supabase
        .from('favoritosusuarios')
        .select('idcomercio')
        .eq('idusuario', userId);

      if (error) throw error;

      const ids = Array.isArray(data)
        ? data
            .map(reg => reg?.idcomercio)
            .filter(id => id !== null && id !== undefined)
        : [];

      const set = new Set();
      ids.forEach(id => {
        const num = Number(id);
        if (!Number.isNaN(num) && Number.isFinite(num)) {
          set.add(num);
          set.add(String(num));
        } else if (typeof id === 'string') {
          const limpio = id.trim();
          if (limpio) set.add(limpio);
        }
      });

      return set;
    } catch (err) {
      console.warn('⚠️ No se pudieron cargar favoritos del usuario:', err?.message || err);
      return new Set();
    }
  })();

  favoritosUsuarioIds = await favoritosPromise;
  return favoritosUsuarioIds;
}

// 👇 Añade esto junto a las utilidades (arriba del archivo)
async function inyectarPortadas(lista = []) {
  const ids = lista.map(c => c.id).filter(Boolean);
  if (ids.length === 0) return lista;

  // Traemos portada exacta desde la tabla Comercios
  const { data, error } = await supabase
    .from('Comercios')              // <- nombre de la tabla con la columna 'portada'
    .select('id, portada')
    .in('id', ids);

  if (error || !data) return lista;

  const mapaPortadas = Object.fromEntries(
    data.map(r => [r.id, (r.portada || '').trim()])
  );

  // Inyectamos en cada comercio; también exponemos 'imagenPortada' por si tu Card la usa con ese nombre
  return lista.map(c => {
    const url = mapaPortadas[c.id] || c.portada || null;
    return { ...c, portada: url, imagenPortada: url };
  });
}

function initMap() {
  // ✅ Crear mapa con zoom extendido y rotación habilitada
  map = L.map('map', {
    maxZoom: 22,        // 🔥 Permite acercar más (nivel calle)
    minZoom: 6,         // 🔹 Previene alejar demasiado
    rotate: true,       // 🧭 Rotación real (requiere leaflet-map-rotate)
    touchRotate: true,  // 📱 Permite girar con dos dedos
  }).setView([18.2208, -66.5901], 9);

  // ✅ TileLayer HD (CartoDB Voyager — más nítido y moderno)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 22,
    attribution:
      '&copy; <a href="https://carto.com/">CartoDB</a> | &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
  }).addTo(map);

  // ✅ Capa de marcadores (comercios)
  markersLayer = L.layerGroup().addTo(map);
  // ✅ Configurar seguimiento dinámico del usuario
map._siguiendoUsuario = true;

map.enableFollowUser = function () {
  map._siguiendoUsuario = true;
  console.log("📍 Seguimiento activado");
};

map.disableFollowUser = function () {
  map._siguiendoUsuario = false;
  console.log("📍 Seguimiento pausado (usuario movió el mapa)");
};

// 🔸 Detiene el seguimiento si el usuario arrastra o hace zoom manual
map.on("dragstart zoomstart", () => {
  map.disableFollowUser();
});
}

function updateRadioLabel() {
  if ($radio && $radioLabel) $radioLabel.textContent = `${$radio.value} mi`;
}

function getComercioColor(comercio) {
  if (comercio.color_hex && /^#([0-9a-f]{6})$/i.test(comercio.color_hex)) {
    return comercio.color_hex;
  }
  if (comercio.idCategoria && CATEGORY_COLORS[comercio.idCategoria]) {
    return CATEGORY_COLORS[comercio.idCategoria];
  }
  return '#2563eb';
}


function createComercioIcon(comercio) {
  const logoURL =
    comercio.logo && comercio.logo.trim() !== '' ? comercio.logo.trim() : PLACEHOLDER_LOGO;

  return L.divIcon({
    className: 'comercio-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 50px;
        height: 50px;
        background: white;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid ${getComercioColor(comercio)};
        box-shadow: 0 3px 8px rgba(0,0,0,0.25);
      ">
        <img
          src="${logoURL}"
          alt="Logo ${comercio.nombre}"
          style="width:100%;height:100%;object-fit:cover;"
          onerror="this.onerror=null;this.src='${PLACEHOLDER_LOGO}'"
        />
      </div>
      <div style="width:2px;height:10px;background:${getComercioColor(
        comercio
      )};margin:0 auto;border-radius:1px;"></div>
    `,
    iconSize: [50, 60],
    iconAnchor: [25, 60],
    popupAnchor: [0, -60],
  });
}

/* -------------------------- ENRIQUECEDORES -------------------------- */

// Cache para evitar hits repetidos
const portadaCache = new Map();
const infoBasicaCache = new Map();

async function obtenerPortada(idComercio) {
  if (portadaCache.has(idComercio)) return portadaCache.get(idComercio);

  try {
    const { data } = await supabase
      .from('imagenesComercios')
      .select('imagen')
      .eq('idComercio', idComercio)
      .eq('portada', true)
      .single();

    const url = data?.imagen?.trim() || null;
    portadaCache.set(idComercio, url);
    return url;
  } catch {
    portadaCache.set(idComercio, null);
    return null;
  }
}

// ✅ Trae el municipio desde la tabla comercios y, si hace falta, desde la relación con Municipios
async function obtenerInfoBasica(idComercio) {
  if (infoBasicaCache.has(idComercio)) return infoBasicaCache.get(idComercio);

  try {
    const { data, error } = await supabase
      .from('Comercios') // 👈 en minúsculas
      .select(`
        id,
        municipio,
        idMunicipio,
        Municipios:Municipios ( nombre )
      `)
      .eq('id', idComercio)
      .single();

    const result = {
      municipio: data?.municipio || data?.Municipios?.nombre || null,
    };

    infoBasicaCache.set(idComercio, result);
    return result;
  } catch {
    infoBasicaCache.set(idComercio, { municipio: null });
    return { municipio: null };
  }
}

function normalizarMunicipio(c) {
  return c.municipio || c.pueblo || c.municipio_nombre || '';
}

async function enriquecerParaCard(c) {
  // Portada
  const portada =
    c.portada?.trim() ||
    (await obtenerPortada(c.id)) ||
    c.imagen?.trim() ||
    PLACEHOLDER_PORTADA;

  // Dirección / municipio / abierto
  const info = await obtenerInfoBasica(c.id);
  const direccion = c.direccion || info.direccion || '';
  const municipio = normalizarMunicipio(c) || info.municipio || '';
  const abierto =
    c.abierto ?? c.abiertoAhora ?? info.abierto ?? null; // deja null si no hay

  // cardComercio usa tiempoTexto (y a veces distanciaTexto)
  const tiempoTexto = c.tiempoVehiculo || c.tiempoTexto || null;

  return {
    ...c,
    portada,
    direccion,
    municipio,
    abierto,
    tiempoTexto,
  };
}

/* ---------------------- DISTANCIA / TIEMPO AUTO --------------------- */

async function adjuntarTiempoManejo(lista = []) {
  if (!Array.isArray(lista) || lista.length === 0) return [];

  const origenValido = Number.isFinite(userLat) && Number.isFinite(userLon);

  return Promise.all(
    lista.map(async (comercio) => {
      const destinoLat = Number(comercio.latitud);
      const destinoLon = Number(comercio.longitud);

      let tiempoVehiculo = comercio.tiempoVehiculo || null;
      let minutosCrudos = null;

      if (origenValido && Number.isFinite(destinoLat) && Number.isFinite(destinoLon)) {
        const r = await getDrivingDistance(
          { lat: userLat, lng: userLon },
          { lat: destinoLat, lng: destinoLon }
        );
        if (r?.duracion != null) {
          minutosCrudos = Math.round(r.duracion / 60);
          tiempoVehiculo = formatTiempo(r.duracion);
        }
      }

      if (!tiempoVehiculo) {
        const fb = calcularTiempoEnVehiculo(3);
        minutosCrudos = fb.minutos;
        tiempoVehiculo = formatTiempo(fb.minutos * 60);
      }

      return { ...comercio, tiempoVehiculo, minutosCrudos };
    })
  );
}

/* ------------------------------ MARCADORES ----------------------------- */
// 🔹 Determina si el comercio está abierto ahora
function estaAbiertoAhora(horarios = []) {
  const ahora = new Date();
  const dia = ahora.getDay(); // 0 = domingo, 6 = sábado
  const horaActual = ahora.toTimeString().slice(0, 5);

  const horarioDia = horarios.find((h) => h.diaSemana === dia);
  if (!horarioDia || horarioDia.cerrado) return false;

  const apertura = horarioDia.apertura?.slice(0, 5);
  const cierre = horarioDia.cierre?.slice(0, 5);
  if (!apertura || !cierre) return false;

  return horaActual >= apertura && horaActual <= cierre;
}

async function renderMarkers(comercios = [], opciones = {}) {
  markersLayer.clearLayers();
  if (!comercios.length) return;

  const ids = comercios.map(c => c.id).filter(Boolean);
  const idsSet = new Set(ids);

  let horariosAll = Array.isArray(opciones.horariosAll) ? opciones.horariosAll : null;
  if ((!horariosAll || !horariosAll.length) && ids.length) {
    const { data } = await supabase
      .from('Horarios')
      .select('idComercio, apertura, cierre, cerrado, diaSemana')
      .in('idComercio', ids);
    horariosAll = data || [];
    horariosCache = horariosAll;
  }

  const horariosPorId = new Map();
  if (Array.isArray(horariosAll)) {
    horariosAll.forEach(h => {
      if (!idsSet.size || idsSet.has(h.idComercio)) {
        if (!horariosPorId.has(h.idComercio)) horariosPorId.set(h.idComercio, []);
        horariosPorId.get(h.idComercio).push(h);
      }
    });
  }

  const ahora = new Date();
  const diaActual = ahora.getDay();
  const horaActual = ahora.toTimeString().slice(0, 5);


  // 🕓 Función auxiliar segura
  function minutosDesdeMedianoche(horaStr) {
    if (!horaStr || typeof horaStr !== "string" || !horaStr.includes(":")) return null;
    const [h, m] = horaStr.split(":").map(Number);
    return !isNaN(h) && !isNaN(m) ? h * 60 + m : null;
  }

  function estaAbierto(horarios, diaActual, horaActual, nombre) {
    const horaMin = minutosDesdeMedianoche(horaActual);
    const hoy = horarios.find(h => h.diaSemana === diaActual);
    const ayer = horarios.find(h => h.diaSemana === (diaActual + 6) % 7);

    const getMinutos = (hora) => minutosDesdeMedianoche(hora);

    // 🔸 Validar horario de hoy
    if (hoy && !hoy.cerrado) {
      const apertura = getMinutos(hoy.apertura);
      const cierre = getMinutos(hoy.cierre);
      if (apertura != null && cierre != null) {
        if (apertura < cierre) {
          if (horaMin >= apertura && horaMin < cierre) {
            return true;
          }
        } else if (horaMin >= apertura || horaMin < cierre) {
          console.log(`✅ ${nombre} está ABIERTO (pasa medianoche)`);
          return true;
        }
      }
    }

    // 🔸 Validar si aún está abierto por horario extendido de ayer
    if (ayer && !ayer.cerrado) {
      const apertura = getMinutos(ayer.apertura);
      const cierre = getMinutos(ayer.cierre);
      if (apertura != null && cierre != null && apertura > cierre && horaMin < cierre) {
        console.log(`✅ ${nombre} sigue ABIERTO por horario de ayer`);
        return true;
      }
    }
    return false;
  }

  // 🔹 Agregar estado de horario a cada comercio
  const comerciosConHorario = comercios.map(c => {
    const horarios = horariosPorId.get(c.id) || [];
    const abierto = estaAbierto(horarios, diaActual, horaActual, c.nombre);
    return { ...c, abiertoAhora: abierto };
  });

  const abiertoMap = new Map(comerciosConHorario.map(c => [c.id, c.abiertoAhora]));
  comerciosOriginales = comerciosOriginales.map(c => {
    if (abiertoMap.has(c.id)) {
      return { ...c, abiertoAhora: abiertoMap.get(c.id) };
    }
    return c;
  });

  // 🔹 Renderizar los marcadores
  comerciosConHorario.forEach((comercio) => {
    if (typeof comercio.latitud !== "number" || typeof comercio.longitud !== "number") return;

    const marker = L.marker([comercio.latitud, comercio.longitud], {
      icon: createComercioIcon(comercio),
    });

const comercioAdaptado = {
  ...comercio,
  abierto: comercio.abiertoAhora,
  municipio: comercio.municipio ?? null,
  pueblo: '',
};


// 🧩 Generar la tarjeta del comercio
const cardNode = cardComercio(comercioAdaptado);

// 🕒 Insertar o actualizar el ícono de reloj dentro del popup
const horarioContainer = cardNode.querySelector('.flex.justify-center.items-center.gap-1');
const relojIcon = horarioContainer?.querySelector('.fa-clock');

if (horarioContainer) {
  const esAbierto = horarioContainer.textContent.toLowerCase().includes('abierto');
  const colorIcono = esAbierto ? 'text-green-600' : 'text-red-500';
  const iconClass = esAbierto
    ? 'far fa-clock slow-spin'
    : 'far fa-clock';

  if (relojIcon) {
    // ✅ Si ya existe el ícono, actualizamos clase y color
    relojIcon.className = `${iconClass} ${colorIcono} mr-1`;
  } else {
    // ✅ Si no existe, lo insertamos al inicio del texto
    horarioContainer.insertAdjacentHTML(
      'afterbegin',
      `<i class="${iconClass} ${colorIcono} mr-1"></i>`
    );
  }
}

// 🏙️ Inserta el municipio directo de la tabla (sin fallbacks)
cardNode.querySelector('div[class*="text-[#23b4e9]"]')?.remove();
cardNode.querySelector('.municipio-info')?.remove();

const municipioTexto = typeof comercio.municipio === 'string' ? comercio.municipio.trim() : '';
if (municipioTexto) {
  const municipioEl = document.createElement('div');
  municipioEl.className = 'flex items-center gap-1 justify-center text-[#23b4e9] text-sm font-medium municipio-info';
  municipioEl.innerHTML = `
    <i class="fas fa-map-pin"></i> ${municipioTexto}
  `;

  const anchorNombre = cardNode.querySelector('a[href*="perfilComercio.html"]');
  if (anchorNombre) {
    anchorNombre.insertAdjacentElement('afterend', municipioEl);
  } else {
    cardNode.insertBefore(municipioEl, cardNode.firstChild);
  }
}


// 🔹 Crear contenedor del popup
const wrapper = document.createElement("div");
wrapper.style.width = "340px";
wrapper.appendChild(cardNode);

marker.bindPopup(wrapper, {
  maxWidth: 360,
  className: "popup-card--clean",
  autoPan: true,
  keepInView: true,
});

    // ✅ Corrige color del botón de teléfono
    marker.on("popupopen", (e) => {
      const popupEl = e.popup._contentNode;
      if (popupEl) {
        const telButtons = popupEl.querySelectorAll('a[href^="tel:"], button[href^="tel:"]');
        telButtons.forEach((btn) => {
          btn.style.color = "#ffffff";
          btn.style.backgroundColor = "#dc2626";
          btn.style.border = "none";
        });
        const telIcons = popupEl.querySelectorAll('a[href^="tel:"] i, a[href^="tel:"] span');
        telIcons.forEach((icon) => (icon.style.color = "#ffffff"));
      }
    });

    markersLayer.addLayer(marker);
  });
}

/* ------------------------------ CARGA ------------------------------ */

async function loadNearby() {
  if (typeof userLat !== 'number' || typeof userLon !== 'number') return;

  const radioMiles = Number($radio?.value ?? 5) || 5;
  const radioMetros = Math.max(0.5, radioMiles) * 1609.34;
  toggleLoader(true);

  try {
    const { data, error } = await supabase.rpc('comercios_cerca_v2', {
  p_lat: userLat,
  p_lon: userLon,
  p_radio_m: radioMetros,
});
if (error) throw error;

async function loadNearby() {
  if (typeof userLat !== 'number' || typeof userLon !== 'number') return;

  const radioMiles = Number($radio?.value ?? 5) || 5;
  const radioMetros = Math.max(0.5, radioMiles) * 1609.34;
  toggleLoader(true);

  try {
    const { data, error } = await supabase.rpc('comercios_cerca_v2', {
      p_lat: userLat,
      p_lon: userLon,
      p_radio_m: radioMetros,
    });
    if (error) throw error;

    // ✅ Enriquecer resultados con Categorías y Subcategorías reales
    const idsComercios = data.map((c) => c.id);

    // 🔹 Categorías
    const { data: categoriasData } = await supabase
      .from('ComercioCategorias')
      .select(`
        idComercio,
        idCategoria,
        categoria:Categorias ( nombre )
      `)
      .in('idComercio', idsComercios);

    // 🔹 Subcategorías
    const { data: subcatsData } = await supabase
      .from('ComercioSubcategorias')
      .select(`
        idComercio,
        idSubcategoria,
        subcategoria:subCategoria ( nombre )
      `)
      .in('idComercio', idsComercios);

    // 🔹 Agrupar por comercio
    const categoriasPorComercio = {};
    categoriasData?.forEach((c) => {
      if (!categoriasPorComercio[c.idComercio])
        categoriasPorComercio[c.idComercio] = [];
      categoriasPorComercio[c.idComercio].push(c.categoria?.nombre);
    });

    const subcategoriasPorComercio = {};
    subcatsData?.forEach((s) => {
      if (!subcategoriasPorComercio[s.idComercio])
        subcategoriasPorComercio[s.idComercio] = [];
      subcategoriasPorComercio[s.idComercio].push(s.subcategoria?.nombre);
    });

    // 🔹 Combinar todo
    const listaEnriquecida = data.map((c) => ({
      ...c,
      categoriasNombre: categoriasPorComercio[c.id] || [],
      subcategoriasNombre: subcategoriasPorComercio[c.id] || [],
    }));

    // ⚙️ Reemplaza la lista base original
    const listaBase = listaEnriquecida;

    // 🔹 Resto del código original (para pintar los resultados)
    // ... continúa desde aquí con tu renderizado original ...

  } catch (err) {
    console.error('❌ Error al cargar comercios cercanos:', err);
  } finally {
    toggleLoader(false);
  }
}

const lista = Array.isArray(data) ? data : [];

// ✅ Recolecta los IDs sin municipio
const idsSinMunicipio = lista
  .filter(c => !c.municipio || c.municipio === 'Sin municipio')
  .map(c => c.id);

let municipiosExtra = [];
if (idsSinMunicipio.length) {
  const { data } = await supabase
    .from('Comercios')
    .select('id, municipio')
    .in('id', idsSinMunicipio);

  municipiosExtra = data || [];
}

// ✅ Une los resultados en memoria
const listaConMunicipio = lista.map(c => {
  const extra = municipiosExtra.find(x => x.id === c.id);
  const municipioBase = c.municipio ?? extra?.municipio ?? null;
  return { ...c, municipio: municipioBase };
});

    // 1) Base
    const listaBase = listaConMunicipio;

    // 2) 💡 Inyectar portada desde la tabla Comercios
    const listaConPortadas = await inyectarPortadas(listaBase);

    // 3) Tiempos de manejo (para que CardComercio muestre el carro + minutos)
    const listaConTiempos = await adjuntarTiempoManejo(listaConPortadas);

    const favoritosIds = await obtenerFavoritosUsuarioIds();

    const listaConFavoritos = listaConTiempos.map(c => {
      const claveTexto = String(c.id);
      const claveNumerica = Number(c.id);
      const esFavorito = favoritosIds.has(claveTexto) || favoritosIds.has(claveNumerica);
      const categoriasOriginales = obtenerCategoriasOriginales(c);
      const categoriasNormalizadas = categoriasOriginales.map(normalizarTextoPlano);
      const idsCategoria = extraerIdsCategoria(c);

      return {
        ...c,
        favorito: esFavorito,
        categoriasNombre: Array.isArray(c.categoriasNombre) && c.categoriasNombre.length
          ? c.categoriasNombre
          : categoriasOriginales,
        categoriasNormalizadas,
        categoriasId: Array.isArray(c.categoriasId) && c.categoriasId.length
          ? c.categoriasId
          : idsCategoria,
        categoriaPrincipal: categoriasOriginales[0] || c.categoria || c.categoriaNombre || null,
      };
    });

    // 4) Guardar para filtros y renderizar
    comerciosOriginales = listaConFavoritos.map(c => ({ ...c }));
    horariosCache = [];
  // renderCategoryButtons();
    aplicarFiltros();
  } finally {
    toggleLoader(false);
  }
}

async function locateUser() {
  if (!navigator.geolocation) return;
  toggleLoader(true);

  const idUsuario = await obtenerIdUsuarioActual();
  const iconoUsuario = await crearIconoUsuario(idUsuario);

  // 📍 Estado actual
  let primeraVez = true;
  let velocidadMph = 0;
  let ultimoHeading = null;

  // 🔁 Actualizar ubicación en vivo
  const actualizarUbicacion = async (pos) => {
    try {
      userLat = pos.coords.latitude;
      userLon = pos.coords.longitude;

      if (!map) return;

      // 🌀 Calcular velocidad en millas por hora
      const speed = pos.coords.speed || 0; // m/s
      velocidadMph = speed * 2.23694; // convertir a mph

      // 🔎 Determinar zoom base según velocidad
      let zoomDeseado;
      if (velocidadMph > 45) zoomDeseado = 13;        // 🚗 Alta velocidad
      else if (velocidadMph >= 20) zoomDeseado = 15;  // 🚙 Media
      else zoomDeseado = 17;                          // 🚶 Lento / detenido

      // 📏 Si el usuario acercó más, respetar su zoom
      const zoomActual = map.getZoom();
      if (zoomActual > zoomDeseado) zoomDeseado = zoomActual;

      // 🧭 Orientar marcador del usuario según dirección real
const heading = pos.coords.heading;
if (heading !== null && !isNaN(heading)) {
  ultimoHeading = heading;

  // 🔄 Rota el ícono del usuario según heading (0° = norte)
  if (userMarker?._icon) {
    userMarker._icon.style.transition = "transform 0.4s ease-out";
    userMarker._icon.style.transformOrigin = "center center";
    userMarker._icon.style.transform = `rotate(${heading}deg)`;
  }
}

      // 🔵 Crear o mover el marcador del usuario
      if (userMarker) {
        userMarker.setLatLng([userLat, userLon]);
      } else {
        userMarker = L.marker([userLat, userLon], { icon: iconoUsuario }).addTo(map);
      }

      // 🔵 Crear o actualizar círculo de precisión
      if (!userAccuracyCircle) {
        userAccuracyCircle = L.circle([userLat, userLon], {
          radius: pos.coords.accuracy || 20,
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);
      } else {
        userAccuracyCircle.setLatLng([userLat, userLon]);
        userAccuracyCircle.setRadius(pos.coords.accuracy || 20);
      }

      // 🎯 Seguir la posición en tiempo real, pero permitir mover el mapa
      map.panTo([userLat, userLon], { animate: true });
      if (primeraVez) {
        map.setZoom(zoomDeseado);
        primeraVez = false;
      }

      // ⚡ Cargar comercios solo la primera vez
      if (!map._comerciosCargados) {
        await loadNearby();
        map._comerciosCargados = true;
      }

      // 🔁 Mostrar en consola (solo para pruebas)
      console.log(`🚀 Velocidad: ${velocidadMph.toFixed(1)} mph | Zoom: ${zoomDeseado} | Heading: ${ultimoHeading}`);

    } catch (err) {
      console.error("⚠️ Error actualizando ubicación:", err);
    } finally {
      toggleLoader(false);
    }
  };

  // ⚠️ Si falla GPS, usar ubicación base (Ponce)
  const handleError = (err) => {
    console.warn("⚠️ Error en seguimiento de ubicación:", err.message);
    if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
      console.warn("⚠️ Usando ubicación por defecto (Ponce, PR)");
      userLat = 18.012;
      userLon = -66.613;
      map.setView([userLat, userLon], 15, { animate: true });
      toggleLoader(false);
    }
  };

  // 📡 Seguimiento continuo
  navigator.geolocation.watchPosition(actualizarUbicacion, handleError, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 30000,
  });

  // 🎯 Botón flotante para centrar vista según la velocidad
  const btnSeguir = L.control({ position: "bottomright" });
  btnSeguir.onAdd = () => {
    const btn = L.DomUtil.create("button", "seguir-usuario-btn");
    btn.innerHTML = '<i class="fas fa-location-arrow"></i>';
    btn.title = "Centrar mapa en tu ubicación";
    btn.style.cssText = `
      background: white;
      border: none;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      font-size: 18px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    `;
    btn.onclick = () => {
      if (userLat && userLon) {
        // Calcular zoom dinámico según velocidad actual
        let zoomDeseado;
        if (velocidadMph > 45) zoomDeseado = 13;
        else if (velocidadMph >= 20) zoomDeseado = 15;
        else zoomDeseado = 17;

        map.setView([userLat, userLon], zoomDeseado, { animate: true });
        if (ultimoHeading && typeof map.setBearing === "function") {
          map.setBearing(ultimoHeading); // reorientar hacia la dirección actual
        }
      }
    };
    return btn;
  };
  btnSeguir.addTo(map);
}

/* ------------------------------ INIT ------------------------------ */

(function init() {
  initMap();
  updateRadioLabel();

  $radio?.addEventListener('input', updateRadioLabel);
  $radio?.addEventListener('change', loadNearby);
  $btnCentrarme?.addEventListener('click', locateUser);
  $btnRecargar?.addEventListener('click', loadNearby);

  if ($search) {
    $search.addEventListener('input', () => {
      if (searchDebounceId) clearTimeout(searchDebounceId);
      searchDebounceId = setTimeout(aplicarFiltros, 200);
    });
  }

  [$filtroAbierto, $filtroActivos, $filtroFavoritos].forEach(toggle => {
    toggle?.addEventListener('change', aplicarFiltros);
  });

 // renderCategoryButtons();

  locateUser();
})();

// Asegurar color blanco en popup al abrirlo
map?.on('popupopen', () => {
  document
    .querySelectorAll('.leaflet-popup-content .card-comercio a[href^="tel:"]')
    .forEach(el => (el.style.color = 'white'));
});
