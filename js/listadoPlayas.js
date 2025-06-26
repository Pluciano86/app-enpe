// listadoPlayas.js
import { obtenerClima } from "./obtenerClima.js";
import { supabase } from "./supabaseClient.js";
import { calcularTiemposParaLugares, calcularDistancia } from './distanciaLugar.js';

const inputBuscar = document.getElementById("inputBuscar");
const selectCosta = document.getElementById("selectCosta");
const selectMunicipio = document.getElementById("selectMunicipio");
const contenedor = document.getElementById("contenedorPlayas");
const template = document.getElementById("templateCard");

// Filtros de actividad
const checkNadar = document.getElementById("filtro-nadar");
const checkSurfear = document.getElementById("filtro-surfear");
const checkSnorkel = document.getElementById("filtro-snorkel");

let todasLasPlayas = [];
let usuarioLat = null;
let usuarioLon = null;

// Obtener ubicación del usuario
navigator.geolocation.getCurrentPosition(
  async (pos) => {
    usuarioLat = pos.coords.latitude;
    usuarioLon = pos.coords.longitude;
    await cargarPlayas();
    await calcularTiempos();
    renderizarPlayas();
  },
  async (err) => {
    console.warn("No se pudo obtener la ubicación del usuario", err);
    await cargarPlayas();
    renderizarPlayas();
  }
);

// Cargar playas desde Supabase
async function cargarPlayas() {
  const { data, error } = await supabase.from("playas").select("*");
  if (error) return console.error("Error cargando playas:", error);
  todasLasPlayas = data;
  cargarFiltros();
}

// Calcular tiempo de viaje desde la ubicación del usuario
async function calcularTiempos() {
  if (!usuarioLat || !usuarioLon) return;
  todasLasPlayas = await calcularTiemposParaLugares(todasLasPlayas, {
    lat: usuarioLat,
    lon: usuarioLon
  });
}

// Listeners
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
    const pasaFiltroNadar = !filtrarNadar || p.nadar;
    const pasaFiltroSurfear = !filtrarSurfear || p.surfear;
    const pasaFiltroSnorkel = !filtrarSnorkel || p.snorkel;
    return coincideNombre && coincideCosta && coincideMunicipio &&
           pasaFiltroNadar && pasaFiltroSurfear && pasaFiltroSnorkel;
  });

  if (usuarioLat && usuarioLon) {
    filtradas = filtradas
      .filter(p => p.latitud && p.longitud)
      .map(p => {
        const d = calcularDistancia(usuarioLat, usuarioLon, p.latitud, p.longitud);
        return { ...p, _distancia: d };
      })
      .sort((a, b) => a._distancia - b._distancia);
  }

  for (const playa of filtradas) {
    const clone = template.content.cloneNode(true);
    const img = clone.querySelector(".imagen");
    img.src = playa.imagen || "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/imgPlayaNoDisponible.jpg";
    img.alt = `Imagen de ${playa.nombre}`;

    clone.querySelector(".nombre").textContent = playa.nombre;
    clone.querySelector(".municipio").textContent = playa.municipio;

    if (playa.nadar) clone.querySelector(".icon-nadar").classList.remove("hidden");
    if (playa.surfear) clone.querySelector(".icon-surfear").classList.remove("hidden");
    if (playa.snorkel) clone.querySelector(".icon-snorkel").classList.remove("hidden");

    const iconTransporte = clone.querySelector(".icon-transporte");
    const distancia = clone.querySelector(".distancia");
    if (playa.bote) {
      iconTransporte.innerHTML = '<i class="fas fa-ship" style="color: #636466;"></i>';
      distancia.textContent = "Acceso en bote";
    } else {
      iconTransporte.innerHTML = '<i class="fas fa-car" style="color: #9c9c9c;"></i>';
      distancia.textContent = playa.tiempoVehiculo || "";
    }

    const iconPin = clone.querySelector(".icon-pin");
    if (iconPin) iconPin.innerHTML = '<i class="fas fa-map-pin" style="color: #23B4E9;"></i>';

    const estadoClima = clone.querySelector(".estado-clima");
    const iconClima = clone.querySelector(".icon-clima");
    const viento = clone.querySelector(".viento");

    const clima = await obtenerClima(playa.latitud, playa.longitud);
    if (clima) {
      estadoClima.textContent = clima.estado;
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

    contenedor.appendChild(clone);
  }
}

// Filtros dinámicos
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

// Municipios por costa
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