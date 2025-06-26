// cardPlayaSlide.js
export function cardPlayaSlide(playa) {
  const {
    nombre,
    municipio,
    imagen,
    clima = {},
    tiempoTexto = '',
  } = playa;

  const card = document.createElement("div");
  card.className = `
    block w-40 shrink-0 rounded-xl overflow-hidden shadow bg-white relative
  `.trim();

  card.innerHTML = `
    <!-- Imagen de la playa -->
    <div class="w-full h-24 relative bg-gray-200">
      <img src="${imagen || 'https://placehold.co/200x120?text=Playa'}" alt="Playa" class="w-full h-full object-cover" />
    </div>

    <!-- Info -->
    <div class="pt-2 px-2 pb-2 text-center">
      <!-- Nombre -->
      <h3 class="text-sm font-semibold leading-tight h-10 overflow-hidden text-ellipsis line-clamp-2">${nombre}</h3>

      <!-- Clima -->
      <div class="flex justify-center items-center gap-1 text-sm text-gray-600 mt-1">
        ${clima.iconoURL ? `<img src="${clima.iconoURL}" alt="${clima.estado}" class="w-4 h-4" />` : ''}
        <span>${clima.estado || ''}</span>
      </div>

      <!-- Municipio -->
      <div class="flex items-center justify-center gap-1 text-[11px] text-gray-600 mt-1">
        <i class="fas fa-map-pin text-sky-600"></i>
        <span>${municipio}</span>
      </div>

      <!-- Distancia -->
      <div class="flex items-center justify-center gap-1 text-[11px] text-gray-600 mt-1">
        <i class="fas fa-car text-red-500"></i>
        <span>${tiempoTexto || 'N/A'}</span>
      </div>
    </div>
  `;

  return card;
}