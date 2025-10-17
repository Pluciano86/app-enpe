import { supabase } from '../shared/supabaseClient.js';
import { cardLugarSlide } from './cardLugarSlide.js';
import { cardPlayaSlide } from './cardPlayaSlide.js';
import { cardEventoSlide } from './cardEventoSlide.js';
import { renderEventosCarousel } from "./eventosCarousel.js";
import { renderJangueoCarouselArea } from "./jangueoCarouselArea.js";

let municipioSeleccionado = null;
let nombreAreaActual = '';
let idAreaGlobal = null;

async function mostrarNombreArea(idArea, idMunicipio = null) {
  const { data: area } = await supabase.from('Area').select('nombre').eq('idArea', idArea).single();
  if (!area) return;
  nombreAreaActual = area.nombre;

  const h1 = document.querySelector('header h1');
  if (idMunicipio) {
    const { data: muni } = await supabase.from('Municipios').select('nombre, imagen').eq('id', idMunicipio).single();
    if (muni) {
      h1.innerHTML = `<img src="${muni.imagen}" class="w-28 h-16 object-cover rounded-lg inline-block mr-3 align-middle shadow"/>Descubre ${muni.nombre}`;
    }
  } else {
    h1.textContent = `Descubre el Área ${area.nombre}`;
  }
}

async function cargarDropdownMunicipios(idArea, idMunicipioSeleccionado) {
  const dropdown = document.getElementById('dropdownMunicipios');
  dropdown.innerHTML = `<option value="">Cargando municipios...</option>`;

  const { data: municipios } = await supabase
    .from('Municipios')
    .select('id, nombre')
    .eq('idArea', idArea)
    .order('nombre');

  dropdown.innerHTML = `<option value="">Selecciona un municipio...</option>`;
  municipios.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.nombre;
    if (parseInt(m.id) === parseInt(idMunicipioSeleccionado)) opt.selected = true;
    dropdown.appendChild(opt);
  });

  const volverContainer = document.getElementById('volverAreaContainer');
  if (idMunicipioSeleccionado) {
    volverContainer.innerHTML = `<button id="btnVolverArea" class="text-[#23b4e9] font-medium underline text-lg hover:text-blue-700">← Volver a descubrir el Área ${nombreAreaActual}</button>`;
    document.getElementById('btnVolverArea').onclick = () => window.location.href = `listadoArea.html?idArea=${idArea}`;
    dropdown.parentElement.classList.add('hidden');
  } else {
    volverContainer.innerHTML = '';
    dropdown.parentElement.classList.remove('hidden');
  }

// 🔹 Nuevo comportamiento dinámico sin recargar
dropdown.addEventListener('change', async (e) => {
  const idMunicipio = e.target.value ? parseInt(e.target.value) : null;

  // 🔸 Actualizar filtros globales
  window.filtrosArea = {
    idArea,
    idMunicipio,
  };

  // 🔸 Actualizar el nombre del header
  await mostrarNombreArea(idArea, idMunicipio);

  // 🔸 Recargar dinámicamente el carrusel de Jangueo
  await renderJangueoCarouselArea("jangueoCarousel");

  // 🔸 También se puede recargar el de eventos si deseas
  await renderEventosCarousel("eventosCarousel", { idArea, idMunicipio });

  // 🔸 🔥 Actualizar el grid de comida sin recargar
  window.dispatchEvent(new CustomEvent("areaCargada", {
    detail: { idArea, idMunicipio },
}));
}); // 👈👈 este cierre FALTABA
}

export async function obtenerParametros() {
  const params = new URLSearchParams(window.location.search);
  return {
    idArea: parseInt(params.get('idArea')),
    idMunicipio: parseInt(params.get('idMunicipio')),
  };
}

async function cargarTodo() {
  const { idArea, idMunicipio } = await obtenerParametros();
  idAreaGlobal = idArea;
  municipioSeleccionado = isNaN(idMunicipio) ? null : idMunicipio;

  // 🔸 Guardar filtros globales accesibles desde cualquier módulo
  window.filtrosArea = {
    idArea,
    idMunicipio,
  };

  await mostrarNombreArea(idArea, municipioSeleccionado);
  await cargarDropdownMunicipios(idArea, municipioSeleccionado);
  await renderEventosCarousel("eventosCarousel", { idArea, idMunicipio });
  await renderJangueoCarouselArea("jangueoCarousel");

  // 🔹 Disparar evento para que otros módulos escuchen el área cargada
  window.dispatchEvent(new CustomEvent('areaCargada', {
    detail: { idArea, idMunicipio },
  }));
}

cargarTodo();