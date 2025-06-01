// adminGaleriaComercio.js
import { supabase } from './supabaseClient.js';
const idComercio = new URLSearchParams(window.location.search).get('id');

// Capitaliza la primera letra
function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

// Mostrar galería existente en contenedor
export async function cargarGaleriaComercio() {
  const contenedor = document.getElementById('galeria-comercio');
  if (!contenedor) return;

  contenedor.innerHTML = 'Cargando...';

  const { data: imagenes, error } = await supabase
    .from('imagenesComercios')
    .select('*')
    .eq('idComercio', idComercio)
    .or('logo.is.false,logo.is.null');

  if (error) {
    console.error('Error al cargar la galería:', error);
    contenedor.innerHTML = 'Error al cargar imágenes.';
    return;
  }

  if (imagenes.length === 0) {
    contenedor.innerHTML = '<p>No hay imágenes aún.</p>';
    return;
  }

  contenedor.innerHTML = '';

  for (const img of imagenes) {
    const url = supabase.storage.from('galeriacomercios').getPublicUrl(img.imagen).data.publicUrl;

    const div = document.createElement('div');
    div.className = 'relative inline-block m-2';

    div.innerHTML = `
      <img src="${url}" class="w-32 h-32 object-cover rounded shadow" />
      <button class="absolute top-1 right-1 text-red-500 bg-white rounded-full p-1 shadow" data-id="${img.id}" title="Eliminar">✖</button>
      <button class="absolute bottom-1 left-1 text-xs bg-white px-2 rounded shadow ${img.portada ? 'bg-green-200 font-bold' : ''}" data-id="${img.id}" title="Portada">Portada</button>
    `;

    contenedor.appendChild(div);
  }

  activarBotonesGaleria();
}

function activarBotonesGaleria() {
  document.querySelectorAll('[title="Eliminar"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('¿Deseas eliminar esta imagen?')) return;

      const { data, error } = await supabase
        .from('imagenesComercios')
        .select('imagen')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        await supabase.storage.from('galeriacomercios').remove([data.imagen]);
        await supabase.from('imagenesComercios').delete().eq('id', id);
        await cargarGaleriaComercio();
      }
    });
  });

  document.querySelectorAll('[title="Portada"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;

      await supabase.from('imagenesComercios')
        .update({ portada: false })
        .eq('idComercio', idComercio);

      await supabase.from('imagenesComercios')
        .update({ portada: true })
        .eq('id', id);

      await cargarGaleriaComercio();
    });
  });
}

export async function subirImagenGaleria(file, categoria, municipio, nombre) {
  const categoriaFmt = capitalizar(categoria);
  const municipioFmt = capitalizar(municipio);
  const nombreFmt = nombre.toUpperCase();
  const extension = file.name.split('.').pop();
  const fileName = `${categoriaFmt}/${municipioFmt}/${nombreFmt}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('galeriacomercios')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    console.error('Error subiendo imagen a storage:', uploadError);
    return;
  }

  const { error: dbError } = await supabase.from('imagenesComercios').insert({
  idComercio,
  imagen: fileName,
  logo: false,
  portada: false
});

  if (dbError) {
    console.error('Error guardando en la base de datos:', dbError);
    return;
  }

  await cargarGaleriaComercio();
}

export function activarInteraccionesGaleria() {
  activarBotonesGaleria();
}

export async function mostrarPortadaEnPreview() {
  const { data, error } = await supabase
    .from('imagenesComercios')
    .select('imagen')
    .eq('idComercio', idComercio)
    .eq('portada', true)
    .maybeSingle();

  if (error) {
    console.error('❌ Error al buscar la portada:', error);
    return;
  }

  if (data && data.imagen) {
    const url = supabase.storage.from('galeriacomercios').getPublicUrl(data.imagen).data.publicUrl;
    const preview = document.getElementById('portadaPreview');
    if (preview) preview.src = url;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await cargarGaleriaComercio();

  // ✅ Subir imagen al presionar botón
  document.getElementById('btn-subir-imagen')?.addEventListener('click', async () => {
  const input = document.getElementById('nueva-imagen-galeria');
  const files = input?.files;

  if (!files || files.length === 0) {
    return alert('Selecciona una o más imágenes');
  }

  const categoriaID = window.categoriasSeleccionadas?.[0];
  const municipioID = document.getElementById('municipio')?.value;
  const nombre = document.getElementById('nombre')?.value;

  const { data: categoria } = await supabase
    .from('Categorias')
    .select('nombre')
    .eq('id', categoriaID)
    .maybeSingle();

  const { data: municipio } = await supabase
    .from('Municipios')
    .select('nombre')
    .eq('id', municipioID)
    .maybeSingle();

  if (!categoria || !municipio || !nombre) {
    alert('Faltan datos para subir las imágenes');
    return;
  }

  // Subir todas las imágenes en serie (una por una)
  for (const file of files) {
    await subirImagenGaleria(file, categoria.nombre, municipio.nombre, nombre);
  }

  alert(`${files.length} imagen${files.length > 1 ? 'es' : ''} subida${files.length > 1 ? 's' : ''} correctamente`);
});
});