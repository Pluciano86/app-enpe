import { supabase } from './supabaseClient.js';
import { cardComercioSlide } from './cardComercioSlide.js';
import { cardLugarSlide } from './cardLugarSlide.js';
import { cardPlayaSlide } from './cardPlayaSlide.js';
import { cardEventoSlide } from './cardEventoSlide.js';
import { calcularTiemposParaLista } from './calcularTiemposParaLista.js';

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

  const h1 = document.querySelector('header h1');
  if (h1 && data?.nombre) {
    h1.textContent = `Descubre el Área ${data.nombre}`;
    document.title = `Descubre el Área ${data.nombre}`;
  }
}

async function cargarPorTipo(tabla, idArea, containerId, cardFunc) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { data: municipios, error: errorMunicipios } = await supabase
    .from('Municipios')
    .select('id')
    .eq('idArea', idArea);

  if (errorMunicipios || !municipios || municipios.length === 0) {
    console.warn(`No se encontraron municipios para idArea ${idArea}`);
    return;
  }

  const idMunicipios = municipios.map(m => m.id);
  const campoMunicipio = tabla === 'eventos' ? 'municipio_id' : 'idMunicipio';

  const { data, error } = await supabase
    .from(tabla)
    .select('*')
    .in(campoMunicipio, idMunicipios)
    .eq('activo', true);

  if (error || !data) {
    console.error(`Error cargando ${tabla}:`, error);
    return;
  }

  let conTiempos = [];

  if (tabla === 'eventos') {
    conTiempos = [...data].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  } else {
    const coords = data.filter(d => d.latitud && d.longitud);

    const userCoords = await obtenerUbicacionUsuario().catch(err => {
      console.warn("No se pudo obtener ubicación del usuario:", err);
      return null;
    });

    conTiempos = coords;
    if (userCoords) {
      conTiempos = await calcularTiemposParaLista(coords, userCoords);
      conTiempos.sort((a, b) => a.minutosCrudos - b.minutosCrudos);
    }
  }

  // 🔁 INYECTAR LOGO Y PORTADA SOLO EN COMERCIOS
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

  const storageUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/';

if (tabla === 'playas' || tabla === 'LugaresTuristicos') {
  for (const item of conTiempos) {
    if (item.imagen && !item.imagen.startsWith('http')) {
      const result = supabase
        .storage
        .from('galeriacomercios')
        .getPublicUrl(item.imagen);
      item.imagen = result?.data?.publicUrl || null;
    }
  }
}

  if (conTiempos.length > 0) {
    console.log(`✅ Mostrando ${conTiempos.length} resultados para ${tabla}`);
    conTiempos.forEach(c => {
      const card = cardFunc(c);
      if (card instanceof HTMLElement) {
        container.appendChild(card);
      } else {
        console.warn(`⚠️ cardFunc no devolvió un elemento válido para ${tabla}`, c);
      }
    });
    const section = container.closest("section");
    if (section) section.classList.remove("hidden");
  } else {
    console.log(`🔍 No hay resultados visibles para ${tabla}`);
  }
}

async function cargarTodoDesdeCoords() {
  const params = new URLSearchParams(window.location.search);
  const idArea = parseInt(params.get('idArea'));
  if (!idArea) return;

  await mostrarNombreArea(idArea);

  await cargarPorTipo('Comercios', idArea, 'sliderCercanosComida', cardComercioSlide);
  await cargarPorTipo('LugaresTuristicos', idArea, 'sliderCercanosLugares', cardLugarSlide);
  await cargarPorTipo('playas', idArea, 'sliderPlayasCercanas', cardPlayaSlide);
  await cargarPorTipo('eventos', idArea, 'sliderEventos', cardEventoSlide);
}

cargarTodoDesdeCoords();