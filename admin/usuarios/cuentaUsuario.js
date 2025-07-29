import { supabase } from '../../js/supabaseClient.js';

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

// 1. Obtener sesión y usuario
const { data: { user }, error } = await supabase.auth.getUser();
if (!user || error) {
  console.error('🛑 No se pudo obtener el usuario:', error);
  window.location.href = '/login/logearse.html';
}
const uid = user.id;

// 2. Obtener perfil
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

// 3. Preview de imagen nueva
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

// 4. Mostrar/Cerrar Modal
btnEditar.addEventListener('click', () => modal.classList.remove('hidden'));
btnCancelar.addEventListener('click', () => modal.classList.add('hidden'));

// 5. Guardar cambios
formEditar.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nuevoNombre = inputNombre.value.trim();
  const nuevoApellido = inputApellido.value.trim();
  const nuevaFoto = inputFoto.files[0];
  let nuevaImagen = perfil.imagen;

  console.log('📤 Comenzando actualización del perfil...');

  // 5a. Subir nueva imagen y borrar anterior si existe
if (nuevaFoto) {
  const extension = nuevaFoto.name.split('.').pop();
  const nuevoNombreArchivo = `usuarios/${uid}_${Date.now()}.${extension}`; // archivo con timestamp

  console.log('🗑️ Intentando borrar imagen anterior (si aplica)...');

  if (perfil.imagen && perfil.imagen.includes('imagenesusuarios')) {
    try {
      const url = new URL(perfil.imagen);
      const key = decodeURIComponent(url.pathname.split('/storage/v1/object/public/imagenesusuarios/')[1]);

      const { error: errorBorrado } = await supabase.storage
        .from('imagenesusuarios')
        .remove([key]);

      if (errorBorrado) {
        console.warn('⚠️ No se pudo borrar la imagen anterior:', errorBorrado.message);
      } else {
        console.log('✅ Imagen anterior borrada:', key);
      }
    } catch (err) {
      console.warn('⚠️ Error al analizar la URL de la imagen anterior:', err);
    }
  }

  console.log('📸 Subiendo nueva imagen al bucket `imagenesusuarios`: ', nuevoNombreArchivo);

  const { error: errorSubida } = await supabase.storage
    .from('imagenesusuarios')
    .upload(nuevoNombreArchivo, nuevaFoto, {
      cacheControl: '3600',
      upsert: true,
      contentType: nuevaFoto.type
    });

  if (errorSubida) {
    console.error('🛑 Error al subir imagen:', errorSubida);
  } else {
    const { data } = supabase.storage
      .from('imagenesusuarios')
      .getPublicUrl(nuevoNombreArchivo);
    nuevaImagen = data.publicUrl;
    console.log('✅ Imagen subida con éxito:', nuevaImagen);
  }
}

  // 5b. Actualizar datos del usuario
  const { error: errorUpdate } = await supabase
    .from('usuarios')
    .update({
      nombre: nuevoNombre,
      apellido: nuevoApellido,
      imagen: nuevaImagen
    })
    .eq('id', uid);

  if (errorUpdate) {
    console.error('🛑 Error al actualizar perfil:', errorUpdate);
    alert('Error al actualizar tu perfil.');
  } else {
    console.log('✅ Perfil actualizado correctamente.');
    modal.classList.add('hidden');
    window.location.reload();
  }
});