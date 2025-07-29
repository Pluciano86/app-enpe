import { supabase } from './supabaseClient.js';
import { cardComercioSlide } from './cardComercioSlide.js';
import { cardLugarSlide } from './cardLugarSlide.js';
import { cardPlayaSlide } from './cardPlayaSlide.js';
import { cardEventoSlide } from './cardEventoSlide.js';
import { calcularTiemposParaLista } from './calcularTiemposParaLista.js';

let municipioSeleccionado = null;
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

async function mostrarNombreArea(idArea, idMunicipio = null) {
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
    if (idMunicipio) {
      const { data: muniData } = await supabase
        .from('Municipios')
        .select('nombre')
        .eq('id', idMunicipio)
        .single();
      h1.textContent = `Descubre ${muniData?.nombre || ''}`;
    } else {
      h1.textContent = `Descubre el Área ${data.nombre}`;
    }
    document.title = h1.textContent;
  }
}

async function mostrarMunicipios(idArea) {
  const container = document.getElementById('gridMunicipios');
  if (!container) return;

  const { data: municipios, error } = await supabase
    .from('Municipios')
    .select('id, nombre')
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
      window.location.href = `listadoArea.html?idArea=${idAreaGlobal}&idMunicipio=${m.id}`;
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
  if (tabla === 'playas' && municipioSeleccionado && municipioActual?.costa === false) {
    console.log('🌴 Municipio sin costa, no se muestran playas');
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
    const userCoords = await obtenerUbicacionUsuario().catch(() => null);
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
  const params = new URLSearchParams(window.location.search);
  const idArea = parseInt(params.get('idArea'));
  const idMunicipio = parseInt(params.get('idMunicipio'));
  if (!idArea) return;

  idAreaGlobal = idArea;
  municipioSeleccionado = isNaN(idMunicipio) ? null : idMunicipio;

  await mostrarNombreArea(idArea, municipioSeleccionado);
  if (!municipioSeleccionado) {
    await mostrarMunicipios(idArea);
  } else {
    document.getElementById('gridMunicipios')?.classList.add('hidden');
    document.querySelector('h2.text-xl')?.classList.add('hidden');

    const volverBtn = document.createElement('button');
    volverBtn.id = 'btnVolverArea';
    volverBtn.textContent = `← Volver al Área ${nombreAreaActual}`;
    volverBtn.className = 'block mx-auto mt-4 text-blue-600 font-medium underline';
    volverBtn.onclick = () => {
      window.location.href = `listadoArea.html?idArea=${idArea}`;
    };

    if (!document.getElementById('btnVolverArea')) {
      document.getElementById('gridMunicipios')?.parentElement?.appendChild(volverBtn);
    }
  }

  await cargarPorTipo('Comercios', idArea, 'sliderCercanosComida', cardComercioSlide);
  await cargarPorTipo('LugaresTuristicos', idArea, 'sliderCercanosLugares', cardLugarSlide);
  await cargarPorTipo('playas', idArea, 'sliderPlayasCercanas', cardPlayaSlide);
  await cargarPorTipo('eventos', idArea, 'sliderEventos', cardEventoSlide);

  actualizarTitulos();
}

function actualizarTitulos() {
  const comidaTitle = document.querySelector('#cercanosComidaContainer h2');
  const playaTitle = document.querySelector('#cercanosPlayasContainer h2');
  const lugaresTitle = document.querySelector('#cercanosLugaresContainer h2');
  const eventosTitle = document.querySelector('#eventosContainer h2');
  const municipiosTitle = document.querySelector('h2.text-xl');

  const sufijo = municipioSeleccionado
    ? `en ${document.querySelector('header h1')?.textContent.replace('Descubre ', '')}`
    : `del Área ${nombreAreaActual}`;

  if (municipiosTitle)
    municipiosTitle.textContent = `Municipios del Área ${nombreAreaActual}`;
  if (comidaTitle)
    comidaTitle.textContent = `Vamos a Comer ${sufijo}`;
  if (playaTitle)
    playaTitle.textContent = `Chequea las Playas ${sufijo}`;
  if (lugaresTitle)
    lugaresTitle.textContent = `Descubre estos Lugares de Interés ${sufijo}`;
  if (eventosTitle)
    eventosTitle.textContent = `Eventos ${sufijo}`;
}

cargarTodoDesdeCoords();