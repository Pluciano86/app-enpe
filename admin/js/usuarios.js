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

function crearFila(usuario) {
  const fila = document.createElement('tr');
  fila.className = 'hover:bg-gray-50';

  const tipo = determinarTipo(usuario);
  const foto = usuario.imagen || PLACEHOLDER_FOTO;
  const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Sin nombre';

  const perfilUrl = resolvePath(`usuarioPerfil.html?id=${usuario.id}`);

  fila.innerHTML = `
    <td class="px-4 py-3">
      <img src="${foto}" alt="Foto" class="w-12 h-12 rounded-full object-cover border" />
    </td>
    <td class="px-4 py-3 font-medium text-gray-800">${nombreCompleto}</td>
    <td class="px-4 py-3 text-gray-600">${usuario.municipio || '—'}</td>
    <td class="px-4 py-3 text-gray-600">–</td>
    <td class="px-4 py-3 text-gray-600">${tipo}</td>
    <td class="px-4 py-3 text-gray-600">${formatearFecha(usuario.creado_en)}</td>
    <td class="px-4 py-3 text-center">
      <a href="${perfilUrl}" class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded">
        <i class="fas fa-eye"></i>
        Ver
      </a>
    </td>
  `;

  return fila;
}

function crearTarjeta(usuario) {
  const tarjeta = document.createElement('div');
  tarjeta.className = 'bg-white rounded-xl shadow p-4 flex items-center gap-4';

  const tipo = determinarTipo(usuario);
  const foto = usuario.imagen || PLACEHOLDER_FOTO;
  const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Sin nombre';

  const perfilUrl = resolvePath(`usuarioPerfil.html?id=${usuario.id}`);

  tarjeta.innerHTML = `
    <img src="${foto}" alt="Foto" class="w-16 h-16 rounded-full object-cover border" />
    <div class="flex-1">
      <h3 class="text-lg font-semibold text-gray-800">${nombreCompleto}</h3>
      <p class="text-sm text-gray-500">${usuario.municipio || '—'}</p>
      <p class="text-sm text-gray-500">${tipo} · ${formatearFecha(usuario.creado_en)}</p>
      <a href="${perfilUrl}" class="inline-flex items-center gap-2 mt-3 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded">
        <i class="fas fa-eye"></i>
        Ver
      </a>
    </div>
  `;

  return tarjeta;
}

function mostrarError(mensaje) {
  tablaUsuarios.innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-center text-red-500">${mensaje}</td></tr>`;
  tablaMobile.innerHTML = `<p class="text-red-500 text-center">${mensaje}</p>`;
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
}

function aplicarFiltros() {
  const texto = (filtroNombre?.value || '').trim().toLowerCase();
  const municipioSeleccionado = filtroMunicipio?.value || '';
  const tipoSeleccionado = filtroTipo?.value || '';

  const filtrados = usuariosOriginales.filter(usuario => {
    const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.toLowerCase();
    const coincideNombre = !texto || nombreCompleto.includes(texto);

    const coincideMunicipio = !municipioSeleccionado || usuario.municipio === municipioSeleccionado;

    const tipo = determinarTipo(usuario).toLowerCase();
    let coincideTipo = true;
    if (tipoSeleccionado === 'regulares') coincideTipo = tipo.includes('regular');
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
      imagen,
      created_at,
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
