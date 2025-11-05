import { supabase } from '../shared/supabaseClient.js';

// Elementos vista de validación
const vistaValidacionEl = document.getElementById('vistaValidacion');
const logoValidacionEl = document.getElementById('logoValidacion');
const logoPlaceholderEl = document.getElementById('logoPlaceholder');
const nombreValidacionEl = document.getElementById('nombreValidacion');
const inputCodigoEl = document.getElementById('inputCodigoSecreto');
const btnValidarEl = document.getElementById('btnValidarCodigo');
const mensajeValidacionEl = document.getElementById('mensajeValidacion');

// Elementos vista del cupón
const vistaCuponEl = document.getElementById('vistaCupon');
const cuponLogoEl = document.getElementById('cuponLogo');
const cuponComercioNombreEl = document.getElementById('cuponComercioNombre');
const cuponComercioMunicipioEl = document.getElementById('cuponComercioMunicipio');
const cuponTituloEl = document.getElementById('cuponTitulo');
const cuponDescripcionEl = document.getElementById('cuponDescripcion');
const cuponFechaEl = document.getElementById('cuponFecha');
const btnRedimirEl = document.getElementById('btnRedimirCupon');
const mensajeCuponEl = document.getElementById('mensajeCupon');

const LOGO_PLACEHOLDER = 'https://placehold.co/160x160?text=Logo';
const MENSAJE_VALIDACION_BASE = 'text-sm text-center min-h-[1.25rem]';
const MENSAJE_CUPON_BASE = 'text-sm text-center mt-3 min-h-[1.25rem]';

const params = new URLSearchParams(window.location.search);
const qrParam = (params.get('qr') || '').trim();

let cuponActual = null;
let comercioActual = null;
let cuponUsuarioActual = null;

const actualizarMensaje = (
  elemento,
  texto,
  color = 'text-red-600',
  baseClass = 'text-sm text-center'
) => {
  if (!elemento) return;
  elemento.textContent = texto || '';
  elemento.className = `${baseClass} ${color}`.trim();
};

const normalizarLogoUrl = (valor) => {
  if (!valor || typeof valor !== 'string') return null;
  if (/^https?:\/\//i.test(valor)) return valor;
  const { data } = supabase.storage.from('galeriacomercios').getPublicUrl(valor);
  return data?.publicUrl || valor;
};

const formatearFecha = (iso) => {
  if (!iso) return '--';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '--';
  return fecha.toLocaleDateString('es-PR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatearFechaHora = (iso) => {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-PR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const mostrarVistaCupon = () => {
  if (!vistaCuponEl || !vistaValidacionEl) return;

  vistaValidacionEl.classList.add('opacity-0', 'translate-y-3', 'pointer-events-none');
  setTimeout(() => {
    vistaValidacionEl.classList.add('hidden');
    vistaCuponEl.classList.remove('hidden');
    requestAnimationFrame(() => {
      vistaCuponEl.classList.remove('opacity-0', '-translate-y-3');
    });
  }, 220);
};

const obtenerNombreMunicipio = async (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;

  if (typeof valor === 'string' && Number.isNaN(Number(valor))) {
    return valor;
  }

  const numero = Number(valor);
  if (Number.isNaN(numero)) return null;

  const { data, error } = await supabase
    .from('Municipios')
    .select('nombre')
    .eq('id', numero)
    .maybeSingle();

  if (error) {
    console.warn('No se pudo obtener el municipio:', error.message);
    return null;
  }

  return data?.nombre || null;
};

const obtenerLogoComercio = async (idComercio) => {
  if (!idComercio) return null;

  const { data, error } = await supabase
    .from('imagenesComercios')
    .select('imagen')
    .eq('idComercio', idComercio)
    .eq('logo', true)
    .maybeSingle();

  if (error) {
    console.warn('No se pudo obtener el logo del comercio:', error.message);
    return null;
  }

  if (!data?.imagen) return null;

  return normalizarLogoUrl(data.imagen);
};

const obtenerInfoComercio = async (idComercio, comercioBase = null) => {
  const baseLogo = comercioBase?.logoUrl ?? comercioBase?.logo ?? null;
  const baseInfo = {
    id: comercioBase?.id ?? idComercio ?? null,
    nombre: comercioBase?.nombre ?? 'Comercio',
    municipio: comercioBase?.municipio ?? null,
    logoUrl: normalizarLogoUrl(baseLogo) || baseLogo
  };

  if (!idComercio) {
    let municipioNombre = baseInfo.municipio;
    if (municipioNombre !== null && municipioNombre !== undefined && typeof municipioNombre !== 'string') {
      municipioNombre = await obtenerNombreMunicipio(municipioNombre);
    }
    if (!municipioNombre || (typeof municipioNombre === 'string' && !municipioNombre.trim())) {
      municipioNombre = '—';
    }
    return {
      id: baseInfo.id,
      nombre: baseInfo.nombre,
      municipio: municipioNombre,
      logoUrl: baseInfo.logoUrl || null
    };
  }

  const { data, error } = await supabase
    .from('Comercios')
    .select('id, nombre, municipio, idMunicipio, logo')
    .eq('id', idComercio)
    .maybeSingle();

  if (error) {
    console.warn('Error obteniendo comercio:', error);
  }

  const municipioValor =
    baseInfo.municipio ??
    data?.municipio ??
    data?.idMunicipio ??
    null;

  let municipioNombre;
  if (typeof municipioValor === 'string') {
    municipioNombre = municipioValor;
  } else if (municipioValor !== null && municipioValor !== undefined) {
    municipioNombre = await obtenerNombreMunicipio(municipioValor);
  }
  if (!municipioNombre || (typeof municipioNombre === 'string' && !municipioNombre.trim())) {
    municipioNombre = '—';
  }

  let logoUrl = baseInfo.logoUrl || null;
  if (!logoUrl && data?.logo) {
    logoUrl = normalizarLogoUrl(data.logo);
  }
  if (!logoUrl) {
    logoUrl = await obtenerLogoComercio(idComercio);
  }

  return {
    id: data?.id ?? baseInfo.id ?? idComercio,
    nombre: data?.nombre || baseInfo.nombre || 'Comercio',
    municipio: municipioNombre,
    logoUrl: logoUrl || null
  };
};

const actualizarEstadoRedencion = () => {
  if (!btnRedimirEl || !mensajeCuponEl) return;

  if (!cuponUsuarioActual) {
    btnRedimirEl.classList.add('hidden');
    btnRedimirEl.disabled = true;
    actualizarMensaje(mensajeCuponEl, 'No se encontró un registro asociado para redimir este cupón.', 'text-red-600', MENSAJE_CUPON_BASE);
    return;
  }

  if (cuponUsuarioActual.redimido) {
    btnRedimirEl.classList.add('hidden');
    btnRedimirEl.disabled = true;
    const fechaTexto = formatearFechaHora(cuponUsuarioActual.fechaRedimido);
    const aviso = fechaTexto
      ? `Este cupón ya fue redimido el ${fechaTexto}.`
      : 'Este cupón ya fue redimido.';
    actualizarMensaje(mensajeCuponEl, aviso, 'text-orange-600', MENSAJE_CUPON_BASE);
  } else {
    btnRedimirEl.classList.remove('hidden');
    btnRedimirEl.disabled = false;
    actualizarMensaje(mensajeCuponEl, '', 'text-gray-600', MENSAJE_CUPON_BASE);
  }
};

const renderizarCupon = () => {
  if (!cuponActual) return;

  const infoComercio = comercioActual ?? {
    nombre: 'Comercio',
    municipio: '—',
    logoUrl: null,
  };

  if (cuponLogoEl) {
    cuponLogoEl.src = infoComercio.logoUrl ? infoComercio.logoUrl : LOGO_PLACEHOLDER;
    cuponLogoEl.classList.remove('hidden');
  }

  if (cuponComercioNombreEl) {
    cuponComercioNombreEl.textContent = infoComercio.nombre || 'Comercio';
  }

  if (cuponComercioMunicipioEl) {
    cuponComercioMunicipioEl.textContent = infoComercio.municipio || '—';
  }

  if (cuponTituloEl) {
    cuponTituloEl.textContent = cuponActual.titulo || 'Cupón';
  }

  if (cuponDescripcionEl) {
    cuponDescripcionEl.textContent = cuponActual.descripcion || '';
  }

  const fechaExpiracion = cuponActual.fechafin ?? cuponActual.fechaFin ?? null;
  if (cuponFechaEl) {
    cuponFechaEl.textContent = fechaExpiracion
      ? `Vence: ${formatearFecha(fechaExpiracion)}`
      : 'Vigencia indefinida';
  }

  mostrarVistaCupon();
  actualizarEstadoRedencion();
};

const cargarDatosIniciales = async () => {
  if (!btnValidarEl) return;
  if (inputCodigoEl) inputCodigoEl.disabled = true;

  if (!qrParam) {
    actualizarMensaje(mensajeValidacionEl, 'No se encontró el código del QR en la URL.', 'text-red-600', MENSAJE_VALIDACION_BASE);
    btnValidarEl.disabled = true;
    return;
  }

  actualizarMensaje(mensajeValidacionEl, 'Cargando datos del cupón...', 'text-gray-500', MENSAJE_VALIDACION_BASE);
  btnValidarEl.disabled = true;

  try {
    const { data, error } = await supabase
      .from('cuponesUsuarios')
      .select(`
        id,
        codigoqr,
        redimido,
        fechaRedimido,
        idCupon,
        cupon:cupones (
          id,
          titulo,
          descripcion,
          imagen,
          codigosecreto,
          fechafin,
          fechaFin,
          idComercio,
          Comercios (
            id,
            nombre,
            logo,
            municipio,
            idMunicipio
          )
        )
      `)
      .eq('codigoqr', qrParam)
      .maybeSingle();

    if (error) {
      console.error('Error consultando cupón por QR:', error);
      actualizarMensaje(mensajeValidacionEl, 'No fue posible preparar el cupón. Inténtelo más tarde.', 'text-red-600', MENSAJE_VALIDACION_BASE);
      btnValidarEl.disabled = true;
      return;
    }

    if (!data || !data.cupon) {
      actualizarMensaje(mensajeValidacionEl, 'Cupón no encontrado para este QR.', 'text-red-600', MENSAJE_VALIDACION_BASE);
      btnValidarEl.disabled = true;
      return;
    }

    cuponUsuarioActual = data;
    cuponActual = data.cupon;

    const comercioRelacion = cuponActual?.Comercios || null;
    const comercioBase = comercioRelacion
      ? {
          id: comercioRelacion.id ?? cuponActual.idComercio,
          nombre: comercioRelacion.nombre ?? 'Comercio',
          logoUrl: comercioRelacion.logo ?? null,
          municipio: comercioRelacion.municipio ?? comercioRelacion.idMunicipio ?? null
        }
      : null;

    comercioActual = await obtenerInfoComercio(cuponActual?.idComercio, comercioBase);

    if (logoValidacionEl) {
      const logoUrl = comercioActual?.logoUrl || LOGO_PLACEHOLDER;
      logoValidacionEl.src = logoUrl;
      logoValidacionEl.classList.remove('hidden');
    }
    logoPlaceholderEl?.classList.add('hidden');

    if (nombreValidacionEl) {
      nombreValidacionEl.textContent = comercioActual?.nombre || 'Comercio';
    }

    actualizarMensaje(mensajeValidacionEl, '', 'text-gray-600', MENSAJE_VALIDACION_BASE);
    btnValidarEl.disabled = false;
    if (inputCodigoEl) inputCodigoEl.disabled = false;
  } catch (error) {
    console.error('Error cargando datos iniciales del cupón:', error);
    actualizarMensaje(mensajeValidacionEl, 'No fue posible preparar el cupón. Inténtelo más tarde.', 'text-red-600', MENSAJE_VALIDACION_BASE);
    btnValidarEl.disabled = true;
  }
};

const validarCodigo = async () => {
  if (!inputCodigoEl || !btnValidarEl) return;

  const valorIngresado = (inputCodigoEl.value || '').trim();

  if (!valorIngresado) {
    actualizarMensaje(mensajeValidacionEl, 'Ingresa el código secreto.', 'text-red-600', MENSAJE_VALIDACION_BASE);
    return;
  }

  const codigoNumero = Number(valorIngresado);
  if (Number.isNaN(codigoNumero)) {
    actualizarMensaje(mensajeValidacionEl, 'El código debe ser numérico.', 'text-red-600', MENSAJE_VALIDACION_BASE);
    return;
  }

  if (!cuponActual) {
    actualizarMensaje(mensajeValidacionEl, 'Cupón no disponible para validar.', 'text-red-600', MENSAJE_VALIDACION_BASE);
    return;
  }

  actualizarMensaje(mensajeValidacionEl, 'Validando código...', 'text-gray-500', MENSAJE_VALIDACION_BASE);
  btnValidarEl.disabled = true;

  try {
    const codigoReal = Number(cuponActual.codigosecreto ?? cuponActual.codigoSecreto);
    if (Number.isNaN(codigoReal)) {
      actualizarMensaje(mensajeValidacionEl, 'El cupón no tiene un código secreto válido configurado.', 'text-orange-600', MENSAJE_VALIDACION_BASE);
      return;
    }

    if (codigoNumero !== codigoReal) {
      actualizarMensaje(mensajeValidacionEl, 'Código incorrecto o cupón no encontrado.', 'text-red-600', MENSAJE_VALIDACION_BASE);
      return;
    }

    actualizarMensaje(mensajeValidacionEl, '', 'text-gray-600', MENSAJE_VALIDACION_BASE);
    renderizarCupon();
  } catch (error) {
    console.error('Error general validando código:', error);
    actualizarMensaje(mensajeValidacionEl, 'Error inesperado validando el código.', 'text-red-600', MENSAJE_VALIDACION_BASE);
  } finally {
    btnValidarEl.disabled = false;
  }
};

const redimirCupon = async () => {
  if (!btnRedimirEl) return;

  if (!cuponUsuarioActual) {
    actualizarMensaje(mensajeCuponEl, 'No se identificó un registro para redimir este cupón.', 'text-red-600', MENSAJE_CUPON_BASE);
    return;
  }

  if (cuponUsuarioActual.redimido) {
    actualizarMensaje(mensajeCuponEl, 'Este cupón ya fue redimido.', 'text-orange-600', MENSAJE_CUPON_BASE);
    return;
  }

  btnRedimirEl.disabled = true;
  actualizarMensaje(mensajeCuponEl, 'Redimiendo cupón...', 'text-gray-500', MENSAJE_CUPON_BASE);

  try {
    const fechaRedimido = new Date().toISOString();
    const { error } = await supabase
      .from('cuponesUsuarios')
      .update({
        redimido: true,
        fechaRedimido: fechaRedimido
      })
      .eq('id', cuponUsuarioActual.id);

    if (error) {
      console.error('Error redimiendo cupón:', error);
      actualizarMensaje(mensajeCuponEl, 'Error al redimir el cupón. Inténtelo nuevamente.', 'text-red-600', MENSAJE_CUPON_BASE);
      btnRedimirEl.disabled = false;
      return;
    }

    cuponUsuarioActual.redimido = true;
    cuponUsuarioActual.fechaRedimido = fechaRedimido;
    actualizarMensaje(mensajeCuponEl, 'Cupón redimido exitosamente.', 'text-emerald-600', MENSAJE_CUPON_BASE);
    actualizarEstadoRedencion();
  } catch (error) {
    console.error('Error inesperado redimiendo cupón:', error);
    actualizarMensaje(mensajeCuponEl, 'Error al redimir el cupón. Inténtelo nuevamente.', 'text-red-600', MENSAJE_CUPON_BASE);
    btnRedimirEl.disabled = false;
  }
};

btnValidarEl?.addEventListener('click', validarCodigo);
inputCodigoEl?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    validarCodigo();
  }
});
btnRedimirEl?.addEventListener('click', redimirCupon);

cargarDatosIniciales();
