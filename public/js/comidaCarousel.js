// public/js/comidaCarousel.js
import { supabase } from "../shared/supabaseClient.js";

/**
 * 🔹 Carrusel aleatorio de lugares para comer
 * (Restaurantes, Bares, FoodTrucks, etc.)
 */
export async function renderComidaCarousel(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 🔸 Categorías que cuentan como "Lugares para Comer"
  const categoriasComida = [1, 2, 3, 4, 5]; // IDs reales en Supabase

  try {
    // ⚠️ Validación: si no hay categorías definidas
    if (!categoriasComida || categoriasComida.length === 0) {
      console.warn("⚠️ No hay categorías de comida definidas.");
      container.innerHTML = `<p class="text-gray-500 text-center">No hay categorías disponibles.</p>`;
      return;
    }

// 🔸 Buscar comercios activos con alguna categoría de comida (nueva versión relacional)
const { data: comercios, error: comerciosError } = await supabase
  .from("Comercios")
  .select(`
    id,
    nombre,
    municipio,
    activo,
    ComercioCategorias (
      idCategoria
    )
  `)
  .eq("activo", true)
  .limit(50);

if (comerciosError) throw comerciosError;

// 🔹 Filtrar comercios por las categorías de comida
const comerciosFiltrados = comercios.filter((c) =>
  c.ComercioCategorias?.some((cc) =>
    categoriasComida.includes(cc.idCategoria)
  )
);

if (comerciosFiltrados.length === 0) {
  container.innerHTML = `<p class="text-gray-500 text-center">No hay lugares disponibles</p>`;
  return;
}

    // 🔸 Obtener imágenes (no logos)
    const idsComercios = comercios.map((c) => c.id).filter(Boolean);
    if (idsComercios.length === 0) {
      console.warn("⚠️ Comercios sin IDs válidos.");
      container.innerHTML = `<p class="text-gray-500 text-center">No hay imágenes disponibles.</p>`;
      return;
    }

    const { data: imagenes, error: imgError } = await supabase
      .from("imagenesComercios")
      .select("imagen, idComercio, logo")
      .in("idComercio", idsComercios)
      .neq("logo", true);

    if (imgError) throw imgError;
    if (!imagenes || imagenes.length === 0) {
      container.innerHTML = `<p class="text-gray-500 text-center">No hay imágenes disponibles.</p>`;
      return;
    }

    // 🔸 Mezclar imágenes aleatoriamente
    const imagenesRandom = imagenes.sort(() => Math.random() - 0.5).slice(0, 20);

    // 🔸 Base URL del bucket
    const baseURL =
      "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/";

    // 🔸 Crear estructura del carrusel
    container.innerHTML = `
      <div class="swiper comida-swiper">
        <div class="swiper-wrapper">
          ${await Promise.all(
            imagenesRandom.map(async (img) => {
              const comercio = comercios.find((c) => c.id === img.idComercio);
              if (!comercio) return "";

              // 🔹 Buscar logo del comercio
              const { data: logoData } = await supabase
                .from("imagenesComercios")
                .select("imagen")
                .eq("idComercio", comercio.id)
                .eq("logo", true)
                .maybeSingle();

              const logoURL = logoData
                ? `${baseURL}${logoData.imagen}`
                : "https://placehold.co/40x40?text=Logo";

              return `
                <div class="swiper-slide cursor-pointer">
                  <a href="perfilComercio.html?id=${comercio.id}" class="block relative w-full aspect-[3/2] overflow-hidden rounded-lg bg-gray-100 shadow">
                    <img src="${baseURL + img.imagen}"
                         alt="${comercio.nombre}"
                         class="w-full h-full object-cover" />

                    <!-- Overlay info -->
                    <div class="absolute bottom-0 left-0 w-full p-2 flex items-end justify-start bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                      <img src="${logoURL}" alt="logo"
                           class="w-9 h-9 rounded-full border border-white mr-2 object-cover bg-white" />
                      <div class="leading-tight justify-items-start text-white text-[11px]">
                        <p class="text-sm text-white">${comercio.municipio}</p>
                      </div>
                    </div>
                  </a>
                </div>
              `;
            })
          ).then((slides) => slides.join(""))}
        </div>
      </div>
    `;

    // 🔸 Inicializar Swiper con autoplay invertido (➡️ izquierda a derecha)
    new Swiper(container.querySelector(".comida-swiper"), {
      loop: true,
      autoplay: {
        delay: 2500,
        disableOnInteraction: false,
        reverseDirection: true,
      },
      speed: 900,
      slidesPerView: 1.5,
      spaceBetween: 16,
      direction: "horizontal",
      breakpoints: {
        640: { slidesPerView: 4, spaceBetween: 20 },
        1024: { slidesPerView: 5, spaceBetween: 24 },
      },
    });
  } catch (err) {
    console.error("❌ Error cargando carrusel de comida:", err);
    container.innerHTML = `<p class="text-red-500 text-center">Error al cargar los lugares.</p>`;
  }
}