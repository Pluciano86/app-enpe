import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://zgjaxanqfkweslkxtayt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnamF4YW5xZmt3ZXNsa3h0YXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzk3NjgsImV4cCI6MjA2Mjg1NTc2OH0.Abif2Fu2uHyby--t_TAacEbjG8jCxmgsCbLx6AinT6c'
);

const baseImageUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios';

let todosLosComercios = [];
let logos = [];

async function cargarComercios() {
  const { data: comercios, error } = await supabase
    .from('Comercios')
    .select(`
      id, nombre, activo, created_at, idCategoria, idMunicipio, idArea,
      Categorias: idCategoria (nombre),
      Municipios: idMunicipio (nombre),
      Areas: idArea (nombre)
    `);

  const { data: imagenes } = await supabase
    .from('imagenesComercios')
    .select('idComercio, imagen, logo')
    .eq('logo', true);

  if (error) {
    console.error('Error cargando comercios:', error);
    return;
  }

  todosLosComercios = comercios;
  logos = imagenes;

  filtrarYMostrarComercios();
}

function filtrarYMostrarComercios() {
  const filtroNombre = document.getElementById('search-nombre').value.toLowerCase();
  const filtroCategoria = document.getElementById('search-categoria').value;
  const filtroMunicipio = document.getElementById('search-municipio').value;
  const filtroOrden = document.getElementById('search-orden').value;

  let lista = todosLosComercios.filter(c => {
    if (filtroNombre && !c.nombre.toLowerCase().includes(filtroNombre)) return false;
    if (filtroCategoria && c.idCategoria != filtroCategoria) return false;
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
  tabla.innerHTML = '';
  tablaMobile.innerHTML = '';

  lista.forEach(c => {
    const logo = logos.find(img => img.idComercio === c.id);
    const logoUrl = logo ? `${baseImageUrl}/${logo.imagen}` : '';

    // 🖥 Desktop
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td class="px-4 py-2 font-medium flex items-center gap-2">
        <img src="${logoUrl}" class="w-8 h-8 object-contain border rounded" />
        ${c.nombre}
      </td>
      <td class="px-4 py-2">${c.Categorias?.nombre || '-'}</td>
      <td class="px-4 py-2">${c.Municipios?.nombre || '-'}</td>
      <td class="px-4 py-2">${c.Areas?.nombre || '-'}</td>
      <td class="px-4 py-2 text-center">
        <input type="checkbox" ${c.activo ? 'checked' : ''} disabled>
      </td>
      <td class="px-4 py-2 text-xs">${new Date(c.created_at).toLocaleDateString()}</td>
      <td class="px-4 py-2 text-center">
        <button class="text-orange-500"><i class="fas fa-edit"></i></button>
        <button class="text-red-500 ml-2"><i class="fas fa-trash-alt"></i></button>
      </td>
    `;
    tabla.appendChild(fila);

    // 📱 Mobile
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow p-4 flex flex-col gap-2';
    card.innerHTML = `
      <div class="flex gap-4 items-start">
        <div class="flex gap-3 flex-1">
          <img src="${logoUrl}" class="w-12 h-12 object-contain border rounded bg-white"/>
          <div>
            <div class="text-base font-bold text-gray-800">${c.nombre}</div>
            <div class="text-sm text-gray-600">Categoría: <strong>${c.Categorias?.nombre}</strong></div>
            <div class="text-sm text-gray-600">Municipio: <strong>${c.Municipios?.nombre}</strong> Área: <strong>${c.Areas?.nombre}</strong></div>
            <span class="text-xs text-gray-500">Desde: ${new Date(c.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="flex flex-col items-center gap-3 text-xl">
          <button class="text-orange-500"><i class="fas fa-edit"></i></button>
          <label class="flex flex-col items-center text-xs text-gray-600">
            <input type="checkbox" ${c.activo ? 'checked' : ''} disabled>
            <span class="mt-1">Activo</span>
          </label>
          <button class="text-red-500"><i class="fas fa-times-circle"></i></button>
        </div>
      </div>
    `;
    tablaMobile.appendChild(card);
  });
}

async function cargarCategorias() {
  const { data } = await supabase.from('Categorias').select('id, nombre');
  const select = document.getElementById('search-categoria');
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
  data.forEach(m => {
    const option = document.createElement('option');
    option.value = m.id;
    option.textContent = m.nombre;
    select.appendChild(option);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await cargarCategorias();
  await cargarMunicipios();
  await cargarComercios();

  ['search-nombre', 'search-categoria', 'search-municipio', 'search-orden'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', filtrarYMostrarComercios);
  });
});