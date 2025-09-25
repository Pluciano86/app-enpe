import { supabase } from '../shared/supabaseClient.js';
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
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null)
    );
  });
}

async function mostrarNombreArea(idArea, idMunicipio = null) {
  const { data, error } = await supabase
    .from('Area')
    .select('nombre')
    .eq('idArea', idArea)
    .single();

  if (error || !data) return;

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

  const { data: municipios } = await supabase
    .from('Municipios')
    .select('id, nombre')
    .eq('idArea', idArea)
    .order('nombre', { ascending: true });

  if (!municipios) return;

  container.innerHTML = '';

  municipios.forEach(m => {
    const nombreImagen = m.nombre
      .normalize("NFD").replace(/[\u0300-\u036f]/g, '')
      .replace(/\u00f1/g, 'n').replace(/\u00d1/g, 'N')
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
    card.onclick = () => {
      window.location.href = `listadoArea.html?idArea=${idAreaGlobal}&idMunicipio=${m.id}`;
    };

    container.appendChild(card);
  });
}

async function cargarPorTipo(tabla, idArea, containerId, cardFunc) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const { data: municipios } = await supabase
    .from('Municipios')
    .select('id, costa')
    .eq('idArea', idArea);

  if (!municipios || municipios.length === 0) return;

  const municipioActual = municipios.find(m => m.id === municipioSeleccionado);
  if (tabla === 'playas' && municipioSeleccionado && municipioActual?.costa === false) {
    const section = container.closest('section');
    if (section) section.classList.add('hidden');
    return;
  }

  const idsMunicipios = municipioSeleccionado
    ? [municipioSeleccionado]
    : municipios.map(m => m.id);

  const campo = tabla === 'eventos' ? 'municipio_id' : 'idMunicipio';

    const query = supabase
    .from(tabla)
    .select('*')
    .in(campo, idsMunicipios);

  if (tabla !== 'Comercios') {
    query.eq('activo', true);
  }

  const { data: resultados } = await query;
  if (!resultados || resultados.length === 0) {
    const section = container.closest('section');
    if (section) section.classList.add('hidden');
    return;
  }

  // Calcular distancias
   let conTiempos = [];

  if (tabla === 'eventos') {
    conTiempos = [...resultados].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  } else {
    const coords = resultados.filter(r => r.latitud && r.longitud);
    const userCoords = await obtenerUbicacionUsuario();
    conTiempos = userCoords
      ? await calcularTiemposParaLista(coords, userCoords)
      : coords;

    if (userCoords) conTiempos.sort((a, b) => a.minutosCrudos - b.minutosCrudos);
  }

  // ✅ UNA SOLA CONSULTA DE IMÁGENES POR TIPO
  if (tabla === 'Comercios') {
    const ids = conTiempos.map(c => c.id);
    const { data: imagenes } = await supabase
      .from('imagenesComercios')
      .select('idComercio, imagen, logo, portada')
      .in('idComercio', ids);

    const base = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/';

    conTiempos.forEach(c => {
      const imagenesComercio = imagenes.filter(i => i.idComercio === c.id);
      const logo = imagenesComercio.find(i => i.logo)?.imagen;
      const portada = imagenesComercio.find(i => i.portada)?.imagen;
      c.logo = logo ? `${base}${logo}` : null;
      c.imagenPortada = portada ? `${base}${portada}` : null;
    });
  }

  if (tabla === 'LugaresTuristicos') {
    const ids = conTiempos.map(c => c.id);
    const { data: imagenes } = await supabase
      .from('imagenesLugares')
      .select('idLugar, imagen, portada')
      .eq('portada', true)
      .in('idLugar', ids);

    conTiempos.forEach(c => {
      const match = imagenes.find(i => i.idLugar === c.id);
      c.imagen = match?.imagen || null;
    });
  }

  if (tabla === 'playas') {
    const ids = conTiempos.map(c => c.id);
    const { data: imagenes } = await supabase
      .from('imagenesPlayas')
      .select('idPlaya, imagen, portada')
      .eq('portada', true)
      .in('idPlaya', ids);

    conTiempos.forEach(c => {
      const match = imagenes.find(i => i.idPlaya === c.id);
      c.imagen = match?.imagen || null;
    });
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
  const sufijo = municipioSeleccionado
    ? `en ${document.querySelector('header h1')?.textContent.replace('Descubre ', '')}`
    : `del Área ${nombreAreaActual}`;

  const actualiza = (selector, texto) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = texto;
  };

  actualiza('#cercanosComidaContainer h2', `Lugares para Comer ${sufijo}`);
  actualiza('#sliderPlayasCercanas h2', `Chequea las Playas ${sufijo}`);
  actualiza('#cercanosLugaresContainer h2', `Lugares de Interés ${sufijo}`);
  actualiza('#eventosContainer h2', `Eventos ${sufijo}`);
  actualiza('h2.text-xl', `Municipios del Área ${nombreAreaActual}`);
}

cargarTodoDesdeCoords();