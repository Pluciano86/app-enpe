// public/js/cercanosComida.js
import { cardComercioSlide, cargarCategoriasComercio } from './cardComercioSlide.js';
import { supabase } from '../shared/supabaseClient.js';
import { getPublicBase, calcularTiempoEnVehiculo } from '../shared/utils.js';
import { getDrivingDistance, formatTiempo } from '../shared/osrmClient.js';
import { calcularDistancia } from './distanciaLugar.js';

export async function mostrarCercanosComida(comercioOrigen) {
  const origenCoords = { lat: comercioOrigen.latitud, lon: comercioOrigen.longitud };

  if (!origenCoords.lat || !origenCoords.lon) {
    console.warn('⚠️ Comercio origen sin coordenadas.');
    return;
  }

  try {
    // 🔹 Categorías válidas para mostrar en “Cercanos para Comer”
    const { data: categorias, error: errorCat } = await supabase
      .from('Categorias')
      .select('id, nombre')
      .in('nombre', ['Restaurantes', 'Coffee Shops', 'Food Trucks', 'Panaderías']);

    if (errorCat) throw errorCat;
    const categoriasValidas = categorias?.map(c => c.id) || [];

    // 🔹 Obtener comercios activos con relación de categorías
    const { data: comercios, error } = await supabase
      .from('Comercios')
      .select(`
        id,
        nombre,
        municipio,
        latitud,
        longitud,
        activo,
        idMunicipio,
        ComercioCategorias ( idCategoria )
      `)
      .eq('activo', true)
      .neq('id', comercioOrigen.id);

    if (error) throw error;

    // 🔹 Filtrar solo los que pertenecen a las categorías válidas
    const comerciosFiltrados = comercios.filter((c) =>
      c.ComercioCategorias?.some((cc) => categoriasValidas.includes(cc.idCategoria))
    );

    const comerciosConCoords = comerciosFiltrados.filter(c =>
      typeof c.latitud === 'number' &&
      typeof c.longitud === 'number' &&
      !isNaN(c.latitud) &&
      !isNaN(c.longitud)
    );

    console.log(`🍽️ ${comerciosConCoords.length} comercios de comida con coordenadas encontrados.`);

    // 🔹 Calcular distancia y tiempo en vehículo
    const listaConTiempos = await Promise.all(
      comerciosConCoords.map(async (comercio) => {
        const resultado = await getDrivingDistance(
          { lat: origenCoords.lat, lng: origenCoords.lon },
          { lat: comercio.latitud, lng: comercio.longitud }
        );

        let minutos = null;
        let texto = null;
        let distanciaKm = typeof resultado?.distancia === 'number'
          ? resultado.distancia / 1000
          : null;

        if (resultado?.duracion != null) {
          minutos = Math.round(resultado.duracion / 60);
          texto = formatTiempo(resultado.duracion);
        }

        if (texto == null) {
          const distanciaFallback = distanciaKm ?? calcularDistancia(
            origenCoords.lat,
            origenCoords.lon,
            comercio.latitud,
            comercio.longitud
          );

          if (Number.isFinite(distanciaFallback) && distanciaFallback > 0) {
            distanciaKm = distanciaFallback;
            const fallbackTiempo = calcularTiempoEnVehiculo(distanciaFallback);
            minutos = fallbackTiempo.minutos;
            texto = formatTiempo(fallbackTiempo.minutos * 60);
          } else {
            texto = 'N/D';
          }
        }

        // 🔹 Obtener categorías para cada comercio
        const categorias = await cargarCategoriasComercio(comercio.id);

        return {
          ...comercio,
          categorias,
          minutosCrudos: minutos,
          tiempoVehiculo: texto,
          tiempoTexto: texto,
          distanciaKm,
          distanciaTexto: Number.isFinite(distanciaKm)
            ? `${distanciaKm.toFixed(1)} km`
            : null,
        };
      })
    );

    // 🔹 Obtener imágenes (portada y logo)
    const idsComercios = listaConTiempos.map(c => c.id);
    const { data: imagenes, error: errorImg } = await supabase
      .from('imagenesComercios')
      .select('imagen, idComercio, portada, logo')
      .or('portada.eq.true,logo.eq.true')
      .in('idComercio', idsComercios);

    if (errorImg) throw errorImg;

    listaConTiempos.forEach((comercio) => {
      const imgPortada = imagenes?.find(
        (img) => img.idComercio === comercio.id && img.portada
      );
      const imgLogo = imagenes?.find(
        (img) => img.idComercio === comercio.id && img.logo
      );

      comercio.portada = imgPortada
        ? getPublicBase(`galeriacomercios/${imgPortada.imagen}`)
        : 'https://placehold.co/200x120?text=Sin+Portada';

      comercio.logo = imgLogo
        ? getPublicBase(`galeriacomercios/${imgLogo.imagen}`)
        : 'https://placehold.co/40x40?text=Logo';
    });

    // 🔹 Filtrar los más cercanos (máximo 10 minutos)
    const cercanos = listaConTiempos
      .filter((c) => c.minutosCrudos !== null && c.minutosCrudos <= 10)
      .sort((a, b) => a.minutosCrudos - b.minutosCrudos);

    console.log(`✅ ${cercanos.length} comercios cercanos encontrados.`);

    // 🔹 Mostrar carrusel si hay resultados
    const container = document.getElementById('cercanosComidaContainer');
    const slider = document.getElementById('sliderCercanosComida');

    if (cercanos.length > 0 && container && slider) {
      // Estructura del carrusel Swiper
      slider.innerHTML = `
        <div class="swiper cercanosSwiper">
          <div class="swiper-wrapper"></div>
        </div>
      `;

      const wrapper = slider.querySelector(".swiper-wrapper");

      for (const c of cercanos) {
        const slide = document.createElement("div");
        slide.className = "swiper-slide";
        slide.appendChild(cardComercioSlide(c));
        wrapper.appendChild(slide);
      }

      container.classList.remove("hidden");

      // ✅ Inicializar Swiper sobre el elemento correcto
      const swiperEl = slider.querySelector(".cercanosSwiper");

      new Swiper(swiperEl, {
        slidesPerView: 2.7,
        spaceBetween: 12,
        loop: true,
        autoplay: { delay: 3000, disableOnInteraction: false },
        breakpoints: {
          640: { slidesPerView: 3, spaceBetween: 18 },
          1024: { slidesPerView: 4, spaceBetween: 20 },
        },
      });
    } else {
      console.info('ℹ️ No hay comercios cercanos para mostrar.');
      if (container) container.classList.add('hidden');
    }
  } catch (err) {
    console.error('❌ Error cargando comercios cercanos:', err);
  }
}

// 🔹 Asegurar que el carrusel no corte sombras ni slides
const style = document.createElement('style');
style.textContent = `
  .cercanosSwiper { overflow: visible !important; }
  .swiper-slide { width: auto !important; overflow: visible !important; }
`;
document.head.appendChild(style);