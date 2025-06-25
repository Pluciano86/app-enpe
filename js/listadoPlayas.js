// listadoPlayas.js
import { obtenerClima } from "./obtenerClima.js";
import { supabase } from "./supabaseClient.js";
import { calcularTiemposParaLugares } from './distanciaLugar.js';

const inputBuscar = document.getElementById("inputBuscar");
const selectCosta = document.getElementById("selectCosta");
const selectMunicipio = document.getElementById("selectMunicipio");
const contenedor = document.getElementById("contenedorPlayas");
const template = document.getElementById("templateCard");

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

// Calcular distancias con API de Google Maps
async function calcularTiempos() {
  if (!usuarioLat || !usuarioLon) return;
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

async function renderizarPlayas() {
  contenedor.innerHTML = "";
  const texto = inputBuscar.value.toLowerCase();
  const costa = selectCosta.value;
  const municipio = selectMunicipio.value;

  const filtradas = todasLasPlayas.filter((p) => {
    const coincideNombre = p.nombre.toLowerCase().includes(texto);
    const coincideCosta = costa ? p.costa === costa : true;
    const coincideMunicipio = municipio ? p.municipio === municipio : true;
    return coincideNombre && coincideCosta && coincideMunicipio;
  });

  for (const playa of filtradas) {
    const clone = template.content.cloneNode(true);
    const img = clone.querySelector(".imagen");
    img.src = playa.imagen || "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/imgPlayaNoDisponible.jpg";
    img.alt = `Imagen de ${playa.nombre}`;

    clone.querySelector(".nombre").textContent = playa.nombre;
    clone.querySelector(".municipio").textContent = playa.municipio;

    // Actividades
    if (playa.nadar) clone.querySelector(".icon-nadar").classList.remove("hidden");
    if (playa.surfear) clone.querySelector(".icon-surfear").classList.remove("hidden");
    if (playa.snorkel) clone.querySelector(".icon-snorkel").classList.remove("hidden");

    // Transporte
    const iconTransporte = clone.querySelector(".icon-transporte");
    const distancia = clone.querySelector(".distancia");
    if (playa.bote) {
      iconTransporte.innerHTML = '<i class="fas fa-ship" style="color: #636466;"></i>';
      distancia.textContent = "Acceso en bote";
    } else {
      iconTransporte.innerHTML = '<i class="fas fa-car" style="color: #636466;"></i>';
      distancia.textContent = playa.tiempoVehiculo || "";
    }

    // Icono de ubicación
    const iconPin = clone.querySelector(".icon-pin");
    if (iconPin) iconPin.innerHTML = '<i class="fas fa-map-pin" style="color: #23B4E9;"></i>';

    // Clima actual
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
        img.classList.add("w-6", "h-6", "inline");
        iconClima.innerHTML = "";
        iconClima.appendChild(img);
      }
      if (viento) viento.innerHTML = `<i class="fas fa-wind text-gray-400"></i> ${clima.viento}`;
    }

    contenedor.appendChild(clone);
  }
}

// Cargar filtros dinámicamente (si tienes tabla de costas y municipios)
async function cargarFiltros() {
  // Por ahora podrías llenar esto manual o desde otra tabla si lo deseas luego
}

// Lógica para llenar municipios por costa
function cargarMunicipios() {
  const costaSeleccionada = selectCosta.value;
  const municipiosUnicos = [...new Set(
    todasLasPlayas
      .filter(p => p.costa === costaSeleccionada)
      .map(p => p.municipio)
  )];

  selectMunicipio.innerHTML = `<option value="">Todos</option>`;
  municipiosUnicos.forEach(m => {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m;
    selectMunicipio.appendChild(option);
  });
}