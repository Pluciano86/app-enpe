export function cardComercioSlide(comercio) {
  const {
    id,
    nombre,
    categoria,
    municipio,
    tiempoTexto,
    imagenPortada, // <-- se usará esta
    logo
  } = comercio;

  const card = document.createElement("a");
  card.href = `perfilComercio.html?id=${id}`;
  card.className = "block w-40 shrink-0 rounded-xl overflow-hidden shadow bg-white relative";

  card.innerHTML = `
    <!-- Imagen portada -->
    <div class="w-full h-24 relative bg-gray-200">
      <img src="${imagenPortada || 'https://placehold.co/200x120'}" alt="Portada" class="w-full h-full object-cover" />
      
      <!-- Logo circular -->
      <div class="absolute -bottom-5 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white rounded-full shadow-[0px_-17px_11px_-5px_rgba(0,_0,_0,_0.3)] overflow-hidden">
        <img src="${logo || 'https://placehold.co/40x40?text=Logo'}" alt="Logo" class="w-full h-full object-cover" />
      </div>
    </div>

    <!-- Info -->
    <div class="pt-6 px-2 pb-2 text-center">
      <h3 class="text-sm font-semibold truncate">${nombre}</h3>
      <p class="text-xs text-gray-500 truncate">${categoria || 'Sin categoría'}</p>
      <div class="flex items-center justify-center gap-1 text-[11px] text-gray-600 mt-1">
        <i class="fas fa-map-pin text-sky-600"></i>
        <span>${municipio}</span>
        <i class="fas fa-car text-red-500 ml-2"></i>
        <span>${tiempoTexto || 'N/A'}</span>
      </div>
    </div>
  `;

  return card;
}