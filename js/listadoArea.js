import { supabase } from './supabaseClient.js';
import { cardComercioSlide } from './cardComercioSlide.js';
import { cardLugarSlide } from './cardLugarSlide.js';
import { cardPlayaSlide } from './cardPlayaSlide.js';
import { cardEventoSlide } from './cardEventoSlide.js';
import { calcularTiemposParaLista } from './calcularTiemposParaLista.js';

let municipioSeleccionado = null;
let nombreMunicipioSeleccionado = '';
let nombreAreaActual = '';
let idAreaGlobal = null;

async function obtenerUbicacionUsuario() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err)
    );
  });
}

async function mostrarNombreArea(idArea) {
  const { data, error } = await supabase
    .from('Area')
    .select('nombre')
    .eq('idArea', idArea)
    .single();

  if (error) {
    console.warn('No se pudo cargar el nombre del área:', error);
    return;
  }

  nombreAreaActual = data.nombre;

  const h1 = document.querySelector('header h1');
  if (h1) {
    h1.textContent = `Descubre el Área ${data.nombre}`;
    document.title = `Descubre el Área ${data.nombre}`;
  }
}

async function mostrarMunicipios(idArea) {
  const container = document.getElementById('gridMunicipios');
  if (!container) return;

  const { data: municipios, error } = await supabase
    .from('Municipios')
    .select('id, nombre, costa')
    .eq('idArea', idArea)
    .order('nombre', { ascending: true });

  if (error || !municipios) {
    console.error('Error cargando municipios:', error);
    return;
  }

  container.innerHTML = '';

  municipios.forEach(m => {
    const nombreImagen = m.nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\u00f1/g, 'n')
      .replace(/\u00d1/g, 'N')
      .toLowerCase();

    const url = `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenmunicipio/${nombreImagen}.jpg`;

    const card = document.createElement('div');
    card.className = 'w-[20%] p-1 flex flex-col items-center text-center cursor-pointer';

    card.innerHTML = `
      <div class="aspect-square w-full rounded-xl overflow-hidden bg-gray-200 shadow">
        <img src="${url}" alt="${m.nombre}" class="w-full h-full object-cover" />
      </div>
      <div class="mt-2 text-sm font-medium">${m.nombre}</div>
    `;

    card.addEventListener('click', () => {
      municipioSeleccionado = m.id;
      nombreMunicipioSeleccionado = m.nombre;

      const titulo = document.querySelector('header h1');
      if (titulo) titulo.textContent = `Descubre ${m.nombre}`;

      document.getElementById('gridMunicipios')?.classList.add('hidden');
      document.querySelector('h2.text-xl')?.classList.add('hidden');

      const volverBtn = document.createElement('button');
      volverBtn.id = 'btnVolverArea';
      volverBtn.textContent = `← Volver al Área ${nombreAreaActual}`;
      volverBtn.className = 'block mx-auto mt-4 text-blue-600 font-medium underline';

      volverBtn.onclick = () => {
        // 👉 Refrescar la página original con el idArea
        window.location.href = `listadoArea.html?idArea=${idAreaGlobal}`;
      };

      if (!document.getElementById('btnVolverArea')) {
        container.parentElement.insertBefore(volverBtn, container.nextSibling);
      }

      cargarTodoDesdeCoords();
    });

    container.appendChild(card);
  });
}

async function cargarPorTipo(tabla, idArea, containerId, cardFunc) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const { data: municipios, error: errorMunicipios } = await supabase
    .from('Municipios')
    .select('id, costa')
    .eq('idArea', idArea);

  if (errorMunicipios || !municipios || municipios.length === 0) {
    console.warn(`No se encontraron municipios para idArea ${idArea}`);
    return;
  }

  const municipioActual = municipios.find(m => m.id === municipioSeleccionado);

  // ⚠️ Oculta playas si no hay costa
  if (tabla === 'playas' && municipioSeleccionado && municipioActual?.costa === false) {
    console.log('🌴 Municipio sin costa, ocultando playas');
    const section = container.closest('section');
    if (section) section.classList.add('hidden');
    return;
  }

  const idMunicipios = municipioSeleccionado ? [municipioSeleccionado] : municipios.map(m => m.id);
  const campoMunicipio = tabla === 'eventos' ? 'municipio_id' : 'idMunicipio';

  const { data, error } = await supabase
    .from(tabla)
    .select('*')
    .in(campoMunicipio, idMunicipios)
    .eq('activo', true);

  if (error || !data || data.length === 0) {
    console.log(`🔍 No hay resultados para ${tabla}`);
    const section = container.closest('section');
    if (section) section.classList.add('hidden');
    return;
  }

  let conTiempos = [];
  if (tabla === 'eventos') {
    conTiempos = [...data].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  } else {
    const coords = data.filter(d => d.latitud && d.longitud);
    const userCoords = await obtenerUbicacionUsuario().catch(err => null);
    conTiempos = userCoords ? await calcularTiemposParaLista(coords, userCoords) : coords;
    if (userCoords) conTiempos.sort((a, b) => a.minutosCrudos - b.minutosCrudos);
  }

  if (tabla === 'Comercios') {
    for (const c of conTiempos) {
      const { data: imagenes } = await supabase
        .from('imagenesComercios')
        .select('imagen, logo, portada')
        .eq('idComercio', c.id);

      const storageUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/';
      const logo = imagenes?.find(i => i.logo)?.imagen;
      const portada = imagenes?.find(i => i.portada)?.imagen;
      c.logo = logo ? `${storageUrl}${logo}` : null;
      c.imagenPortada = portada ? `${storageUrl}${portada}` : null;
    }
  }

  for (const item of conTiempos) {
    if (item.imagen && !item.imagen.startsWith('http')) {
      const bucket =
        tabla === 'playas' ? 'galeriaplayas' :
        tabla === 'LugaresTuristicos' ? 'galerialugares' : null;

      if (bucket) {
        const result = supabase.storage.from(bucket).getPublicUrl(item.imagen);
        item.imagen = result?.data?.publicUrl || null;
      }
    }
  }

  conTiempos.forEach(c => {
    const card = cardFunc(c);
    if (card instanceof HTMLElement) container.appendChild(card);
  });

  const section = container.closest('section');
  if (section) section.classList.remove('hidden');
}

async function cargarTodoDesdeCoords() {
  await cargarPorTipo('Comercios', idAreaGlobal, 'sliderCercanosComida', cardComercioSlide);
  await cargarPorTipo('LugaresTuristicos', idAreaGlobal, 'sliderCercanosLugares', cardLugarSlide);
  await cargarPorTipo('playas', idAreaGlobal, 'sliderPlayasCercanas', cardPlayaSlide);
  await cargarPorTipo('eventos', idAreaGlobal, 'sliderEventos', cardEventoSlide);
}

// Inicialización
const params = new URLSearchParams(window.location.search);
const idArea = parseInt(params.get('idArea'));
if (idArea) {
  idAreaGlobal = idArea;
  mostrarNombreArea(idArea);
  mostrarMunicipios(idArea);
  cargarTodoDesdeCoords();
}