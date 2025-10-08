// public/js/eventosCarousel.js
import { supabase } from "../shared/supabaseClient.js";
import { abrirModal } from "./modalEventos.js";

/**
 * 🔹 Cargar eventos filtrados por área o municipio
 * @param {string} containerId - ID del contenedor donde renderizar el carrusel
 * @param {object} filtros - { idArea, idMunicipio }
 */
export async function renderEventosCarousel(containerId, filtros = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { idArea, idMunicipio } = filtros;
  let municipiosIds = [];

  try {
    // 🔸 Si se pasó un idArea, obtener todos los municipios de esa área
    if (idArea && !idMunicipio) {
      const { data: municipios, error: muniError } = await supabase
        .from("Municipios")
        .select("id")
        .eq("idArea", idArea);

      if (muniError) throw muniError;
      municipiosIds = municipios?.map(m => m.id) || [];
    }

    // 🔸 Construir query base
    let query = supabase
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
        enlaceboletos,
        municipio_id,
        eventoFechas (
          fecha,
          horainicio
        )
      `)
      .eq("activo", true)
      .order("creado", { ascending: false })
      .limit(20);

    // 🔸 Aplicar filtros de ubicación
    if (idMunicipio) {
      query = query.eq("municipio_id", idMunicipio);
    } else if (idArea && municipiosIds.length > 0) {
      query = query.in("municipio_id", municipiosIds);
    }

    const { data: eventos, error } = await query;

    if (error) throw error;

    if (!eventos?.length) {
      container.innerHTML = `
        <p class="text-gray-500 text-center">No hay eventos disponibles</p>
      `;
      return;
    }

    // 🔸 Estructura del carrusel Swiper
    container.innerHTML = `
      <div class="swiper">
        <div class="swiper-wrapper">
          ${eventos
            .map(
              (evento) => `
            <div class="swiper-slide cursor-pointer" data-id="${evento.id}">
              <div class="w-full aspect-[4/5] overflow-hidden rounded-lg bg-gray-100 shadow">
                <img src="${evento.imagen || "https://placehold.co/400x500?text=Sin+Imagen"}"
                     alt="${evento.nombre || "Evento"}"
                     class="w-full h-full object-cover" />
              </div>
            </div>`
            )
            .join("")}
        </div>
      </div>
    `;

    // 🔸 Detectar si estamos en listadoArea.html
    const esListadoArea = window.location.pathname.includes("listadoArea.html");

    // 🔸 Inicializar Swiper con configuración adaptada
    const swiper = new Swiper(container.querySelector(".swiper"), {
      loop: true,
      autoplay: {
        delay: 2500,
        disableOnInteraction: false,
      },
      speed: 800,
      slidesPerView: esListadoArea ? 2 : 3,
      spaceBetween: esListadoArea ? 20 : 16,
      breakpoints: esListadoArea
        ? {
            640: { slidesPerView: 2, spaceBetween: 24 },
            1024: { slidesPerView: 2.3, spaceBetween: 28 },
          }
        : {
            640: { slidesPerView: 4, spaceBetween: 20 },
            1024: { slidesPerView: 5, spaceBetween: 24 },
          },
    });

    // 🔸 Click → abrir modal con datos completos
    container.querySelectorAll(".swiper-slide").forEach((slide) => {
      slide.addEventListener("click", () => {
        const id = slide.getAttribute("data-id");
        const evento = eventos.find((e) => e.id == id);
        if (evento) abrirModal(evento);
      });
    });
  } catch (err) {
    console.error("❌ Error cargando eventos:", err);
    container.innerHTML = `
      <p class="text-red-500 text-center">Error al cargar los eventos.</p>
    `;
  }
}