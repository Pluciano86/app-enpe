import { supabase } from '../shared/supabaseClient.js';
import { cardPlayaSlide } from './cardPlayaSlide.js';
import { obtenerClima } from './obtenerClima.js';
import { getDrivingDistance, formatTiempo } from '../shared/osrmClient.js';
import { calcularTiempoEnVehiculo } from '../shared/utils.js';
import { calcularDistancia } from './distanciaLugar.js';

export async function mostrarPlayasCercanas(comercio) {
  const contenedor = document.getElementById('sliderPlayasCercanas');
  const seccion = document.getElementById('cercanosPlayasContainer');
  const nombreSpan = document.getElementById('nombreCercanosPlayas');

  if (!contenedor || !seccion) return;

  // 🔹 Verificar si el municipio tiene costa
  const { data: municipioData } = await supabase
    .from('Municipios')
    .select('costa')
    .eq('nombre', comercio.municipio)
    .single();

  if (!municipioData?.costa) return;

  // 🔹 Buscar playas con coordenadas válidas
  const { data: playas, error } = await supabase
    .from('playas')
    .select('*')
    .not('latitud', 'is', null)
    .not('longitud', 'is', null);

  if (error || !playas?.length) return;

  // 🔹 Calcular tiempo y distancia
  const conTiempo = await Promise.all(
    playas.map(async (playa) => {
      const resultado = await getDrivingDistance(
        { lat: comercio.latitud, lng: comercio.longitud },
        { lat: playa.latitud, lng: playa.longitud }
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

      // Fallback si no hay datos del API
      if (texto == null) {
        const distanciaFallback = distanciaKm ?? calcularDistancia(
          comercio.latitud,
          comercio.longitud,
          playa.latitud,
          playa.longitud
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

      return {
        ...playa,
        minutosCrudos: minutos,
        tiempoTexto: texto,
        distanciaKm,
        distanciaTexto: Number.isFinite(distanciaKm)
          ? `${distanciaKm.toFixed(1)} km`
          : null,
      };
    })
  );

  // 🔹 Filtrar playas cercanas (<=45 min)
  const filtradas = conTiempo
    .filter((p) => p.minutosCrudos !== null && p.minutosCrudos <= 45)
    .sort((a, b) => a.minutosCrudos - b.minutosCrudos);

  if (filtradas.length === 0) return;

  if (nombreSpan) nombreSpan.textContent = comercio.nombre;
  seccion.classList.remove('hidden');

  // 🔹 Estructura Swiper
  contenedor.innerHTML = `
    <div class="swiper playasSwiper overflow-visible">
      <div class="swiper-wrapper"></div>
    </div>
  `;

  const wrapper = contenedor.querySelector('.swiper-wrapper');

  for (const playa of filtradas) {
    const imagenURL =
      playa.imagen && playa.imagen.trim() !== ''
        ? playa.imagen.trim()
        : "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/imgPlayaNoDisponible.jpg";

    const clima = await obtenerClima(playa.latitud, playa.longitud);

    const card = cardPlayaSlide({
      id: playa.id,
      nombre: playa.nombre,
      imagen: imagenURL,
      municipio: playa.municipio,
      clima: {
        estado: clima?.estado || 'Clima desconocido',
        iconoURL: clima?.iconoURL || ''
      },
      tiempoTexto: playa.tiempoTexto || 'N/D'
    });

    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    slide.appendChild(card);
    wrapper.appendChild(slide);
  }

 // 🔹 Inicializar Swiper igual que Comercios (ajustado para mostrar varias tarjetas)
const swiperEl = contenedor.querySelector('.playasSwiper');
const numSlides = swiperEl.querySelectorAll('.swiper-slide').length;

new Swiper(swiperEl, {
  slidesPerView: 2.7,
        spaceBetween: 12,
        loop: true,
        autoplay: { delay: 3000, disableOnInteraction: false },
        reverseDirection: true,
        breakpoints: {
          640: { slidesPerView: 3, spaceBetween: 18 },
          1024: { slidesPerView: 4, spaceBetween: 20 },
  },
});

// 🔹 Asegurar que el carrusel no corte sombras ni slides
const style = document.createElement('style');
style.textContent = `
  .playasSwiper { overflow: visible !important; }
  .swiper-slide { width: auto !important; overflow: visible !important; }
`;
document.head.appendChild(style);
}