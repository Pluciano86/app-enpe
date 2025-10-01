// listadoPlayas.js
import { obtenerClima } from "./obtenerClima.js";
import { supabase } from '../shared/supabaseClient.js';
import { calcularTiemposParaLugares, calcularDistancia } from './distanciaLugar.js';
import { mostrarMensajeVacio } from './mensajesUI.js';
import { createGlobalBannerElement, destroyCarousel } from './bannerCarousel.js';

const inputBuscar = document.getElementById("inputBuscar");
const selectCosta = document.getElementById("selectCosta");
const selectMunicipio = document.getElementById("selectMunicipio");
const contenedor = document.getElementById("contenedorPlayas");
const template = document.getElementById("templateCard");

const checkNadar = document.getElementById("filtro-nadar");
const checkSurfear = document.getElementById("filtro-surfear");
const checkSnorkel = document.getElementById("filtro-snorkel");

let todasLasPlayas = [];
let usuarioLat = null;
let usuarioLon = null;
let renderID = 0;

const cleanupCarousels = (container) => {
  if (!container) return;
  container
    .querySelectorAll(`[data-banner-carousel="true"]`)
    .forEach(destroyCarousel);
};

async function renderTopBannerPlayas() {
  const seccionFiltros = document.querySelector('section.p-4');
  if (!seccionFiltros) return;

  let topContainer = document.querySelector('[data-banner-slot="top-playas"]');
  if (!topContainer) {
    topContainer = document.createElement('div');
    topContainer.dataset.bannerSlot = 'top-playas';
    seccionFiltros.parentNode?.insertBefore(topContainer, seccionFiltros);
  } else {
    cleanupCarousels(topContainer);
    topContainer.innerHTML = '';
  }

  const banner = await createGlobalBannerElement({ intervalMs: 5000, slotName: 'banner-top' });
  if (banner) {
    topContainer.appendChild(banner);
    topContainer.classList.remove('hidden');
  } else {
    topContainer.classList.add('hidden');
  }
}

async function crearBannerElemento(slotName = 'banner-inline') {
  try {
    return await createGlobalBannerElement({ intervalMs: 5000, slotName });
  } catch (error) {
    console.error('Error creando banner global:', error);
    return null;
  }
}

async function inicializarPlayas({ lat, lon } = {}) {
  if (typeof mostrarLoader === 'function') {
    await mostrarLoader();
  }

  try {
    if (typeof lat === 'number' && typeof lon === 'number') {
      usuarioLat = lat;
      usuarioLon = lon;
    }

    await cargarPlayas();

    if (typeof usuarioLat === 'number' && typeof usuarioLon === 'number') {
      await calcularTiempos();
    }

    renderizarPlayas();
  } finally {
    if (typeof ocultarLoader === 'function') {
      await ocultarLoader();
    }
  }
}

if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      await inicializarPlayas({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude
      });
    },
    async () => {
      await inicializarPlayas();
    }
  );
} else {
  inicializarPlayas();
}

async function cargarPlayas() {
  const { data, error } = await supabase.from("playas").select("*");
  if (error) return console.error("Error cargando playas:", error);
  todasLasPlayas = data;

  const { data: imagenes, error: errorImg } = await supabase
    .from("imagenesPlayas")
    .select("imagen, idPlaya, portada")
    .eq("portada", true);

  if (errorImg) {
    console.error("❌ Error cargando portadas de playas:", errorImg);
  } else {
    todasLasPlayas.forEach(playa => {
      const img = imagenes?.find(i => i.idPlaya === playa.id);
      playa.portada = img?.imagen || null;
    });
  }

  cargarFiltros();
}

async function calcularTiempos() {
  if (typeof usuarioLat !== 'number' || typeof usuarioLon !== 'number') return;
  todasLasPlayas = await calcularTiemposParaLugares(todasLasPlayas, {
    lat: usuarioLat,
    lon: usuarioLon
  });
}

inputBuscar.addEventListener("input", renderizarPlayas);
selectCosta.addEventListener("change", () => {
  renderizarPlayas();
  cargarMunicipios();
});
selectMunicipio.addEventListener("change", renderizarPlayas);
[checkNadar, checkSurfear, checkSnorkel].forEach(el =>
  el.addEventListener("change", renderizarPlayas)
);


async function renderizarPlayas() {
  const currentID = ++renderID;
  try {
    await renderTopBannerPlayas();
    if (currentID !== renderID) return;

    cleanupCarousels(contenedor);
    contenedor.innerHTML = "";

  const texto = inputBuscar.value.toLowerCase();
  const costa = selectCosta.value;
  const municipio = selectMunicipio.value;
  const filtrarNadar = checkNadar.checked;
  const filtrarSurfear = checkSurfear.checked;
  const filtrarSnorkel = checkSnorkel.checked;

  let filtradas = todasLasPlayas.filter((p) => {
    const coincideNombre = p.nombre.toLowerCase().includes(texto);
    const coincideCosta = costa ? p.costa === costa : true;
    const coincideMunicipio = municipio ? p.municipio === municipio : true;
    const pasaFiltroNadar = !filtrarNadar || Boolean(p.nadar);
    const pasaFiltroSurfear = !filtrarSurfear || Boolean(p.surfear);
    const pasaFiltroSnorkel = !filtrarSnorkel || Boolean(p.snorkel);
    return coincideNombre && coincideCosta && coincideMunicipio &&
           pasaFiltroNadar && pasaFiltroSurfear && pasaFiltroSnorkel;
  });

    if (filtradas.length === 0) {
    const filtrosActivos = [];
    if (texto) filtrosActivos.push(`nombre "${texto}"`);
    if (costa) filtrosActivos.push(`costa "${costa}"`);
    if (municipio) filtrosActivos.push(`municipio "${municipio}"`);
    if (filtrarNadar) filtrosActivos.push("aptas para nadar");
    if (filtrarSurfear) filtrosActivos.push("aptas para surfear");
    if (filtrarSnorkel) filtrosActivos.push("aptas para snorkel");

    const mensaje = filtrosActivos.length > 0
      ? `No se encontraron playas que coincidan con ${filtrosActivos.join(", ")}.`
      : "No se encontraron playas para mostrar.";

    contenedor.innerHTML = `
  <div class="col-span-full flex justify-center items-center py-12">
    <div class="w-full max-w-xs text-center text-gray-600 px-4">
      <div class="text-5xl mb-2 animate-bounce">🏖️</div>
      <p class="text-lg font-medium leading-tight mb-1">${mensaje}</p>
      <p class="text-sm text-gray-400">Prueba cambiar los filtros o intenta otra búsqueda.</p>
    </div>
  </div>
`;

    const bannerFinal = await crearBannerElemento('banner-bottom');
    if (currentID !== renderID) return;
    if (bannerFinal) contenedor.appendChild(bannerFinal);
    return;
  } 

  if (typeof usuarioLat === 'number' && typeof usuarioLon === 'number') {
    filtradas = filtradas
      .filter(p => p.latitud && p.longitud)
      .map(p => {
        const d = calcularDistancia(usuarioLat, usuarioLon, p.latitud, p.longitud);
        return { ...p, _distancia: d };
      })
      .sort((a, b) => a._distancia - b._distancia);
  }

  const cards = [];

  for (const playa of filtradas) {
    if (currentID !== renderID) return;

    const clone = template.content.cloneNode(true);

    const imagenEl = clone.querySelector(".imagen");
    if (imagenEl) {
      imagenEl.src = playa.portada || "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/imgPlayaNoDisponible.jpg";
      imagenEl.alt = `Imagen de ${playa.nombre}`;
    }
    clone.querySelector(".nombre").textContent = playa.nombre;
    clone.querySelector(".municipio").textContent = playa.municipio || "";

    if (playa.nadar) clone.querySelector(".icon-nadar")?.classList.remove("hidden");
    if (playa.surfear) clone.querySelector(".icon-surfear")?.classList.remove("hidden");
    if (playa.snorkel) clone.querySelector(".icon-snorkel")?.classList.remove("hidden");

    const iconTransporte = clone.querySelector(".icon-transporte");
    if (iconTransporte) {
      if (playa.bote) {
        iconTransporte.innerHTML = `
          <div class="flex justify-center items-center gap-1 text-sm text-[#9c9c9c] mt-1 leading-tight">
            <span><i class="fas fa-ship text-[#9c9c9c]"></i></span>
            <span class="text-center leading-snug">Acceso en bote</span>
          </div>`;
      } else {
        iconTransporte.innerHTML = `
          <div class="flex justify-center items-center gap-1 text-sm text-[#9c9c9c] mt-1 leading-tight">
            <span><i class="fas fa-car text-[#9c9c9c]"></i></span>
            <span class="text-center leading-snug">${playa.tiempoVehiculo || ""}</span>
          </div>`;
      }
    }

    const estadoClima = clone.querySelector(".estado-clima");
    const iconClima = clone.querySelector(".icon-clima");
    const viento = clone.querySelector(".viento");

    obtenerClima(playa.latitud, playa.longitud).then(clima => {
      if (renderID !== currentID) return;

      if (clima) {
        if (estadoClima) estadoClima.textContent = clima.estado;
        if (iconClima) {
          const img = document.createElement("img");
          img.src = clima.iconoURL;
          img.alt = clima.estado;
          img.classList.add("w-6", "h-6", "inline", "mr-1");
          iconClima.innerHTML = "";
          iconClima.appendChild(img);
        }
        if (viento) viento.innerHTML = `<i class="fas fa-wind text-gray-400"></i> Viento de: ${clima.viento}`;
      }
    });

    cards.push(clone);
  }

  const fragment = document.createDocumentFragment();
  let cartasEnFila = 0;
  let totalFilas = 0;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    fragment.appendChild(card);
    cartasEnFila += 1;

    const esUltimaCarta = i === cards.length - 1;
    const filaCompleta = cartasEnFila === 2 || esUltimaCarta;

    if (filaCompleta) {
      totalFilas += 1;
      cartasEnFila = 0;

      const debeInsertarIntermedio = totalFilas % 4 === 0 && !esUltimaCarta;
      if (debeInsertarIntermedio) {
        const bannerIntermedio = await crearBannerElemento('banner-inline');
        if (currentID !== renderID) return;
        if (bannerIntermedio) fragment.appendChild(bannerIntermedio);
      }
    }
  }

  const debeAgregarFinal = totalFilas === 0 || totalFilas % 4 !== 0;
  if (debeAgregarFinal) {
    const bannerFinal = await crearBannerElemento('banner-bottom');
    if (currentID !== renderID) return;
    if (bannerFinal) fragment.appendChild(bannerFinal);
  }

  contenedor.appendChild(fragment);
  } catch (error) {
    console.error('Error al renderizar playas:', error);
  }
}

async function cargarFiltros() {
  const costasUnicas = [...new Set(todasLasPlayas.map(p => p.costa).filter(Boolean))].sort();
  selectCosta.innerHTML = `<option value="">Todas las Costas</option>`;
  costasUnicas.forEach(c => {
    const option = document.createElement("option");
    option.value = c;
    option.textContent = c;
    selectCosta.appendChild(option);
  });

  cargarMunicipios();
}

function cargarMunicipios() {
  const costaSeleccionada = selectCosta.value;
  const municipiosUnicos = [...new Set(
    todasLasPlayas
      .filter(p => !costaSeleccionada || p.costa === costaSeleccionada)
      .map(p => p.municipio)
  )].sort();

  selectMunicipio.innerHTML = `<option value="">Todos</option>`;
  municipiosUnicos.forEach(m => {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m;
    selectMunicipio.appendChild(option);
  });
}
