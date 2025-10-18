// lugaresCarousel.js
import { supabase } from "../shared/supabaseClient.js";
import { cardLugarSlide } from "./cardLugarSlide.js";

export async function renderLugaresCarousel(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    container.innerHTML = `<p class="text-gray-400 text-center">Cargando lugares...</p>`;

    const filtros = window.filtrosArea || {};
    const { idArea, idMunicipio } = filtros;
    console.log("📍 Filtros activos (Lugares):", filtros);

    // 🔹 Obtener nombre del área y municipio para mostrar en mensaje
    let nombreMunicipio = "";
    let nombreArea = "";

    if (idMunicipio) {
      const { data: muni } = await supabase
        .from("Municipios")
        .select("nombre")
        .eq("id", idMunicipio)
        .maybeSingle();
      nombreMunicipio = muni?.nombre || "";
    }

    if (idArea) {
      const { data: area } = await supabase
        .from("Area")
        .select("nombre")
        .eq("idArea", idArea)
        .maybeSingle();
      nombreArea = area?.nombre || "";
    }

    // 🔹 Construir consulta principal
    let query = supabase
      .from("LugaresTuristicos")
      .select(`
        id,
        nombre,
        municipio,
        imagen,
        latitud,
        longitud,
        idArea,
        idMunicipio,
        activo
      `)
      .eq("activo", true)
      .order("nombre", { ascending: true })
      .limit(20);

    // 🔸 Aplicar filtro principal
    if (idMunicipio && !isNaN(idMunicipio)) {
      query = query.eq("idMunicipio", idMunicipio);
    } else if (idArea && !isNaN(idArea)) {
      query = query.eq("idArea", idArea);
    }

    let { data: lugares, error } = await query;
    if (error) throw error;

    console.log("🗺️ Lugares obtenidos (municipio/área):", lugares);

    let mensajeFallback = "";

    // 🔹 Si no hay resultados en el municipio, buscar los del área como fallback
    if ((!lugares || lugares.length === 0) && idArea) {
      console.warn("⚠️ Sin lugares en el municipio, cargando por área...");
      const { data: lugaresArea, error: areaError } = await supabase
        .from("LugaresTuristicos")
        .select(`
          id,
          nombre,
          municipio,
          imagen,
          latitud,
          longitud,
          idArea,
          idMunicipio,
          activo
        `)
        .eq("activo", true)
        .eq("idArea", idArea)
        .order("nombre", { ascending: true })
        .limit(20);

      if (areaError) throw areaError;
      lugares = lugaresArea || [];

      if (nombreMunicipio && nombreArea) {
        mensajeFallback = `No hay lugares disponibles en <b>${nombreMunicipio}</b>. 
        Te mostramos los más cercanos en el Área <b>${nombreArea}</b>.`;
      }
    }

    // 🔸 Si no hay lugares ni siquiera por área
    if (!lugares || lugares.length === 0) {
      const mensaje =
        nombreMunicipio
          ? `No hay lugares disponibles en <b>${nombreMunicipio}</b>.`
          : nombreArea
          ? `No hay lugares disponibles en el Área <b>${nombreArea}</b>.`
          : "No hay lugares disponibles.";
      container.innerHTML = `<p class="text-center text-gray-500 my-6">${mensaje}</p>`;
      return;
    }

    // 🔹 Mostrar mensaje de fallback si aplica
    container.innerHTML = mensajeFallback
      ? `<p class="text-center text-gray-600 my-4">${mensajeFallback}</p>`
      : "";

    // 🔹 Crear carrusel
    container.innerHTML += `
      <div class="swiper lugaresSwiper">
        <div class="swiper-wrapper">
          ${lugares
            .map(
              (lugar) => `
                <div class="swiper-slide">
                  ${cardLugarSlide(lugar).outerHTML}
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `;

    // 🌀 Inicializar Swiper (centrado y fluido)
const swiperEl = slider.querySelector('.lugaresSwiper');

if (swiperEl.__swiper) swiperEl.__swiper.destroy(true, true);

const swiper = new Swiper(swiperEl, {
  centeredSlides: true,              // 👈 centra la tarjeta actual
  slidesPerView: 'auto',             // 👈 calcula ancho automático
  spaceBetween: 20,
  loop: true,
  speed: 900,
  grabCursor: true,                  // 👈 mejora el control táctil
  autoplay: {
    delay: 3200,
    disableOnInteraction: false,  
  },
  slidesOffsetBefore: 16,            // 👈 pequeño margen lateral
  slidesOffsetAfter: 16,
  breakpoints: {
    640: { spaceBetween: 24 },
    1024: { spaceBetween: 28 },
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
    container.innerHTML = `<p class="text-red-500 text-center mt-6">Error al cargar los lugares.</p>`;
  }
}

/* -------------------------------------------------------
   🔄 ACTUALIZACIÓN AUTOMÁTICA POR EVENTO 
-------------------------------------------------------- */
window.addEventListener("areaCargada", async (e) => {
  const { idArea, idMunicipio } = e.detail || {};
  window.filtrosArea = { idArea, idMunicipio };
  console.log("🎯 Recargando lugares con filtros:", window.filtrosArea);
  await renderLugaresCarousel("lugaresCarousel");
});