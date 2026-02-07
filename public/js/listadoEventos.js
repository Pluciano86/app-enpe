// listadoEventos.js
import { supabase } from '../shared/supabaseClient.js';
import { mostrarMensajeVacio, mostrarError, mostrarCargando } from './mensajesUI.js';
import { createGlobalBannerElement, destroyCarousel } from './bannerCarousel.js';
import { t } from './i18n.js';
import { abrirModal } from './modalEventos.js';

const lista = document.getElementById('listaEventos');
const filtroMunicipio = document.getElementById('filtroMunicipio');
const filtroCategoria = document.getElementById('filtroCategoria');
const filtroOrden = document.getElementById('filtroOrden');
const busquedaNombre = document.getElementById('busquedaNombre');

const btnHoy = document.getElementById('btnHoy');
const btnSemana = document.getElementById('btnSemana');
const btnGratis = document.getElementById('btnGratis');

// Estado
let eventos = [];
let municipios = {};
let categorias = {};
let filtroHoy = false;
let filtroSemana = false;
let filtroGratis = false;
let renderVersion = 0;

const cleanupCarousels = (container) => {
  if (!container) return;
  container
    .querySelectorAll(`[data-banner-carousel="true"]`)
    .forEach(destroyCarousel);
};

async function renderTopBannerEventos() {
  const filtrosSection = document.querySelector('section.p-4');
  if (!filtrosSection) return;

  let topContainer = document.querySelector('[data-banner-slot="top-eventos"]');
  if (!topContainer) {
    topContainer = document.createElement('div');
    topContainer.dataset.bannerSlot = 'top-eventos';
    filtrosSection.parentNode?.insertBefore(topContainer, filtrosSection);
  } else {
    cleanupCarousels(topContainer);
    topContainer.innerHTML = '';
  }

  const banner = await createGlobalBannerElement({ intervalMs: 8000, slotName: 'banner-top' });
  if (banner) {
    topContainer.appendChild(banner);
    topContainer.classList.remove('hidden');
  } else {
    topContainer.classList.add('hidden');
  }
}

async function crearBannerElemento(slotName = 'banner-inline') {
  try {
    return await createGlobalBannerElement({ intervalMs: 8000, slotName });
  } catch (error) {
    console.error('Error creando banner global:', error);
    return null;
  }
}

function ordenarFechas(fechas = []) {
  return [...fechas].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function eventoExpirado(evento) {
  const hoyISO = new Date().toISOString().slice(0, 10);
  const ultFecha = evento.fechas?.length ? evento.fechas[evento.fechas.length - 1].fecha : null;
  return ultFecha && ultFecha < hoyISO;
}

function obtenerProximaFecha(evento) {
  const hoyISO = new Date().toISOString().slice(0, 10);
  const ordenadas = ordenarFechas(evento.fechas);
  return ordenadas.find((item) => item.fecha >= hoyISO) || ordenadas[ordenadas.length - 1] || null;
}

function eventoEsHoy(evento) {
  const hoyISO = new Date().toISOString().slice(0, 10);
  return evento.fechas.some((item) => item.fecha === hoyISO);
}

function eventoEstaEnSemana(evento) {
  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(inicioSemana.getDate() + 6);

  return evento.fechas.some((item) => {
    const fecha = new Date(`${item.fecha}T00:00:00`);
    return fecha >= inicioSemana && fecha <= finSemana;
  });
}

async function cargarEventos() {
  mostrarCargando(lista);

  const { data, error } = await supabase
    .from('eventos')
    .select(`
      id,
      nombre,
      descripcion,
      costo,
      gratis,
      categoria,
      enlaceboletos,
      imagen,
      activo,
      eventos_municipios (
        id,
        municipio_id,
        lugar,
        direccion,
        eventoFechas (id, fecha, horainicio, mismahora)
      )
    `)
    .eq('activo', true);

  if (error) {
    console.error('Error cargando eventos:', error);
    mostrarError(lista, 'No pudimos cargar los eventos.', '🎭');
    return;
  }

  const hoyISO = new Date().toISOString().slice(0, 10);

  eventos = (data ?? [])
    .map((evento) => {
      const sedes = (evento.eventos_municipios || []).map((sede) => {
        const municipioNombre = municipios[sede.municipio_id] || '';
        const fechas = (sede.eventoFechas || []).map((item) => ({
          id: item.id,
          fecha: item.fecha,
          horainicio: item.horainicio,
          mismahora: item.mismahora ?? false,
          municipio_id: sede.municipio_id,
          municipioNombre,
          lugar: sede.lugar || '',
          direccion: sede.direccion || ''
        }));
        return {
          id: sede.id,
          municipio_id: sede.municipio_id,
          municipioNombre,
          lugar: sede.lugar || '',
          direccion: sede.direccion || '',
          fechas
        };
      });

      const municipioIds = Array.from(new Set(sedes.map((sede) => sede.municipio_id).filter(Boolean)));
      const municipioNombre =
        municipioIds.length > 1
          ? t('evento.variosMunicipios')
          : (municipios[municipioIds[0]] || '');

      const fechasOrdenadas = ordenarFechas(sedes.flatMap((sede) => sede.fechas || []));
      const ultimaFecha = fechasOrdenadas.length
        ? fechasOrdenadas[fechasOrdenadas.length - 1].fecha
        : null;
      const categoriaInfo = categorias[evento.categoria] || {};
      const eventoNormalizado = {
        ...evento,
        sedes,
        municipioIds,
        municipioNombre,
        categoriaNombre: categoriaInfo.nombre || '',
        categoriaIcono: categoriaInfo.icono || '',
        fechas: fechasOrdenadas,
        eventoFechas: fechasOrdenadas,
        ultimaFecha
      };
      return eventoNormalizado;
    })
    .filter((evento) => !evento.ultimaFecha || evento.ultimaFecha >= hoyISO);

  await renderizarEventos();
}

function normalizarTexto(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

async function renderizarEventos() {
  const currentRender = ++renderVersion;
  await renderTopBannerEventos();
  if (currentRender !== renderVersion) return;

  lista.className = 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 gap-y-6 px-4 md:px-6';
  cleanupCarousels(lista);
  lista.innerHTML = '';

  const texto = normalizarTexto(busquedaNombre.value.trim());
  const muni = filtroMunicipio.value;
  const cat = filtroCategoria.value;
  const orden = filtroOrden.value;

  let filtrados = eventos.filter((evento) => {
    const matchTexto = !texto || normalizarTexto(evento.nombre).includes(texto);
    const matchMuni = !muni || (evento.municipioIds || []).includes(Number(muni));
    const matchCat = !cat || evento.categoria == cat;

    let matchFiltro = true;
    if (filtroHoy) {
      matchFiltro = eventoEsHoy(evento);
    } else if (filtroSemana) {
      matchFiltro = eventoEstaEnSemana(evento);
    }

    if (filtroGratis) {
      matchFiltro = matchFiltro && evento.gratis === true;
    }

    return matchTexto && matchMuni && matchCat && matchFiltro;
  });

  if (orden === 'fechaAsc') {
    filtrados.sort((a, b) => {
      const fa = obtenerProximaFecha(a)?.fecha || '9999-12-31';
      const fb = obtenerProximaFecha(b)?.fecha || '9999-12-31';
      return fa.localeCompare(fb);
    });
  } else if (orden === 'fechaDesc') {
    filtrados.sort((a, b) => {
      const fa = obtenerProximaFecha(a)?.fecha || '0000-01-01';
      const fb = obtenerProximaFecha(b)?.fecha || '0000-01-01';
      return fb.localeCompare(fa);
    });
  } else if (orden === 'alfabetico') {
    filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  // Sin resultados
  if (filtrados.length === 0) {
    mostrarMensajeVacio(lista, 'No se encontraron eventos para los filtros seleccionados.', '🗓️');
    const bannerFinal = await crearBannerElemento('banner-bottom');
    if (currentRender !== renderVersion) return;
    if (bannerFinal) lista.appendChild(bannerFinal);
    return;
  }

  const fragment = document.createDocumentFragment();
  let cartasEnFila = 0;
  let totalFilas = 0;

  for (let i = 0; i < filtrados.length; i++) {
    const evento = filtrados[i];
    const proxima = obtenerProximaFecha(evento);
    const fechaDetalle = proxima ? obtenerPartesFecha(proxima.fecha) : null;
    const horaTexto = proxima?.horainicio ? formatearHora(proxima.horainicio) : '';
    const iconoCategoria = evento.categoriaIcono ? `<i class="fas ${evento.categoriaIcono}"></i>` : '';
    const costoRaw = evento.costo != null ? String(evento.costo).trim() : '';
    const costoConSimbolo = /^[\d,.]+$/.test(costoRaw) && !costoRaw.startsWith('$')
      ? `$${costoRaw}`
      : costoRaw;
    const costoTexto = evento.gratis
      ? 'Gratis'
      : costoConSimbolo
        ? (costoConSimbolo.toLowerCase().startsWith('costo') ? costoConSimbolo : `Costo: ${costoConSimbolo}`)
        : 'Costo no disponible';
    const div = document.createElement('div');
    div.className = 'bg-white rounded shadow hover:shadow-lg transition overflow-hidden cursor-pointer flex flex-col';
    div.innerHTML = `
      <div class="aspect-[4/5] w-full overflow-hidden bg-gray-200 relative">
        <img src="${evento.imagen}?v=${evento.id}" class="absolute inset-0 w-full h-full object-cover blur-md scale-110" alt="" />
        <img src="${evento.imagen}?v=${evento.id}" class="relative z-10 w-full h-full object-contain" alt="${evento.nombre}" />
      </div>
      <div class="p-3 flex flex-col flex-1">
        <div class="flex flex-col gap-2 flex-1">
          <h3 class="flex items-center justify-center text-center leading-tight text-lg font-bold line-clamp-2 h-12">${evento.nombre}</h3>
          <div class="flex items-center justify-center gap-1 text-sm text-orange-500">
            ${iconoCategoria}
            <span>${evento.categoriaNombre || ''}</span>
          </div>
          ${fechaDetalle ? `
            <div class="flex flex-col items-center justify-center gap-0 text-base text-red-600 font-medium leading-tight">
              <span>${fechaDetalle.weekday}</span>
              <span>${fechaDetalle.resto}</span>
            </div>
          ` : `
            <div class="flex items-center justify-center gap-1 text-sm text-red-600 font-medium leading-tight">Sin fecha</div>
          `}
          ${horaTexto ? `<div class="flex items-center justify-center gap-1 text-sm text-gray-500 leading-tight">${horaTexto}</div>` : ''}
          <div class="flex items-center justify-center gap-1 text-sm font-medium" style="color:#23B4E9;">
            <i class="fa-solid fa-map-pin"></i>
            <span>${evento.municipioNombre}</span>
          </div>
        </div>
        <div class="mt-3 text-sm font-semibold text-green-600 flex items-center justify-center">${costoTexto}</div>
      </div>
    `;
    div.addEventListener('click', () => abrirModal(evento));
    fragment.appendChild(div);

    cartasEnFila += 1;

    const esUltimaCarta = i === filtrados.length - 1;
    const filaCompleta = cartasEnFila === 2 || esUltimaCarta;

    if (filaCompleta) {
      totalFilas += 1;
      cartasEnFila = 0;

      const debeInsertarIntermedio = totalFilas % 4 === 0 && !esUltimaCarta;
      if (debeInsertarIntermedio) {
        const bannerIntermedio = await crearBannerElemento('banner-inline');
        if (currentRender !== renderVersion) return;
        if (bannerIntermedio) fragment.appendChild(bannerIntermedio);
      }
    }
  }

  const debeAgregarFinal = totalFilas === 0 || totalFilas % 4 !== 0;
  if (debeAgregarFinal) {
    const bannerFinal = await crearBannerElemento('banner-bottom');
    if (currentRender !== renderVersion) return;
    if (bannerFinal) fragment.appendChild(bannerFinal);
  }

  lista.appendChild(fragment);
}

function capitalizarPalabra(texto = '') {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function estilizarFechaExtendida(fechaLocale = '') {
  if (!fechaLocale) return '';
  const [primeraParte, ...resto] = fechaLocale.split(', ');
  const primera = capitalizarPalabra(primeraParte);
  let restoTexto = resto.join(', ');

  if (restoTexto) {
    restoTexto = restoTexto.replace(/ de ([a-záéíóúñ]+)/gi, (_, palabra) => ` de ${capitalizarPalabra(palabra)}`);
    restoTexto = restoTexto.replace(/\sde\s(\d{4})$/i, ' $1');
  }

  return restoTexto ? `${primera}, ${restoTexto}` : primera;
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return 'Sin fecha';
  const [year, month, day] = fechaStr.split('-').map(Number);
  if ([year, month, day].some((value) => Number.isNaN(value))) return 'Sin fecha';
  const fecha = new Date(Date.UTC(year, month - 1, day));
  const base = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
  return estilizarFechaExtendida(base);
}

function formatearHora(horaStr) {
  if (!horaStr) return '';
  const [hourPart, minutePart] = horaStr.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return '';
  const fecha = new Date(Date.UTC(1970, 0, 1, hour, minute));
  const base = fecha.toLocaleTimeString('es-ES', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC'
  });
  return base.toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
}

function obtenerPartesFecha(fechaStr) {
  const completa = formatearFecha(fechaStr);
  if (!completa || completa === 'Sin fecha') return null;
  const [weekday, resto] = completa.split(', ');
  return {
    weekday: weekday || completa,
    resto: resto || ''
  };
}

async function cargarFiltros() {
  const { data: muni } = await supabase.from('Municipios').select('id, nombre').order('nombre');
  municipios = {};
  muni?.forEach(m => {
    municipios[m.id] = m.nombre;
    filtroMunicipio.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
  });

  const { data: cat } = await supabase.from('categoriaEventos').select('id, nombre, icono').order('nombre');
  categorias = {};
  cat?.forEach(c => {
    categorias[c.id] = { nombre: c.nombre, icono: c.icono || '' };
    filtroCategoria.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
  });
}

// Listeners
[filtroMunicipio, filtroCategoria, filtroOrden, busquedaNombre].forEach(input => {
  input.addEventListener('input', renderizarEventos);
});

btnHoy.addEventListener('change', (e) => {
  filtroHoy = e.target.checked;
  if (filtroHoy) {
    filtroSemana = false;
    document.getElementById('btnSemana').checked = false;
  }
  renderizarEventos();
});

btnSemana.addEventListener('change', (e) => {
  filtroSemana = e.target.checked;
  if (filtroSemana) {
    filtroHoy = false;
    document.getElementById('btnHoy').checked = false;
  }
  renderizarEventos();
});

btnGratis.addEventListener('change', (e) => {
  filtroGratis = e.target.checked;
  renderizarEventos();
});

(async function init() {
  if (typeof mostrarLoader === 'function') {
    await mostrarLoader();
  }

  try {
    await cargarFiltros();
    await cargarEventos();
  } finally {
    if (typeof ocultarLoader === 'function') {
      await ocultarLoader();
    }
  }
})();
