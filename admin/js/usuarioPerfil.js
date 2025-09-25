import { supabase } from '../shared/supabaseClient.js';

const params = new URLSearchParams(window.location.search);
const idUsuario = params.get('id');

const fotoEl = document.getElementById('user-foto');
const nombreEl = document.getElementById('user-nombre');
const emailEl = document.getElementById('user-email');
const municipioEl = document.getElementById('user-municipio');
const creadoEl = document.getElementById('user-creado');
const comerciosListEl = document.getElementById('comercios-list');
const favoritosListEl = document.getElementById('favoritos-list');

const PLACEHOLDER_FOTO = 'https://placehold.co/120x120?text=User';

if (!idUsuario) {
  console.error('ID de usuario no proporcionado');
  if (nombreEl) nombreEl.textContent = 'Usuario no encontrado';
  if (comerciosListEl) comerciosListEl.innerHTML = '<li class="px-4 py-2 text-red-500">Falta el parámetro id en la URL</li>';
  if (favoritosListEl) favoritosListEl.innerHTML = '<li class="px-4 py-2 text-red-500">Falta el parámetro id en la URL</li>';
  throw new Error('ID de usuario requerido');
}

console.log('ID recibido:', idUsuario);

function renderLista(target, items, emptyMsg) {
  if (!target) return;
  target.innerHTML = '';
  if (!items || !items.length) {
    target.innerHTML = `<li class="px-4 py-2 text-gray-500">${emptyMsg}</li>`;
    return;
  }
  items.forEach(nombre => {
    const li = document.createElement('li');
    li.className = 'px-4 py-2 border-b';
    li.textContent = nombre;
    target.appendChild(li);
  });
}

async function cargarUsuario() {
  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      id,
      nombre,
      apellido,
      telefono,
      email,
      imagen,
      creado_en,
      municipio,
      Municipios(nombre),
      UsuarioComercios(
        idComercio,
        Comercios:Comercios!fk_usuario_comercio_comercio (id, nombre)
      )
    `)
    .eq('id', idUsuario)
    .maybeSingle();

  if (error) {
    console.error('Error cargando usuario:', JSON.stringify(error, null, 2));
    renderLista(comerciosListEl, null, 'Error cargando usuario');
    renderLista(favoritosListEl, null, 'Error cargando usuario');
    return;
  }

  if (!data) {
    console.warn('Usuario no encontrado');
    if (nombreEl) nombreEl.textContent = 'Usuario no encontrado';
    renderLista(comerciosListEl, null, 'Ningún comercio asignado');
    renderLista(favoritosListEl, null, 'Sin favoritos');
    return;
  }

  console.log('Usuario cargado:', data);

  if (fotoEl) fotoEl.src = data.imagen || PLACEHOLDER_FOTO;
  if (nombreEl) {
    const nombreCompleto = `${data.nombre || ''} ${data.apellido || ''}`.trim() || 'Sin nombre';
    nombreEl.textContent = nombreCompleto;
  }
  if (emailEl) emailEl.textContent = data.email || 'Sin email';
  if (municipioEl) municipioEl.textContent = data.Municipios?.nombre || data.municipio || 'Sin municipio';
  if (creadoEl) {
    creadoEl.textContent = data.creado_en
      ? `Creado: ${new Date(data.creado_en).toLocaleDateString('es-PR')}`
      : 'Creado: --';
  }

  const comercios = data.UsuarioComercios?.map(rel => rel.Comercios?.nombre).filter(Boolean) || [];
  renderLista(comerciosListEl, comercios, 'Ningún comercio asignado');

  await cargarFavoritos();
}

async function cargarFavoritos() {
  const { data, error } = await supabase
    .from('favoritousuarios')
    .select(`
      idcomercio,
      Comercios (id, nombre, municipio)
    `)
    .eq('idusuario', idUsuario);

  if (error) {
    console.error('Error cargando favoritos:', JSON.stringify(error, null, 2));
    renderLista(favoritosListEl, null, 'Error cargando favoritos');
    return;
  }

  const favoritos = data?.map(fav => fav.Comercios?.nombre).filter(Boolean) || [];
  renderLista(favoritosListEl, favoritos, 'Sin favoritos');
}

cargarUsuario();
