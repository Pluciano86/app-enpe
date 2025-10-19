// ✅ cercanosPlaya.js
import { supabase } from '../shared/supabaseClient.js';
import { cardComercioSlide } from './cardComercioSlide.js';
import { cardPlayaSlide } from './cardPlayaSlide.js';
import { cardLugarSlide } from './cardLugarSlide.js';

const params = new URLSearchParams(window.location.search);
const idPlaya = params.get('id');

// ==================== PRINCIPAL ====================
async function cargarCercanos() {
  const { data: playa } = await supabase
    .from('playas')
    .select('id, nombre, latitud, longitud, idMunicipio')
    .eq('id', idPlaya)
    .maybeSingle();

  if (!playa) return console.warn('⚠️ No se encontró la playa base');

  // ✅ 1. Comercios cercanos
  const { data: comercios } = await supabase
    .from('Comercios')
    .select('id, nombre, logo, municipio, latitud, longitud, activo')
    .eq('activo', true);

  const comidaCercana = comercios?.filter(
    c => distancia(playa, c) <= 5 && c.latitud && c.longitud
  );
  mostrarSwiper('sliderCercanosComida', comidaCercana, cardComercioSlide);

  // ✅ 2. Otras playas cercanas
  const { data: playas } = await supabase
    .from('playas')
    .select('id, nombre, imagen, municipio, latitud, longitud')
    .neq('id', idPlaya);

  const playasCercanas = playas?.filter(
    p => distancia(playa, p) <= 10 && p.latitud && p.longitud
  );
  mostrarSwiper('sliderPlayasCercanas', playasCercanas, cardPlayaSlide);

  // ✅ 3. Lugares cercanos
  const { data: lugares } = await supabase
    .from('Comercios')
    .select('id, nombre, logo, municipio, latitud, longitud, activo, idCategoria')
    .eq('idCategoria', 15)
    .eq('activo', true);

  const lugaresCercanos = lugares?.filter(
    l => distancia(playa, l) <= 10 && l.latitud && l.longitud
  );
  mostrarSwiper('sliderCercanosLugares', lugaresCercanos, cardLugarSlide);
}

// ==================== FUNCIONES AUXILIARES ====================
function distancia(p1, p2) {
  const R = 6371;
  const dLat = ((p2.latitud - p1.latitud) * Math.PI) / 180;
  const dLon = ((p2.longitud - p1.longitud) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.latitud * Math.PI) / 180) *
      Math.cos((p2.latitud * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mostrarSwiper(idSlider, lista, cardFn) {
  const contenedor = document.querySelector(`#${idSlider} .swiper-wrapper`);
  const section = contenedor.closest('section');
  contenedor.innerHTML = '';

  if (!lista?.length) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  lista.forEach(item => {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    slide.innerHTML = cardFn(item).outerHTML;
    contenedor.appendChild(slide);
  });

  // Inicializa Swiper
  new Swiper(`#${idSlider}`, {
     loop: true,
      autoplay: { delay: 3000, disableOnInteraction: false },
      speed: 900,
      slidesPerView: 2.6,
      spaceBetween: 16,
      direction: "horizontal",
      breakpoints: {
        640: { slidesPerView: 4, spaceBetween: 20 },
        1024: { slidesPerView: 5, spaceBetween: 24 },
      },
  });
}

cargarCercanos();