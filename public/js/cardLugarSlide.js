// cardLugarSlide.js
export function cardLugarSlide(lugar) {
  const {
    id,
    nombre,
    municipio,
    imagen,
    tiempoTexto = "a 3 minutos"
  } = lugar;

  const card = document.createElement("a");
  card.href = `perfilLugar.html?id=${id}`;
  card.className = `
    block w-80 sm:w-96 shrink-0 rounded-lg overflow-hidden  bg-white relative
    hover:scale-[1.02] transition-transform
  `.trim();

  card.innerHTML = `
    <!-- Imagen del lugar -->
    <div class="w-full h-42 relative bg-gray-200">
      <img src="${imagen || 'https://placehold.co/300x200?text=Lugar'}" alt="${nombre}" class="w-full h-full object-cover" />
    </div>

    <!-- Info -->
    <div class="pt-2 pb-2 text-center">
      <!-- Nombre -->
      <h3 class="text-lg font-medium text-gray-800 truncate px-2 leading-tight">${nombre}</h3>

      <!-- Municipio y tiempo -->
      <div class="flex justify-around items-center gap-2 text-sm mt-1 text-gray-500">
        <span class="flex items-center gap-1 text-[#23b4e9] font-normal">
         <i class="fas fa-map-pin"></i> ${municipio}
        </span>
        <span class="flex items-center gap-1 text-gray-400 font-normal">
          <i class="fa-solid fa-car text-gray-400"></i> ${tiempoTexto}
        </span>
      </div>
    </div>
  `;

  return card;
}