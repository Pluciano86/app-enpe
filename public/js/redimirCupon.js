import { supabase } from '../shared/supabaseClient.js';

const params = new URLSearchParams(window.location.search);
const qr = params.get('qr') || '';

const seccionCupon = document.getElementById('cuponSection');
const mensajeGeneral = document.getElementById('mensajeGeneral');
const btnRedimir = document.getElementById('btnRedimir');
const inputCodigo = document.getElementById('inputCodigoSecreto');
const mensajeResultado = document.getElementById('redimirMensaje');

const imagenEl = document.getElementById('cuponImagen');
const tituloEl = document.getElementById('cuponTitulo');
const descripcionEl = document.getElementById('cuponDescripcion');
const descuentoEl = document.getElementById('cuponDescuento');
const estadoActualEl = document.getElementById('estadoActual');

let registroCupon = null;

function mostrarEstado(texto, color = 'text-gray-600') {
  if (!estadoActualEl) return;
  estadoActualEl.textContent = texto;
  estadoActualEl.className = `text-sm font-semibold ${color}`;
}

function setMensajeGeneral(texto, color = 'text-gray-500') {
  mensajeGeneral.textContent = texto;
  mensajeGeneral.className = `text-center text-sm ${color}`;
}

function setMensajeResultado(texto, color = 'text-gray-600') {
  mensajeResultado.textContent = texto;
  mensajeResultado.className = `text-sm mt-2 ${color}`;
}

async function cargarCupon() {
  if (!qr) {
    setMensajeGeneral('No se encontró el código del cupón.', 'text-red-600');
    return;
  }

  setMensajeGeneral('Cargando información del cupón...', 'text-gray-500');
  console.log('QR recibido:', qr);

  const { data, error } = await supabase
    .from('cuponesUsuarios')
    .select(`
      id,
      codigoqr,
      redimido,
      fechaGuardado,
      fechaRedimido,
      idUsuario,
      cupon:cupones (
        id,
        titulo,
        descripcion,
        descuento,
        imagen,
        codigosecreto
      )
    `)
    .eq('codigoqr', qr)
    .maybeSingle();

  if (error) {
    console.error('❌ Error obteniendo cupón por QR:', error);
    setMensajeGeneral('Error consultando el cupón. Intenta nuevamente.', 'text-red-600');
    return;
  }

  if (!data) {
    setMensajeGeneral('Cupón no encontrado o QR inválido.', 'text-red-600');
    return;
  }

  registroCupon = data;
  console.log('Registro encontrado:', registroCupon);

  const cupon = registroCupon.cupon || {};
  if (cupon.imagen) {
    imagenEl.src = cupon.imagen;
    imagenEl.classList.remove('hidden');
  }

  tituloEl.textContent = cupon.titulo || 'Cupón';
  descripcionEl.textContent = cupon.descripcion || '';
  if (cupon.descuento != null) {
    descuentoEl.textContent = `Descuento: ${cupon.descuento}%`;
    descuentoEl.classList.remove('hidden');
  } else {
    descuentoEl.classList.add('hidden');
  }

  if (registroCupon.redimido) {
    mostrarEstado(
      `Cupón redimido el ${registroCupon.fechaRedimido ? new Date(registroCupon.fechaRedimido).toLocaleString('es-PR') : ''}`,
      'text-green-600'
    );
    btnRedimir.disabled = true;
  } else {
    mostrarEstado('Cupón pendiente de redimir.', 'text-blue-600');
  }

  setMensajeGeneral('');
  seccionCupon.classList.remove('hidden');
}

btnRedimir?.addEventListener('click', async () => {
  if (!registroCupon) return;

  const codigoIngresado = inputCodigo.value.trim();
  if (!codigoIngresado) {
    setMensajeResultado('Ingresa el código secreto para redimir el cupón.', 'text-red-600');
    return;
  }

  const codigoCorrecto = registroCupon.cupon?.codigoSecreto || '';
  console.log('Validando redención. Código ingresado:', codigoIngresado);

  if (registroCupon.redimido) {
    setMensajeResultado('Este cupón ya fue redimido previamente.', 'text-orange-600');
    return;
  }

  if (codigoIngresado !== codigoCorrecto) {
    setMensajeResultado('Código incorrecto. Verifica e intenta nuevamente.', 'text-red-600');
    return;
  }

  btnRedimir.disabled = true;
  setMensajeResultado('Redimiendo cupón...', 'text-gray-500');

  const { error } = await supabase
    .from('cuponesUsuarios')
    .update({
      redimido: true,
      fechaRedimido: new Date().toISOString()
    })
    .eq('id', registroCupon.id);

  if (error) {
    console.error('❌ Error redimiendo cupón:', error);
    setMensajeResultado('No se pudo redimir el cupón. Intenta nuevamente.', 'text-red-600');
    btnRedimir.disabled = false;
    return;
  }

  registroCupon.redimido = true;
  mostrarEstado(
    `Cupón redimido el ${new Date().toLocaleString('es-PR')}`,
    'text-green-600'
  );
  setMensajeResultado('✅ Cupón redimido correctamente.', 'text-green-600');
});

cargarCupon();
