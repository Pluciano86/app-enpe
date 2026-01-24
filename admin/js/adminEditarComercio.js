// adminEditarComercio.js
import { supabase, idComercio } from '/shared/supabaseClient.js';
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

console.log('adminEditarComercio loaded', { supabase });

async function cargarMunicipiosSelect(idSeleccionado = null) {
  const selectMunicipio = document.getElementById('municipio');
  if (!selectMunicipio) return;
  if (!supabase) {
    console.error('Supabase no disponible para cargar municipios');
    return;
  }
  try {
    const { data, error } = await supabase
      .from('Municipios')
      .select('id, Municipio')
      .order('Municipio', { ascending: true });
    if (error) throw error;
    selectMunicipio.innerHTML = '<option value=\"\">Selecciona un municipio</option>';
    (data || []).forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.Municipio || m.nombre || '';
      selectMunicipio.appendChild(opt);
    });
    if (idSeleccionado) {
      selectMunicipio.value = String(idSeleccionado);
    }
  } catch (err) {
    console.error('Error cargando municipios:', err);
  }
}

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
  try {
    if (!supabase) {
      console.error('Supabase no disponible en adminEditarComercio');
      alert('No se pudo inicializar Supabase. Revisa la carga de shared/supabaseClient.js');
      return;
    }
    await cargarMunicipiosSelect();
    await cargarGaleriaComercio();
    await mostrarPortadaEnPreview();
    if (typeof activarBotonesGaleria === 'function') {
  activarBotonesGaleria();
} else {
}

    await cargarHorariosComercio();
    await cargarFeriadosComercio();
    await cargarAmenidadesComercio();
    await cargarCategoriasYSubcategorias();
    await cargarDatosGenerales();
    await cargarSucursalesRelacionadas();
    await verificarSiEsSucursal();
  } catch (err) {
  }
});

// ✅ Mostrar botones solo si el comercio es sucursal
async function verificarSiEsSucursal() {
  try {
    const { data: relacion, error } = await supabase
      .from('ComercioSucursales')
      .select('comercio_id')
      .eq('sucursal_id', idComercio)
      .maybeSingle();

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
    } else {
    }
  } catch (err) {
  }
}

// 🧾 Cargar datos generales con logs detallados
async function cargarDatosGenerales() {

  const { data: comercio, error: errorComercio } = await supabase
    .from('Comercios')
    .select(
      'id, nombre, telefono, direccion, latitud, longitud, idMunicipio, municipio, idArea, area, whatsapp, facebook, instagram, tiktok, webpage, descripcion, colorPrimario, colorSecundario, categoria, subCategorias'
    )
    .eq('id', idComercio)
    .maybeSingle();

  if (errorComercio) console.error('❌ Error cargando comercio:', errorComercio);

  if (!comercio) {

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

  // Rellenar inputs
  camposTexto.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = comercio[id] || '';
    }
  });

  await cargarMunicipiosSelect(comercio.idMunicipio);
}
