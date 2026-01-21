// ✅ public/js/cardComercio.js
import { getPublicBase, calcularTiempoEnVehiculo } from '../shared/utils.js';

function resolveAppBase() {
  const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  return isLocal ? '/public/' : '/';
}

export function cardComercio(comercio) {
  const div = document.createElement('div');
  div.className = `
    bg-white rounded-2xl shadow-md overflow-hidden 
    text-center transition-transform duration-300 hover:scale-[1.02]
    w-full max-w-[180px] sm:max-w-[200px] mx-auto
  `;

  // 🕒 Calcular tiempo estimado de llegada
  let textoTiempoEstimado = comercio.tiempoVehiculo || comercio.tiempoTexto || '';
  if (!textoTiempoEstimado && Number.isFinite(comercio.distanciaKm)) {
    const { minutos, texto } = calcularTiempoEnVehiculo(comercio.distanciaKm);
    textoTiempoEstimado = minutos < 60 ? `a ${minutos} minutos` : `a ${texto}`;
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

    <a href="${resolveAppBase()}perfilComercio.html?id=${comercio.id}" 
       class="relative w-full flex flex-col items-center pt-9 mt-6 no-underline">

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
      comercio.telefono && comercio.telefono.trim() !== ''
        ? `
        <a href="tel:${comercio.telefono}" 
          class="inline-flex items-center justify-center gap-2 text-[15px] text-white font-medium 
                 bg-red-600 rounded-full px-4 py-[6px] mb-2 shadow hover:bg-red-700 transition 
                 mx-auto mt-2 max-w-[100%]">
          <i class="fa-solid fa-phone text-base"></i> ${comercio.telefono}
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
          ${abiertoAhora ? 'Abierto Ahora' : 'Cerrado Ahora'}
        </div>
      `;
    })()}

    <div class="flex justify-center items-center gap-1 font-medium mb-1 text-sm text-[#23b4e9]">
      <i class="fas fa-map-pin text-[#23b4e9]"></i> ${comercio.pueblo}
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

  return div;
}
