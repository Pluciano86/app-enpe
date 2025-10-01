import { supabase } from '../shared/supabaseClient.js';

const tablaBanners = document.getElementById('tablaBanners');
const listaBannersMobile = document.getElementById('listaBannersMobile');
const contadorBanners = document.getElementById('contadorBanners');
const filtroBusqueda = document.getElementById('filtroBusqueda');
const filtroTipo = document.getElementById('filtroTipo');
const filtroActivo = document.getElementById('filtroActivo');

const btnNuevoBanner = document.getElementById('btnNuevoBanner');
const modalBanner = document.getElementById('modalBanner');
const modalTitulo = document.getElementById('modalTitulo');
const btnCerrarModal = document.getElementById('btnCerrarModal');
const btnCancelarBanner = document.getElementById('btnCancelarBanner');
const formBanner = document.getElementById('formBanner');

const campoArea = document.getElementById('campoArea');
const campoMunicipio = document.getElementById('campoMunicipio');
const bannerArea = document.getElementById('bannerArea');
const bannerMunicipio = document.getElementById('bannerMunicipio');
const bannerTipo = document.getElementById('bannerTipo');
const bannerId = document.getElementById('bannerId');
const bannerTitulo = document.getElementById('bannerTitulo');
const bannerDescripcion = document.getElementById('bannerDescripcion');
const bannerImagen = document.getElementById('bannerImagen');
const bannerVideo = document.getElementById('bannerVideo');
const bannerVideoUrl = document.getElementById('bannerVideoUrl');
const bannerFechaInicio = document.getElementById('bannerFechaInicio');
const bannerFechaFin = document.getElementById('bannerFechaFin');
const bannerActivo = document.getElementById('bannerActivo');
const bannerArchivoActual = document.getElementById('bannerArchivoActual');
const errorBanner = document.getElementById('errorBanner');
const inputUrlExterna = document.getElementById('urlexterna');
const esComercioCheckbox = document.getElementById('esComercio');
const selectorComercio = document.getElementById('selectorComercio');
const buscarComercioInput = document.getElementById('buscarComercio');
const resultadosComercio = document.getElementById('resultadosComercio');

let banners = [];
let areasLista = [];
let municipiosLista = [];
let bannerEnEdicion = null;
let comercioSeleccionadoId = null;
let comercioSeleccionadoNombre = '';
let buscarComercioTimeout = null;

const areaMap = new Map();
const municipioMap = new Map();

function safeText(texto) {
  return (texto ?? '').toString();
}

function formatearTipo(tipo) {
  if (!tipo) return '--';
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

function formatearFecha(fecha) {
  if (!fecha) return '';
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-PR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatearRangoFechas(inicio, fin) {
  const inicioFmt = formatearFecha(inicio);
  const finFmt = formatearFecha(fin);
  if (!inicioFmt && !finFmt) return 'Sin fechas';
  if (inicioFmt && !finFmt) return `Desde ${inicioFmt}`;
  if (!inicioFmt && finFmt) return `Hasta ${finFmt}`;
  return `${inicioFmt} – ${finFmt}`;
}

function slugify(value) {
  return safeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || `banner-${Date.now()}`;
}

function toggleSelectorComercio(mostrar) {
  if (!selectorComercio) return;
  if (mostrar) {
    selectorComercio.classList.remove('hidden');
    inputUrlExterna.value = '';
    inputUrlExterna.disabled = true;
  } else {
    selectorComercio.classList.add('hidden');
    limpiarSeleccionComercio();
    inputUrlExterna.disabled = false;
  }
}

function limpiarSeleccionComercio() {
  comercioSeleccionadoId = null;
  comercioSeleccionadoNombre = '';
  if (buscarComercioInput) {
    buscarComercioInput.value = '';
    buscarComercioInput.dataset.selected = '';
  }
  if (resultadosComercio) resultadosComercio.innerHTML = '';
}

async function buscarComercioPorNombre(query) {
  const { data, error } = await supabase
    .from('Comercios')
    .select('id, nombre')
    .ilike('nombre', `%${query}%`)
    .limit(10);
  return { data, error };
}

async function cargarComercioPorId(id) {
  const { data, error } = await supabase
    .from('Comercios')
    .select('id, nombre')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.warn('No se pudo cargar el comercio para banner:', error);
    return null;
  }
  return data;
}

function toggleCamposTipo(tipo) {
  if (tipo === 'area') {
    campoArea.classList.remove('hidden');
    campoMunicipio.classList.add('hidden');
    bannerMunicipio.value = '';
  } else if (tipo === 'municipio') {
    campoMunicipio.classList.remove('hidden');
    campoArea.classList.add('hidden');
    bannerArea.value = '';
  } else {
    campoArea.classList.add('hidden');
    campoMunicipio.classList.add('hidden');
    bannerArea.value = '';
    bannerMunicipio.value = '';
  }
}

function abrirModal(banner = null) {
  bannerEnEdicion = banner;
  errorBanner.classList.add('hidden');
  errorBanner.textContent = '';
  bannerArchivoActual.classList.add('hidden');
  bannerArchivoActual.textContent = '';
  formBanner.reset();
  bannerActivo.checked = true;
  inputUrlExterna.value = '';
  esComercioCheckbox.checked = false;
  toggleSelectorComercio(false);

  if (banner) {
    modalTitulo.textContent = 'Editar Banner';
    bannerId.value = banner.id;
    bannerTitulo.value = banner.titulo || '';
    bannerDescripcion.value = banner.descripcion || '';
    bannerTipo.value = banner.tipo || 'global';
    toggleCamposTipo(banner.tipo);
    bannerArea.value = banner.idArea != null ? String(banner.idArea) : '';
    bannerMunicipio.value = banner.idMunicipio != null ? String(banner.idMunicipio) : '';
    bannerFechaInicio.value = banner.fechaInicio ? banner.fechaInicio.split('T')[0] : '';
    bannerFechaFin.value = banner.fechaFin ? banner.fechaFin.split('T')[0] : '';
    bannerActivo.checked = banner.activo === true;
    bannerVideoUrl.value = banner.videoUrl || '';
    inputUrlExterna.value = banner.urlExterna || '';

    if (banner.idComercio != null) {
      esComercioCheckbox.checked = true;
      toggleSelectorComercio(true);
      comercioSeleccionadoId = banner.idComercio;
      buscarComercioInput.value = 'Cargando...';
      cargarComercioPorId(banner.idComercio).then((comercio) => {
        if (comercio) {
          comercioSeleccionadoNombre = comercio.nombre;
          buscarComercioInput.value = comercio.nombre;
          buscarComercioInput.dataset.selected = comercio.id;
        } else {
          buscarComercioInput.value = '';
        }
      });
    }

    const referencias = [];
    if (banner.imagenUrl) referencias.push(`Imagen actual: <a href="${banner.imagenUrl}" target="_blank" class="text-blue-600 underline">ver</a>`);
    if (banner.videoUrl) referencias.push(`Video actual: <a href="${banner.videoUrl}" target="_blank" class="text-blue-600 underline">ver</a>`);
    if (referencias.length) {
      bannerArchivoActual.innerHTML = referencias.join(' | ');
      bannerArchivoActual.classList.remove('hidden');
    }
  } else {
    modalTitulo.textContent = 'Nuevo Banner';
    bannerId.value = '';
    toggleCamposTipo('global');
    bannerVideoUrl.value = '';
    inputUrlExterna.value = '';
    toggleSelectorComercio(false);
  }

  bannerImagen.value = '';
  bannerVideo.value = '';

  modalBanner.classList.remove('hidden');
  modalBanner.classList.add('flex');
}

function cerrarModal() {
  modalBanner.classList.add('hidden');
  modalBanner.classList.remove('flex');
  bannerEnEdicion = null;
  limpiarSeleccionComercio();
  esComercioCheckbox.checked = false;
  toggleSelectorComercio(false);
}

function aplicarFiltros() {
  const text = filtroBusqueda.value.trim().toLowerCase();
  const tipo = filtroTipo.value;
  const activoFilter = filtroActivo.value;

  let filtrados = [...banners];

  if (text) {
    filtrados = filtrados.filter(b => (b.titulo || '').toLowerCase().includes(text));
  }

  if (tipo) {
    filtrados = filtrados.filter(b => b.tipo === tipo);
  }

  if (activoFilter) {
    const flag = activoFilter === 'true';
    filtrados = filtrados.filter(b => Boolean(b.activo) === flag);
  }

  renderBanners(filtrados);
}

function renderBanners(lista) {
  tablaBanners.innerHTML = '';
  listaBannersMobile.innerHTML = '';

  contadorBanners.textContent = `Mostrando ${lista.length} banner${lista.length === 1 ? '' : 's'}`;

  lista.forEach(banner => {
    const ubicacion = banner.tipo === 'area'
      ? (areaMap.get(banner.idArea) || '--')
      : banner.tipo === 'municipio'
        ? (municipioMap.get(banner.idMunicipio) || '--')
        : 'Global';

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td class="px-4 py-3 font-medium text-gray-800">${safeText(banner.titulo)}</td>
      <td class="px-4 py-3 text-gray-600">${formatearTipo(banner.tipo)}</td>
      <td class="px-4 py-3 text-gray-600">${ubicacion}</td>
      <td class="px-4 py-3 text-gray-600">${formatearRangoFechas(banner.fechaInicio, banner.fechaFin)}</td>
      <td class="px-4 py-3 text-center">
        <span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${banner.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}">
          ${banner.activo ? 'Sí' : 'No'}
        </span>
      </td>
      <td class="px-4 py-3 text-center space-x-2">
        <button data-accion="editar" data-id="${banner.id}" class="text-blue-600 hover:text-blue-800">Editar</button>
        <button data-accion="toggle" data-id="${banner.id}" class="text-yellow-600 hover:text-yellow-800">${banner.activo ? 'Desactivar' : 'Activar'}</button>
        <button data-accion="eliminar" data-id="${banner.id}" class="text-red-600 hover:text-red-800">Eliminar</button>
      </td>
    `;
    tablaBanners.appendChild(fila);

    const card = document.createElement('article');
    card.className = 'p-4';
    card.innerHTML = `
      <div class="bg-white rounded-lg shadow p-4 space-y-2">
        <header class="flex items-start justify-between gap-2">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">${safeText(banner.titulo)}</h3>
            <p class="text-sm text-gray-500">${formatearTipo(banner.tipo)} · ${ubicacion}</p>
          </div>
          <span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${banner.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}">
            ${banner.activo ? 'Activo' : 'Inactivo'}
          </span>
        </header>
        <p class="text-sm text-gray-600">${formatearRangoFechas(banner.fechaInicio, banner.fechaFin)}</p>
        <footer class="flex flex-wrap gap-3 text-sm pt-2 border-t border-gray-100 mt-2">
          <button data-accion="editar" data-id="${banner.id}" class="text-blue-600 hover:text-blue-800">Editar</button>
          <button data-accion="toggle" data-id="${banner.id}" class="text-yellow-600 hover:text-yellow-800">${banner.activo ? 'Desactivar' : 'Activar'}</button>
          <button data-accion="eliminar" data-id="${banner.id}" class="text-red-600 hover:text-red-800">Eliminar</button>
        </footer>
      </div>
    `;
    listaBannersMobile.appendChild(card);
  });
}

async function cargarCatalogos() {
  if (typeof mostrarLoader === 'function') await mostrarLoader();
  try {
    const [areasResp, municipiosResp] = await Promise.all([
      supabase.from('Area').select('idArea, nombre').order('nombre'),
      supabase.from('Municipios').select('id, nombre, idArea').order('nombre')
    ]);

    if (areasResp.error) throw areasResp.error;
    if (municipiosResp.error) throw municipiosResp.error;

    areasLista = areasResp.data ?? [];
    municipiosLista = municipiosResp.data ?? [];

    bannerArea.innerHTML = '<option value="">Selecciona un área</option>';
    areasLista.forEach(area => {
      const id = Number(area.idArea);
      areaMap.set(id, area.nombre);
      const option = document.createElement('option');
      option.value = id;
      option.textContent = area.nombre;
      bannerArea.appendChild(option);
    });

    bannerMunicipio.innerHTML = '<option value="">Selecciona un municipio</option>';
    municipiosLista.forEach(muni => {
      const id = Number(muni.id);
      municipioMap.set(id, muni.nombre);
      const option = document.createElement('option');
      option.value = id;
      option.textContent = muni.nombre;
      bannerMunicipio.appendChild(option);
    });
  } finally {
    if (typeof ocultarLoader === 'function') await ocultarLoader();
  }
}

async function cargarBanners() {
  if (typeof mostrarLoader === 'function') await mostrarLoader();
  try {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    banners = (data ?? []).map(item => {
      const rawArea = item.idArea ?? item.areaId ?? item.area_id;
      const rawMunicipio = item.idMunicipio ?? item.municipioId ?? item.municipio_id;
      const imagenUrl = item.imagenurl ?? item.imagenUrl ?? item.imagen_url ?? item.archivo_url ?? null;
      const videoUrl = item.videourl ?? item.videoUrl ?? item.video_url ?? null;
      const urlExterna = item.urlExterna ?? item.urlexterna ?? null;
      const idComercio = item.idComercio ?? item.idcomercio ?? null;

      return {
        ...item,
        imagenUrl,
        videoUrl,
        urlExterna,
        idComercio: idComercio === null || idComercio === undefined ? null : Number(idComercio),
        idArea: rawArea === null || rawArea === undefined ? null : Number(rawArea),
        idMunicipio: rawMunicipio === null || rawMunicipio === undefined ? null : Number(rawMunicipio)
      };
    });

    aplicarFiltros();
  } catch (error) {
    console.error('Error cargando banners:', error);
  } finally {
    if (typeof ocultarLoader === 'function') await ocultarLoader();
  }
}

async function handleToggle(id) {
  const banner = banners.find(b => b.id === id);
  if (!banner) return;

  if (typeof mostrarLoader === 'function') await mostrarLoader();
  try {
    const { error } = await supabase
      .from('banners')
      .update({ activo: !banner.activo })
      .eq('id', id);

    if (error) throw error;
    await cargarBanners();
  } catch (error) {
    console.error('Error actualizando estado:', error);
    alert('No se pudo actualizar el banner.');
  } finally {
    if (typeof ocultarLoader === 'function') await ocultarLoader();
  }
}

async function handleEliminar(id) {
  if (!confirm('¿Eliminar este banner? Esta acción no se puede deshacer.')) return;

  if (typeof mostrarLoader === 'function') await mostrarLoader();
  try {
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await cargarBanners();
  } catch (error) {
    console.error('Error eliminando banner:', error);
    alert('No se pudo eliminar el banner.');
  } finally {
    if (typeof ocultarLoader === 'function') await ocultarLoader();
  }
}

async function subirArchivo(file, carpeta) {
  const extension = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${carpeta}/${slugify(bannerTitulo.value)}_${Date.now()}.${extension}`;

  console.log('[adminBanners] Subiendo archivo a:', path);

  const { error } = await supabase.storage
    .from('banners')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from('banners')
    .getPublicUrl(path);

  return data?.publicUrl ?? null;
}

function validarMedios({ imagenFile, videoFile, videoUrl }) {
  const opcionesSeleccionadas = [
    imagenFile ? 1 : 0,
    videoFile ? 1 : 0,
    videoUrl ? 1 : 0
  ].reduce((acc, curr) => acc + curr, 0);

  if (opcionesSeleccionadas > 1) {
    throw new Error('Solo se permite una fuente de contenido: imagen, video subido o URL de video.');
  }

  if (!bannerEnEdicion && opcionesSeleccionadas === 0) {
    throw new Error('Debes subir una imagen, un video o proporcionar una URL de video.');
  }
}

formBanner.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBanner.classList.add('hidden');
  errorBanner.textContent = '';

  const titulo = bannerTitulo.value.trim();
  const descripcion = bannerDescripcion.value.trim();
  const tipo = bannerTipo.value;
  const areaSeleccionada = bannerArea.value || null;
  const municipioSeleccionado = bannerMunicipio.value || null;
  const imagenFile = bannerImagen.files?.[0] ?? null;
  const videoFile = bannerVideo.files?.[0] ?? null;
  const videoUrl = bannerVideoUrl.value.trim();
  const fechaInicio = bannerFechaInicio.value ? new Date(bannerFechaInicio.value).toISOString() : null;
  const fechaFin = bannerFechaFin.value ? new Date(bannerFechaFin.value).toISOString() : null;
  const activo = bannerActivo.checked;
  const esComercio = esComercioCheckbox.checked;

  try {
    if (!titulo) throw new Error('El título es obligatorio.');
    if (tipo === 'area' && !areaSeleccionada) throw new Error('Selecciona un área para el banner.');
    if (tipo === 'municipio' && !municipioSeleccionado) throw new Error('Selecciona un municipio para el banner.');

    validarMedios({ imagenFile, videoFile, videoUrl });

    if (esComercio && !comercioSeleccionadoId) {
      throw new Error('Selecciona un comercio para vincular el banner.');
    }

    const urlExternaValor = !esComercio ? (inputUrlExterna.value.trim() || null) : null;
    const payload = {
      titulo,
      descripcion: descripcion || null,
      tipo,
      idArea: tipo === 'area' ? Number(areaSeleccionada) : null,
      idMunicipio: tipo === 'municipio' ? Number(municipioSeleccionado) : null,
      fechaInicio,
      fechaFin,
      activo,
      idComercio: esComercio ? Number(comercioSeleccionadoId) : null,
      urlExterna: esComercio ? null : urlExternaValor
    };

    let imagenUrl = bannerEnEdicion?.imagenUrl ?? null;
    let videoFinalUrl = bannerEnEdicion?.videoUrl ?? null;

    if (imagenFile) {
      imagenUrl = await subirArchivo(imagenFile, 'banners/imagenes');
      videoFinalUrl = null;
    }

    if (videoFile) {
      videoFinalUrl = await subirArchivo(videoFile, 'banners/videos');
      imagenUrl = null;
    }

    if (videoUrl) {
      videoFinalUrl = videoUrl;
      imagenUrl = null;
    }

    if (!imagenUrl && !videoFinalUrl) {
      throw new Error('Debes mantener al menos una imagen o video en el banner.');
    }

    const datosSupabase = {
      ...payload,
      imagenurl: imagenUrl,
      videourl: videoFinalUrl
    };

    if (typeof mostrarLoader === 'function') await mostrarLoader();

    if (bannerEnEdicion) {
    const { error } = await supabase
      .from('banners')
      .update(datosSupabase)
      .eq('id', bannerEnEdicion.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('banners')
        .insert([datosSupabase]);
      if (error) throw error;
    }

    await cargarBanners();
    cerrarModal();
  } catch (error) {
    console.error('Error guardando banner:', error);
    errorBanner.textContent = error.message || 'Ocurrió un error al guardar.';
    errorBanner.classList.remove('hidden');
  } finally {
    if (typeof ocultarLoader === 'function') await ocultarLoader();
  }
});

[bannerTipo].forEach(select => {
  if (!select) return;
  select.addEventListener('change', (event) => {
    toggleCamposTipo(event.target.value);
  });
});

[btnNuevoBanner, btnCerrarModal, btnCancelarBanner].forEach(btn => {
  if (!btn) return;
  if (btn === btnNuevoBanner) {
    btn.addEventListener('click', () => abrirModal());
  } else {
    btn.addEventListener('click', () => cerrarModal());
  }
});

modalBanner?.addEventListener('click', (event) => {
  if (event.target === modalBanner) {
    cerrarModal();
  }
});

esComercioCheckbox?.addEventListener('change', (event) => {
  if (event.target.checked) {
    toggleSelectorComercio(true);
  } else {
    toggleSelectorComercio(false);
  }
});

buscarComercioInput?.addEventListener('input', (event) => {
  const query = event.target.value.trim();
  comercioSeleccionadoId = null;
  comercioSeleccionadoNombre = '';
  event.target.dataset.selected = '';

  if (buscarComercioTimeout) clearTimeout(buscarComercioTimeout);

  if (query.length < 2) {
    if (resultadosComercio) resultadosComercio.innerHTML = '';
    return;
  }

  buscarComercioTimeout = setTimeout(async () => {
    const { data, error } = await buscarComercioPorNombre(query);
    if (error) {
      console.error('Error buscando comercios:', error);
      return;
    }

    if (!resultadosComercio) return;
    resultadosComercio.innerHTML = '';

    (data ?? []).forEach(comercio => {
      const item = document.createElement('li');
      item.className = 'px-3 py-2 cursor-pointer hover:bg-gray-100';
      item.textContent = comercio.nombre;
      item.dataset.id = comercio.id;
      item.addEventListener('click', () => {
        comercioSeleccionadoId = comercio.id;
        comercioSeleccionadoNombre = comercio.nombre;
        buscarComercioInput.value = comercio.nombre;
        buscarComercioInput.dataset.selected = comercio.id;
        resultadosComercio.innerHTML = '';
      });
      resultadosComercio.appendChild(item);
    });
  }, 250);
});

[filtroBusqueda, filtroTipo, filtroActivo].forEach(ctrl => {
  if (!ctrl) return;
  const evento = ctrl === filtroBusqueda ? 'input' : 'change';
  ctrl.addEventListener(evento, aplicarFiltros);
});

function delegarAcciones(contenedor) {
  if (!contenedor) return;
  contenedor.addEventListener('click', async (event) => {
    const accion = event.target?.dataset?.accion;
    if (!accion) return;
    const id = Number(event.target.dataset.id);
    if (!id) return;

    if (accion === 'editar') {
      const banner = banners.find(b => b.id === id);
      if (banner) abrirModal(banner);
    }

    if (accion === 'toggle') {
      await handleToggle(id);
    }

    if (accion === 'eliminar') {
      await handleEliminar(id);
    }
  });
}

delegarAcciones(tablaBanners);
delegarAcciones(listaBannersMobile);

document.addEventListener('DOMContentLoaded', async () => {
  await cargarCatalogos();
  toggleCamposTipo(bannerTipo.value);
  await cargarBanners();
});
