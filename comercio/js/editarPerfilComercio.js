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
const btnCambiarPlan = document.getElementById('btnCambiarPlan');

const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

if (!idComercio) {
  alert('ID de comercio no encontrado');
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
      'telefono,direccion,whatsapp,facebook,instagram,tiktok,webpage,descripcion,plan_id,plan_nivel,plan_nombre,permite_menu,permite_especiales,permite_ordenes,permite_perfil,aparece_en_cercanos,estado_propiedad,estado_verificacion,propietario_verificado'
    )
    .eq('id', idComercio)
    .maybeSingle();
  if (!error && data) {
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
    alert('No se pudo guardar el perfil');
    console.error(error);
    return;
  }
  await guardarHorarios();
  alert('Perfil actualizado');
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

document.addEventListener('DOMContentLoaded', cargarDatos);
