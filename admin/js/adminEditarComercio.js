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
    .select('*')
    .eq('id', idComercio)
    .maybeSingle();

  if (error || !data) {
    console.error('Error cargando datos generales:', error);
    return;
  }

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

  window.categoriasSeleccionadas = Array.isArray(data.idCategoria)
    ? data.idCategoria
    : data.idCategoria !== null ? [data.idCategoria] : [];

  window.subcategoriasSeleccionadas = Array.isArray(data.idSubcategoria)
    ? data.idSubcategoria
    : data.idSubcategoria !== null ? [data.idSubcategoria] : [];
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

  // Obtener municipio y área
  const { data: municipioData, error: municipioError } = await supabase
    .from('Municipios')
    .select('idArea, nombre')
    .eq('id', idMunicipio)
    .single();

  if (municipioError || !municipioData?.idArea) {
    alert('❌ Error obteniendo el área del municipio.');
    console.error(municipioError);
    return;
  }

  const idArea = municipioData.idArea;
  const nombreMunicipio = municipioData.nombre;

  const { data: areaData, error: areaError } = await supabase
    .from('Area')
    .select('nombre')
    .eq('idArea', idArea)
    .single();

  if (areaError || !areaData?.nombre) {
    alert('❌ Error obteniendo el nombre del área.');
    console.error(areaError);
    return;
  }

  const nombreArea = areaData.nombre;

  // Actualizar datos en Supabase
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
      colorSecundario
    })
    .eq('id', idComercio);

  if (updateError) {
    alert('❌ Error actualizando comercio');
    console.error(updateError);
    return;
  }

  await guardarLogoSiAplica();

  alert('✅ Comercio actualizado correctamente');
});