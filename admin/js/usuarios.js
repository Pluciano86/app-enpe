import { supabase } from '../shared/supabaseClient.js';
import { resolvePath } from '../shared/pathResolver.js';

const tablaUsuarios = document.getElementById('tabla-usuarios');
const tablaMobile = document.getElementById('tabla-mobile');
const filtroNombre = document.getElementById('search-nombre');
const filtroMunicipio = document.getElementById('search-municipio');
const filtroTipo = document.getElementById('search-tipo');

const PLACEHOLDER_FOTO = 'https://placehold.co/80x80?text=User';

let usuariosOriginales = [];

function formatearFecha(iso) {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-PR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function determinarTipo(usuario) {
  if (!usuario.comercios?.length) return 'Regular';
  const roles = usuario.comercios.map(c => (c.rol || '').toLowerCase());
  if (roles.includes('colaborador') || roles.includes('colaborador de comercio')) {
    return 'Colaborador de Comercio';
  }
  return 'Admin Comercio';
}

function obtenerBadges(usuario) {
  const badges = [];
  const tipo = determinarTipo(usuario);

  if (usuario.membresiaUp) {
    badges.push({
      tipo: 'up',
      logo: 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/Logo%20UP_FondoOscuro.png'
    });
  }

  if (tipo === 'Admin Comercio') {
    badges.push({
      tipo: 'admin',
      texto: 'Admin',
      emoji: '🧑‍💼',
      clase: 'bg-cyan-500/15 text-cyan-100 border border-cyan-400/40'
    });
  } else if (tipo.includes('colaborador')) {
    badges.push({
      tipo: 'editor',
      texto: 'Editor',
      emoji: '✏️',
      clase: 'bg-amber-400/15 text-amber-100 border border-amber-300/40'
    });
  }

  return badges;
}

function renderizarBadges(badges) {
  if (!badges?.length) return '';
  return badges
    .map((b) => {
      if (b.tipo === 'up') {
        return `<img src="${b.logo}" alt="Membresía Up" class="h-6 w-auto drop-shadow-md inline-block align-middle">`;
      }
      return `<span class="px-2 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${b.clase}">
        ${b.emoji || ''} ${b.texto || ''}
      </span>`;
    })
    .join('');
}

function renderizarBadgesCorner(badges) {
  if (!badges?.length) return '';
  return badges
    .map((b) => {
      if (b.tipo === 'up') {
        return `<img src="${b.logo}" alt="Membresía Up" class="h-9 w-auto drop-shadow-xl">`;
      }
      return `<span class="px-3 py-1 rounded-full text-[12px] font-semibold inline-flex items-center gap-1 ${b.clase}">
        ${b.emoji || ''} ${b.texto || ''}
      </span>`;
    })
    .join('');
}

function crearFila(usuario) {
  const fila = document.createElement('tr');
  fila.className = 'hover:bg-gray-50';

  const tipo = determinarTipo(usuario);
  const foto = usuario.imagen || PLACEHOLDER_FOTO;
  const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Sin nombre';

  const perfilUrl = resolvePath(`usuarioPerfil.html?id=${usuario.id}`);

  const badgesHtml = renderizarBadges(obtenerBadges(usuario));

  fila.innerHTML = `
    <td class="px-4 py-3">
      <img src="${foto}" alt="Foto" class="w-12 h-12 rounded-full object-cover border" />
    </td>
    <td class="px-4 py-3 font-medium text-gray-800">${nombreCompleto}</td>
    <td class="px-4 py-3 text-gray-600">${usuario.municipio || '—'}</td>
    <td class="px-4 py-3 text-gray-600">–</td>
    <td class="px-4 py-3">
      <div class="flex flex-wrap gap-1">${badgesHtml}</div>
    </td>
    <td class="px-4 py-3 text-gray-600">${formatearFecha(usuario.creado_en)}</td>
    <td class="px-4 py-3 text-center">
      <div class="flex items-center justify-center gap-2">
        <a href="${perfilUrl}" class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-cyan-500 hover:bg-cyan-600 text-white rounded">
          <i class="fas fa-eye"></i>
          Ver
        </a>
        <a href="${resolvePath(`usuarioEditar.html?id=${usuario.id}`)}" class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded">
          <i class="fas fa-pen"></i>
          Editar
        </a>
        <button data-id="${usuario.id}" class="btn-eliminar inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded">
          <i class="fas fa-trash"></i>
          Eliminar
        </button>
      </div>
    </td>
  `;

  return fila;
}

function crearTarjeta(usuario) {
  const tarjeta = document.createElement('div');
  tarjeta.className = 'relative bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-2xl shadow p-4 flex items-center gap-4';

  const badgesData = obtenerBadges(usuario);
  const badgesCorner = renderizarBadgesCorner(badgesData);
  const foto = usuario.imagen || PLACEHOLDER_FOTO;
  const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Sin nombre';

  const perfilUrl = resolvePath(`usuarioPerfil.html?id=${usuario.id}`);

  tarjeta.innerHTML = `
    <div class="absolute top-2 right-2 flex gap-2">${badgesCorner}</div>
    <img src="${foto}" alt="Foto" class="w-16 h-16 rounded-full object-cover border border-white/10" />
    <div class="flex-1">
      <h3 class="text-lg font-semibold text-white">${nombreCompleto}</h3>
      <p class="text-sm text-gray-300">${usuario.municipio || '—'}</p>
      <p class="text-sm text-gray-300 mt-1">${formatearFecha(usuario.creado_en)}</p>
      <div class="flex gap-2 mt-3 flex-wrap">
        <a href="${perfilUrl}" class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-cyan-500 hover:bg-cyan-600 text-white rounded">
          <i class="fas fa-eye"></i>
          Ver
        </a>
        <a href="${resolvePath(`usuarioEditar.html?id=${usuario.id}`)}" class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded">
          <i class="fas fa-pen"></i>
          Editar
        </a>
        <button data-id="${usuario.id}" class="btn-eliminar inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded">
          <i class="fas fa-trash"></i>
          Eliminar
        </button>
      </div>
    </div>
  `;

  return tarjeta;
}

function mostrarError(mensaje) {
  tablaUsuarios.innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-center text-red-500">${mensaje}</td></tr>`;
  tablaMobile.innerHTML = `<p class="text-red-500 text-center">${mensaje}</p>`;
}

async function eliminarUsuario(id, nombre = '') {
  const confirmar = confirm(`¿Eliminar al usuario ${nombre || id}?`);
  if (!confirmar) return;
  const { error } = await supabase.from('usuarios').delete().eq('id', id);
  if (error) {
    alert('No se pudo eliminar el usuario');
    return;
  }
  await cargarUsuarios();
}

function renderizarUsuarios(lista) {
  if (!lista.length) {
    tablaUsuarios.innerHTML = '<tr><td colspan="7" class="px-4 py-6 text-center text-gray-500">No se encontraron usuarios</td></tr>';
    tablaMobile.innerHTML = '<p class="text-gray-500 text-center">No se encontraron usuarios</p>';
    return;
  }

  tablaUsuarios.innerHTML = '';
  tablaMobile.innerHTML = '';

  lista.forEach(usuario => {
    tablaUsuarios.appendChild(crearFila(usuario));
    tablaMobile.appendChild(crearTarjeta(usuario));
  });

  // Bind eliminar botones
  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const nombre = btn.getAttribute('data-nombre');
      eliminarUsuario(id, nombre);
    });
  });
}

function aplicarFiltros() {
  const texto = (filtroNombre?.value || '').trim().toLowerCase();
  const municipioSeleccionado = filtroMunicipio?.value || '';
  const tipoSeleccionado = filtroTipo?.value || '';

  const filtrados = usuariosOriginales.filter(usuario => {
    const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.toLowerCase();
    const email = (usuario.email || '').toLowerCase();
    const coincideNombre = !texto || nombreCompleto.includes(texto) || email.includes(texto);

    const coincideMunicipio = !municipioSeleccionado || usuario.municipio === municipioSeleccionado;

    const tipo = determinarTipo(usuario).toLowerCase();
    let coincideTipo = true;
    if (tipoSeleccionado === 'up') coincideTipo = usuario.membresiaUp === true;
    else if (tipoSeleccionado === 'regulares') coincideTipo = !usuario.membresiaUp && tipo.includes('regular');
    else if (tipoSeleccionado === 'admins-comercio') coincideTipo = tipo.includes('admin');
    else if (tipoSeleccionado === 'colaboradores-comercio') coincideTipo = tipo.includes('colaborador');

    return coincideNombre && coincideMunicipio && coincideTipo;
  });

  renderizarUsuarios(filtrados);
}

function inicializarFiltros() {
  [filtroNombre, filtroMunicipio, filtroTipo].forEach(control => {
    if (!control) return;
    control.addEventListener('input', aplicarFiltros);
    control.addEventListener('change', aplicarFiltros);
  });
}

async function cargarMunicipios() {
  if (!filtroMunicipio) return;
  const { data, error } = await supabase
    .from('Municipios')
    .select('id, nombre')
    .order('nombre');

  if (error) {
    console.error('Error cargando municipios:', error);
    return;
  }

  data.forEach(municipio => {
    const opcion = document.createElement('option');
    opcion.value = municipio.nombre;
    opcion.textContent = municipio.nombre;
    filtroMunicipio.appendChild(opcion);
  });
}

async function cargarUsuarios() {
  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      id,
      nombre,
      apellido,
      membresiaUp,
      email,
      imagen,
      creado_en,
      Municipios:Municipios(nombre),
      UsuarioComercios:UsuarioComercios(
        rol,
        Comercios:Comercios!fk_usuario_comercio_comercio(nombre)
      )
    `);

  if (error) {
    console.error('Error cargando usuarios:', error);
    mostrarError('Error cargando usuarios');
    return;
  }

  usuariosOriginales = (data || []).map(usuario => ({
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    membresiaUp: usuario.membresiaUp === true,
    email: usuario.email,
    imagen: usuario.imagen,
    creado_en: usuario.creado_en,
    municipio: usuario.Municipios?.nombre || '—',
    comercios: usuario.UsuarioComercios?.map(uc => ({
      rol: uc.rol,
      nombre: uc.Comercios?.nombre
    })) || []
  }));

  renderizarUsuarios(usuariosOriginales);
}

async function init() {
  await cargarMunicipios();
  await cargarUsuarios();
  inicializarFiltros();
}

init();
