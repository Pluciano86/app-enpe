// ✅ public/js/cardComercio.js
import { supabase } from '../shared/supabaseClient.js';
import { getPublicBase, calcularTiempoEnVehiculo, formatearTelefonoDisplay, formatearTelefonoHref } from '../shared/utils.js';
import { t, interpolate } from './i18n.js';
import { resolverPlanComercio } from '../shared/planes.js';

function resolveAppBase() {
  const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  return isLocal ? '/public/' : '/';
}

function hasPlanData(comercio = {}) {
  const rawNivel =
    comercio.plan_nivel ??
    comercio.planNivel ??
    comercio.plan_level ??
    comercio.nivel_plan ??
    comercio.plan ??
    comercio.plan_slug ??
    comercio.plan_nombre;

  const tieneFlags = [
    comercio.permite_perfil,
    comercio.aparece_en_cercanos,
    comercio.permite_menu,
    comercio.permite_especiales,
    comercio.permite_ordenes,
  ].some((v) => typeof v === 'boolean');

  const tienePlan =
    rawNivel !== undefined &&
    rawNivel !== null &&
    rawNivel !== '' ||
    Boolean(comercio.plan_id || comercio.planId || comercio.plan_nombre);

  return Boolean(tieneFlags || tienePlan);
}

async function fetchPlanInfo(idComercio) {
  if (!idComercio || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('Comercios')
      .select('id, plan_id, plan_nivel, plan_nombre, permite_perfil, aparece_en_cercanos, permite_menu, permite_especiales, permite_ordenes')
      .eq('id', idComercio)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return resolverPlanComercio(data);
  } catch (err) {
    console.warn('No se pudo validar plan del comercio:', err?.message || err);
    return null;
  }
}

export function cardComercio(comercio) {
  const div = document.createElement('div');
  div.className = `
    bg-white rounded-2xl shadow-md overflow-hidden relative
    text-center transition-transform duration-300 hover:scale-[1.02]
    w-full max-w-[180px] sm:max-w-[200px] mx-auto
  `;

  const planInfo = resolverPlanComercio(comercio || {});
  const permitePerfil = planInfo.permite_perfil !== false;
  const planExplicito = hasPlanData(comercio || {});

  // 🕒 Calcular tiempo estimado de llegada con i18n
  let minutosEstimados = null;
  if (Number.isFinite(comercio.distanciaKm)) {
    const { minutos } = calcularTiempoEnVehiculo(comercio.distanciaKm);
    minutosEstimados = minutos;
  } else if (Number.isFinite(comercio.tiempoVehiculo)) {
    minutosEstimados = Number(comercio.tiempoVehiculo);
  }

  let textoTiempoEstimado = '';
  if (Number.isFinite(minutosEstimados)) {
    if (minutosEstimados < 60) {
      textoTiempoEstimado = interpolate(t('card.minAway'), { min: Math.round(minutosEstimados) });
    } else {
      const h = Math.floor(minutosEstimados / 60);
      const m = Math.max(0, Math.round(minutosEstimados % 60));
      textoTiempoEstimado = interpolate(t('card.horasMinAway'), { h, m });
    }
  } else if (typeof comercio.tiempoTexto === 'string' && comercio.tiempoTexto.trim() !== '') {
    textoTiempoEstimado = comercio.tiempoTexto;
  } else {
    textoTiempoEstimado = t('card.noDisponible');
  }

  // 🖼️ Imagen de portada y logo
  const fallbackPortada =
    'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/lugarnodisponible.jpg';
  const urlPortada =
    comercio?.portada && comercio.portada.trim() !== ''
      ? comercio.portada
      : fallbackPortada;

  const logoUrl = comercio.logo?.startsWith('http')
    ? comercio.logo
    : getPublicBase(`galeriacomercios/${comercio.logo || 'NoActivoLogo.png'}`);

  // ✅ Render dinámico
  div.innerHTML = `
  <div class="relative">
    ${comercio.favorito ? `
      <div class="absolute top-2 right-2 z-50">
        <div class="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
          <div class="w-6 h-6 rounded-full border-2 border-red-600 flex items-center justify-center">
            <i class="fas fa-heart text-red-600 text-xs"></i>
          </div>
        </div>
      </div>` : ''
    }

    <div class="w-full h-20 overflow-hidden">
      <img src="${urlPortada}" alt="${comercio.nombre}" class="w-full h-full object-cover" loading="lazy" />
    </div>

    <a href="${permitePerfil ? `${resolveAppBase()}perfilComercio.html?id=${comercio.id}` : '#'}" 
       data-plan-bloqueado="${permitePerfil ? 'false' : 'true'}"
       class="relative w-full flex flex-col items-center pt-9 mt-6 no-underline ${permitePerfil ? '' : 'cursor-default'}">

      <img 
        src="${logoUrl}" 
        alt="Logo de ${comercio.nombre}"
        class="w-24 h-24 rounded-full absolute left-1/2 -top-10 transform -translate-x-1/2 
               bg-white object-contain shadow-[0px_-17px_11px_-5px_rgba(0,_0,_0,_0.3)] 
               border-4 border-white z-20" 
        loading="lazy"
      />

      <div class="relative h-12 w-full">
        <div class="absolute inset-0 flex items-center justify-center px-2 text-center">
          <h3 class="${comercio.nombre.length > 25 ? 'text-lg' : 'text-xl'} 
                     font-medium text-[#424242] z-30 mt-2 leading-[0.9] text-center">
            ${comercio.nombre}
          </h3>
        </div>
      </div>
    </a>

    ${
      !permitePerfil
        ? `<div class="mt-2 mb-1 inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-600">
             Perfil próximamente
           </div>`
        : ''
    }

    ${
      comercio.telefono && comercio.telefono.trim() !== ''
        ? `
        <a href="${formatearTelefonoHref(comercio.telefono)}" 
          class="inline-flex items-center justify-center gap-2 text-[15px] text-white font-medium 
                 bg-red-600 rounded-full px-4 py-[6px] mb-2 shadow hover:bg-red-700 transition 
                 mx-auto mt-2 max-w-[100%]">
          <i class="fa-solid fa-phone text-base"></i> ${formatearTelefonoDisplay(comercio.telefono)}
        </a>
        `
        : ''
    }

    ${(() => {
      const abiertoAhora = comercio.abierto_ahora === true;
      return `
        <div class="flex justify-center items-center gap-1 
                    ${abiertoAhora ? 'text-green-600' : 'text-red-600'} 
                    font-medium mb-1 text-base">
          <i class="far fa-clock ${abiertoAhora ? 'slow-spin text-green-600' : 'text-red-500'}"></i> 
          ${abiertoAhora ? t('card.abiertoAhora') : t('card.cerradoAhora')}
        </div>
      `;
    })()}

    <div class="flex justify-center items-center gap-1 font-medium mb-1 text-sm text-[#3ea6c4]">
      <i class="fas fa-map-pin text-[#3ea6c4]"></i> ${comercio.pueblo}
    </div>

    ${
      textoTiempoEstimado
        ? `<div class="flex justify-center items-center gap-1 text-[#9c9c9c] font-medium text-sm mb-4">
             <i class="fas fa-car"></i> ${textoTiempoEstimado}
           </div>`
        : ''
    }
  </div>
`;

  if (!permitePerfil) {
    const link = div.querySelector('[data-plan-bloqueado=\"true\"]');
    if (link) {
      link.setAttribute('aria-disabled', 'true');
      link.setAttribute('tabindex', '-1');
      link.classList.add('pointer-events-none');
    }

    // bubble handled in shared click handler below
  }

  const showBubble = (message) => {
    let bubble = div.querySelector('.basic-plan-bubble');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className =
        'basic-plan-bubble absolute left-1/2 -translate-x-1/2 top-2 bg-black/85 text-white text-[11px] px-3 py-1.5 rounded-full shadow-lg opacity-0 pointer-events-none transition-opacity duration-200 z-50';
      bubble.textContent = message;
      div.appendChild(bubble);
    } else {
      bubble.textContent = message;
    }
    bubble.classList.remove('opacity-0');
    bubble.classList.add('opacity-100');
    if (bubble._hideTimer) clearTimeout(bubble._hideTimer);
    bubble._hideTimer = setTimeout(() => {
      bubble.classList.remove('opacity-100');
      bubble.classList.add('opacity-0');
    }, 2200);
  };

  // Controlar navegación para evitar saltar al perfil en plan básico
  div.addEventListener('click', async (event) => {
    const telLink = event.target.closest('a[href^="tel:"]');
    if (telLink) return;

    event.preventDefault();
    event.stopPropagation();

    let info = planExplicito ? planInfo : await fetchPlanInfo(comercio?.id);
    if (!info) {
      info = planInfo;
    }

    if (info?.permite_perfil) {
      window.location.href = `${resolveAppBase()}perfilComercio.html?id=${comercio.id}`;
      return;
    }

    showBubble('Este comercio está en plan básico. Puedes llamarlo por teléfono.');
  });

  return div;
}
