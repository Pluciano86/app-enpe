// adminEditarComercio.js
import { manejarInteraccionesLogo, guardarLogoSiAplica } from './adminLogoComercio.js';
import {
  cargarGaleriaComercio,
  activarBotonesGaleria,
  mostrarPortadaEnPreview,
  subirImagenGaleria
} from './adminGaleriaComercio.js';
import {
  cargarHorariosComercio,
  guardarHorariosComercio
} from './adminHorarioComercio.js';
import {
  cargarFeriadosComercio,
  guardarFeriadosComercio
} from './adminFeriadosComercio.js';
import {
  cargarAmenidadesComercio,
  guardarAmenidadesComercio
} from './adminAmenidadesComercio.js';
import {
  cargarCategoriasYSubcategorias,
  guardarCategoriasYSubcategorias
} from './adminCategoriasComercio.js';
import { idComercio, supabase } from './supabaseClient.js';

// Cargar datos generales al inicio
document.addEventListener('DOMContentLoaded', async () => {
  await manejarInteraccionesLogo();
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

  window.categoriasSeleccionadas = data.idCategoria || [];
  window.subcategoriasSeleccionadas = data.idSubcategoria || [];
}

// Guardar toda la información
const btnGuardar = document.getElementById('btnGuardar');
btnGuardar?.addEventListener('click', async (e) => {
  e.preventDefault();

  await guardarLogoSiAplica();
  await guardarHorariosComercio();
  await guardarFeriadosComercio();
  await guardarAmenidadesComercio();
  await guardarCategoriasYSubcategorias();
  await guardarDatosGenerales();

  alert('✅ Cambios guardados correctamente');
});

// Guardar datos generales en Supabase
async function guardarDatosGenerales() {
  const payload = {
    nombre: document.getElementById('nombre')?.value,
    telefono: document.getElementById('telefono')?.value,
    direccion: document.getElementById('direccion')?.value,
    latitud: document.getElementById('latitud')?.value,
    longitud: document.getElementById('longitud')?.value,
    whatsapp: document.getElementById('whatsapp')?.value,
    facebook: document.getElementById('facebook')?.value,
    instagram: document.getElementById('instagram')?.value,
    tiktok: document.getElementById('tiktok')?.value,
    webpage: document.getElementById('webpage')?.value,
    descripcion: document.getElementById('descripcion')?.value,
    colorPrimario: document.getElementById('colorPrimario')?.value,
    colorSecundario: document.getElementById('colorSecundario')?.value,
    idMunicipio: document.getElementById('municipio')?.value || null,
    idCategoria: window.categoriasSeleccionadas || [],
    idSubcategoria: window.subcategoriasSeleccionadas || []
  };

  const { error } = await supabase
    .from('Comercios')
    .update(payload)
    .eq('id', idComercio);

  if (error) console.error('Error guardando datos generales:', error);
}
