import { supabase } from '../shared/supabaseClient.js';
import { calcularTiempoEnVehiculo } from '../shared/utils.js';
import { getDrivingDistance, formatTiempo } from '../shared/osrmClient.js';

const PLACEHOLDER_LOGO = 'https://placehold.co/80x80?text=Logo';
const PLACEHOLDER_PORTADA = 'https://placehold.co/400x200?text=Sin+portada';
const USER_PLACEHOLDER = 'https://placehold.co/80x80?text=Yo';

const CATEGORY_COLORS = {
  1: '#2563eb', // Restaurantes
  2: '#16a34a', // Cafés
  3: '#f97316',
  4: '#ec4899',
  5: '#9333ea',
  6: '#facc15',
  7: '#0ea5e9'
};

let map;
let markersLayer;
let userMarker;
let userLat = null;
let userLon = null;
let userPhotoUrl = null;

const $radio = document.getElementById('radioKm');
const $radioLabel = document.getElementById('radioKmLabel');
const $btnCentrarme = document.getElementById('btnCentrarme');
const $btnRecargar = document.getElementById('btnRecargar');
const $loader = document.getElementById('loader');

function toggleLoader(show) {
  if (!$loader) return;
  $loader.classList.toggle('hidden', !show);
  $loader.classList.toggle('flex', show);
}

function initMap() {
  map = L.map('map', { maxZoom: 20 }).setView([18.2208, -66.5901], 9);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function updateRadioLabel() {
  if ($radio && $radioLabel) {
    $radioLabel.textContent = `${$radio.value} km`;
  }
}

async function fetchUserPhoto() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const session = data.session;
    if (!session?.user) return null;

    const { data: perfil, error: perfilError } = await supabase
      .from('usuarios')
      .select('imagen')
      .eq('id', session.user.id)
      .maybeSingle();

    if (perfilError) throw perfilError;

    return perfil?.imagen || null;
  } catch (error) {
    console.warn('No se pudo obtener la foto del usuario:', error?.message || error);
    return null;
  }
}

function createUserIcon(photoUrl) {
  const url = photoUrl || USER_PLACEHOLDER;
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="width:38px;height:38px;border:3px solid #2563eb;border-radius:50%;overflow:hidden;background:#fff;box-shadow:0 4px 10px rgba(37,99,235,0.35);">
        <img src="${url}" alt="Usuario" style="width:100%;height:100%;object-fit:cover;" />
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19]
  });
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
  const color = getComercioColor(comercio);
  return L.divIcon({
    className: 'comercio-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:18px;height:18px;border-radius:50%;border:2px solid #fff;background:${color};box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>
        <div style="width:2px;height:10px;background:${color};"></div>
      </div>
    `,
    iconSize: [18, 28],
    iconAnchor: [9, 28],
    popupAnchor: [0, -28]
  });
}

async function adjuntarTiempoManejo(lista = []) {
  if (!Array.isArray(lista) || lista.length === 0) return [];

  const origenValido = Number.isFinite(userLat) && Number.isFinite(userLon);

  return Promise.all(lista.map(async (comercio) => {
    const destinoLat = Number(comercio.latitud);
    const destinoLon = Number(comercio.longitud);

    let tiempoVehiculo = comercio.tiempoVehiculo || null;
    let minutosCrudos = null;
    let distanciaKm = Number.isFinite(comercio.distancia_m)
      ? comercio.distancia_m / 1000
      : null;

    if (origenValido && Number.isFinite(destinoLat) && Number.isFinite(destinoLon)) {
      const resultado = await getDrivingDistance(userLat, userLon, destinoLat, destinoLon);
      if (resultado?.duration != null) {
        minutosCrudos = Math.round(resultado.duration / 60);
        tiempoVehiculo = formatTiempo(resultado.duration);
        distanciaKm = typeof resultado.distance === 'number'
          ? resultado.distance / 1000
          : distanciaKm;
      }
    }

    if (!tiempoVehiculo && Number.isFinite(distanciaKm)) {
      const fallback = calcularTiempoEnVehiculo(distanciaKm);
      minutosCrudos = fallback.minutos;
      tiempoVehiculo = formatTiempo(fallback.minutos * 60);
    }

    if (!tiempoVehiculo) tiempoVehiculo = 'Distancia no disponible';

    return {
      ...comercio,
      tiempoVehiculo,
      minutosCrudos,
      distancia_m: Number.isFinite(distanciaKm) ? distanciaKm * 1000 : comercio.distancia_m
    };
  }));
}

function formatDistancia(comercio) {
  if (comercio.tiempoVehiculo) return comercio.tiempoVehiculo;
  if (!Number.isFinite(comercio.distancia_m)) return 'Distancia no disponible';
  const km = comercio.distancia_m / 1000;
  const { minutos, texto } = calcularTiempoEnVehiculo(km);
  return minutos < 60 ? `a ${minutos} minutos` : `a ${texto}`;
}

function popupHTML(comercio) {
  const logo = comercio.logo && comercio.logo.trim() !== ''
    ? comercio.logo
    : PLACEHOLDER_LOGO;

  const portada = comercio.portada && comercio.portada.trim() !== ''
    ? comercio.portada
    : PLACEHOLDER_PORTADA;

  console.log('Comercio recibido:', {
    nombre: comercio.nombre,
    logo,
    portada
  });

  const categorias = comercio.categoria_nombre || 'Sin categoría';
  const telefonoHTML = comercio.telefono
    ? `<a href="tel:${comercio.telefono}" 
   class="inline-flex items-center justify-center gap-2 bg-red-600 text-white !text-white px-3 py-1 rounded-full text-xs font-semibold mt-2">
   <i class="fas fa-phone"></i> ${comercio.telefono}
</a>`
    : '';

  const distanciaTexto = formatoDistanciaPopup(comercio);

  return `
   <div class="w-45 rounded-xl overflow-hidden shadow-lg bg-white text-center pointer-events-auto">
  <div class="relative">
    <img src="${portada}" alt="Portada" 
         class="w-full h-24 object-cover" 
         onerror="this.onerror=null;this.src='${PLACEHOLDER_PORTADA}';" />
         
    <img src="${logo}" alt="Logo" 
         class="absolute -bottom-6 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full object-cover bg-white  shadow-[0px_-17px_11px_-5px_rgba(0,_0,_0,_0.5)]" 
         onerror="this.onerror=null;this.src='${PLACEHOLDER_LOGO}';" />
  </div>
  
  <div class="pt-10 pb-4 px-4 space-y-2">
    <h3 class="text-sm font-bold leading-tight break-words">
      ${comercio.nombre}
    </h3>
    <p class="text-xs text-gray-600">${categorias}</p>
    
    ${telefonoHTML}
    
    <p class="text-xs text-gray-500">${distanciaTexto}</p>
    
    <a href="perfilComercio.html?id=${encodeURIComponent(comercio.id)}" 
       class="block w-full bg-green-600 hover:bg-green-700 !text-white text-xs font-semibold px-3 py-2 rounded">
      Ver perfil
    </a>
  </div>
</div>
  `;
}

function formatoDistanciaPopup(comercio) {
  if (comercio.tiempoVehiculo) return comercio.tiempoVehiculo;
  if (!Number.isFinite(comercio.distancia_m)) return 'Distancia no disponible';
  const km = comercio.distancia_m / 1000;
  const { minutos, texto } = calcularTiempoEnVehiculo(km);
  return minutos < 60 ? `a ${minutos} minutos` : `a ${texto}`;
}

function renderMarkers(comercios = []) {
  markersLayer.clearLayers();

  comercios.forEach((comercio) => {
    if (typeof comercio.latitud !== 'number' || typeof comercio.longitud !== 'number') return;

    const marker = L.marker([comercio.latitud, comercio.longitud], {
      icon: createComercioIcon(comercio)
    });

    marker.bindPopup(popupHTML(comercio));
    markersLayer.addLayer(marker);
  });
}

async function loadNearby() {
  if (typeof userLat !== 'number' || typeof userLon !== 'number') {
    console.warn('Las coordenadas del usuario no están disponibles todavía.');
    return;
  }

  const radioKm = Number($radio?.value ?? 5) || 5;
  const radioMetros = Math.max(1, radioKm) * 1000;

  toggleLoader(true);

  try {
    const { data, error } = await supabase.rpc('comercios_cerca_v2', {
      p_lat: userLat,
      p_lon: userLon,
      p_radio_m: radioMetros
    });

    if (error) {
      console.error('Error consultando comercios cercanos:', error);
      return;
    }

    const lista = Array.isArray(data) ? data : [];
    if (!lista.length) {
      console.info('No se encontraron comercios en el radio seleccionado.');
    }

    const listaConTiempos = await adjuntarTiempoManejo(lista);
    renderMarkers(listaConTiempos);
  } finally {
    toggleLoader(false);
  }
}

function updateUserMarker() {
  if (typeof userLat !== 'number' || typeof userLon !== 'number') return;

  if (!map) return;

  const icon = createUserIcon(userPhotoUrl);

  if (!userMarker) {
    userMarker = L.marker([userLat, userLon], { icon }).addTo(map).bindPopup('Estás aquí');
  } else {
    userMarker.setIcon(icon);
    userMarker.setLatLng([userLat, userLon]);
  }
}

async function locateUser() {
  if (!navigator.geolocation) {
    console.warn('Geolocalización no soportada.');
    return;
  }

  toggleLoader(true);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      userLat = position.coords.latitude;
      userLon = position.coords.longitude;

      userPhotoUrl = userPhotoUrl ?? await fetchUserPhoto();

      map.setView([userLat, userLon], 13);
      updateUserMarker();
      await loadNearby();
      toggleLoader(false);
    },
    (error) => {
      console.error('No se pudo obtener la ubicación del usuario:', error);
      toggleLoader(false);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function wireEvents() {
  if ($radio) {
    updateRadioLabel();
    $radio.addEventListener('input', updateRadioLabel);
    $radio.addEventListener('change', () => loadNearby());
  }

  $btnCentrarme?.addEventListener('click', () => locateUser());
  $btnRecargar?.addEventListener('click', () => loadNearby());
}

(function init() {
  initMap();
  wireEvents();
  locateUser();
})();
