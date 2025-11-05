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

  const { data: publicData } = supabase.storage
    .from('galeriacomercios')
    .getPublicUrl(data.imagen);

  return publicData?.publicUrl || null;
};

const obtenerInfoComercio = async (idComercio) => {
  if (!idComercio) return null;

  const { data, error } = await supabase
    .from('Comercios')
    .select('id, nombre, municipio, idMunicipio')
    .eq('id', idComercio)
    .maybeSingle();

  if (error) {
    console.warn('Error obteniendo comercio:', error);
    return null;
  }

  const municipioBase = data?.municipio ?? data?.idMunicipio ?? null;
  const municipioNombre = await obtenerNombreMunicipio(municipioBase);
  const logoUrl = await obtenerLogoComercio(data?.id);

  return {
    id: data?.id ?? idComercio,
    nombre: data?.nombre || 'Comercio',
    municipio: municipioNombre || (typeof data?.municipio === 'string' ? data.municipio : '—'),
    logoUrl: logoUrl || null
  };
};

const actualizarEstadoRedencion = () => {
  if (!btnRedimirEl || !mensajeCuponEl) return;

  if (!cuponUsuarioActual) {
    btnRedimirEl.classList.add('hidden');
    btnRedimirEl.disabled = true;
    actualizarMensaje(mensajeCuponEl, 'No se encontró un registro asociado para redimir este cupón.', 'text-red-600', 'text-sm text-center mt-3 min-h-[1.25rem]');
    return;
  }

  if (cuponUsuarioActual.redimido) {
    btnRedimirEl.classList.add('hidden');
    btnRedimirEl.disabled = true;
    const fechaTexto = formatearFechaHora(cuponUsuarioActual.fechaRedimido);
    const aviso = fechaTexto
      ? `Este cupón ya fue redimido el ${fechaTexto}.`
      : 'Este cupón ya fue redimido.';
    actualizarMensaje(mensajeCuponEl, aviso, 'text-orange-600', 'text-sm text-center mt-3 min-h-[1.25rem]');
  } else {
    btnRedimirEl.classList.remove('hidden');
    btnRedimirEl.disabled = false;
    actualizarMensaje(mensajeCuponEl, '', 'text-gray-600', 'text-sm text-center mt-3 min-h-[1.25rem]');
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

const validarCodigo = async () => {
  if (!inputCodigoEl || !btnValidarEl) return;

  const valorIngresado = (inputCodigoEl.value || '').trim();

  if (!valorIngresado) {
    actualizarMensaje(mensajeValidacionEl, 'Ingresa el código secreto.', 'text-red-600', 'text-sm text-center min-h-[1.25rem]');
    return;
  }

  const codigoNumero = Number(valorIngresado);
  if (Number.isNaN(codigoNumero)) {
    actualizarMensaje(mensajeValidacionEl, 'El código debe ser numérico.', 'text-red-600', 'text-sm text-center min-h-[1.25rem]');
    return;
  }

  actualizarMensaje(mensajeValidacionEl, 'Validando código...', 'text-gray-500', 'text-sm text-center min-h-[1.25rem]');
  btnValidarEl.disabled = true;

  try {
    const { data: cuponData, error: cuponError } = await supabase
      .from('cupones')
      .select('id, titulo, descripcion, imagen, fechafin, fechafin, idComercio, codigosecreto')
      .eq('codigosecreto', codigoNumero)
      .maybeSingle();

    if (cuponError) {
      console.error('Error consultando cupón:', cuponError);
      actualizarMensaje(mensajeValidacionEl, 'Ocurrió un error al validar el código.', 'text-red-600', 'text-sm text-center min-h-[1.25rem]');
      return;
    }

    if (!cuponData) {
      actualizarMensaje(mensajeValidacionEl, 'Código incorrecto o cupón no encontrado.', 'text-red-600', 'text-sm text-center min-h-[1.25rem]');
      return;
    }

    cuponActual = cuponData;
    comercioActual = await obtenerInfoComercio(cuponData.idComercio);

    if (comercioActual?.logoUrl && logoValidacionEl) {
      logoValidacionEl.src = comercioActual.logoUrl;
      logoValidacionEl.classList.remove('hidden');
      logoPlaceholderEl?.classList.add('hidden');
    }
    if (comercioActual?.nombre && nombreValidacionEl) {
      nombreValidacionEl.textContent = comercioActual.nombre;
    }

    const { data: registrosUsuarios, error: usuariosError } = await supabase
      .from('cuponesUsuarios')
      .select('id, redimido, fechaRedimido')
      .eq('idCupon', cuponData.id)
      .order('fechaGuardado', { ascending: true });

    if (usuariosError) {
      console.warn('No se pudieron obtener cupones de usuarios:', usuariosError);
      cuponUsuarioActual = null;
    } else if (Array.isArray(registrosUsuarios) && registrosUsuarios.length) {
      const pendiente = registrosUsuarios.find((registro) => !registro.redimido);
      cuponUsuarioActual = pendiente ?? registrosUsuarios[registrosUsuarios.length - 1];
    } else {
      cuponUsuarioActual = null;
    }

    actualizarMensaje(mensajeValidacionEl, '', 'text-gray-600', 'text-sm text-center min-h-[1.25rem]');
    renderizarCupon();
  } catch (error) {
    console.error('Error general validando código:', error);
    actualizarMensaje(mensajeValidacionEl, 'Error inesperado validando el código.', 'text-red-600', 'text-sm text-center min-h-[1.25rem]');
  } finally {
    btnValidarEl.disabled = false;
  }
};

const redimirCupon = async () => {
  if (!btnRedimirEl) return;

  if (!cuponUsuarioActual) {
    actualizarMensaje(mensajeCuponEl, 'No se identificó un registro para redimir este cupón.', 'text-red-600', 'text-sm text-center mt-3 min-h-[1.25rem]');
    return;
  }

  if (cuponUsuarioActual.redimido) {
    actualizarMensaje(mensajeCuponEl, 'Este cupón ya fue redimido.', 'text-orange-600', 'text-sm text-center mt-3 min-h-[1.25rem]');
    return;
  }

  btnRedimirEl.disabled = true;
  actualizarMensaje(mensajeCuponEl, 'Redimiendo cupón...', 'text-gray-500', 'text-sm text-center mt-3 min-h-[1.25rem]');

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
      actualizarMensaje(mensajeCuponEl, 'Error al redimir el cupón. Inténtelo nuevamente.', 'text-red-600', 'text-sm text-center mt-3 min-h-[1.25rem]');
      btnRedimirEl.disabled = false;
      return;
    }

    cuponUsuarioActual.redimido = true;
    cuponUsuarioActual.fechaRedimido = fechaRedimido;
    actualizarMensaje(mensajeCuponEl, 'Cupón redimido exitosamente.', 'text-emerald-600', 'text-sm text-center mt-3 min-h-[1.25rem]');
    actualizarEstadoRedencion();
  } catch (error) {
    console.error('Error inesperado redimiendo cupón:', error);
    actualizarMensaje(mensajeCuponEl, 'Error al redimir el cupón. Inténtelo nuevamente.', 'text-red-600', 'text-sm text-center mt-3 min-h-[1.25rem]');
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
