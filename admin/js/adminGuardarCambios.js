// adminGuardarCambios.js
import { supabase } from '../shared/supabaseClient.js';
import { guardarLogoSiAplica } from './adminLogoComercio.js';
import { guardarAmenidadesSeleccionadas } from './adminAmenidadesComercio.js';

const idComercio = new URLSearchParams(window.location.search).get('id');

function normalizarIds(lista) {
  return (Array.isArray(lista) ? lista : [])
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id));
}

async function sincronizarRelacionesComercio(id, categoriasIds, subcategoriasIds) {
  const categoriaIds = normalizarIds(categoriasIds);
  const subcategoriaIds = normalizarIds(subcategoriasIds);

  const [eliminarCategorias, eliminarSubcategorias] = await Promise.all([
    supabase.from('ComercioCategorias').delete().eq('idComercio', id),
    supabase.from('ComercioSubcategorias').delete().eq('idComercio', id),
  ]);

  if (eliminarCategorias.error) throw eliminarCategorias.error;
  if (eliminarSubcategorias.error) throw eliminarSubcategorias.error;

  if (categoriaIds.length) {
    const { error } = await supabase.from('ComercioCategorias').insert(
      categoriaIds.map((categoriaId) => ({
        idComercio: id,
        idCategoria: categoriaId,
      }))
    );
    if (error) throw error;
  }

  if (subcategoriaIds.length) {
    const { error } = await supabase.from('ComercioSubcategorias').insert(
      subcategoriaIds.map((subcategoriaId) => ({
        idComercio: id,
        idSubcategoria: subcategoriaId,
      }))
    );
    if (error) throw error;
  }
}

document.getElementById('btn-guardar')?.addEventListener('click', async (e) => {
  e.preventDefault();
  console.log('👉 Guardar Cambios presionado');

  const nombre = document.getElementById('nombre')?.value.trim();
  const direccion = document.getElementById('direccion')?.value.trim();
  const telefono = document.getElementById('telefono')?.value.trim();
  const whatsapp = document.getElementById('whatsapp')?.value.trim();
  const descripcion = document.getElementById('descripcion')?.value.trim();
  const municipio = document.getElementById('municipio')?.value;
  const facebook = document.getElementById('facebook')?.value.trim();
  const instagram = document.getElementById('instagram')?.value.trim();
  const tiktok = document.getElementById('tiktok')?.value.trim();
  const webpage = document.getElementById('webpage')?.value.trim();
  const colorPrimario = document.getElementById('colorPrimario')?.value.trim();
  const colorSecundario = document.getElementById('colorSecundario')?.value.trim();

  // ✅ Primero subimos el logo si hay uno nuevo
  console.log('📤 Verificando si hay logo nuevo...');
  await guardarLogoSiAplica();
  console.log('✅ Logo procesado');

  const categoriasSeleccionadas = normalizarIds(window.categoriasSeleccionadas);
  const subcategoriasSeleccionadas = normalizarIds(window.subcategoriasSeleccionadas);

  console.log('📝 Datos a actualizar:', {
    nombre,
    direccion,
    telefono,
    whatsapp,
    descripcion,
    municipio,
    facebook,
    instagram,
    tiktok,
    webpage,
    colorPrimario,
    colorSecundario,
    categoriasSeleccionadas,
    subcategoriasSeleccionadas,
  });

  try {
    const { error: errorUpdate } = await supabase
      .from('Comercios')
      .update({
        nombre,
        direccion,
        telefono,
        whatsapp,
        descripcion,
        idMunicipio: municipio,
        facebook,
        instagram,
        tiktok,
        webpage,
        colorPrimario,
        colorSecundario,
        latitud: document.getElementById('latitud')?.value,
        longitud: document.getElementById('longitud')?.value,
        categoria: categoriasSeleccionadas.length ? null : 'Sin categoría',
        subCategorias: subcategoriasSeleccionadas.length ? null : 'Sin subcategoría',
      })
      .eq('id', idComercio);

    if (errorUpdate) {
      throw errorUpdate;
    }

    await sincronizarRelacionesComercio(idComercio, categoriasSeleccionadas, subcategoriasSeleccionadas);
  } catch (error) {
    alert('❌ Error al actualizar la información básica');
    console.error('🚫 Error actualizando comercio:', error);
    return;
  }

  console.log('📦 Categorías:', categoriasSeleccionadas);
  console.log('📦 Subcategorías:', subcategoriasSeleccionadas);

  console.log('✅ Información básica actualizada');

  // 3. Guardar horarios regulares
  console.log('🕘 Guardando horarios...');
  await guardarHorarios();
  console.log('✅ Horarios actualizados');

  // 4. Guardar amenidades seleccionadas
  console.log('🎯 Guardando amenidades seleccionadas...');
  await guardarAmenidadesSeleccionadas();
  console.log('✅ Amenidades actualizadas');

  alert('✅ Comercio actualizado correctamente');
});

// Función auxiliar para guardar horarios regulares
async function guardarHorarios() {
  const contenedor = document.getElementById('horariosContainer');
  if (!contenedor) return;

  const diasSemana = Array.from(contenedor.children);
  const nuevosHorarios = diasSemana.map((row, i) => {
    const apertura = row.querySelector('.apertura')?.value || null;
    const cierre = row.querySelector('.cierre')?.value || null;
    const cerrado = row.querySelector('.cerrado')?.checked || false;

    return {
      idComercio,
      diaSemana: i,
      apertura: cerrado ? null : apertura,
      cierre: cerrado ? null : cierre,
      cerrado
    };
  });

  console.log('📅 Horarios a guardar:', nuevosHorarios);

  await supabase.from('Horarios').delete().eq('idComercio', idComercio);
  const { error } = await supabase.from('Horarios').insert(nuevosHorarios);

  if (error) {
    console.error('❌ Error guardando horarios:', error);
    alert('Hubo un problema al guardar los horarios');
  }
}
