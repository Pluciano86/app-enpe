// cardLugarSlide.js
export function cardLugarSlide(lugar) {
  const {
    id,
    nombre,
    municipio,
    imagen,
    tiempoTexto = "a 3 minutos",
  } = lugar;

  const card = document.createElement("a");
  card.href = `perfilLugar.html?id=${id}`;
  card.className = `
    block w-72 sm:w-80 md:w-96 shrink-0 rounded-xl overflow-hidden bg-white shadow-sm
    hover:shadow-lg hover:scale-[1.02] transition-all duration-300
  `.trim();

  card.innerHTML = `
    <!-- Imagen principal -->
    <div class="relative w-full h-44 bg-gray-100">
      <img
        src="${imagen || "https://placehold.co/400x250?text=Lugar"}"
        alt="${nombre}"
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>

    <!-- Contenido -->
    <div class="py-2 text-center">
      <!-- Nombre -->
      <h3 class="text-base sm:text-lg font-semibold text-gray-800 leading-tight truncate px-3">
        ${nombre}
      </h3>

      <!-- Municipio y tiempo -->
      <div class="flex justify-center items-center gap-3 mt-1 text-sm text-gray-500">
        <span class="flex items-center gap-1 text-[#23b4e9]">
          <i class="fa-solid fa-map-marker-alt"></i> ${municipio || "Sin municipio"}
        </span>
        <span class="flex items-center gap-1">
          <i class="fa-solid fa-car text-gray-400"></i> ${tiempoTexto}
        </span>
      </div>
    </div>
  `;

  return card;
}