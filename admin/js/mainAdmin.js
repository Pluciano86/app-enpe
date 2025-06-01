// mainAdmin.js extendido para editarComercio.html y adminComercios.html
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const supabase = createClient(
  'https://zgjaxanqfkweslkxtayt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnamF4YW5xZmt3ZXNsa3h0YXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzk3NjgsImV4cCI6MjA2Mjg1NTc2OH0.Abif2Fu2uHyby--t_TAacEbjG8jCxmgsCbLx6AinT6c'
);

const baseImageUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios';

let todosLosComercios = [];
let logos = [];
let categorias = [];
let municipios = [];

export const idComercio = new URLSearchParams(window.location.search).get('id');

// ✅ NUEVO - para editarComercio.html
export async function cargarDatosComercio() {
  const { data, error } = await supabase.from('Comercios').select('*').eq('id', idComercio).single();
  if (error) return alert('Error cargando comercio');

  for (const key in data) {
    const el = document.getElementById(key);
    if (el) {
      if (key.includes("color") && (!data[key] || !/^#[0-9A-Fa-f]{6}$/.test(data[key]))) {
        el.value = '#000000';
      } else {
        el.value = data[key] || '';
      }
    }
  }

  if (data.idMunicipio) document.getElementById('municipio').value = String(data.idMunicipio);
  window.categoriasSeleccionadas = data.idCategoria || [];
  window.subcategoriasSeleccionadas = data.idSubcategoria || [];
}

// ✅ Para adminComercios.html
async function cargarComercios() {
  const { data: comercios, error } = await supabase.from('Comercios').select('*');
  const { data: imagenes, error: errorImagenes } = await supabase
    .from('imagenesComercios')
    .select('idComercio, imagen, logo')
    .eq('logo', true);
  const { data: catData, error: errorCategorias } = await supabase
    .from('Categorias')
    .select('id, nombre');
  const { data: muniData, error: errorMunicipios } = await supabase
    .from('Municipios')
    .select('id, nombre');

  if (error || errorImagenes || errorCategorias || errorMunicipios) {
    console.error('❌ Error cargando datos:', { error, errorImagenes, errorCategorias, errorMunicipios });
    alert('Error cargando comercios');
    return;
  }

  todosLosComercios = comercios;
  logos = imagenes;
  categorias = catData;
  municipios = muniData;

  filtrarYMostrarComercios();
}

function filtrarYMostrarComercios() {
  const filtroNombre = document.getElementById('search-nombre')?.value.toLowerCase() || '';
  const filtroCategoria = document.getElementById('search-categoria')?.value || '';
  const filtroMunicipio = document.getElementById('search-municipio')?.value || '';
  const filtroOrden = document.getElementById('search-orden')?.value || '';

  const normalizar = txt => txt.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  let lista = todosLosComercios.filter(c => {
    if (filtroNombre && !normalizar(c.nombre).includes(normalizar(filtroNombre))) return false;
    if (filtroCategoria && !c.idCategoria?.includes(parseInt(filtroCategoria))) return false;
    if (filtroMunicipio && c.idMunicipio != filtroMunicipio) return false;
    return true;
  });

  if (filtroOrden === 'az') {
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  } else {
    lista.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const tabla = document.getElementById('tabla-comercios');
  const tablaMobile = document.getElementById('tabla-mobile');
  const contador = document.getElementById('contador-comercios');
  if (!tabla || !tablaMobile || !contador) return;

  contador.textContent = `Mostrando ${lista.length} comercio${lista.length !== 1 ? 's' : ''}`;
  tabla.innerHTML = '';
  tablaMobile.innerHTML = '';

  lista.forEach(c => {
    const logo = logos.find(img => img.idComercio === c.id);
    const logoUrl = logo ? `${baseImageUrl}/${logo.imagen}` : '';

    const nombreCategoria = categorias.find(cat => c.idCategoria?.includes(cat.id))?.nombre || '-';
    const nombreMunicipio = municipios.find(m => m.id === c.idMunicipio)?.nombre || '-';

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td class="px-4 py-2 font-medium flex items-center gap-2">
        <img src="${logoUrl}" class="w-8 h-8 object-contain border rounded" />
        ${c.nombre}
      </td>
      <td class="px-4 py-2">${nombreCategoria}</td>
      <td class="px-4 py-2">${nombreMunicipio}</td>
      <td class="px-4 py-2">-</td>
      <td class="px-4 py-2 text-center">
        <input type="checkbox" ${c.activo ? 'checked' : ''} disabled>
      </td>
      <td class="px-4 py-2 text-xs">${new Date(c.created_at).toLocaleDateString()}</td>
      <td class="px-4 py-2 text-center">
        <button class="text-orange-500 btn-editar" data-id="${c.id}"><i class="fas fa-edit"></i></button>
        <button class="text-red-500 ml-2 btn-eliminar" data-id="${c.id}"><i class="fas fa-trash-alt"></i></button>
      </td>
    `;
    tabla.appendChild(fila);

    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow p-4 flex flex-col gap-2';
    card.innerHTML = `
      <div class="flex gap-4 items-start">
        <div class="flex gap-3 flex-1">
          <img src="${logoUrl}" class="w-24 h-24 object-contain shadow rounded-full bg-white"/>
          <div>
            <div class="text-xl font-bold text-gray-800">${c.nombre}</div>
            <div class="text-sm text-gray-600">Categoría: <strong>${nombreCategoria}</strong></div>
            <div class="text-sm text-gray-600">Municipio: <strong>${nombreMunicipio}</strong></div>
            <span class="text-xs text-gray-500">Desde: ${new Date(c.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="flex flex-col items-center gap-3 text-xl">
          <button class="text-orange-500 btn-editar" data-id="${c.id}"><i class="fas fa-edit"></i></button>
          <label class="flex flex-col items-center text-xs text-gray-600">
            <input type="checkbox" ${c.activo ? 'checked' : ''} disabled>
            <span class="mt-1">Activo</span>
          </label>
          <button class="text-red-500 btn-eliminar" data-id="${c.id}"><i class="fas fa-times-circle"></i></button>
        </div>
      </div>
    `;
    tablaMobile.appendChild(card);
  });

  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      window.location.href = `editarComercio.html?id=${id}`;
    });
  });

  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm("¿Seguro que deseas eliminar este comercio?")) {
        const { error } = await supabase.from('Comercios').delete().eq('id', id);
        if (error) {
          alert("Error al eliminar.");
        } else {
          alert("Comercio eliminado exitosamente.");
          cargarComercios();
        }
      }
    });
  });
}

async function cargarCategorias() {
  const { data } = await supabase.from('Categorias').select('id, nombre');
  const select = document.getElementById('search-categoria');
  if (!select) return;
  data.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.nombre;
    select.appendChild(option);
  });
}

async function cargarMunicipios() {
  const { data } = await supabase.from('Municipios').select('id, nombre');
  const select = document.getElementById('search-municipio');
  if (!select) return;
  data.forEach(m => {
    const option = document.createElement('option');
    option.value = m.id;
    option.textContent = m.nombre;
    select.appendChild(option);
  });
}

async function cargarMunicipiosFormulario(idSeleccionado = null) {
  const { data, error } = await supabase.from('Municipios').select('id, nombre').order('nombre', { ascending: true });
  if (error) {
    console.error('Error cargando municipios para el formulario:', error);
    return;
  }

  const select = document.getElementById('municipio');
  if (!select) return;

  select.innerHTML = '<option value="">Selecciona un municipio</option>';

  data.forEach(m => {
    const option = document.createElement('option');
    option.value = m.id;
    option.textContent = m.nombre;
    if (idSeleccionado && String(m.id) === String(idSeleccionado)) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await cargarDatosComercio(); // Esto llena los campos básicos

  // Luego, llenas el dropdown con municipios y seleccionas el correcto
  const comercio = await supabase.from('Comercios').select('idMunicipio').eq('id', idComercio).single();
  await cargarMunicipiosFormulario(comercio.data?.idMunicipio);

  await cargarCategorias();
  await cargarMunicipios(); // Este es el de búsqueda (adminComercios)
  await cargarComercios();

  ['search-nombre', 'search-categoria', 'search-municipio', 'search-orden'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', filtrarYMostrarComercios);
  });
});