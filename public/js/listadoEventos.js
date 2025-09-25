// listadoEventos.js
import { supabase } from '../shared/supabaseClient.js';
import { mostrarMensajeVacio, mostrarError, mostrarCargando } from './mensajesUI.js';

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
const modalFecha = document.getElementById('modalFecha');
const modalLugar = document.getElementById('modalLugar');
const modalDireccion = document.getElementById('modalDireccion');
const modalBoletos = document.getElementById('modalBoletos');

// Estado
let eventos = [];
let municipios = {};
let categorias = {};
let filtroHoy = false;
let filtroSemana = false;
let filtroGratis = false;

async function cargarEventos() {
  mostrarCargando(lista);

  const { data, error } = await supabase
    .from('eventos')
    .select('*, Municipios(nombre), categoriaEventos(nombre)')
    .eq('activo', true);

  if (error) {
    console.error('Error cargando eventos:', error);
    mostrarError(lista, 'No pudimos cargar los eventos.', '🎭');
    return;
  }

  eventos = data.map(e => ({
    ...e,
    municipioNombre: e.Municipios?.nombre || '',
    categoriaNombre: e.categoriaEventos?.nombre || ''
  }));

  renderizarEventos();
}

function normalizarTexto(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function renderizarEventos() {
  lista.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 px-2';
  lista.innerHTML = '';

  const texto = normalizarTexto(busquedaNombre.value.trim());
  const muni = filtroMunicipio.value;
  const cat = filtroCategoria.value;
  const orden = filtroOrden.value;

  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(inicioSemana.getDate() + 6);

  let filtrados = eventos.filter(e => {
    const fechaEvento = new Date(e.fecha);

    const matchTexto = !texto || normalizarTexto(e.nombre).includes(texto);
    const matchMuni = !muni || e.municipio_id == muni;
    const matchCat = !cat || e.categoria == cat;

    let matchFiltro = true;
    if (filtroHoy) {
      matchFiltro = fechaEvento.toDateString() === hoy.toDateString();
    } else if (filtroSemana) {
      matchFiltro = fechaEvento >= inicioSemana && fechaEvento <= finSemana;
    }

    if (filtroGratis) {
      matchFiltro = matchFiltro && e.gratis === true;
    }

    return matchTexto && matchMuni && matchCat && matchFiltro;
  });

  // Ordenar
  if (orden === 'fechaAsc') {
    filtrados.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  } else if (orden === 'fechaDesc') {
    filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  } else if (orden === 'alfabetico') {
    filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  // Sin resultados
  if (filtrados.length === 0) {
    mostrarMensajeVacio(lista, 'No se encontraron eventos para los filtros seleccionados.', '🗓️');
    return;
  }

  // Mostrar tarjetas
  filtrados.forEach(e => {
    const div = document.createElement('div');
    div.className = 'bg-white rounded shadow hover:shadow-lg transition overflow-hidden cursor-pointer flex flex-col';
    div.innerHTML = `
      <div class="aspect-[4/5] w-full overflow-hidden bg-gray-200 relative">
        <img src="${e.imagen}?v=${e.id}" class="absolute inset-0 w-full h-full object-cover blur-md scale-110" alt="" />
        <img src="${e.imagen}?v=${e.id}" class="relative z-10 w-full h-full object-contain" alt="${e.nombre}" />
      </div>
      <div class="p-3 flex-1 flex flex-col text-center justify-between">
        <h3 class="text-base font-medium mb-1 line-clamp-2">${e.nombre}</h3>
        <div class="text-xs text-gray-500 mb-1">${e.categoriaNombre || ''}</div>
        <div class="text-sm mb-1"><i class="fa-solid fa-calendar-days mr-1 text-sky-600"></i> ${formatearFecha(e.fecha)}</div>
        <div class="text-sm mb-1"><i class="fa-solid fa-map-pin mr-1 text-pink-600"></i> ${e.municipioNombre}</div>
        <div class="text-sm font-bold ${e.gratis ? 'text-green-600' : 'text-black'}">${e.costo}</div>
      </div>
    `;
    div.addEventListener('click', () => abrirModal(e));
    lista.appendChild(div);
  });
}

function abrirModal(evento) {
  modalImagen.src = evento.imagen;
  modalTitulo.textContent = evento.nombre;
  modalDescripcion.textContent = evento.descripcion || '';
  modalFecha.textContent = `📅 ${formatearFecha(evento.fecha)} ${evento.hora || ''}`;
  modalLugar.textContent = `📍 ${evento.lugar}`;
  modalDireccion.textContent = evento.direccion;
  if (evento.enlaceBoletos) {
    modalBoletos.href = evento.enlaceBoletos;
    modalBoletos.classList.remove('hidden');
  } else {
    modalBoletos.classList.add('hidden');
  }
  modal.classList.remove('hidden');
}

cerrarModal.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});

function formatearFecha(fechaStr) {
  const fecha = new Date(fechaStr);
  return fecha.toLocaleDateString('es-PR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

async function cargarFiltros() {
  const { data: muni } = await supabase.from('Municipios').select('id, nombre').order('nombre');
  muni?.forEach(m => {
    municipios[m.id] = m.nombre;
    filtroMunicipio.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
  });

  const { data: cat } = await supabase.from('categoriaEventos').select('id, nombre').order('nombre');
  cat?.forEach(c => {
    categorias[c.id] = c.nombre;
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

cargarFiltros();
cargarEventos();