import { supabase } from '../../js/supabaseClient.js';

// ------------------ Datos de perfil ------------------
const nombreUsuario = document.getElementById('nombreUsuario');
const fechaRegistro = document.getElementById('fechaRegistro');
const fotoPerfil = document.getElementById('fotoPerfil');

const modal = document.getElementById('modalEditar');
const btnEditar = document.getElementById('btnEditarPerfil');
const btnCancelar = document.getElementById('btnCancelar');
const formEditar = document.getElementById('formEditarPerfil');

const inputNombre = document.getElementById('inputNombre');
const inputApellido = document.getElementById('inputApellido');
const inputFoto = document.getElementById('inputFoto');
const previewFoto = document.getElementById('previewFoto');
const imagenActual = document.getElementById('imagenActual');

// ------------------ Obtener sesión ------------------
const { data: { user }, error } = await supabase.auth.getUser();
if (!user || error) {
  console.error('🛑 No se pudo obtener el usuario:', error);
  window.location.href = '/login/logearse.html';
}
const uid = user.id;

// ------------------ Cargar perfil ------------------
const { data: perfil, error: errorPerfil } = await supabase
  .from('usuarios')
  .select('*')
  .eq('id', uid)
  .single();

if (!perfil || errorPerfil) {
  console.error('🛑 No se pudo cargar el perfil:', errorPerfil);
  alert('No se pudo cargar tu perfil.');
} else {
  const nombreCompleto = `${perfil.nombre || ''} ${perfil.apellido || ''}`.trim();
  nombreUsuario.textContent = nombreCompleto || user.email;

  inputNombre.value = perfil.nombre || '';
  inputApellido.value = perfil.apellido || '';

  const imagenURL = perfil.imagen || 'https://placehold.co/100x100?text=User';
  fotoPerfil.src = imagenURL;
  imagenActual.src = imagenURL;

  const fecha = new Date(perfil.creado_en || user.created_at);
  fechaRegistro.textContent = `Activo desde ${fecha.toLocaleDateString('es-PR', {
    year: 'numeric', month: 'short', day: 'numeric'
  })}`;
}

// ------------------ Cambiar imagen preview ------------------
inputFoto.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      previewFoto.src = reader.result;
      previewFoto.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
});

// ------------------ Mostrar/Cerrar modal ------------------
btnEditar.addEventListener('click', () => modal.classList.remove('hidden'));
btnCancelar.addEventListener('click', () => modal.classList.add('hidden'));

// ------------------ Guardar cambios perfil ------------------
formEditar.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nuevoNombre = inputNombre.value.trim();
  const nuevoApellido = inputApellido.value.trim();
  const nuevaFoto = inputFoto.files[0];
  let nuevaImagen = perfil.imagen;

  if (nuevaFoto) {
    const extension = nuevaFoto.name.split('.').pop();
    const nuevoNombreArchivo = `usuarios/${uid}_${Date.now()}.${extension}`;

    if (perfil.imagen && perfil.imagen.includes('imagenesusuarios')) {
      try {
        const url = new URL(perfil.imagen);
        const key = decodeURIComponent(url.pathname.split('/storage/v1/object/public/imagenesusuarios/')[1]);
        await supabase.storage.from('imagenesusuarios').remove([key]);
      } catch (err) {
        console.warn('⚠️ Error al borrar imagen anterior:', err);
      }
    }

    const { error: errorSubida } = await supabase.storage
      .from('imagenesusuarios')
      .upload(nuevoNombreArchivo, nuevaFoto, {
        cacheControl: '3600',
        upsert: true,
        contentType: nuevaFoto.type
      });

    if (!errorSubida) {
      const { data } = supabase.storage
        .from('imagenesusuarios')
        .getPublicUrl(nuevoNombreArchivo);
      nuevaImagen = data.publicUrl;
    }
  }

  const { error: errorUpdate } = await supabase
    .from('usuarios')
    .update({ nombre: nuevoNombre, apellido: nuevoApellido, imagen: nuevaImagen })
    .eq('id', uid);

  if (!errorUpdate) {
    modal.classList.add('hidden');
    window.location.reload();
  } else {
    alert('Error al actualizar tu perfil.');
  }
});

// ------------------ Logout ------------------
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    if (!confirm('¿Deseas cerrar sesión?')) return;
    await supabase.auth.signOut();
    window.location.href = '/index.html';
  });
}

// ------------------ FAVORITOS USUARIO ------------------
const btnAbrirFavoritos = document.getElementById('btnFavoritos');
const btnCerrarFavoritos = document.getElementById('btnCerrarFavoritos');
const modalFavoritos = document.getElementById('modalFavoritos');
const listaFavoritos = document.getElementById('listaFavoritos');

const inputBuscar = document.getElementById('searchFavorito');
const filtroMunicipio = document.getElementById('filtroMunicipio');
const filtroCategoria = document.getElementById('filtroCategoria');
const filtroSubcategoria = document.getElementById('filtroSubcategoria');

let favoritos = [];

btnAbrirFavoritos.addEventListener('click', () => {
  modalFavoritos.classList.remove('hidden');
  cargarFavoritos();
});

btnCerrarFavoritos.addEventListener('click', () => {
  modalFavoritos.classList.add('hidden');
});

inputBuscar.addEventListener('input', mostrarFavoritos);
filtroMunicipio.addEventListener('change', mostrarFavoritos);
filtroCategoria.addEventListener('change', mostrarFavoritos);
filtroSubcategoria.addEventListener('change', mostrarFavoritos);

async function cargarFavoritos() {
  const { data, error } = await supabase
    .from('favoritosUsuarios')
    .select(`
      id, creado_en,
      Comercios (
        id, nombre, municipio, idCategoria, idSubcategoria, logo,
        Categorias ( nombre ),
        Subcategorias ( nombre )
      )
    `)
    .eq('idUsuario', uid);

  if (!error && data) {
    favoritos = data;
    mostrarFavoritos();
  }
}

function mostrarFavoritos() {
  const texto = inputBuscar.value.toLowerCase();
  const muni = filtroMunicipio.value;
  const cat = filtroCategoria.value;
  const subcat = filtroSubcategoria.value;

  const filtrados = favoritos.filter(fav => {
    const c = fav.Comercios;
    if (!c) return false;
    return (
      c.nombre.toLowerCase().includes(texto) &&
      (!muni || c.municipio === muni) &&
      (!cat || c.idCategoria == cat) &&
      (!subcat || c.idSubcategoria == subcat)
    );
  });

  listaFavoritos.innerHTML = filtrados.map(fav => {
    const c = fav.Comercios;
    const logo = c.logo || 'https://placehold.co/60x60?text=Logo';
    const cat = c?.Categorias?.nombre || '';
    const sub = c?.Subcategorias?.nombre || '';
    return `
      <div class="flex items-center gap-3 border-b pb-2">
        <img src="${logo}" class="w-12 h-12 rounded" alt="${c.nombre}">
        <div class="flex-1">
          <div class="font-semibold">${c.nombre}</div>
          <div class="text-xs text-gray-500">${cat} • ${c.municipio} ${sub ? `• ${sub}` : ''}</div>
        </div>
        <button onclick="eliminarFavorito(${fav.id})" class="text-red-500 hover:text-red-700">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
  }).join('') || '<p class="text-center text-sm text-gray-500">No hay favoritos.</p>';
}

// 🗑️ Eliminar favorito
window.eliminarFavorito = async (idFavorito) => {
  const { error } = await supabase
    .from('favoritosUsuarios')
    .delete()
    .eq('id', idFavorito);

  if (!error) {
    favoritos = favoritos.filter(f => f.id !== idFavorito);
    mostrarFavoritos();
  }
};