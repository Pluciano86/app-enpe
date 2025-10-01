// listadoEventos.js
import { supabase } from '../shared/supabaseClient.js';
import { mostrarMensajeVacio, mostrarError, mostrarCargando } from './mensajesUI.js';
import { createGlobalBannerElement, destroyCarousel } from './bannerCarousel.js';

const lista = document.getElementById('listaEventos');
const filtroMunicipio = document.getElementById('filtroMunicipio');
const filtroCategoria = document.getElementById('filtroCategoria');
const filtroOrden = document.getElementById('filtroOrden');
const busquedaNombre = document.getElementById('busquedaNombre');

const btnHoy = document.getElementById('btnHoy');
const btnSemana = document.getElementById('btnSemana');
const btnGratis = document.getElementById('btnGratis');

// Modal
const modal = document.getElementById('modalEvento');
const cerrarModal = document.getElementById('cerrarModal');
const modalImagen = document.getElementById('modalImagen');
const modalTitulo = document.getElementById('modalTitulo');
const modalDescripcion = document.getElementById('modalDescripcion');
const modalFechaPrincipal = document.getElementById('modalFechaPrincipal');
const modalHoraPrincipal = document.getElementById('modalHoraPrincipal');
const modalVerFechas = document.getElementById('modalVerFechas');
const modalFechasListado = document.getElementById('modalFechasListado');
const modalLugar = document.getElementById('modalLugar');
const modalDireccion = document.getElementById('modalDireccion');
const modalBoletos = document.getElementById('modalBoletos');
const modalCosto = document.getElementById('modalCosto');

// Estado
let eventos = [];
let municipios = {};
let categorias = {};
let filtroHoy = false;
let filtroSemana = false;
let filtroGratis = false;
let renderVersion = 0;
let modalFechasExpandido = false;

modalVerFechas.addEventListener('click', () => {
  modalFechasExpandido = !modalFechasExpandido;
  modalFechasListado.classList.toggle('hidden', !modalFechasExpandido);
  modalVerFechas.textContent = modalFechasExpandido ? 'Ocultar fechas' : 'Ver todas las fechas';
  modalVerFechas.setAttribute('aria-expanded', String(modalFechasExpandido));
});

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
    .select('id, nombre, descripcion, costo, gratis, lugar, direccion, municipio_id, categoria, enlaceboletos, imagen, activo, eventoFechas(id, fecha, horainicio, mismahora)')
    .eq('activo', true);

  if (error) {
    console.error('Error cargando eventos:', error);
    mostrarError(lista, 'No pudimos cargar los eventos.', '🎭');
    return;
  }

  eventos = (data ?? []).map((evento) => {
    const { eventoFechas, ...resto } = evento;
    const categoriaInfo = categorias[resto.categoria] || {};
    return {
      ...resto,
      municipioNombre: municipios[resto.municipio_id] || '',
      categoriaNombre: categoriaInfo.nombre || '',
      categoriaIcono: categoriaInfo.icono || '',
      fechas: ordenarFechas(eventoFechas || [])
    };
  });

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
    const matchMuni = !muni || evento.municipio_id == muni;
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
    const costoTexto = evento.gratis
      ? 'Gratis'
      : costoRaw
        ? (costoRaw.toLowerCase().startsWith('costo') ? costoRaw : `Costo: ${costoRaw}`)
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

function abrirModal(evento) {
  const fechas = Array.isArray(evento.fechas) ? ordenarFechas(evento.fechas) : [];
  const primeraFecha = fechas[0] || null;

  modalImagen.src = evento.imagen || 'https://placehold.co/400x500?text=Evento';
  modalImagen.alt = `Imagen de ${evento.nombre || 'Evento'}`;
  modalTitulo.textContent = evento.nombre || '';

  if (evento.descripcion) {
    modalDescripcion.textContent = evento.descripcion;
    modalDescripcion.classList.remove('hidden');
  } else {
    modalDescripcion.textContent = '';
    modalDescripcion.classList.add('hidden');
  }

  modalFechaPrincipal.innerHTML = '';
  modalFechaPrincipal.classList.toggle('hidden', false);
  if (primeraFecha) {
    const partes = obtenerPartesFecha(primeraFecha.fecha);
    if (partes) {
      modalFechaPrincipal.innerHTML = `<div>${partes.weekday}</div><div>${partes.resto}</div>`;
    } else {
      modalFechaPrincipal.textContent = formatearFecha(primeraFecha.fecha);
    }
  } else {
    modalFechaPrincipal.textContent = 'Sin fecha';
  }

  const horaPrincipal = primeraFecha?.horainicio ? formatearHora(primeraFecha.horainicio) : '';
  modalHoraPrincipal.textContent = horaPrincipal;
  modalHoraPrincipal.classList.toggle('hidden', !horaPrincipal);

  modalFechasListado.innerHTML = '';
  let mostrarToggle = false;
  if (fechas.length > 1) {
    mostrarToggle = true;
    modalFechasListado.innerHTML = fechas
      .map((item) => {
        const partes = obtenerPartesFecha(item.fecha);
        const fechaTexto = partes ? `${partes.weekday} · ${partes.resto}` : formatearFecha(item.fecha);
        const horaTexto = item.horainicio ? formatearHora(item.horainicio) : '';
        return `<div>${fechaTexto}${horaTexto ? ` • ${horaTexto}` : ''}</div>`;
      })
      .join('');
  }

  modalFechasExpandido = false;
  modalFechasListado.classList.toggle('hidden', true);
  modalVerFechas.classList.toggle('hidden', !mostrarToggle);
  modalVerFechas.textContent = 'Ver todas las fechas';
  modalVerFechas.setAttribute('aria-expanded', 'false');

  if (evento.lugar) {
    modalLugar.textContent = evento.lugar;
    modalLugar.classList.remove('hidden');
  } else {
    modalLugar.textContent = '';
    modalLugar.classList.add('hidden');
  }

  if (evento.direccion) {
    modalDireccion.textContent = evento.direccion;
    modalDireccion.classList.remove('hidden');
  } else {
    modalDireccion.textContent = '';
    modalDireccion.classList.add('hidden');
  }

  console.log('Modal evento', evento);
  const costoNumerico = Number.isFinite(Number(evento.costo)) ? Number(evento.costo) : NaN;
  if (evento.costo === null || (Number.isFinite(costoNumerico) && costoNumerico === 0)) {
    modalCosto.textContent = 'Gratis';
    modalBoletos.href = '#';
    modalBoletos.classList.add('hidden');
  } else if (Number.isFinite(costoNumerico) && costoNumerico > 0) {
    modalCosto.textContent = `Costo: $${costoNumerico.toFixed(2)}`;
    const urlBoletos = evento.urlBoletos || evento.enlaceboletos || '#';
    modalBoletos.href = urlBoletos || '#';
    modalBoletos.textContent = 'Comprar boletos';
    modalBoletos.classList.remove('hidden');
  } else {
    const costoBase = evento.costo != null ? String(evento.costo).trim() : '';
    modalCosto.textContent = costoBase ? costoBase : 'Costo no disponible';
    const urlBoletos = evento.urlBoletos || evento.enlaceboletos || '#';
    modalBoletos.href = urlBoletos || '#';
    modalBoletos.textContent = 'Comprar boletos';
    if (urlBoletos && urlBoletos !== '#') {
      modalBoletos.classList.remove('hidden');
    } else {
      modalBoletos.classList.add('hidden');
    }
  }

  modalCosto.classList.toggle('hidden', !modalCosto.textContent);

  modal.classList.remove('hidden');
}

cerrarModal.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});

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
