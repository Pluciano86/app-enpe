// lugaresCarousel.js
import { supabase } from "../shared/supabaseClient.js";
import { cardLugarSlide } from "./cardLugarSlide.js";

export async function renderLugaresCarousel(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
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
      .eq("activo", true) // 👈 solo los activos
      .limit(15);

    if (error) throw error;

    if (!lugares?.length) {
      container.innerHTML = `<p class="text-gray-400 text-center">No hay lugares disponibles</p>`;
      return;
    }

    // 🔹 Estructura del carrusel Swiper
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
        reverseDirection: true, // 👈 desliza de izquierda a derecha
      },
      speed: 900,
      slidesPerView: 1.2, // 👈 se ven 2.2 tarjetas (ajustable)
      spaceBetween: 8,
      breakpoints: {
        640: { slidesPerView: 2.2, spaceBetween: 20 },
        1024: { slidesPerView: 3.2, spaceBetween: 24 },
      },
    });

    // 🔹 Botón “Ver más Lugares”
    const btnContainer = document.createElement("div");
    btnContainer.className = "flex justify-center mt-6 w-full";

    const btnVerMas = document.createElement("a");
    btnVerMas.href = "listadoLugares.html";
    btnVerMas.textContent = "Ver más lugares";
    btnVerMas.className =
      "bg-[#0B132B] hover:bg-[#1C2541] text-white font-light py-2 px-8 rounded-lg shadow transition";

    btnContainer.appendChild(btnVerMas);
    container.appendChild(btnContainer);
  } catch (err) {
    console.error("❌ Error al cargar lugares:", err);
    container.innerHTML = `<p class="text-red-500 text-center">Error al cargar los lugares.</p>`;
  }
}