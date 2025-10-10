// adminEditarComercio.js
import { guardarLogoSiAplica, duplicarLogoDesdePrincipal } from './adminLogoComercio.js';
import {
  cargarGaleriaComercio,
  activarBotonesGaleria,
  mostrarPortadaEnPreview,
  duplicarGaleriaDesdePrincipal
} from './adminGaleriaComercio.js';
import { cargarHorariosComercio } from './adminHorarioComercio.js';
import { cargarFeriadosComercio } from './adminFeriadosComercio.js';
import { cargarAmenidadesComercio } from './adminAmenidadesComercio.js';
import { cargarCategoriasYSubcategorias } from './adminCategoriasComercio.js';
import { cargarSucursalesRelacionadas } from './adminSucursalesComercio.js';
import { idComercio, supabase } from '../shared/supabaseClient.js';

console.log('✅ adminEditarComercio.js importado y ejecutándose');
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM completamente cargado, inicializando funciones');
});

let categoriaFallbackActual = '';
let subcategoriaFallbackActual = '';

function toNonEmptyString(value) {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

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

  return { categoriaIds, subcategoriaIds };
}

// 🚀 Flujo de carga con logs paso a paso
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando flujo de carga completo...');
  try {
    await cargarGaleriaComercio();
    console.log('🖼️ Galería cargada');

    await mostrarPortadaEnPreview();
    console.log('🖼️ Portada mostrada');

    if (typeof activarBotonesGaleria === 'function') {
  activarBotonesGaleria();
  console.log('🧩 Botones galería activos');
} else {
  console.warn('⚠️ activarBotonesGaleria no está exportada. Se omite.');
}

    await cargarHorariosComercio();
    console.log('⏰ Horarios cargados');

    await cargarFeriadosComercio();
    console.log('🎉 Feriados cargados');

    await cargarAmenidadesComercio();
    console.log('🎯 Amenidades cargadas');

    await cargarCategoriasYSubcategorias();
    console.log('📚 Categorías cargadas');

    await cargarDatosGenerales();
    console.log('🧾 Datos generales cargados');

    await cargarSucursalesRelacionadas();
    console.log('🏪 Sucursales cargadas');

    await verificarSiEsSucursal();
    console.log('🔍 Verificación de sucursal completa');
  } catch (err) {
    console.error('❌ Error durante la carga inicial:', err);
  }
});

// ✅ Mostrar botones solo si el comercio es sucursal
async function verificarSiEsSucursal() {
  try {
    console.log('🔎 Verificando si el comercio es una sucursal...');
    const { data: relacion, error } = await supabase
      .from('ComercioSucursales')
      .select('comercio_id')
      .eq('sucursal_id', idComercio)
      .maybeSingle();

    console.log('📦 Resultado relación sucursal:', relacion);
    if (error) throw error;

    if (relacion?.comercio_id) {
      const principalId = relacion.comercio_id;
      const btnLogo = document.getElementById('btnDuplicarLogo');
      const btnGaleria = document.getElementById('btnDuplicarGaleria');

      btnLogo?.classList.remove('hidden');
      btnGaleria?.classList.remove('hidden');

      btnLogo?.addEventListener('click', () =>
        duplicarLogoDesdePrincipal(idComercio, principalId)
      );

      btnGaleria?.addEventListener('click', () =>
        duplicarGaleriaDesdePrincipal(idComercio, principalId)
      );

      console.log('🧭 Comercio detectado como sucursal, botones visibles.');
    } else {
      console.log('ℹ️ Comercio no es sucursal o sin relación registrada.');
    }
  } catch (err) {
    console.error('Error verificando si el comercio es sucursal:', err);
  }
}

// 🧾 Cargar datos generales con logs detallados
async function cargarDatosGenerales() {
  console.log('🟡 Iniciando carga de datos generales para comercio:', idComercio);

  const { data: comercio, error: errorComercio } = await supabase
    .from('Comercios')
    .select(
      'id, nombre, telefono, direccion, latitud, longitud, idMunicipio, municipio, idArea, area, whatsapp, facebook, instagram, tiktok, webpage, descripcion, colorPrimario, colorSecundario, categoria, subCategorias'
    )
    .eq('id', idComercio)
    .maybeSingle();

  console.log('📤 Query ejecutada. Respuesta cruda:', comercio);
  if (errorComercio) console.error('❌ Error cargando comercio:', errorComercio);

  if (!comercio) {
    console.warn('⚠️ No se encontró información del comercio.');
    return;
  }

  // 🧩 Log campo por campo
  const camposTexto = [
    'nombre',
    'telefono',
    'direccion',
    'latitud',
    'longitud',
    'whatsapp',
    'facebook',
    'instagram',
    'tiktok',
    'webpage',
    'descripcion',
    'colorPrimario',
    'colorSecundario',
  ];

  console.group('🔎 Valores recibidos de Supabase');
  camposTexto.forEach((campo) => {
    console.log(`${campo}:`, comercio[campo]);
  });
  console.groupEnd();

  console.log('🏙️ Municipio:', comercio.idMunicipio, '-', comercio.municipio);
  console.log('🌎 Área:', comercio.idArea, '-', comercio.area);
  console.log('📂 Categoria textual:', comercio.categoria);
  console.log('📂 Subcategoría textual:', comercio.subCategorias);

  // Rellenar inputs
  camposTexto.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = comercio[id] || '';
    }
  });

  const selectMunicipio = document.getElementById('municipio');
  if (selectMunicipio && comercio.idMunicipio) {
    selectMunicipio.value = String(comercio.idMunicipio);
  }

  console.log('✅ Campos cargados correctamente en el formulario');
}

// 💾 Guardar cambios
const btnGuardar = document.getElementById('btn-guardar');
btnGuardar.addEventListener('click', async () => {
  console.log('💾 Iniciando guardado de comercio...');
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const direccion = document.getElementById('direccion').value.trim();
  const latitud = parseFloat(document.getElementById('latitud').value);
  const longitud = parseFloat(document.getElementById('longitud').value);
  const idMunicipio = parseInt(document.getElementById('municipio').value);

  const whatsapp = document.getElementById('whatsapp').value.trim();
  const facebook = document.getElementById('facebook').value.trim();
  const instagram = document.getElementById('instagram').value.trim();
  const tiktok = document.getElementById('tiktok').value.trim();
  const webpage = document.getElementById('webpage').value.trim();
  const descripcion = document.getElementById('descripcion').value.trim();
  const colorPrimario = document.getElementById('colorPrimario').value;
  const colorSecundario = document.getElementById('colorSecundario').value;

  btnGuardar.disabled = true;

  try {
    const { data: municipioData, error: municipioError } = await supabase
      .from('Municipios')
      .select('idArea, nombre')
      .eq('id', idMunicipio)
      .single();

    if (municipioError || !municipioData?.idArea) {
      throw municipioError || new Error('Municipio sin área asociada.');
    }

    const idArea = municipioData.idArea;
    const nombreMunicipio = municipioData.nombre;

    const { data: areaData, error: areaError } = await supabase
      .from('Area')
      .select('nombre')
      .eq('idArea', idArea)
      .single();

    if (areaError || !areaData?.nombre) {
      throw areaError || new Error('No se pudo obtener el nombre del área.');
    }

    const nombreArea = areaData.nombre;

    const categoriasSeleccionadas = normalizarIds(window.categoriasSeleccionadas);
    const subcategoriasSeleccionadas = normalizarIds(window.subcategoriasSeleccionadas);

    const categoriaFallback =
      categoriasSeleccionadas.length === 0 ? categoriaFallbackActual || 'Sin categoría' : null;
    const subcategoriaFallback =
      subcategoriasSeleccionadas.length === 0 ? subcategoriaFallbackActual || 'Sin subcategoría' : null;

    const { error: updateError } = await supabase
      .from('Comercios')
      .update({
        nombre,
        telefono,
        direccion,
        latitud,
        longitud,
        idMunicipio,
        municipio: nombreMunicipio,
        idArea,
        area: nombreArea,
        whatsapp,
        facebook,
        instagram,
        tiktok,
        webpage,
        descripcion,
        colorPrimario,
        colorSecundario,
        categoria: categoriaFallback,
        subCategorias: subcategoriaFallback,
      })
      .eq('id', idComercio);

    if (updateError) throw updateError;

    const { categoriaIds, subcategoriaIds } = await sincronizarRelacionesComercio(
      idComercio,
      categoriasSeleccionadas,
      subcategoriasSeleccionadas
    );

    await guardarLogoSiAplica();

    categoriaFallbackActual =
      categoriaIds.length === 0 ? categoriaFallback || 'Sin categoría' : categoriaFallbackActual;
    subcategoriaFallbackActual =
      subcategoriaIds.length === 0 ? subcategoriaFallback || 'Sin subcategoría' : subcategoriaFallbackActual;

    alert('✅ Comercio actualizado correctamente');
  } catch (error) {
    console.error('❌ Error actualizando comercio:', error);
    alert('❌ Error actualizando comercio');
  } finally {
    btnGuardar.disabled = false;
  }
});

console.log('✅ adminEditarComercio.js cargado correctamente');