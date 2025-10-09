// adminLogoComercio.js
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

// 🔁 Variable global para mantener el archivo seleccionado
let archivoLogoSeleccionado = null;

// Esperar a que todo esté listo
document.addEventListener('DOMContentLoaded', () => {
  const inputLogo = document.getElementById('nuevo-logo');
  const preview = document.getElementById('preview-logo');
  const btnEliminar = document.getElementById('btn-eliminar-logo');

  // Mostrar preview si selecciona nuevo logo
  inputLogo?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    archivoLogoSeleccionado = file || null;

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      preview.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Eliminar logo actual
  btnEliminar?.addEventListener('click', async () => {
    if (!Number.isFinite(idComercioDB)) {
      console.warn('ID de comercio inválido. No se puede eliminar el logo.');
      return;
    }

    const { data } = await supabase
      .from('imagenesComercios')
      .select('id, imagen')
      .eq('idComercio', idComercioDB)
      .eq('logo', true)
      .maybeSingle();

    if (data) {
      const storagePath = obtenerRutaStorage(data.imagen);
      if (storagePath) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
      }
      await supabase.from('imagenesComercios').delete().eq('id', data.id);
      if (Number.isFinite(idComercioDB)) {
        await supabase.from('Comercios').update({ logo: null }).eq('id', idComercioDB);
      }
      if (preview) preview.src = '';
      archivoLogoSeleccionado = null;
    }
  });
});

// Función pública para guardar el logo si aplica
export async function guardarLogoSiAplica() {
  const archivo = archivoLogoSeleccionado;

  if (!archivo) {
    console.log('ℹ️ No se seleccionó un nuevo logo.');
    return;
  }

  if (!Number.isFinite(idComercioDB)) {
    console.error('❌ ID de comercio inválido. No se puede subir el logo.');
    alert('No se pudo identificar el comercio para guardar el logo.');
    return;
  }

  console.log('📦 Archivo:', {
    name: archivo.name,
    type: archivo.type,
    size: archivo.size,
  });

  if (archivo.size === 0 || !archivo.type || !archivo.type.startsWith('image/')) {
    alert('Logo inválido. Selecciona un archivo PNG o JPG válido.');
    return;
  }

  const extension = obtenerExtension(archivo.name);
  const nombreArchivo = generarNombreUnico('logo', extension);
  const path = nombreArchivo;

  console.log('📁 Ruta destino en bucket:', path);

  try {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, archivo, {
        cacheControl: '3600',
        upsert: true,
        contentType: archivo.type || 'image/jpeg',
      });

    if (uploadError) {
      console.error('❌ Error subiendo logo:', uploadError);
      alert(`Error al subir el logo:\n${uploadError.message}`);
      return;
    }

    await supabase.from('imagenesComercios').delete().eq('idComercio', idComercioDB).eq('logo', true);

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = publicData?.publicUrl || construirPublicUrlFallback(path);

    const { error: insertError } = await supabase.from('imagenesComercios').insert({
      idComercio: idComercioDB,
      imagen: path,
      logo: true
    });

    if (insertError) {
      console.error('❌ Error al guardar logo en DB:', insertError);
      alert('Error al guardar el logo en la base de datos');
      return;
    }

    await supabase.from('Comercios').update({ logo: publicUrl }).eq('id', idComercioDB);

    const preview = document.getElementById('preview-logo');
    if (preview) preview.src = publicUrl;
    archivoLogoSeleccionado = null;

    console.log('✅ Logo subido y registrado correctamente:', path);
  } catch (err) {
    console.error('❌ Error inesperado al subir logo:', err);
    alert('Error inesperado al subir el logo');
  }
}

function obtenerRutaStorage(valor) {
  if (!valor) return null;
  const decoded = decodeURIComponent(valor);
  if (/^https?:\/\//i.test(decoded)) {
    const indice = decoded.indexOf(PUBLIC_PREFIX);
    if (indice === -1) return null;
    return decoded.slice(indice + PUBLIC_PREFIX.length);
  }
  return normalizarStoragePath(decoded);
}

function construirPublicUrlFallback(path) {
  if (!path) return '';
  const limpio = normalizarStoragePath(path);
  return `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/${BUCKET}/${limpio}`;
}

function normalizarStoragePath(path) {
  return path
    .replace(/^public\//i, '')
    .replace(/^galeriacomercios\//i, '');
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
