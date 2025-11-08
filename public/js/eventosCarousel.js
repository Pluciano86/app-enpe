import { supabase } from "../shared/supabaseClient.js";
import { abrirModal } from "./modalEventos.js";

/**
 * 🔹 Cargar eventos filtrados por área o municipio
 * Incluye fallback automático por área con mensaje visual.
 */
export async function renderEventosCarousel(containerId, filtros = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { idArea, idMunicipio } = filtros;
  let municipiosIds = [];
  let nombreMunicipio = "";
  let nombreArea = "";

  try {
    container.innerHTML = `<p class="text-gray-500 text-center">Cargando eventos...</p>`;

    // 🧭 Obtener nombres del municipio y área
    if (idMunicipio) {
      const { data: muni } = await supabase
        .from("Municipios")
        .select("nombre, idArea")
        .eq("id", idMunicipio)
        .maybeSingle();
      nombreMunicipio = muni?.nombre || "";
      if (!idArea && muni?.idArea) {
        filtros.idArea = muni.idArea; // fallback al área si no se pasó
      }
    }

    if (idArea) {
      const { data: area } = await supabase
        .from("Area")
        .select("nombre")
        .eq("idArea", idArea)
        .maybeSingle();
      nombreArea = area?.nombre || "";
    }

    // 🔸 Obtener siempre los municipios del área (aunque haya municipio activo)
    if (idArea) {
      const { data: municipios, error: muniError } = await supabase
        .from("Municipios")
        .select("id")
        .eq("idArea", idArea);
      if (muniError) throw muniError;
      municipiosIds = municipios?.map((m) => m.id) || [];
    }

    // 🔸 Query base
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
        eventoFechas (fecha, horainicio)
      `)
      .eq("activo", true)
      .order("creado", { ascending: false })
      .limit(20);

    // 🔸 Filtro principal
    if (idMunicipio) {
      query = query.eq("municipio_id", idMunicipio);
    } else if (idArea && municipiosIds.length > 0) {
      query = query.in("municipio_id", municipiosIds);
    }

    let { data: eventos, error } = await query;
    if (error) throw error;

    console.log("🎟️ Eventos obtenidos (municipio/área):", eventos);

    const hoyISO = new Date().toISOString().slice(0, 10);
    const filtrarExpirados = (lista = []) =>
      (lista || []).map((evento) => ({
        ...evento,
        eventoFechas: (evento.eventoFechas || []).sort((a, b) => a.fecha.localeCompare(b.fecha)),
        ultimaFecha: evento.eventoFechas?.length
          ? evento.eventoFechas[evento.eventoFechas.length - 1].fecha
          : null,
      }))
      .filter((evento) => !evento.ultimaFecha || evento.ultimaFecha >= hoyISO);

    eventos = filtrarExpirados(eventos);

    let mensajeFallback = "";

    // 🔹 Si no hay eventos en municipio → buscar en el área
    if ((!eventos || eventos.length === 0) && idArea) {
      console.warn("⚠️ Sin eventos en el municipio, cargando por área...");

      const { data: eventosArea, error: areaError } = await supabase
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
          eventoFechas (fecha, horainicio)
        `)
        .eq("activo", true)
        .in("municipio_id", municipiosIds)
        .order("creado", { ascending: false })
        .limit(20);

      if (areaError) throw areaError;
      eventos = filtrarExpirados(eventosArea || []);

      // Mostrar mensaje visual
      if (nombreMunicipio && nombreArea) {
        mensajeFallback = `
          <div class="text-center text-gray-600 my-4 leading-snug">
            <span class="inline-block text-[#23b4e9] text-xl mr-1">🎟️</span>
            No hay eventos disponibles en <b>${nombreMunicipio}</b>.<br>
            Te mostramos los más cercanos en el Área <b>${nombreArea}</b>.
          </div>
        `;
      }
    }

    // 🔸 Si no hay eventos en absoluto
    if (!eventos || eventos.length === 0) {
      const mensaje =
        nombreMunicipio
          ? `No hay eventos disponibles en <b>${nombreMunicipio}</b>.`
          : nombreArea
          ? `No hay eventos disponibles en el Área <b>${nombreArea}</b>.`
          : "No hay eventos disponibles.";
      container.innerHTML = `<p class="text-center text-gray-500 my-6">${mensaje}</p>`;
      return;
    }

    // 🔹 Mostrar mensaje de fallback si aplica
    container.innerHTML = mensajeFallback ? mensajeFallback : "";

    // 🔸 Estructura del carrusel
    container.innerHTML += `
      <div class="swiper eventosSwiper">
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

    // 🔹 Inicializar Swiper
    const esListadoArea = window.location.pathname.includes("listadoArea.html");
    new Swiper(container.querySelector(".eventosSwiper"), {
      loop: true,
      autoplay: { delay: 2500, disableOnInteraction: false },
      speed: 900,
      slidesPerView: esListadoArea ? 1.1 : 2,
      spaceBetween: esListadoArea ? 18 : 14,
      breakpoints: esListadoArea
        ? {
            640: { slidesPerView: 2, spaceBetween: 22 },
            1024: { slidesPerView: 2.2, spaceBetween: 24 },
          }
        : {
            640: { slidesPerView: 3, spaceBetween: 16 },
            1024: { slidesPerView: 3.3, spaceBetween: 20 },
          },
    });

    // 🔹 Click → abrir modal
    container.querySelectorAll(".swiper-slide").forEach((slide) => {
      slide.addEventListener("click", () => {
        const id = slide.getAttribute("data-id");
        const evento = eventos.find((e) => e.id == id);
        if (evento) abrirModal(evento);
      });
    });

    // 🔹 Botón “Ver más eventos”
    const btnContainer = document.createElement("div");
    btnContainer.className = "flex justify-center mt-6 w-full";

    const btnVerMas = document.createElement("a");
    btnVerMas.href = "listadoEventos.html";
    btnVerMas.textContent = "Ver más eventos";
    btnVerMas.className =
      "bg-[#0B132B] hover:bg-[#1C2541] text-white font-light py-2 px-8 rounded-lg shadow transition";

    btnContainer.appendChild(btnVerMas);
    container.appendChild(btnContainer);

  } catch (err) {
    console.error("❌ Error cargando eventos:", err);
    container.innerHTML = `<p class="text-red-500 text-center mt-6">Error al cargar los eventos.</p>`;
  }
}
