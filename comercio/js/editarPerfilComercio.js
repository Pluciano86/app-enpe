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
const imageValidationCta = document.getElementById('imageValidationCta');
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
const firstLogoUploadSection = document.getElementById('firstLogoUploadSection');
const firstLogoInput = document.getElementById('firstLogoInput');
const firstLogoProcessBtn = document.getElementById('firstLogoProcessBtn');
const firstLogoFeedback = document.getElementById('firstLogoFeedback');
const firstLogoEditor = document.getElementById('firstLogoEditor');
const firstLogoPreviewCanvas = document.getElementById('firstLogoPreviewCanvas');
const firstLogoZoom = document.getElementById('firstLogoZoom');
const firstLogoCenterBtn = document.getElementById('firstLogoCenterBtn');
const firstLogoUpgradeBox = document.getElementById('firstLogoUpgradeBox');
const firstLogoUpgradeText = document.getElementById('firstLogoUpgradeText');
const firstLogoRetryBtn = document.getElementById('firstLogoRetryBtn');
const firstLogoUpgradeBtn = document.getElementById('firstLogoUpgradeBtn');
const firstPortadaUploadSection = document.getElementById('firstPortadaUploadSection');
const firstPortadaInput = document.getElementById('firstPortadaInput');
const firstPortadaProcessBtn = document.getElementById('firstPortadaProcessBtn');
const firstPortadaFeedback = document.getElementById('firstPortadaFeedback');

const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SOLICITUD_CAMPO_TITULO = {
  nombre: 'Cambio de nombre',
  coordenadas: 'Cambio de coordenadas',
  logo: 'Cambio de logo',
};

let comercioActual = null;
let currentUserId = null;
let solicitudCampoActual = null;
let firstLogoOffer = null;
let firstLogoEditorState = null;

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

function normalizeImageEstado(value) {
  const estado = String(value || '').trim().toLowerCase();
  if (['aprobado', 'upgrade_listo'].includes(estado)) return 'aprobado';
  if (estado === 'requiere_accion') return 'requiere_accion';
  if (estado === 'en_upgrade') return 'en_upgrade';
  return 'pendiente';
}

function getImageEstadoLabel(value) {
  const estado = normalizeImageEstado(value);
  if (estado === 'aprobado') return 'Aprobado';
  if (estado === 'requiere_accion') return 'Requiere acción';
  if (estado === 'en_upgrade') return 'En optimización';
  return 'Pendiente';
}

function renderImageValidationCta(comercio = {}) {
  if (!imageValidationCta) return;

  const logoEstado = normalizeImageEstado(comercio.logo_estado);
  const portadaEstado = normalizeImageEstado(comercio.portada_estado);
  const logoAprobado = comercio.logo_aprobado === true || logoEstado === 'aprobado';
  const portadaAprobada = comercio.portada_aprobada === true || portadaEstado === 'aprobado';

  if (logoAprobado && portadaAprobada) {
    imageValidationCta.classList.add('hidden');
    imageValidationCta.innerHTML = '';
    return;
  }

  const bullets = [];
  if (!logoAprobado) bullets.push(`Logo: ${getImageEstadoLabel(comercio.logo_estado)}`);
  if (!portadaAprobada) bullets.push(`Portada: ${getImageEstadoLabel(comercio.portada_estado)}`);

  imageValidationCta.classList.remove('hidden');
  imageValidationCta.innerHTML = `
    <div class="font-semibold">Pendiente validación de imagen</div>
    <p class="mt-1">Para publicar el comercio en Findixi, logo y portada deben estar aprobados.</p>
    <p class="mt-2 text-xs">${bullets.join(' · ')}</p>
  `;
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

function setFirstLogoFeedback(type, message) {
  if (!firstLogoFeedback) return;
  const tone = {
    success: 'bg-emerald-50 border border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border border-amber-200 text-amber-800',
    error: 'bg-red-50 border border-red-200 text-red-700',
    info: 'bg-sky-50 border border-sky-200 text-sky-800',
  };
  firstLogoFeedback.className = `text-xs rounded-lg px-3 py-2 ${tone[type] || tone.info}`;
  firstLogoFeedback.textContent = message;
  firstLogoFeedback.classList.remove('hidden');
}

function clearFirstLogoFeedback() {
  if (!firstLogoFeedback) return;
  firstLogoFeedback.classList.add('hidden');
  firstLogoFeedback.textContent = '';
}

function setFirstPortadaFeedback(type, message) {
  if (!firstPortadaFeedback) return;
  const tone = {
    success: 'bg-emerald-50 border border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border border-amber-200 text-amber-800',
    error: 'bg-red-50 border border-red-200 text-red-700',
    info: 'bg-sky-50 border border-sky-200 text-sky-800',
  };
  firstPortadaFeedback.className = `text-xs rounded-lg px-3 py-2 ${tone[type] || tone.info}`;
  firstPortadaFeedback.textContent = message;
  firstPortadaFeedback.classList.remove('hidden');
}

function clearFirstPortadaFeedback() {
  if (!firstPortadaFeedback) return;
  firstPortadaFeedback.classList.add('hidden');
  firstPortadaFeedback.textContent = '';
}

function clearFirstLogoEditor() {
  if (firstLogoEditorState?.objectUrl) {
    URL.revokeObjectURL(firstLogoEditorState.objectUrl);
  }
  firstLogoEditorState = null;
  if (firstLogoEditor) firstLogoEditor.classList.add('hidden');
  if (firstLogoZoom) firstLogoZoom.value = '100';

  const canvas = firstLogoPreviewCanvas;
  const ctx = canvas?.getContext('2d');
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function getCircleLayout(side) {
  const radius = Math.round(side * 0.43);
  const center = side / 2;
  return { center, radius, diameter: radius * 2 };
}

function pickBackgroundColorFromImage(image) {
  const sampleSize = 64;
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '#111111';

  ctx.drawImage(image, 0, 0, sampleSize, sampleSize);
  const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
  const bins = new Map();
  let whiteLike = 0;
  let total = 0;

  for (let y = 0; y < sampleSize; y += 1) {
    for (let x = 0; x < sampleSize; x += 1) {
      const isBorder = x === 0 || y === 0 || x === sampleSize - 1 || y === sampleSize - 1;
      if (!isBorder) continue;

      const idx = (y * sampleSize + x) * 4;
      const r = data[idx] ?? 255;
      const g = data[idx + 1] ?? 255;
      const b = data[idx + 2] ?? 255;
      const a = data[idx + 3] ?? 255;
      if (a < 20) continue;

      total += 1;
      if (r >= 230 && g >= 230 && b >= 230) whiteLike += 1;

      const qr = Math.round(r / 24) * 24;
      const qg = Math.round(g / 24) * 24;
      const qb = Math.round(b / 24) * 24;
      const key = `${qr}|${qg}|${qb}`;
      const prev = bins.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      prev.count += 1;
      prev.r += r;
      prev.g += g;
      prev.b += b;
      bins.set(key, prev);
    }
  }

  if (!total) return '#111111';
  if (whiteLike / total >= 0.55) return '#ffffff';

  let selected = null;
  for (const bucket of bins.values()) {
    if (!selected || bucket.count > selected.count) selected = bucket;
  }
  if (!selected || !selected.count) return '#111111';

  return `rgb(${Math.round(selected.r / selected.count)}, ${Math.round(selected.g / selected.count)}, ${Math.round(selected.b / selected.count)})`;
}

function detectClientTextHeavyLogo(image) {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { blocked: false };

  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const total = size * size;
  const dark = new Uint8Array(total);

  let darkCount = 0;
  let transitions = 0;
  for (let y = 0; y < size; y += 1) {
    let prev = 0;
    for (let x = 0; x < size; x += 1) {
      const idxPx = y * size + x;
      const idx = idxPx * 4;
      const lum = 0.2126 * (data[idx] || 0) + 0.7152 * (data[idx + 1] || 0) + 0.0722 * (data[idx + 2] || 0);
      const v = lum < 165 ? 1 : 0;
      dark[idxPx] = v;
      darkCount += v;
      if (x > 0 && v !== prev) transitions += 1;
      prev = v;
    }
  }

  const darkRatio = darkCount / Math.max(1, total);
  const transitionDensity = transitions / Math.max(1, size * (size - 1));
  const blocked = darkRatio > 0.54 && transitionDensity > 0.33;

  return {
    blocked,
    darkRatio,
    transitionDensity,
    reason: blocked
      ? 'Detectamos demasiado texto distribuido en toda la imagen. Sube un logo más simple (símbolo o texto breve).'
      : '',
  };
}

function renderFirstLogoPreview(showGuide = true) {
  if (!firstLogoEditorState || !firstLogoPreviewCanvas) return;
  const canvas = firstLogoPreviewCanvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { image, scale, offsetX, offsetY, backgroundColor } = firstLogoEditorState;
  const { center, radius } = getCircleLayout(canvas.width);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = backgroundColor || '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const drawX = center - drawW / 2 + offsetX;
  const drawY = center - drawH / 2 + offsetY;
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
  ctx.restore();

  if (showGuide) {
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function updateFirstLogoScaleBySlider() {
  if (!firstLogoEditorState || !firstLogoZoom) return;
  const raw = Number(firstLogoZoom.value || 100);
  const normalized = Math.max(0, Math.min(1, (raw - 60) / 220));
  const nextScale =
    firstLogoEditorState.minScale +
    (firstLogoEditorState.maxScale - firstLogoEditorState.minScale) * normalized;
  firstLogoEditorState.scale = nextScale;
  renderFirstLogoPreview(true);
}

async function prepareFirstLogoEditor(file) {
  clearFirstLogoEditor();
  if (!file) return false;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo cargar la vista previa del logo.'));
      img.src = objectUrl;
    });

    const textCheck = detectClientTextHeavyLogo(image);
    if (textCheck.blocked) {
      setFirstLogoFeedback('warning', textCheck.reason);
      URL.revokeObjectURL(objectUrl);
      return false;
    }

    const canvasSide = firstLogoPreviewCanvas?.width || 480;
    const { diameter } = getCircleLayout(canvasSide);
    const initialScale = (diameter * 0.88) / Math.max(1, Math.max(image.width, image.height));
    const isPngInput = String(file.type || '').toLowerCase() === 'image/png';

    firstLogoEditorState = {
      image,
      objectUrl,
      backgroundColor: isPngInput ? '#ffffff' : pickBackgroundColorFromImage(image),
      scale: initialScale,
      minScale: initialScale * 0.6,
      maxScale: initialScale * 3.2,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      dragStartX: 0,
      dragStartY: 0,
      startOffsetX: 0,
      startOffsetY: 0,
    };

    if (firstLogoZoom) firstLogoZoom.value = '100';
    if (firstLogoEditor) firstLogoEditor.classList.remove('hidden');
    renderFirstLogoPreview(true);
    return true;
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function getPreparedLogoDataUrl(file) {
  if (!firstLogoEditorState?.image) {
    const ok = await prepareFirstLogoEditor(file);
    if (!ok) return '';
  }
  if (!firstLogoEditorState?.image) return '';

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const { image, scale, offsetX, offsetY, backgroundColor } = firstLogoEditorState;
  const { center, radius } = getCircleLayout(canvas.width);
  const scaleFactor = canvas.width / Math.max(1, firstLogoPreviewCanvas?.width || 480);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = backgroundColor || '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const drawW = image.width * scale * scaleFactor;
  const drawH = image.height * scale * scaleFactor;
  const drawX = center - drawW / 2 + offsetX * scaleFactor;
  const drawY = center - drawH / 2 + offsetY * scaleFactor;
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
  ctx.restore();

  return canvas.toDataURL('image/png', 0.95);
}

function hideLogoUpgradeBox() {
  firstLogoUpgradeBox?.classList.add('hidden');
  firstLogoOffer = null;
}

function showLogoUpgradeBox(offer, nota = '') {
  if (!firstLogoUpgradeBox) return;
  firstLogoOffer = offer || null;
  const label = offer?.label || 'Incluido en tu plan';
  if (firstLogoUpgradeText) {
    firstLogoUpgradeText.textContent = nota
      ? `${nota} Puedes subir otro archivo o usar Logo Upgrade (${label}).`
      : `Puedes subir otro archivo o usar Logo Upgrade (${label}).`;
  }
  firstLogoUpgradeBox.classList.remove('hidden');
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
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

  const sinLogo = !comercio.logo;
  const puedeSubirPrimerLogo = locked && sinLogo;
  if (firstLogoUploadSection) {
    firstLogoUploadSection.classList.toggle('hidden', !puedeSubirPrimerLogo);
  }
  if (btnSolicitarLogo) {
    btnSolicitarLogo.classList.toggle('hidden', puedeSubirPrimerLogo);
  }
  if (!puedeSubirPrimerLogo) {
    clearFirstLogoFeedback();
    if (firstLogoInput) firstLogoInput.value = '';
    hideLogoUpgradeBox();
    clearFirstLogoEditor();
  }

  const sinPortada = !comercio.portada;
  const puedeSubirPrimeraPortada = locked && sinPortada;
  if (firstPortadaUploadSection) {
    firstPortadaUploadSection.classList.toggle('hidden', !puedeSubirPrimeraPortada);
  }
  if (!puedeSubirPrimeraPortada) {
    clearFirstPortadaFeedback();
    if (firstPortadaInput) firstPortadaInput.value = '';
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
      'nombre,logo,portada,latitud,longitud,telefono,direccion,whatsapp,facebook,instagram,tiktok,webpage,descripcion,plan_id,plan_nivel,plan_nombre,permite_menu,permite_especiales,permite_ordenes,permite_perfil,aparece_en_cercanos,estado_propiedad,estado_verificacion,propietario_verificado,logo_estado,logo_aprobado,portada_estado,portada_aprobada'
    )
    .eq('id', idComercio)
    .maybeSingle();
  if (!error && data) {
    comercioActual = data;
    renderProtectedFields(data);
    const comercioVerificado = isComercioVerificado(data);
    renderImageValidationCta(data);
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

async function subirPrimerLogoConValidacion({ mode = 'validate' } = {}) {
  if (!idComercio) return;
  clearFirstLogoFeedback();

  if (!comercioActual || !isComercioVerificado(comercioActual) || comercioActual.logo) {
    setFirstLogoFeedback('warning', 'Este flujo solo aplica para comercios verificados sin logo.');
    return;
  }

  const file = firstLogoInput?.files?.[0] || null;
  if (!file) {
    setFirstLogoFeedback('warning', 'Selecciona un archivo PNG/JPG/WEBP.');
    return;
  }

  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(String(file.type || '').toLowerCase())) {
    setFirstLogoFeedback('warning', 'Formato no permitido. Usa PNG, JPG o WEBP.');
    return;
  }

  const isUpgradeMode = mode === 'upgrade_demo';
  const previousText = isUpgradeMode
    ? firstLogoUpgradeBtn?.textContent || 'Optimizar automáticamente'
    : firstLogoProcessBtn?.textContent || 'Validar y subir logo';
  if (isUpgradeMode) {
    if (firstLogoUpgradeBtn) {
      firstLogoUpgradeBtn.disabled = true;
      firstLogoUpgradeBtn.textContent = 'Optimizando...';
    }
  } else if (firstLogoProcessBtn) {
    firstLogoProcessBtn.disabled = true;
    firstLogoProcessBtn.textContent = 'Procesando...';
  }

  try {
    const dataUrl = await getPreparedLogoDataUrl(file);
    if (!dataUrl) {
      setFirstLogoFeedback(
        'warning',
        'No se pudo preparar el logo. Ajusta el encuadre o sube otro archivo.'
      );
      return;
    }
    const {
      data: { session } = {},
    } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    if (!token) {
      setFirstLogoFeedback('error', 'Tu sesión expiró. Vuelve a iniciar sesión.');
      return;
    }

    const response = await fetch('/.netlify/functions/image-validate-process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        idComercio: Number(idComercio),
        type: 'logo',
        mode,
        file_base64: dataUrl,
        file_name: file.name || 'logo',
        mime_type: 'image/png',
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || 'No se pudo validar el logo.');
    }

    if (payload?.aprobado) {
      const suffix = isUpgradeMode
        ? (payload?.demo_mode ? ' (modo demo sin cobro real).' : '.')
        : '.';
      setFirstLogoFeedback('success', `${payload?.nota || 'Logo aprobado y guardado'}${suffix}`);
      hideLogoUpgradeBox();
      clearFirstLogoEditor();
      await cargarDatos();
      return;
    }

    setFirstLogoFeedback(
      'warning',
      payload?.nota || 'Tu logo requiere ajustes. Sube otra imagen con fondo blanco o transparente.'
    );
    showLogoUpgradeBox(payload?.logo_upgrade_offer, payload?.nota || '');
  } catch (error) {
    console.error('Error procesando primer logo:', error);
    setFirstLogoFeedback('error', error?.message || 'No se pudo procesar el logo en este momento.');
  } finally {
    if (isUpgradeMode) {
      if (firstLogoUpgradeBtn) {
        firstLogoUpgradeBtn.disabled = false;
        firstLogoUpgradeBtn.textContent = previousText;
      }
    } else if (firstLogoProcessBtn) {
      firstLogoProcessBtn.disabled = false;
      firstLogoProcessBtn.textContent = previousText;
    }
  }
}

async function subirPrimeraPortadaConValidacion() {
  if (!idComercio) return;
  clearFirstPortadaFeedback();

  if (!comercioActual || !isComercioVerificado(comercioActual) || comercioActual.portada) {
    setFirstPortadaFeedback('warning', 'Este flujo solo aplica para comercios verificados sin portada.');
    return;
  }

  const file = firstPortadaInput?.files?.[0] || null;
  if (!file) {
    setFirstPortadaFeedback('warning', 'Selecciona un archivo PNG/JPG/WEBP.');
    return;
  }

  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(String(file.type || '').toLowerCase())) {
    setFirstPortadaFeedback('warning', 'Formato no permitido. Usa PNG, JPG o WEBP.');
    return;
  }

  const previousText = firstPortadaProcessBtn?.textContent || 'Validar y subir portada';
  if (firstPortadaProcessBtn) {
    firstPortadaProcessBtn.disabled = true;
    firstPortadaProcessBtn.textContent = 'Procesando...';
  }

  try {
    const dataUrl = await fileToDataUrl(file);
    const {
      data: { session } = {},
    } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    if (!token) {
      setFirstPortadaFeedback('error', 'Tu sesión expiró. Vuelve a iniciar sesión.');
      return;
    }

    const response = await fetch('/.netlify/functions/image-validate-process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        idComercio: Number(idComercio),
        type: 'portada',
        mode: 'validate',
        file_base64: dataUrl,
        file_name: file.name || 'portada',
        mime_type: file.type || 'image/png',
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || 'No se pudo validar la portada.');
    }

    if (payload?.aprobado) {
      setFirstPortadaFeedback('success', payload?.nota || 'Portada aprobada y guardada.');
      await cargarDatos();
      return;
    }

    setFirstPortadaFeedback(
      'warning',
      payload?.nota || 'La portada requiere ajustes. Sube otra imagen con mejor resolución.'
    );
  } catch (error) {
    console.error('Error procesando primera portada:', error);
    setFirstPortadaFeedback('error', error?.message || 'No se pudo procesar la portada en este momento.');
  } finally {
    if (firstPortadaProcessBtn) {
      firstPortadaProcessBtn.disabled = false;
      firstPortadaProcessBtn.textContent = previousText;
    }
  }
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
firstLogoProcessBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  subirPrimerLogoConValidacion({ mode: 'validate' });
});
firstLogoInput?.addEventListener('change', async () => {
  clearFirstLogoFeedback();
  hideLogoUpgradeBox();
  const file = firstLogoInput?.files?.[0] || null;
  if (!file) {
    clearFirstLogoEditor();
    return;
  }
  try {
    await prepareFirstLogoEditor(file);
  } catch (error) {
    console.error('Error preparando editor de logo:', error);
    setFirstLogoFeedback('error', error?.message || 'No se pudo preparar la vista previa del logo.');
  }
});
firstLogoRetryBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  clearFirstLogoFeedback();
  hideLogoUpgradeBox();
  clearFirstLogoEditor();
  if (firstLogoInput) {
    firstLogoInput.value = '';
    firstLogoInput.focus();
  }
});
firstLogoUpgradeBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  const priceLabel = firstLogoOffer?.label || 'modo demo';
  const ok = confirm(`Logo Upgrade: ${priceLabel}\n\nEn esta etapa correrá en modo demo (sin cobro real). ¿Continuar?`);
  if (!ok) return;
  await subirPrimerLogoConValidacion({ mode: 'upgrade_demo' });
});
firstLogoZoom?.addEventListener('input', () => {
  updateFirstLogoScaleBySlider();
});
firstLogoCenterBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  if (!firstLogoEditorState) return;
  firstLogoEditorState.offsetX = 0;
  firstLogoEditorState.offsetY = 0;
  renderFirstLogoPreview(true);
});
firstLogoPreviewCanvas?.addEventListener('pointerdown', (event) => {
  if (!firstLogoEditorState || !firstLogoPreviewCanvas) return;
  const rect = firstLogoPreviewCanvas.getBoundingClientRect();
  firstLogoEditorState.dragging = true;
  firstLogoEditorState.dragStartX = event.clientX - rect.left;
  firstLogoEditorState.dragStartY = event.clientY - rect.top;
  firstLogoEditorState.startOffsetX = firstLogoEditorState.offsetX;
  firstLogoEditorState.startOffsetY = firstLogoEditorState.offsetY;
  firstLogoPreviewCanvas.setPointerCapture(event.pointerId);
});
firstLogoPreviewCanvas?.addEventListener('pointermove', (event) => {
  if (!firstLogoEditorState?.dragging || !firstLogoPreviewCanvas) return;
  const rect = firstLogoPreviewCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const dx = x - firstLogoEditorState.dragStartX;
  const dy = y - firstLogoEditorState.dragStartY;
  firstLogoEditorState.offsetX = firstLogoEditorState.startOffsetX + dx;
  firstLogoEditorState.offsetY = firstLogoEditorState.startOffsetY + dy;
  renderFirstLogoPreview(true);
});
function stopLogoDrag(event) {
  if (!firstLogoEditorState || !firstLogoPreviewCanvas) return;
  firstLogoEditorState.dragging = false;
  if (event?.pointerId !== undefined && firstLogoPreviewCanvas.hasPointerCapture(event.pointerId)) {
    firstLogoPreviewCanvas.releasePointerCapture(event.pointerId);
  }
}
firstLogoPreviewCanvas?.addEventListener('pointerup', stopLogoDrag);
firstLogoPreviewCanvas?.addEventListener('pointercancel', stopLogoDrag);
firstLogoPreviewCanvas?.addEventListener('pointerleave', stopLogoDrag);
firstPortadaProcessBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  subirPrimeraPortadaConValidacion();
});
firstPortadaInput?.addEventListener('change', () => {
  clearFirstPortadaFeedback();
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
