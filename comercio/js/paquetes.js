import { supabase } from '../shared/supabaseClient.js';
import {
  PLANES_PRELIMINARES,
  formatoPrecio,
  resolverPlanComercio,
  buildComercioPlanPayload,
  obtenerPlanPorNivel,
} from '../shared/planes.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
const comercioNombre = document.getElementById('comercioNombre');
const planActual = document.getElementById('planActual');
const planesGrid = document.getElementById('planesGrid');
const mensajePlanes = document.getElementById('mensajePlanes');

if (!idComercio) {
  if (comercioNombre) comercioNombre.textContent = 'No se encontró el ID del comercio.';
}

function renderPlanActual(planInfo) {
  if (!planActual) return;
  planActual.textContent = `Plan actual: ${planInfo.nombre} (Nivel ${planInfo.nivel})`;
}

function buildFeaturesList(features) {
  const list = Array.isArray(features) ? features : [];
  if (!list.length) return '<p class="text-sm text-gray-400">Sin features definidos.</p>';
  return `
    <ul class="text-sm text-gray-600 space-y-1">
      ${list.map((f) => `<li class="flex items-start gap-2"><span class="text-emerald-500">✓</span>${f}</li>`).join('')}
    </ul>
  `;
}

function createPlanCard(plan, planInfo) {
  const nivel = Number(plan.nivel ?? plan.plan_nivel ?? 0);
  const base = obtenerPlanPorNivel(nivel);
  const nombre = plan.nombre || base.nombre;
  const descripcion = plan.descripcion_corta || plan.descripcion || base.descripcion_corta || '';
  const precio = formatoPrecio(plan.precio ?? base.precio);
  const features = Array.isArray(plan.features) ? plan.features : base.features;
  const esActual = Number(planInfo.nivel) === Number(nivel);

  const card = document.createElement('div');
  card.className = `border rounded-2xl p-5 shadow-sm bg-white flex flex-col gap-4 ${
    esActual ? 'border-cyan-400 ring-2 ring-cyan-200' : 'border-gray-200'
  }`;

  card.innerHTML = `
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Nivel ${nivel}</p>
        <h3 class="text-xl font-semibold text-gray-900">${nombre}</h3>
        ${descripcion ? `<p class="text-sm text-gray-500">${descripcion}</p>` : ''}
      </div>
      <div class="text-right">
        <p class="text-2xl font-bold text-gray-900">${precio}</p>
        <p class="text-xs text-gray-400">mensual</p>
      </div>
    </div>
    ${buildFeaturesList(features)}
    <button
      type="button"
      class="mt-2 w-full px-4 py-2 rounded-lg font-semibold ${
        esActual ? 'bg-gray-200 text-gray-500 cursor-default' : 'bg-cyan-600 hover:bg-cyan-700 text-white'
      }"
      ${esActual ? 'disabled' : ''}
    >
      ${esActual ? 'Plan actual' : 'Seleccionar plan'}
    </button>
  `;

  const btn = card.querySelector('button');
  if (btn && !esActual) {
    btn.addEventListener('click', () => seleccionarPlan(plan));
  }

  return card;
}

async function cargarComercio() {
  if (!idComercio) return null;
  const { data, error } = await supabase
    .from('Comercios')
    .select('id, nombre, plan_id, plan_nivel, plan_nombre, permite_perfil, aparece_en_cercanos, permite_menu, permite_especiales, permite_ordenes')
    .eq('id', idComercio)
    .maybeSingle();

  if (error) {
    console.error('Error cargando comercio:', error);
    return null;
  }

  return data || null;
}

async function cargarPlanes() {
  try {
    const { data, error } = await supabase
      .from('planes')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });
    if (error) throw error;
    if (Array.isArray(data) && data.length) return data;
  } catch (error) {
    console.warn('No se pudieron cargar planes desde Supabase:', error?.message || error);
  }
  return PLANES_PRELIMINARES;
}

async function seleccionarPlan(plan) {
  if (!idComercio) return;
  const confirmar = confirm(`¿Cambiar al plan ${plan.nombre || plan.slug || 'seleccionado'}?`);
  if (!confirmar) return;

  const payload = buildComercioPlanPayload(plan);
  try {
    const { error } = await supabase
      .from('Comercios')
      .update(payload)
      .eq('id', idComercio);
    if (error) throw error;
    alert('Plan actualizado.');
    await iniciar();
  } catch (error) {
    console.error('Error actualizando plan:', error);
    alert('No se pudo actualizar el plan.');
  }
}

async function iniciar() {
  planesGrid.innerHTML = '';
  mensajePlanes.textContent = 'Cargando planes...';

  const comercio = await cargarComercio();
  if (!comercio) {
    mensajePlanes.textContent = 'No se pudo cargar el comercio.';
    return;
  }

  if (comercioNombre) {
    comercioNombre.textContent = `Comercio: ${comercio.nombre || 'Sin nombre'}`;
  }

  const planInfo = resolverPlanComercio(comercio);
  renderPlanActual(planInfo);

  const planes = await cargarPlanes();
  mensajePlanes.textContent = '';

  planes.forEach((plan) => {
    planesGrid.appendChild(createPlanCard(plan, planInfo));
  });
}

iniciar();
