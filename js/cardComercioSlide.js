export function cardComercioSlide(comercio) {
  const {
    id,
    nombre,
    categoria,
    municipio,
    tiempoTexto,
    imagenPortada,
    logo,
    activo
  } = comercio;

  const isActivo = activo === true;

  const card = document.createElement("a");

  if (isActivo) {
    card.href = `perfilComercio.html?id=${id}`;
  }

  card.className = `
    block w-40 shrink-0 rounded-xl overflow-hidden shadow bg-white relative
    ${!isActivo ? 'pointer-events-none opacity-60' : ''}
  `.trim();

  card.innerHTML = `
    <!-- Imagen portada -->
    <div class="w-full h-24 relative bg-gray-200">
      <img src="${imagenPortada || 'https://placehold.co/200x120?text=Portada'}" alt="Portada" class="w-full h-full object-cover" />
      
      <!-- Logo circular -->
      <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white rounded-full
       shadow-[0px_-17px_11px_-5px_rgba(0,_0,_0,_0.5)] overflow-hidden">
        <img src="${logo || 'https://placehold.co/40x40?text=Logo'}" alt="Logo" class="w-full h-full object-cover" />
      </div>
    </div>

    <!-- Info -->
    <div class="pt-8 px-2 pb-2 text-center">
      <!-- Nombre con altura fija -->
      <h3 class="text-[13px] font-semibold leading-tight h-12 overflow-hidden text-ellipsis line-clamp-2">
        ${nombre}
      </h3>

      <p class="-mt-2 text-xs text-gray-500 truncate">${categoria || 'Sin categoría'}</p>
      <p class="text-[11px] text-gray-600 mt-1 truncate">
        <i class="fas fa-map-pin text-sky-600 mr-1"></i>${municipio}
      </p>
      <p class="text-[11px] text-gray-600 mt-1">
        <i class="fas fa-car text-red-500 mr-1"></i>${tiempoTexto || 'N/A'}
      </p>
    </div>
  `;

  return card;
}