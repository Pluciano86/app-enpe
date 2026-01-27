import { supabase } from '../shared/supabaseClient.js';

const btnLogout = document.getElementById('btnLogout');
const userNombre = document.getElementById('userNombre');
const userEmail = document.getElementById('userEmail');
const userAvatar = document.getElementById('userAvatar');
const userRol = document.getElementById('userRol');
const comerciosLista = document.getElementById('comerciosLista');
const comerciosVacio = document.getElementById('comerciosVacio');

async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    window.location.href = './login.html';
    return null;
  }
  return data.user;
}

async function cargarPerfil(user) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('nombre, apellido, email, imagen, municipio')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return;
  const nombreCompleto = `${data.nombre || ''} ${data.apellido || ''}`.trim() || 'Sin nombre';
  userNombre.textContent = nombreCompleto;
  userEmail.textContent = data.email || user.email || '—';
  userAvatar.src = data.imagen
    ? (data.imagen.startsWith('http')
        ? data.imagen
        : `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${data.imagen}`)
    : 'https://placehold.co/120x120?text=User';
}

async function cargarComercios(user) {
  if (!comerciosLista) return;
  comerciosLista.innerHTML = '';
  comerciosVacio?.classList.add('hidden');

  const { data: relaciones, error: errRel } = await supabase
    .from('UsuarioComercios')
    .select('idComercio, rol')
    .eq('idUsuario', user.id);

  if (errRel) {
    console.error('Error cargando asignaciones', errRel);
    comerciosVacio?.classList.remove('hidden');
    return;
  }

  const ids = [...new Set((relaciones || []).map((r) => r.idComercio).filter(Boolean))];
  if (ids.length === 0) {
    comerciosVacio?.classList.remove('hidden');
    return;
  }

  // Asignar rol principal (primera asignación)
  const rolPrincipal = relaciones?.[0]?.rol;
  if (userRol) userRol.textContent = rolPrincipal ? rolPrincipal.replace('comercio_', '').replace('_', ' ').toUpperCase() : 'USUARIO';

  const { data: comercios, error: errCom } = await supabase
    .from('Comercios')
    .select('id, nombre, logo, direccion, municipio, telefono')
    .in('id', ids);

  if (errCom || !comercios?.length) {
    comerciosVacio?.classList.remove('hidden');
    return;
  }

  comercios.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'bg-white/5 border border-white/10 rounded-xl shadow p-4 flex gap-4';

    const logo = document.createElement('img');
    logo.className = 'w-16 h-16 rounded object-cover border border-gray-200 bg-white';
    logo.src = c.logo
      ? (c.logo.startsWith('http')
          ? c.logo
          : `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${c.logo}`)
      : 'https://placehold.co/80x80?text=Logo';
    logo.alt = c.nombre || 'Logo';

    const info = document.createElement('div');
    info.className = 'flex-1 space-y-1 text-white';
    info.innerHTML = `
      <h4 class="text-lg font-semibold text-white">${c.nombre || 'Sin nombre'}</h4>
      <p class="text-sm text-gray-200">${c.municipio || ''}</p>
      <p class="text-sm text-gray-300">${c.direccion || ''}</p>
      <p class="text-sm text-gray-300">${c.telefono || ''}</p>
    `;

    const acciones = document.createElement('div');
    acciones.className = 'flex flex-col gap-2';

    const btnEditar = document.createElement('a');
    btnEditar.href = `./editarPerfilComercio.html?id=${c.id}`;
    btnEditar.className = 'px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded text-center';
    btnEditar.textContent = 'Editar perfil';

    const btnMenu = document.createElement('a');
    btnMenu.href = `./adminMenuComercio.html?id=${c.id}`;
    btnMenu.className = 'px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded text-center';
    btnMenu.textContent = 'Administrar Menú';

    const btnEspeciales = document.createElement('a');
    btnEspeciales.href = `./especiales/adminEspeciales.html?id=${c.id}`;
    btnEspeciales.className = 'px-3 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded text-center';
    btnEspeciales.textContent = 'Almuerzos & Happy Hours';

    acciones.appendChild(btnEditar);
    acciones.appendChild(btnMenu);
    acciones.appendChild(btnEspeciales);

    card.appendChild(logo);
    card.appendChild(info);
    card.appendChild(acciones);
    comerciosLista.appendChild(card);
  });
}

btnLogout?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = './login.html';
});

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getUser();
  if (!user) return;
  await cargarPerfil(user);
  await cargarComercios(user);
});
