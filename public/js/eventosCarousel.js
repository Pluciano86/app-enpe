// public/js/eventosCarousel.js
import { supabase } from "../shared/supabaseClient.js";

async function fetchEventos() {
  const { data, error } = await supabase
    .from("eventos")
    .select("id, imagen") // solo necesitamos id e imagen
    .eq("activo", true)
    .limit(15);

  if (error) {
    console.error("[eventosCarousel] Error al obtener eventos:", error);
    return [];
  }

  return data || [];
}

export async function renderEventosCarousel(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const eventos = await fetchEventos();

  if (!eventos.length) {
    container.innerHTML =
      `<p class="text-gray-500 text-center">No hay eventos disponibles</p>`;
    return;
  }

  // Estructura del carrusel Swiper
  container.innerHTML = `
    <div class="swiper">
      <div class="swiper-wrapper">
        ${eventos
          .map(
            (evento) => `
          <div class="swiper-slide">
            <div class="w-full aspect-[4/5] overflow-hidden rounded-lg bg-gray-100">
              <img src="${evento.imagen}" 
                   alt="Evento ${evento.id}" 
                   class="w-full h-full object-cover" />
            </div>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;

  // Inicializar Swiper
  new Swiper(container.querySelector(".swiper"), {
    loop: true,
    autoplay: {
      delay: 2000, // cada 2s
      disableOnInteraction: false,
    },
    speed: 1000, // velocidad del slide
    slidesPerView: 3,
    spaceBetween: 16,
    breakpoints: {
      640: { slidesPerView: 4, spaceBetween: 20 },
      1024: { slidesPerView: 5, spaceBetween: 24 },
    },
  });
}