// public/js/cardComercioSlide.js
import { supabase } from "../shared/supabaseClient.js";

/**
 * 🔹 Tarjeta compacta para mostrar comercios en sliders tipo “Cercanos para Comer”
 * Muestra portada (desde Comercios.portada), logo, nombre, categoría, municipio y tiempo en vehículo.
 */
export function cardComercioSlide(comercio) {
  const {
    id,
    nombre,
    municipio,
    portada,
    logo,
    categorias,
    tiempoTexto,
  } = comercio;

  const categoriaTexto =
    categorias?.length > 0 ? categorias.join(", ") : "Sin categoría";

  // 🔹 Crear tarjeta
  const card = document.createElement("a");
  card.href = `perfilComercio.html?id=${id}`;
  card.className =
    "block bg-white rounded-xl mb-1 overflow-hidden shadow w-[160px] sm:w-[180px]";

  // 🔹 Estructura visual idéntica al estilo de Playas
  card.innerHTML = `
    <!-- Imagen portada -->
    <div class="w-full h-24 relative bg-gray-200">
      <img src="${
        portada || "https://placehold.co/200x120?text=Portada"
      }" alt="Portada"
           class="w-full h-full object-cover" />

      <!-- Logo circular centrado -->
      <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-white rounded-full shadow-[0px_-17px_11px_-5px_rgba(0,_0,_0,_0.5)] overflow-hidden">
        <img src="${
          logo || "https://placehold.co/40x40?text=Logo"
        }" alt="Logo" class="w-full h-full object-cover" />
      </div>
    </div>

    <!-- Info -->
    <div class="pt-8 px-2 pb-2 text-center">
      <!-- Nombre -->
      <h3 class="text-[12px] font-semibold leading-tight h-10 overflow-hidden line-clamp-2">
        ${nombre}
      </h3>

      <p class="text-[11px] text-gray-500 truncate">${categoriaTexto}</p>
      <p class="text-[11px] text-gray-600 mt-1 truncate">
        <i class="fas fa-map-pin text-sky-600 mr-1"></i>${municipio || "—"}
      </p>
      <p class="text-[11px] text-gray-600 mt-1">
        <i class="fas fa-car text-red-500 mr-1"></i>${tiempoTexto || "N/A"}
      </p>
    </div>
  `;

  return card;
}

/**
 * 🔸 Cargar las categorías reales del comercio desde la relación ComercioCategorias → Categorias
 */
export async function cargarCategoriasComercio(idComercio) {
  try {
    const { data, error } = await supabase
      .from("ComercioCategorias")
      .select("Categorias (nombre)")
      .eq("idComercio", idComercio);

    if (error) throw error;

    return data?.map((c) => c.Categorias?.nombre).filter(Boolean) || [];
  } catch (err) {
    console.error("❌ Error cargando categorías del comercio:", err);
    return [];
  }
}