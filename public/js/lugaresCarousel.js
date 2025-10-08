// lugaresCarousel.js
import { supabase } from "../shared/supabaseClient.js";
import { cardLugarSlide } from "./cardLugarSlide.js";

export async function renderLugaresCarousel(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 🔹 Obtener lugares activos con imágenes
  const { data: lugares, error } = await supabase
    .from("LugaresTuristicos")
    .select(`
      id,
      nombre,
      municipio,
      imagen,
      latitud,
      longitud
      `)
  .eq("activo", true) // 👈 filtra solo los activos
  .limit(15);

  if (error) {
    console.error("❌ Error al cargar lugares:", error);
    container.innerHTML = `<p class="text-gray-500">No se pudieron cargar los lugares.</p>`;
    return;
  }
  

  if (!lugares?.length) {
    container.innerHTML = `<p class="text-gray-400 text-center">No hay lugares disponibles</p>`;
    return;
  }

  // 🔹 Estructura Swiper
  container.innerHTML = `
    <div class="swiper">
      <div class="swiper-wrapper">
        ${lugares
          .map(
            (lugar) => `
          <div class="swiper-slide">${cardLugarSlide(lugar).outerHTML}</div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  // 🔹 Inicializar Swiper
  new Swiper(container.querySelector(".swiper"), {
    loop: true,
    autoplay: {
      delay: 2500,
      disableOnInteraction: false,
      reverseDirection: true, // ← desliza de izquierda a derecha
    },
    speed: 900,
    slidesPerView: 1.4, // 👈 se ven 2.2 tarjetas por slide
    spaceBetween: 3,
    breakpoints: {
      640: { slidesPerView: 2, spaceBetween: 20 },
      1024: { slidesPerView: 3, spaceBetween: 24 },
    },
  });
}