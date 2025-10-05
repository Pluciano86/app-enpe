// public/js/cardPlayaSlide.js
const PLACEHOLDER_PLAYA =
  "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/imgPlayaNoDisponible.jpg";

export function cardPlayaSlide(playa) {
  const { id, nombre, municipio, tiempoTexto = "", imagen, clima = {} } = playa;

  // 🪶 Crear el enlace contenedor
  const card = document.createElement("a");
  card.href = `perfilPlaya.html?id=${id}`;
  card.className =
    "block w-40 shrink-0 rounded-xl overflow-hidden shadow bg-white relative transition-transform hover:scale-[1.02] active:scale-[0.98]";

  // 🧩 Validar imagen
  const imagenURL =
    imagen && imagen.trim() !== ""
      ? imagen.trim()
      : PLACEHOLDER_PLAYA;

  // 🧱 Estructura HTML
  card.innerHTML = `
    <!-- Imagen -->
    <div class="w-full h-24 relative bg-gray-200">
      <img 
        src="${imagenURL}" 
        alt="Imagen de ${nombre}" 
        class="w-full h-full object-cover" 
        loading="lazy"
        onerror="this.src='${PLACEHOLDER_PLAYA}'"
      />
    </div>

    <!-- Información -->
    <div class="pt-2 px-2 pb-2 text-center">
      <h3 class="text-sm font-semibold leading-tight h-10 overflow-hidden text-ellipsis line-clamp-2">
        ${nombre || "Playa sin nombre"}
      </h3>

      <div class="flex justify-center items-center gap-1 text-sm text-gray-600 mt-1">
        ${
          clima.iconoURL
            ? `<img src="${clima.iconoURL}" alt="${clima.estado}" class="w-4 h-4" />`
            : ""
        }
        <span>${clima.estado || ""}</span>
      </div>

      <div class="flex items-center justify-center gap-1 text-[11px] text-gray-600 mt-1">
        <i class="fas fa-map-pin text-sky-600"></i>
        <span>${municipio || ""}</span>
      </div>

      <div class="flex items-start justify-center gap-1 text-[11px] text-gray-600 mt-1">
        <i class="fas fa-car text-red-500 mt-[2px]"></i>
        <span>${tiempoTexto || "N/A"}</span>
      </div>
    </div>
  `;

  return card;
}