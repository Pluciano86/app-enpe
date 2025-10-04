// public/js/eventosCarousel.js
import { supabase } from "../shared/supabaseClient.js";
import { abrirModal } from "./modalEventos.js";

// 🔹 Obtener eventos completos para el modal
async function fetchEventos() {
  const { data, error } = await supabase
    .from("eventos")
    .select(`
      id,
      nombre,
      descripcion,
      costo,
      gratis,
      lugar,
      direccion,
      imagen,
      enlaceboletos
    `)
    .eq("activo", true)
    .order("creado", { ascending: false })
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
          <div class="swiper-slide cursor-pointer" data-id="${evento.id}">
            <div class="w-full aspect-[4/5] overflow-hidden rounded-lg bg-gray-100">
              <img src="${evento.imagen}" 
                   alt="${evento.nombre || "Evento"}" 
                   class="w-full h-full object-cover" />
            </div>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;

  // Inicializar Swiper
  const swiper = new Swiper(container.querySelector(".swiper"), {
    loop: true,
    autoplay: {
      delay: 2500,
      disableOnInteraction: false,
    },
    speed: 800,
    slidesPerView: 3,
    spaceBetween: 16,
    breakpoints: {
      640: { slidesPerView: 4, spaceBetween: 20 },
      1024: { slidesPerView: 5, spaceBetween: 24 },
    },
  });

  // 🔹 Click en evento → abrirModal con datos completos
  container.querySelectorAll(".swiper-slide").forEach((slide) => {
    slide.addEventListener("click", () => {
      const id = slide.getAttribute("data-id");
      const evento = eventos.find((e) => e.id == id);
      if (evento) abrirModal(evento);
    });
  });
}