// public/js/cardComercioSlide.js
import { supabase } from "../shared/supabaseClient.js";
import { t } from "./i18n.js";
import { resolverPlanComercio } from "../shared/planes.js";

const CATEGORIA_KEY_BY_ES = {
  "Restaurantes": "categoria.restaurantes",
  "Coffee Shops": "categoria.coffeeShops",
  "Panaderías": "categoria.panaderias",
  "Panaderias": "categoria.panaderias",
  "Pubs": "categoria.pubs",
  "Food Trucks": "categoria.foodTrucks",
  "Postres": "categoria.postres",
  "Playgrounds": "categoria.playgrounds",
  "Discotecas": "categoria.discotecas",
  "Barras": "categoria.barras",
};

function traducirCategoria(nombre) {
  const key = CATEGORIA_KEY_BY_ES[nombre];
  return key ? t(key) : nombre;
}

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
    categorias?.length > 0
      ? categorias.map(traducirCategoria).join(", ")
      : t("categoria.sin");

  // 🔹 Crear tarjeta
  const planInfo = resolverPlanComercio(comercio || {});
  const permitePerfil = planInfo.permite_perfil !== false;

  const card = document.createElement("a");
  card.href = permitePerfil ? `perfilComercio.html?id=${id}` : "#";
  card.dataset.planBloqueado = permitePerfil ? "false" : "true";
  card.className =
    `block bg-white rounded-xl mb-1 overflow-hidden shadow w-[160px] sm:w-[180px] relative ${permitePerfil ? '' : 'cursor-default'}`;

  // 🔹 Estructura visual idéntica al estilo de Playas
  card.innerHTML = `
    <div class="w-full h-24 relative bg-gray-200">
      <img src="${
        portada || "https://placehold.co/200x120?text=Portada"
      }" alt="Portada"
           class="w-full h-full object-cover" />

      <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-white rounded-full shadow-[0px_-17px_11px_-5px_rgba(0,_0,_0,_0.5)] overflow-hidden">
        <img src="${
          logo || "https://placehold.co/40x40?text=Logo"
        }" alt="Logo" class="w-full h-full object-cover" />
      </div>
    </div>

    <div class="pt-8 px-2 pb-2 text-center">
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

  if (!permitePerfil) {
    card.setAttribute('aria-disabled', 'true');
    card.setAttribute('tabindex', '-1');

    const showBubble = (message) => {
      let bubble = card.querySelector('.basic-plan-bubble');
      if (!bubble) {
        bubble = document.createElement('div');
        bubble.className =
          'basic-plan-bubble absolute left-1/2 -translate-x-1/2 top-3 bg-black/80 text-white text-[10px] px-3 py-1.5 rounded-full shadow-lg opacity-0 pointer-events-none transition-opacity duration-200 z-20';
        bubble.textContent = message;
        card.appendChild(bubble);
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

    card.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showBubble('Perfil básico. Llama al comercio para más info.');
    });
  }

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
