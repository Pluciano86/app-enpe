// adminEditarComercio.js (actualizado)
import { guardarLogoSiAplica } from './adminLogoComercio.js';
import {
  cargarGaleriaComercio,
  activarBotonesGaleria,
  mostrarPortadaEnPreview
} from './adminGaleriaComercio.js';
import { cargarHorariosComercio } from './adminHorarioComercio.js';
import { cargarFeriadosComercio } from './adminFeriadosComercio.js';
import { cargarAmenidadesComercio } from './adminAmenidadesComercio.js';
import { cargarCategoriasYSubcategorias } from './adminCategoriasComercio.js';
import { idComercio, supabase } from '../shared/supabaseClient.js';

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

// Cargar datos generales al inicio
document.addEventListener('DOMContentLoaded', async () => {
  await cargarGaleriaComercio();
  await mostrarPortadaEnPreview();
  activarBotonesGaleria();

  await cargarHorariosComercio();
  await cargarFeriadosComercio();
  await cargarAmenidadesComercio();
  await cargarCategoriasYSubcategorias();
  await cargarDatosGenerales();
});

// Función para cargar campos de texto
async function cargarDatosGenerales() {
  const { data, error } = await supabase
    .from('Comercios')
    .select(
      `
        *,
        ComercioCategorias (
          idCategoria
        ),
        ComercioSubcategorias (
          idSubcategoria
        )
      `
    )
    .eq('id', idComercio)
    .maybeSingle();

  if (error || !data) {
    console.error('Error cargando datos generales:', error);
    return;
  }

  categoriaFallbackActual = toNonEmptyString(data.categoria);
  subcategoriaFallbackActual = toNonEmptyString(data.subCategorias);

  const campos = [
    'nombre', 'telefono', 'direccion', 'latitud', 'longitud',
    'whatsapp', 'facebook', 'instagram', 'tiktok', 'webpage',
    'descripcion', 'colorPrimario', 'colorSecundario'
  ];

  campos.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = data[id] || '';
  });

  if (data.idMunicipio) {
    const select = document.getElementById('municipio');
    if (select) select.value = String(data.idMunicipio);
  }

  const categoriasRel = Array.isArray(data.ComercioCategorias) ? data.ComercioCategorias : [];
  const subcategoriasRel = Array.isArray(data.ComercioSubcategorias) ? data.ComercioSubcategorias : [];

  const categoriasDesdeRel = categoriasRel
    .map((rel) => Number(rel?.idCategoria))
    .filter((id) => !Number.isNaN(id));
  const subcategoriasDesdeRel = subcategoriasRel
    .map((rel) => Number(rel?.idSubcategoria))
    .filter((id) => !Number.isNaN(id));

  const categoriasLegacy = Array.isArray(data.idCategoria)
    ? data.idCategoria
    : data.idCategoria !== null && data.idCategoria !== undefined
    ? [data.idCategoria]
    : [];

  const subcategoriasLegacy = Array.isArray(data.idSubcategoria)
    ? data.idSubcategoria
    : data.idSubcategoria !== null && data.idSubcategoria !== undefined
    ? [data.idSubcategoria]
    : [];

  window.categoriasSeleccionadas = categoriasDesdeRel.length
    ? categoriasDesdeRel
    : categoriasLegacy.map((id) => Number(id)).filter((id) => !Number.isNaN(id));

  window.subcategoriasSeleccionadas = subcategoriasDesdeRel.length
    ? subcategoriasDesdeRel
    : subcategoriasLegacy.map((id) => Number(id)).filter((id) => !Number.isNaN(id));
}

// Evento para guardar cambios
const btnGuardar = document.getElementById('btn-guardar');
btnGuardar.addEventListener('click', async () => {
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
