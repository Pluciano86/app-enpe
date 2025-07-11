// listadoEventos.js
import { supabase } from './supabaseClient.js';

const lista = document.getElementById('listaEventos');
const filtroMunicipio = document.getElementById('filtroMunicipio');
const filtroCategoria = document.getElementById('filtroCategoria');
const busquedaNombre = document.getElementById('busquedaNombre');

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

// Datos
let eventos = [];
let municipios = {};
let categorias = {};

async function cargarEventos() {
  const { data, error } = await supabase
    .from('eventos')
    .select('*, Municipios(nombre), categoriaEventos(nombre)')
    .eq('activo', true)
    .order('fecha', { ascending: true });

  if (error) {
    console.error('Error cargando eventos:', error);
    return;
  }

  eventos = data.map(e => ({
    ...e,
    municipioNombre: e.Municipios?.nombre || '',
    categoriaNombre: e.categoriaEventos?.nombre || ''
  }));

  renderizarEventos();
}

function renderizarEventos() {
  lista.innerHTML = '';

  const texto = busquedaNombre.value.toLowerCase().trim();
  const muni = filtroMunicipio.value;
  const cat = filtroCategoria.value;

  const filtrados = eventos.filter(e =>
    (!texto || e.nombre.toLowerCase().includes(texto)) &&
    (!muni || e.municipio_id == muni) &&
    (!cat || e.categoria == cat)
  );

  if (filtrados.length === 0) {
    lista.innerHTML = `<p class="text-center col-span-full text-gray-500">No hay eventos que coincidan.</p>`;
    return;
  }

  filtrados.forEach(e => {
    const div = document.createElement('div');
    div.className = 'bg-white rounded shadow hover:shadow-lg transition overflow-hidden cursor-pointer flex flex-col';
    div.innerHTML = `
      <img src="${e.imagen}" alt="${e.nombre}" class="h-60 object-cover w-full" />
      <div class="p-3 flex-1 flex flex-col justify-between">
        <h3 class="text-base font-semibold mb-1 line-clamp-2">${e.nombre}</h3>
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

// Eventos
[filtroMunicipio, filtroCategoria, busquedaNombre].forEach(input => {
  input.addEventListener('input', renderizarEventos);
});

cargarFiltros();
cargarEventos();