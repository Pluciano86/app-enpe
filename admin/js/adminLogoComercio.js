// adminLogoComercio.js
import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');

// Mostrar preview si selecciona nuevo logo
document.getElementById('nuevo-logo')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    document.getElementById('preview-logo').src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// Eliminar logo actual
document.getElementById('btn-eliminar-logo')?.addEventListener('click', async () => {
  const { data } = await supabase
    .from('imagenesComercios')
    .select('id, imagen')
    .eq('idComercio', idComercio)
    .eq('logo', true)
    .maybeSingle();

  if (data) {
    await supabase.storage.from('galeriacomercios').remove([data.imagen]);
    await supabase.from('imagenesComercios').delete().eq('id', data.id);
    document.getElementById('preview-logo').src = '';
  }
});

export async function guardarLogoSiAplica() {
  const archivo = document.getElementById('nuevo-logo')?.files?.[0];
  if (!archivo) return;

  const nombre = document.getElementById('nombre')?.value.trim();
  const idCategoria = window.categoriasSeleccionadas?.[0];
  const idMunicipio = document.getElementById('municipio')?.value;

  const { data: categoria } = await supabase.from('Categorias').select('nombre').eq('id', idCategoria).maybeSingle();
  const { data: municipio } = await supabase.from('Municipios').select('nombre').eq('id', idMunicipio).maybeSingle();

  if (!categoria || !municipio || !nombre || !archivo) {
    alert('Faltan datos para subir el logo');
    return;
  }

  const nombreLimpio = limpiarTexto(nombre.toUpperCase());
  const categoriaLimpia = capitalizar(limpiarTexto(categoria.nombre));
  const municipioLimpio = capitalizar(limpiarTexto(municipio.nombre));

  const carpeta = `galeriacomercios/${categoriaLimpia}/${municipioLimpio}/${nombreLimpio}`;
  const nombreArchivo = `logo_${Date.now()}.${archivo.name.split('.').pop()}`;

  const { error: uploadError } = await supabase
    .storage
    .from('galeriacomercios')
    .upload(`${carpeta}/${nombreArchivo}`, archivo, { upsert: true });

  if (uploadError) {
    console.error('❌ Error subiendo logo:', uploadError);
    alert('Error al subir el logo');
    return;
  }

  await supabase.from('imagenesComercios').delete().eq('idComercio', idComercio).eq('logo', true);

  const { error: insertError } = await supabase
    .from('imagenesComercios')
    .insert({
      idComercio,
      imagen: `${carpeta}/${nombreArchivo}`,
      logo: true,
      portada: false,
    });

  if (insertError) {
    console.error('❌ Error al guardar logo en DB:', insertError);
    alert('Error al guardar el logo en la base de datos');
    return;
  }

  console.log('✅ Logo subido correctamente');
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

function limpiarTexto(texto) {
  return texto
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-zA-Z0-9]/g, '-') // reemplaza espacios y símbolos por guiones
    .replace(/-+/g, '-') // elimina guiones repetidos
    .replace(/^-|-$/g, ''); // remueve guiones al inicio o final
}