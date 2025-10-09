// adminGaleriaComercio.js
import { supabase } from '../shared/supabaseClient.js';
const idComercio = new URLSearchParams(window.location.search).get('id');
const idComercioNumero = Number(idComercio);
const idComercioDB = Number.isFinite(idComercioNumero)
  ? idComercioNumero
  : (() => {
      const parsed = Number.parseInt(idComercio, 10);
      return Number.isFinite(parsed) ? parsed : null;
    })();
const BUCKET = 'galeriacomercios';
const PUBLIC_PREFIX = '/storage/v1/object/public/galeriacomercios/';

export async function cargarGaleriaComercio() {
  const contenedor = document.getElementById('galeria-comercio');
  if (!contenedor) return;
  contenedor.innerHTML = 'Cargando...';

  if (!Number.isFinite(idComercioDB)) {
    console.warn('ID de comercio inválido. No se puede cargar la galería.');
    contenedor.innerHTML = 'No se pudo cargar la galería.';
    return;
  }

  const { data: imagenes, error } = await supabase
    .from('imagenesComercios')
    .select('*')
    .eq('idComercio', idComercioDB)
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
    const url = obtenerUrlPublica(img.imagen);
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
      if (!Number.isFinite(idComercioDB)) {
        console.warn('ID de comercio inválido. No se puede eliminar la imagen.');
        return;
      }

      const id = btn.dataset.id;
      if (!confirm('¿Deseas eliminar esta imagen?')) return;

      const { data, error } = await supabase
        .from('imagenesComercios')
        .select('imagen, portada')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return;

      const storagePath = obtenerRutaStorage(data.imagen);
      if (storagePath) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
      }

      await supabase.from('imagenesComercios').delete().eq('id', id);
      await sincronizarPortadaPrincipal();
      await mostrarPortadaEnPreview();
      await cargarGaleriaComercio();
    });
  });

  document.querySelectorAll('[title="Portada"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!Number.isFinite(idComercioDB)) {
        console.warn('ID de comercio inválido. No se puede actualizar la portada.');
        return;
      }

      const id = btn.dataset.id;
      const { data: registro } = await supabase
        .from('imagenesComercios')
        .select('imagen')
        .eq('id', id)
        .maybeSingle();

      await supabase.from('imagenesComercios').update({ portada: false }).eq('idComercio', idComercioDB);
      await supabase.from('imagenesComercios').update({ portada: true }).eq('id', id);
      if (registro?.imagen) {
        const portadaUrl = obtenerUrlPublica(registro.imagen);
        await actualizarPortadaComercio(portadaUrl);
      }
      await mostrarPortadaEnPreview();
      await cargarGaleriaComercio();
    });
  });
}

export async function subirImagenGaleria(file) {
  if (!Number.isFinite(idComercioDB)) {
    console.error('❌ ID de comercio inválido. No se pueden subir imágenes.');
    alert('No se pudo identificar el comercio para subir la imagen.');
    return;
  }

  const extension = obtenerExtension(file.name);
  const fileName = generarNombreUnico('imagen', extension);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    console.error('Error subiendo imagen a storage:', uploadError);
    return;
  }

  const { data: insertData, error: dbError } = await supabase
    .from('imagenesComercios')
    .insert({
      idComercio: idComercioDB,
      imagen: fileName,
      logo: false,
      portada: false
    })
    .select('id, imagen')
    .maybeSingle();

  if (dbError || !insertData) {
    console.error('Error guardando en la base de datos:', dbError);
    return;
  }

  const portadaUrl = obtenerUrlPublica(insertData.imagen);

  const { data: portadaActual } = await supabase
    .from('imagenesComercios')
    .select('id')
    .eq('idComercio', idComercioDB)
    .eq('portada', true)
    .maybeSingle();

  if (!portadaActual) {
    await supabase.from('imagenesComercios').update({ portada: true }).eq('id', insertData.id);
    await actualizarPortadaComercio(portadaUrl);
    const preview = document.getElementById('portadaPreview');
    if (preview) preview.src = portadaUrl;
  }

  await cargarGaleriaComercio();
  await mostrarPortadaEnPreview();
}

export function activarInteraccionesGaleria() {
  activarBotonesGaleria();
}

export async function mostrarPortadaEnPreview() {
  const { data, error } = await supabase
    .from('imagenesComercios')
    .select('imagen')
    .eq('idComercio', idComercioDB)
    .eq('portada', true)
    .maybeSingle();

  if (error) {
    console.error('❌ Error al buscar la portada:', error);
    return;
  }

  if (data && data.imagen) {
    const url = obtenerUrlPublica(data.imagen);
    const preview = document.getElementById('portadaPreview');
    if (preview) preview.src = url;
  } else {
    const preview = document.getElementById('portadaPreview');
    if (preview) preview.removeAttribute('src');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await cargarGaleriaComercio();

  document.getElementById('btn-subir-imagen')?.addEventListener('click', async () => {
    const input = document.getElementById('nueva-imagen-galeria');
    const files = input?.files;

    if (!files || files.length === 0) {
      return alert('Selecciona una o más imágenes');
    }

    for (const file of files) {
      await subirImagenGaleria(file);
    }

    alert(`${files.length} imagen${files.length > 1 ? 'es' : ''} subida${files.length > 1 ? 's' : ''} correctamente`);
  });
});

function obtenerUrlPublica(valor) {
  if (!valor) return '';
  const decoded = decodeURIComponent(valor);
  if (/^https?:\/\//i.test(decoded)) return decoded;
  const pathNormalizado = normalizarPathStorage(decoded);
  return supabase.storage.from(BUCKET).getPublicUrl(pathNormalizado).data.publicUrl;
}

function obtenerRutaStorage(valor) {
  if (!valor) return null;
  const decoded = decodeURIComponent(valor);
  if (/^https?:\/\//i.test(decoded)) {
    const indice = decoded.indexOf(PUBLIC_PREFIX);
    if (indice === -1) return null;
    return decoded.slice(indice + PUBLIC_PREFIX.length);
  }
  return normalizarPathStorage(decoded);
}

async function sincronizarPortadaPrincipal() {
  const { data: portadaActual } = await supabase
    .from('imagenesComercios')
    .select('id, imagen')
    .eq('idComercio', idComercioDB)
    .eq('portada', true)
    .maybeSingle();

  if (portadaActual?.imagen) {
    const url = obtenerUrlPublica(portadaActual.imagen);
    await actualizarPortadaComercio(url);
    return;
  }

  const { data: primeraImagen } = await supabase
    .from('imagenesComercios')
    .select('id, imagen')
    .eq('idComercio', idComercioDB)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (primeraImagen?.id && primeraImagen.imagen) {
    await supabase.from('imagenesComercios').update({ portada: true }).eq('id', primeraImagen.id);
    const url = obtenerUrlPublica(primeraImagen.imagen);
    await actualizarPortadaComercio(url);
  } else {
    await actualizarPortadaComercio(null);
  }
}

function normalizarPathStorage(path) {
  return path
    .replace(/^public\//i, '')
    .replace(/^galeriacomercios\//i, '');
}

async function actualizarPortadaComercio(url) {
  if (!Number.isFinite(idComercioDB)) return;
  await supabase.from('Comercios').update({ portada: url }).eq('id', idComercioDB);
}

function generarNombreUnico(prefijo, extension) {
  const base = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${prefijo}_${Date.now()}_${base}.${extension}`;
}

function obtenerExtension(nombreArchivo = '') {
  const partes = String(nombreArchivo).split('.');
  if (partes.length <= 1) return 'jpg';
  return partes.pop().toLowerCase() || 'jpg';
}
