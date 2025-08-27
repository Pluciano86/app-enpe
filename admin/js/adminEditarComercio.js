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
import { idComercio, supabase } from './supabaseClient.js';

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