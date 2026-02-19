import { supabase } from '../shared/supabaseClient.js';
import { resolverPlanComercio } from '../shared/planes.js';

const idComercio = new URLSearchParams(window.location.search).get('id');

const telefono = document.getElementById('telefono');
const direccion = document.getElementById('direccion');
const whatsapp = document.getElementById('whatsapp');
const facebook = document.getElementById('facebook');
const instagram = document.getElementById('instagram');
const tiktok = document.getElementById('tiktok');
const webpage = document.getElementById('webpage');
const descripcion = document.getElementById('descripcion');
const horariosContainer = document.getElementById('horariosContainer');
const feriadosContainer = document.getElementById('feriadosContainer');
const btnGuardar = document.getElementById('btn-guardar');
const btnAdminMenu = document.getElementById('btnAdminMenu');
const btnAdministrarEspeciales = document.getElementById('btnAdministrarEspeciales');
const btnAgregarFeriado = document.getElementById('agregarFeriado');
const planBadge = document.getElementById('planBadge');
const planCta = document.getElementById('planCta');
const verificationCta = document.getElementById('verificationCta');
const btnCambiarPlan = document.getElementById('btnCambiarPlan');
const protectedLockState = document.getElementById('protectedLockState');
const protectedNombre = document.getElementById('protectedNombre');
const protectedCoords = document.getElementById('protectedCoords');
const protectedLogo = document.getElementById('protectedLogo');
const protectedLogoPlaceholder = document.getElementById('protectedLogoPlaceholder');
const btnSolicitarNombre = document.getElementById('btnSolicitarNombre');
const btnSolicitarCoords = document.getElementById('btnSolicitarCoords');
const btnSolicitarLogo = document.getElementById('btnSolicitarLogo');
const solicitudModal = document.getElementById('solicitudModal');
const solicitudModalClose = document.getElementById('solicitudModalClose');
const solicitudForm = document.getElementById('solicitudForm');
const solicitudCampoLabel = document.getElementById('solicitudCampoLabel');
const solicitudValorActual = document.getElementById('solicitudValorActual');
const solicitudInputs = document.getElementById('solicitudInputs');
const solicitudMotivo = document.getElementById('solicitudMotivo');
const solicitudFeedback = document.getElementById('solicitudFeedback');
const solicitudSubmit = document.getElementById('solicitudSubmit');

const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SOLICITUD_CAMPO_TITULO = {
  nombre: 'Cambio de nombre',
  coordenadas: 'Cambio de coordenadas',
  logo: 'Cambio de logo',
};

let comercioActual = null;
let currentUserId = null;
let solicitudCampoActual = null;

if (!idComercio) {
  alert('ID de comercio no encontrado');
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatCoord(value) {
  const num = toFiniteNumber(value);
  return num === null ? '—' : num.toFixed(6);
}

function isComercioVerificado(comercio = {}) {
  const estadoPropiedad = String(comercio?.estado_propiedad || '').toLowerCase();
  const estadoVerificacion = String(comercio?.estado_verificacion || '').toLowerCase();
  const propietarioVerificado = comercio?.propietario_verificado === true;
  const verificacionOk = ['otp_verificado', 'sms_verificado', 'messenger_verificado', 'manual_aprobado'].includes(
    estadoVerificacion
  );
  return estadoPropiedad === 'verificado' && (propietarioVerificado || verificacionOk);
}

function setFieldsLocked(fields = [], locked = false) {
  fields.forEach((el) => {
    if (!el) return;
    el.disabled = locked;
    el.classList.toggle('bg-gray-100', locked);
    el.classList.toggle('cursor-not-allowed', locked);
  });
}

function setSolicitudFeedback(type, message) {
  if (!solicitudFeedback) return;
  const tone = {
    success: 'bg-emerald-50 border border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border border-amber-200 text-amber-800',
    error: 'bg-red-50 border border-red-200 text-red-700',
    info: 'bg-sky-50 border border-sky-200 text-sky-800',
  };
  solicitudFeedback.className = `text-xs rounded-lg px-3 py-2 ${tone[type] || tone.info}`;
  solicitudFeedback.textContent = message;
  solicitudFeedback.classList.remove('hidden');
}

function clearSolicitudFeedback() {
  if (!solicitudFeedback) return;
  solicitudFeedback.classList.add('hidden');
  solicitudFeedback.textContent = '';
}

function renderProtectedFields(comercio = {}) {
  if (protectedNombre) protectedNombre.textContent = comercio.nombre || 'Sin nombre';
  if (protectedCoords) {
    protectedCoords.textContent = `${formatCoord(comercio.latitud)}, ${formatCoord(comercio.longitud)}`;
  }
  if (protectedLogo) {
    if (comercio.logo) {
      protectedLogo.src = comercio.logo;
      protectedLogo.classList.remove('hidden');
      protectedLogoPlaceholder?.classList.add('hidden');
    } else {
      protectedLogo.classList.add('hidden');
      protectedLogoPlaceholder?.classList.remove('hidden');
    }
  }

  const locked = isComercioVerificado(comercio);
  if (protectedLockState) {
    protectedLockState.textContent = locked ? 'Bloqueado por verificación' : 'No verificado';
    protectedLockState.className = locked
      ? 'text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700'
      : 'text-xs font-semibold px-2 py-1 rounded-full bg-slate-200 text-slate-700';
  }
}

function buildSolicitudActual(campo) {
  if (!comercioActual) return {};
  if (campo === 'nombre') return { nombre: comercioActual.nombre || null };
  if (campo === 'coordenadas') {
    return {
      latitud: toFiniteNumber(comercioActual.latitud),
      longitud: toFiniteNumber(comercioActual.longitud),
    };
  }
  if (campo === 'logo') return { logo: comercioActual.logo || null };
  return {};
}

function renderSolicitudInputs(campo) {
  if (!solicitudInputs) return;

  if (campo === 'nombre') {
    solicitudInputs.innerHTML = `
      <label class="block text-xs font-semibold text-gray-600 mb-1">Nuevo nombre *</label>
      <input id="solicitudNuevoNombre" type="text" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200" placeholder="Nombre solicitado" />
    `;
    return;
  }

  if (campo === 'coordenadas') {
    solicitudInputs.innerHTML = `
      <label class="block text-xs font-semibold text-gray-600 mb-1">Nuevas coordenadas *</label>
      <div class="grid grid-cols-2 gap-2">
        <input id="solicitudNuevaLatitud" type="number" step="any" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200" placeholder="Latitud" />
        <input id="solicitudNuevaLongitud" type="number" step="any" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200" placeholder="Longitud" />
      </div>
    `;
    return;
  }

  solicitudInputs.innerHTML = `
    <label class="block text-xs font-semibold text-gray-600 mb-1">URL o referencia del nuevo logo *</label>
    <input id="solicitudNuevoLogo" type="text" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200" placeholder="https://..." />
  `;
}

function openSolicitudModal(campo) {
  if (!idComercio || !comercioActual) return;
  solicitudCampoActual = campo;
  clearSolicitudFeedback();

  if (solicitudCampoLabel) {
    solicitudCampoLabel.textContent = SOLICITUD_CAMPO_TITULO[campo] || 'Cambio';
  }
  if (solicitudValorActual) {
    solicitudValorActual.value = JSON.stringify(buildSolicitudActual(campo), null, 2);
  }
  if (solicitudMotivo) solicitudMotivo.value = '';
  renderSolicitudInputs(campo);

  solicitudModal?.classList.remove('hidden');
  solicitudModal?.classList.add('flex');
}

function closeSolicitudModal() {
  solicitudModal?.classList.add('hidden');
  solicitudModal?.classList.remove('flex');
  solicitudCampoActual = null;
}

function getSolicitudValorSolicitado(campo) {
  if (campo === 'nombre') {
    const nuevoNombre = String(document.getElementById('solicitudNuevoNombre')?.value || '').trim();
    if (!nuevoNombre) return { error: 'Ingresa el nuevo nombre.' };
    return { value: { nombre: nuevoNombre } };
  }

  if (campo === 'coordenadas') {
    const latitud = toFiniteNumber(document.getElementById('solicitudNuevaLatitud')?.value);
    const longitud = toFiniteNumber(document.getElementById('solicitudNuevaLongitud')?.value);
    if (latitud === null || longitud === null) {
      return { error: 'Ingresa latitud y longitud válidas.' };
    }
    if (latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180) {
      return { error: 'Las coordenadas están fuera de rango.' };
    }
    return { value: { latitud, longitud } };
  }

  const nuevoLogo = String(document.getElementById('solicitudNuevoLogo')?.value || '').trim();
  if (!nuevoLogo) return { error: 'Ingresa la referencia del nuevo logo.' };
  return { value: { logo: nuevoLogo } };
}

async function cargarUsuarioActual() {
  try {
    const {
      data: { user } = {},
    } = await supabase.auth.getUser();
    currentUserId = user?.id || null;
  } catch (error) {
    currentUserId = null;
    console.warn('No se pudo obtener usuario autenticado:', error?.message || error);
  }
}

function renderHorarios(horarios = []) {
  if (!horariosContainer) return;
  horariosContainer.innerHTML = '';
  dias.forEach((dia, i) => {
    const row = horarios.find((h) => Number(h.diaSemana) === i) || {};
    const apertura = row.apertura?.substring(0, 5) || '';
    const cierre = row.cierre?.substring(0, 5) || '';
    const cerrado = row.cerrado || false;
    const feriado = row.feriado || null;

    const div = document.createElement('div');
    div.className = 'grid grid-cols-12 items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2';
    div.innerHTML = `
      <span class="col-span-3 sm:col-span-2 font-semibold text-sm text-gray-800">${dia}</span>
      <div class="col-span-4 sm:col-span-4">
        <input type="time" class="w-full border rounded px-2 py-1 apertura" value="${apertura}" ${cerrado ? 'disabled' : ''}>
      </div>
      <span class="col-span-1 text-center text-sm text-gray-500">a</span>
      <div class="col-span-4 sm:col-span-4">
        <input type="time" class="w-full border rounded px-2 py-1 cierre" value="${cierre}" ${cerrado ? 'disabled' : ''}>
      </div>
      <label class="col-span-12 sm:col-span-1 flex items-center gap-1 text-xs text-gray-700 justify-end sm:justify-start mt-1 sm:mt-0">
        <input type="checkbox" class="cerrado" ${cerrado ? 'checked' : ''}> Cerrado
      </label>
    `;
    const cb = div.querySelector('.cerrado');
    const ap = div.querySelector('.apertura');
    const ci = div.querySelector('.cierre');
    cb.addEventListener('change', () => {
      ap.disabled = cb.checked;
      ci.disabled = cb.checked;
    });
    horariosContainer.appendChild(div);
  });
}

function renderFeriados(list = []) {
  if (!feriadosContainer) return;
  feriadosContainer.innerHTML = '';
  if (!list.length) {
    feriadosContainer.innerHTML = '<p class="text-sm text-gray-500">No hay feriados registrados.</p>';
    return;
  }
  list.forEach((f) => {
    const wrap = document.createElement('div');
    wrap.className = 'flex items-center gap-3 bg-gray-50 border border-gray-200 rounded px-3 py-2';
    wrap.innerHTML = `
      <input type="date" class="border rounded px-2 py-1 flex-1" value="${f.feriado}" data-id="${f.id}">
      <button class="text-red-600 text-sm" data-id="${f.id}">Eliminar</button>
    `;
    wrap.querySelector('button').addEventListener('click', () => eliminarFeriado(f.id));
    feriadosContainer.appendChild(wrap);
  });
}

async function cargarDatos() {
  if (!idComercio) return;
  const { data, error } = await supabase
    .from('Comercios')
    .select(
      'nombre,logo,latitud,longitud,telefono,direccion,whatsapp,facebook,instagram,tiktok,webpage,descripcion,plan_id,plan_nivel,plan_nombre,permite_menu,permite_especiales,permite_ordenes,permite_perfil,aparece_en_cercanos,estado_propiedad,estado_verificacion,propietario_verificado'
    )
    .eq('id', idComercio)
    .maybeSingle();
  if (!error && data) {
    comercioActual = data;
    renderProtectedFields(data);
    const comercioVerificado = isComercioVerificado(data);
    setFieldsLocked([telefono, direccion], !comercioVerificado);

    if (verificationCta) {
      if (!comercioVerificado) {
        verificationCta.classList.remove('hidden');
        verificationCta.innerHTML = `
          <div class="font-semibold">Propiedad pendiente de verificación</div>
          <p class="mt-1">Mientras el comercio no esté verificado, no puedes cambiar teléfono ni dirección, ni publicar módulos avanzados.</p>
        `;
      } else {
        verificationCta.classList.add('hidden');
        verificationCta.innerHTML = '';
      }
    }

    telefono.value = data.telefono || '';
    direccion.value = data.direccion || '';
    whatsapp.value = data.whatsapp || '';
    facebook.value = data.facebook || '';
    instagram.value = data.instagram || '';
    tiktok.value = data.tiktok || '';
    webpage.value = data.webpage || '';
    descripcion.value = data.descripcion || '';

    const planInfo = resolverPlanComercio(data);
    if (planBadge) planBadge.textContent = `${planInfo.nombre} (Nivel ${planInfo.nivel})`;
    if (btnCambiarPlan) btnCambiarPlan.href = `./paquetes.html?id=${idComercio}`;

    const puedeRedes = planInfo.nivel >= 1;
    const puedeMenu = planInfo.permite_menu;
    const puedeEspeciales = planInfo.permite_especiales;

    const bloquearInput = (el) => {
      if (!el) return;
      el.disabled = true;
      el.classList.add('bg-gray-100', 'cursor-not-allowed');
    };

    if (!puedeRedes) {
      [whatsapp, facebook, instagram, tiktok, webpage, descripcion].forEach(bloquearInput);
      if (planCta) {
        planCta.classList.remove('hidden');
        planCta.innerHTML = `
          <div class="font-semibold">Estas opciones requieren Findixi Regular o superior.</div>
          <p class="text-sm">Mejora tu plan para activar redes sociales y descripción.</p>
        `;
      }
    }

    if (!puedeMenu && btnAdminMenu) {
      btnAdminMenu.classList.add('opacity-60', 'pointer-events-none');
      btnAdminMenu.textContent = 'Menú (Plus)';
    }

    if (!puedeEspeciales && btnAdministrarEspeciales) {
      btnAdministrarEspeciales.classList.add('opacity-60', 'pointer-events-none');
      btnAdministrarEspeciales.textContent = 'Especiales (Plus)';
    }
  }

  const { data: horarios, error: errHor } = await supabase
    .from('Horarios')
    .select('*')
    .eq('idComercio', idComercio);
  if (!errHor) {
    renderHorarios(horarios || []);
    const feriados = (horarios || []).filter((h) => h.feriado);
    renderFeriados(feriados);
  }

  // links
  if (btnAdminMenu) btnAdminMenu.href = `./adminMenuComercio.html?id=${idComercio}`;
  if (btnAdministrarEspeciales) btnAdministrarEspeciales.href = `./especiales/index.html?id=${idComercio}`;
}

async function guardarPerfil() {
  if (!idComercio) return;
  const payload = {
    telefono: telefono.value.trim() || null,
    direccion: direccion.value.trim() || null,
    whatsapp: whatsapp.value.trim() || null,
    facebook: facebook.value.trim() || null,
    instagram: instagram.value.trim() || null,
    tiktok: tiktok.value.trim() || null,
    webpage: webpage.value.trim() || null,
    descripcion: descripcion.value.trim() || null,
  };
  const { error } = await supabase.from('Comercios').update(payload).eq('id', idComercio);
  if (error) {
    const errorText = String(error?.message || '').toLowerCase();
    if (errorText.includes('propiedad pendiente de verificacion')) {
      alert('No puedes cambiar teléfono o dirección hasta completar la verificación de propiedad.');
    } else {
      alert('No se pudo guardar el perfil');
    }
    console.error(error);
    return;
  }
  await guardarHorarios();
  alert('Perfil actualizado');
}

async function enviarSolicitudCambio(event) {
  event.preventDefault();
  clearSolicitudFeedback();

  if (!idComercio || !solicitudCampoActual) {
    setSolicitudFeedback('error', 'No hay un campo seleccionado para solicitar cambio.');
    return;
  }

  const motivo = String(solicitudMotivo?.value || '').trim();
  if (!motivo || motivo.length < 8) {
    setSolicitudFeedback('warning', 'Describe el motivo (mínimo 8 caracteres).');
    return;
  }

  const parsed = getSolicitudValorSolicitado(solicitudCampoActual);
  if (parsed.error) {
    setSolicitudFeedback('warning', parsed.error);
    return;
  }

  const prevText = solicitudSubmit?.textContent || 'Enviar solicitud';
  if (solicitudSubmit) {
    solicitudSubmit.disabled = true;
    solicitudSubmit.textContent = 'Enviando...';
  }

  try {
    if (!currentUserId) {
      await cargarUsuarioActual();
    }

    const payload = {
      idComercio: Number(idComercio),
      user_id: currentUserId || null,
      campo: solicitudCampoActual,
      valor_actual: buildSolicitudActual(solicitudCampoActual),
      valor_solicitado: parsed.value,
      motivo,
      estado: 'pendiente',
      metadata: {
        source: 'comercio/editarPerfilComercio',
        submitted_at: new Date().toISOString(),
      },
    };

    const { error } = await supabase.from('solicitudes_cambio_comercio').insert(payload);
    if (error) throw error;

    setSolicitudFeedback('success', 'Solicitud enviada. Findixi la revisará manualmente.');
    setTimeout(() => {
      closeSolicitudModal();
      alert('Solicitud enviada. Te contactaremos cuando sea revisada.');
    }, 650);
  } catch (error) {
    console.error('Error enviando solicitud de cambio:', error);
    setSolicitudFeedback('error', 'No se pudo enviar la solicitud ahora mismo. Intenta nuevamente.');
  } finally {
    if (solicitudSubmit) {
      solicitudSubmit.disabled = false;
      solicitudSubmit.textContent = prevText;
    }
  }
}

async function guardarHorarios() {
  if (!idComercio || !horariosContainer) return;
  const rows = Array.from(horariosContainer.children).map((div, idx) => {
    const apertura = div.querySelector('.apertura').value || null;
    const cierre = div.querySelector('.cierre').value || null;
    const cerrado = div.querySelector('.cerrado').checked;
    return {
      idComercio: idComercio,
      diaSemana: idx,
      apertura: cerrado ? null : apertura,
      cierre: cerrado ? null : cierre,
      cerrado,
    };
  });
  const { error } = await supabase.from('Horarios').upsert(rows, { onConflict: 'idComercio,diaSemana' });
  if (error) {
    console.error('Error guardando horarios', error);
    alert('No se pudieron guardar los horarios');
  }
}

async function agregarFeriado() {
  const fecha = prompt('Fecha del feriado (YYYY-MM-DD):');
  if (!fecha || isNaN(Date.parse(fecha))) {
    alert('Fecha inválida');
    return;
  }
  const { error } = await supabase.from('Horarios').insert({ idComercio, feriado: fecha });
  if (error) {
    console.error('Error agregando feriado', error);
    alert('No se pudo agregar el feriado');
    return;
  }
  await cargarDatos();
}

async function eliminarFeriado(idRow) {
  const confirmar = confirm('¿Eliminar este feriado?');
  if (!confirmar) return;
  const { error } = await supabase.from('Horarios').update({ feriado: null }).eq('id', idRow);
  if (error) {
    console.error('Error eliminando feriado', error);
    alert('No se pudo eliminar el feriado');
    return;
  }
  await cargarDatos();
}

btnGuardar?.addEventListener('click', (e) => {
  e.preventDefault();
  guardarPerfil();
});

btnAgregarFeriado?.addEventListener('click', (e) => {
  e.preventDefault();
  agregarFeriado();
});

btnSolicitarNombre?.addEventListener('click', (e) => {
  e.preventDefault();
  openSolicitudModal('nombre');
});

btnSolicitarCoords?.addEventListener('click', (e) => {
  e.preventDefault();
  openSolicitudModal('coordenadas');
});

btnSolicitarLogo?.addEventListener('click', (e) => {
  e.preventDefault();
  openSolicitudModal('logo');
});

solicitudModal?.addEventListener('click', (event) => {
  if (event.target === solicitudModal) closeSolicitudModal();
});
solicitudModalClose?.addEventListener('click', closeSolicitudModal);
solicitudForm?.addEventListener('submit', enviarSolicitudCambio);

document.addEventListener('DOMContentLoaded', async () => {
  await cargarUsuarioActual();
  await cargarDatos();
});
