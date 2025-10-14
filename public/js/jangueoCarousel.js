// public/js/jangueoCarousel.js
import { supabase } from "../shared/supabaseClient.js";

/**
 * 🔹 Carrusel de lugares para janguear
 * Solo muestra comercios con categoría Jangueo.
 */
export async function renderJangueoCarousel(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // ✅ ID de la categoría “Jangueo”
  const idJangueo = 11;

  try {
    // 🔸 Buscar comercios activos que pertenezcan a Jangueo
    const { data: comercios, error: comerciosError } = await supabase
      .from("Comercios")
      .select(`
        id,
        nombre,
        municipio,
        activo,
        ComercioCategorias ( idCategoria )
      `)
      .eq("activo", true)
      .limit(50);

    if (comerciosError) throw comerciosError;

    // 🔹 Filtrar solo los de la categoría Jangueo
    const comerciosFiltrados = comercios.filter((c) =>
      c.ComercioCategorias?.some((cc) => cc.idCategoria === idJangueo)
    );

    if (comerciosFiltrados.length === 0) {
      container.innerHTML = `<p class="text-gray-500 text-center">No hay lugares de jangueo disponibles</p>`;
      return;
    }

    // 🔸 Obtener imágenes (no logos)
    const idsComercios = comerciosFiltrados.map((c) => c.id).filter(Boolean);

    const { data: imagenes, error: imgError } = await supabase
      .from("imagenesComercios")
      .select("imagen, idComercio, logo, portada")
      .in("idComercio", idsComercios)
      .neq("logo", true);

    if (imgError) throw imgError;
    if (!imagenes?.length) {
      container.innerHTML = `<p class="text-gray-500 text-center">No hay imágenes disponibles.</p>`;
      return;
    }

    // 🔸 Tomar una imagen por comercio (priorizar portada)
    const imagenesPorComercio = idsComercios.map((id) => {
      const imgs = imagenes.filter((img) => img.idComercio === id);
      return imgs.find((img) => img.portada) || imgs[0];
    }).filter(Boolean);

    // 🔸 Base URL del bucket
    const baseURL =
      "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/";

    // 🔸 Crear estructura del carrusel
    container.innerHTML = `
      <div class="swiper jangueo-swiper">
        <div class="swiper-wrapper">
          ${await Promise.all(
            imagenesPorComercio.map(async (img) => {
              const comercio = comerciosFiltrados.find((c) => c.id === img.idComercio);
              if (!comercio) return "";

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
                        <p class="text-sm text-white font-semibold">${comercio.nombre}</p>
                        <p class="text-xs text-gray-200">${comercio.municipio}</p>
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

    // 🔸 Inicializar Swiper
    new Swiper(container.querySelector(".jangueo-swiper"), {
      loop: true,
      autoplay: { delay: 3000, disableOnInteraction: false },
      speed: 900,
      slidesPerView: 1.5,
      spaceBetween: 16,
      direction: "horizontal",
      autoplay: {
  delay: 3000,
  disableOnInteraction: false,
  reverseDirection: true,  // 👈 hace que el carrusel vaya al revés
},
      breakpoints: {
        640: { slidesPerView: 4, spaceBetween: 20 },
        1024: { slidesPerView: 5, spaceBetween: 24 },
      },
    });
  } catch (err) {
    console.error("❌ Error cargando carrusel de Jangueo:", err);
    container.innerHTML = `<p class="text-red-500 text-center">Error al cargar los lugares de Jangueo.</p>`;
  }
}