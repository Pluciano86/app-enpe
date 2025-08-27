// adminLogoComercio.js
import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');

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
    const { data } = await supabase
      .from('imagenesComercios')
      .select('id, imagen')
      .eq('idComercio', idComercio)
      .eq('logo', true)
      .maybeSingle();

    if (data) {
      await supabase.storage.from('galeriacomercios').remove([data.imagen]);
      await supabase.from('imagenesComercios').delete().eq('id', data.id);
      preview.src = '';
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

  console.log('📦 Archivo:', {
    name: archivo.name,
    type: archivo.type,
    size: archivo.size,
  });

  if (archivo.size === 0 || !archivo.type || !archivo.type.startsWith('image/')) {
    alert('Logo inválido. Selecciona un archivo PNG o JPG válido.');
    return;
  }

  const nombre = document.getElementById('nombre')?.value.trim();
  const idCategoria = window.categoriasSeleccionadas?.[0];
  const idMunicipio = document.getElementById('municipio')?.value;

  const { data: categoria } = await supabase.from('Categorias').select('nombre').eq('id', idCategoria).maybeSingle();
  const { data: municipio } = await supabase.from('Municipios').select('nombre').eq('id', idMunicipio).maybeSingle();

  if (!categoria || !municipio || !nombre) {
    alert('Faltan datos para subir el logo');
    console.warn({ categoria, municipio, nombre });
    return;
  }

  const nombreLimpio = limpiarTexto(nombre.toUpperCase());
  const categoriaLimpia = capitalizar(limpiarTexto(categoria.nombre));
  const municipioLimpio = capitalizar(limpiarTexto(municipio.nombre));
  const carpeta = `${categoriaLimpia}/${municipioLimpio}/${nombreLimpio}`;
  const extension = archivo.name.split('.').pop();
  const nombreArchivo = `logo_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
  const path = `${carpeta}/${nombreArchivo}`;

  console.log('📁 Ruta destino en bucket:', path);

  try {
    const { error: uploadError } = await supabase.storage
      .from('galeriacomercios')
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

    await supabase.from('imagenesComercios').delete().eq('idComercio', idComercio).eq('logo', true);

    const { error: insertError } = await supabase.from('imagenesComercios').insert({
  idComercio: parseInt(idComercio),
  imagen: path,
  logo: true,
  portada: false,
});

    if (insertError) {
      console.error('❌ Error al guardar logo en DB:', insertError);
      alert('Error al guardar el logo en la base de datos');
      return;
    }

    const publicUrl = supabase.storage.from('galeriacomercios').getPublicUrl(path).data.publicUrl;
    document.getElementById('preview-logo').src = publicUrl;

    console.log('✅ Logo subido y registrado correctamente:', path);
  } catch (err) {
    console.error('❌ Error inesperado al subir logo:', err);
    alert('Error inesperado al subir el logo');
  }
}

// Helpers
function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

function limpiarTexto(texto) {
  return texto
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2013\u2014]/g, '-') // ← reemplaza guion largo por guion normal
    .replace(/[^a-zA-Z0-9\-]/g, '-') // ← conserva guiones normales
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}