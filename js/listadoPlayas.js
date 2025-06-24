// listadoPlayas.js
import { obtenerClima } from "./obtenerClima.js";
import { supabase } from "./supabaseClient.js";

const inputBuscar = document.getElementById("inputBuscar");
const selectCosta = document.getElementById("selectCosta");
const selectMunicipio = document.getElementById("selectMunicipio");
const contenedor = document.getElementById("contenedorPlayas");
const template = document.getElementById("templateCard");

let todasLasPlayas = [];

// Cargar playas desde Supabase
async function cargarPlayas() {
  const { data, error } = await supabase.from("playas").select("*");
  if (error) return console.error("Error cargando playas:", error);
  todasLasPlayas = data;
  renderizarPlayas();
  cargarFiltros();
}

inputBuscar.addEventListener("input", renderizarPlayas);
selectCosta.addEventListener("change", () => {
  renderizarPlayas();
  cargarMunicipios();
});
selectMunicipio.addEventListener("change", renderizarPlayas);

function renderizarPlayas() {
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

  filtradas.forEach(async (playa) => {
    const clone = template.content.cloneNode(true);
    clone.querySelector(".imagen").src = playa.imagen || "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/imgPlayaNoDisponible.jpg";
    clone.querySelector(".nombre").textContent = playa.nombre;
    clone.querySelector(".municipio").textContent = playa.municipio;

    if (playa.nadar) clone.querySelector(".icon-nadar").classList.remove("hidden");
    if (playa.surfear) clone.querySelector(".icon-surfear").classList.remove("hidden");
    if (playa.snorkel) clone.querySelector(".icon-snorkel").classList.remove("hidden");

    const iconTransporte = clone.querySelector(".icon-transporte");
    const distancia = clone.querySelector(".distancia");
    if (playa.bote) {
      iconTransporte.textContent = "⛴";
      distancia.textContent = "Acceso en bote";
    } else {
      iconTransporte.textContent = "🚗";
      distancia.textContent = playa.distancia ? `${playa.distancia} min` : "";
    }

    const iconClima = clone.querySelector(".icon-clima");
    const estadoClima = clone.querySelector(".estado-clima");
    const clima = await obtenerClima(playa.latitud, playa.longitud);
    if (clima) {
      iconClima.textContent = clima.icono;
      estadoClima.textContent = clima.estado;
    }

    contenedor.appendChild(clone);
  });
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

cargarPlayas();