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
  // Asegúrate que exista <div id="map"></div> en cercaDeMi.html
  map = L.map('map', { maxZoom: 20 }).setView([18.2208, -66.5901], 9);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function updateRadioLabel() {
  if ($radio && $radioLabel) $radioLabel.textContent = `${$radio.value} km`;
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

async function renderMarkers(comercios = []) {
  markersLayer.clearLayers();
  if (!comercios.length) return;

  // 🔹 Obtener todos los IDs de los comercios visibles
  const ids = comercios.map(c => c.id);

  // 🔹 Traer todos los horarios de una sola vez
  const { data: horariosAll, error } = await supabase
    .from("Horarios")
    .select("idComercio, apertura, cierre, cerrado, diaSemana")
    .in("idComercio", ids);


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
    const horarios = horariosAll?.filter(h => h.idComercio === c.id) || [];
    const abierto = estaAbierto(horarios, diaActual, horaActual, c.nombre);
    return { ...c, abiertoAhora: abierto };
  });

  console.log("🕓 Comercios con estado de horario:", comerciosConHorario);

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
  municipioEl.className = 'flex items-center justify-center gap-1 text-[#23b4e9] text-sm font-medium municipio-info';
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

  const radioKm = Number($radio?.value ?? 5) || 5;
  const radioMetros = Math.max(1, radioKm) * 1000;
  toggleLoader(true);

  try {
    const { data, error } = await supabase.rpc('comercios_cerca_v2', {
  p_lat: userLat,
  p_lon: userLon,
  p_radio_m: radioMetros,
});
if (error) throw error;

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

    // 4) Render
    renderMarkers(listaConTiempos);
  } finally {
    toggleLoader(false);
  }
}

async function locateUser() {
  if (!navigator.geolocation) return;
  toggleLoader(true);

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        userLat = pos.coords.latitude;
        userLon = pos.coords.longitude;

        map.setView([userLat, userLon], 13);

        if (userMarker) {
          map.removeLayer(userMarker);
        }

        const idUsuario = await obtenerIdUsuarioActual();
        const iconoUsuario = await crearIconoUsuario(idUsuario);
        userMarker = L.marker([userLat, userLon], { icon: iconoUsuario }).addTo(map);

        await loadNearby();
      } catch (err) {
        console.error('⚠️ Error posicionando al usuario:', err);
      } finally {
        toggleLoader(false);
      }
    },
    () => toggleLoader(false),
    { enableHighAccuracy: true }
  );
}

/* ------------------------------ INIT ------------------------------ */

(function init() {
  initMap();
  updateRadioLabel();

  $radio?.addEventListener('input', updateRadioLabel);
  $radio?.addEventListener('change', loadNearby);
  $btnCentrarme?.addEventListener('click', locateUser);
  $btnRecargar?.addEventListener('click', loadNearby);

  locateUser();
})();

// Asegurar color blanco en popup al abrirlo
map?.on('popupopen', () => {
  document
    .querySelectorAll('.leaflet-popup-content .card-comercio a[href^="tel:"]')
    .forEach(el => (el.style.color = 'white'));
});
