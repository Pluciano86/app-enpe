// listadoArea.js
import { supabase } from '../shared/supabaseClient.js';
import { cardLugarSlide } from './cardLugarSlide.js';
import { cardPlayaSlide } from './cardPlayaSlide.js';
import { cardEventoSlide } from './cardEventoSlide.js';
import { calcularTiemposParaLista } from './calcularTiemposParaLista.js';

let municipioSeleccionado = null;
let nombreAreaActual = '';
let idAreaGlobal = null;

/* 🔹 Obtener ubicación del usuario */
async function obtenerUbicacionUsuario() {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null)
    );
  });
}

/* 🔹 Mostrar nombre del área o municipio con imagen rectangular */
async function mostrarNombreArea(idArea, idMunicipio = null) {
  const { data: area, error: areaError } = await supabase
    .from('Area')
    .select('nombre')
    .eq('idArea', idArea)
    .single();

  if (areaError || !area) return;
  nombreAreaActual = area.nombre;

  const h1 = document.querySelector('header h1');
  if (!h1) return;

  if (idMunicipio) {
    const { data: muni } = await supabase
      .from('Municipios')
      .select('nombre, imagen')
      .eq('id', idMunicipio)
      .single();

    if (muni) {
      h1.innerHTML = `
        <img src="${muni.imagen}" alt="${muni.nombre}"
             class="w-28 h-16 object-cover rounded-lg inline-block mr-3 align-middle shadow" />
        Descubre ${muni.nombre}
      `;
    } else {
      h1.textContent = `Descubre el Área ${area.nombre}`;
    }
  } else {
    h1.textContent = `Descubre el Área ${area.nombre}`;
  }

  document.title = h1.textContent;
}

/* 🔹 Cargar dropdown de municipios */
async function cargarDropdownMunicipios(idArea, idMunicipioSeleccionado) {
  const dropdown = document.getElementById('dropdownMunicipios');
  if (!dropdown) return;

  dropdown.innerHTML = `<option value="">Cargando municipios...</option>`;

  const { data: municipios, error } = await supabase
    .from('Municipios')
    .select('id, nombre')
    .eq('idArea', idArea)
    .order('nombre');

  if (error || !municipios?.length) {
    dropdown.innerHTML = `<option value="">No hay municipios disponibles</option>`;
    return;
  }

  dropdown.innerHTML = `<option value="">Selecciona un municipio...</option>`;
  municipios.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.nombre;
    if (parseInt(m.id) === parseInt(idMunicipioSeleccionado)) opt.selected = true;
    dropdown.appendChild(opt);
  });

  // 🔹 Botón “Volver al área”
  const volverContainer = document.getElementById('volverAreaContainer');
  if (idMunicipioSeleccionado) {
    volverContainer.innerHTML = `
      <button id="btnVolverArea"
        class="text-[#23b4e9] font-medium underline text-lg hover:text-blue-700 transition">
        ← Volver a descubrir el Área ${nombreAreaActual}
      </button>
    `;
    document.getElementById('btnVolverArea').onclick = () => {
      window.location.href = `listadoArea.html?idArea=${idArea}`;
    };
    dropdown.parentElement.classList.add('hidden');
  } else {
    volverContainer.innerHTML = '';
    dropdown.parentElement.classList.remove('hidden');
  }

  // 🔹 Cambiar municipio
  dropdown.addEventListener('change', (e) => {
    const idMunicipio = e.target.value;
    const nuevaURL = new URL(window.location.href);
    if (idMunicipio) {
      nuevaURL.searchParams.set('idMunicipio', idMunicipio);
    } else {
      nuevaURL.searchParams.delete('idMunicipio');
    }
    window.location.href = nuevaURL.toString();
  });
}

/* 🔹 Mostrar municipios (cuando no hay municipio seleccionado) */
async function mostrarMunicipios(idArea) {
  const container = document.getElementById('gridMunicipios');
  if (!container) return;

  const { data: municipios } = await supabase
    .from('Municipios')
    .select('id, nombre, imagen')
    .eq('idArea', idArea)
    .order('nombre', { ascending: true });

  if (!municipios) return;

  container.innerHTML = '';
  municipios.forEach(m => {
    const card = document.createElement('div');
    card.className = 'w-[45%] sm:w-[20%] p-2 flex flex-col items-center text-center cursor-pointer';
    card.innerHTML = `
      <div class="aspect-[5/3] w-full rounded-xl overflow-hidden bg-gray-200 shadow">
        <img src="${m.imagen}" alt="${m.nombre}" class="w-full h-full object-cover" />
      </div>
      <div class="mt-2 text-sm font-medium">${m.nombre}</div>
    `;
    card.onclick = () => {
      window.location.href = `listadoArea.html?idArea=${idArea}&idMunicipio=${m.id}`;
    };
    container.appendChild(card);
  });
}

/* 🔹 Cargar otras secciones: lugares, playas, eventos */
async function cargarPorTipo(tabla, idArea, containerId, cardFunc) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const { data: municipios } = await supabase
    .from('Municipios')
    .select('id, costa')
    .eq('idArea', idArea);

  if (!municipios?.length) return;
  const idsMunicipios = municipioSeleccionado
    ? [municipioSeleccionado]
    : municipios.map(m => m.id);

  const campo = tabla === 'eventos' ? 'municipio_id' : 'idMunicipio';
  let query = supabase.from(tabla).select('*').in(campo, idsMunicipios);

  if (tabla === 'eventos') {
    const hoy = new Date().toISOString().split('T')[0];
    query = query.gte('fecha', hoy).order('fecha', { ascending: true });
  }

  const { data: resultados } = await query;
  if (!resultados?.length) {
    container.closest('section')?.classList.add('hidden');
    return;
  }

  const fragment = document.createDocumentFragment();
  resultados.forEach(r => {
    const card = cardFunc(r);
    if (card instanceof HTMLElement) fragment.appendChild(card);
  });
  container.appendChild(fragment);
  container.closest('section')?.classList.remove('hidden');
}

/* 🔹 Cargar todo */
async function cargarTodoDesdeCoords() {
  try {
    const params = new URLSearchParams(window.location.search);
    const idArea = parseInt(params.get('idArea'));
    const idMunicipio = parseInt(params.get('idMunicipio'));
    if (!idArea) return;

    idAreaGlobal = idArea;
    municipioSeleccionado = isNaN(idMunicipio) ? null : idMunicipio;

    await mostrarNombreArea(idArea, municipioSeleccionado);
    await cargarDropdownMunicipios(idArea, municipioSeleccionado);

    if (!municipioSeleccionado) {
      await mostrarMunicipios(idArea);
    } else {
      document.getElementById('gridMunicipios')?.classList.add('hidden');
    }

    // Mantén tu gridComida.js para la sección de comida
    // Solo cargamos las demás secciones dinámicas
    await cargarPorTipo('LugaresTuristicos', idArea, 'sliderCercanosLugares', cardLugarSlide);
    await cargarPorTipo('playas', idArea, 'sliderPlayasCercanas', cardPlayaSlide);
    await cargarPorTipo('eventos', idArea, 'eventosCarousel', cardEventoSlide);

  } catch (err) {
    console.error('Error en cargarTodoDesdeCoords:', err);
  }
}

/* 🔹 Inicializar */
cargarTodoDesdeCoords();