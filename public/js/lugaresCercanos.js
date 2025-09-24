import { calcularTiemposParaLista } from './calcularTiemposParaLista.js';
import { cardLugarSlide } from './cardLugarSlide.js';
import { supabase } from '/shared/supabaseClient.js';

export async function mostrarLugaresCercanos(comercioOrigen) {
  const origenCoords = {
    lat: comercioOrigen.latitud,
    lon: comercioOrigen.longitud
  };

  if (!origenCoords.lat || !origenCoords.lon) {
    console.warn('⚠️ Comercio origen sin coordenadas válidas.');
    return;
  }

  const { data: lugares, error } = await supabase
    .from('LugaresTuristicos')
    .select('*')
    .eq('activo', true);

  if (error || !lugares) {
    console.error('❌ Error trayendo lugares:', error);
    return;
  }

  const lugaresConCoords = lugares.filter(l =>
    typeof l.latitud === 'number' &&
    typeof l.longitud === 'number' &&
    !isNaN(l.latitud) &&
    !isNaN(l.longitud)
  );

  const { data: imagenes, error: errorImg } = await supabase
    .from('imagenesLugares')
    .select('imagen, idLugar')
    .eq('portada', true);

  if (errorImg) {
    console.error('❌ Error trayendo portadas:', errorImg);
  }

  const lugaresConImagen = lugaresConCoords.map(l => {
    const portada = imagenes?.find(img => img.idLugar === l.id);
    return {
      ...l,
      imagen: portada?.imagen || null
    };
  });

  const lugaresConTiempos = await calcularTiemposParaLista(lugaresConImagen, origenCoords);

  const cercanos = lugaresConTiempos
    .filter(l => l.minutosCrudos !== null && l.minutosCrudos <= 15)
    .sort((a, b) => a.minutosCrudos - b.minutosCrudos); // ✅ ordenar por cercanía

  const container = document.getElementById('cercanosLugaresContainer');
  const slider = document.getElementById('sliderCercanosLugares');
  const nombreSpan = document.getElementById('nombreCercanosLugares'); // ✅ nombre del comercio

  if (!container || !slider) {
    console.warn('⚠️ No se encontraron los contenedores para mostrar los lugares cercanos.');
    return;
  }

  if (nombreSpan) nombreSpan.textContent = comercioOrigen.nombre;

  if (cercanos.length > 0) {
    slider.innerHTML = '';
    cercanos.forEach(l => slider.appendChild(cardLugarSlide(l)));
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}