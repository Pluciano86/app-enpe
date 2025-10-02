import { cardLugarSlide } from './cardLugarSlide.js';
import { supabase } from '../shared/supabaseClient.js';
import { getDrivingDistance, formatTiempo } from '../shared/osrmClient.js';
import { calcularTiempoEnVehiculo } from '../shared/utils.js';
import { calcularDistancia } from './distanciaLugar.js';

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

  const lugaresConTiempos = await Promise.all(lugaresConImagen.map(async (lugar) => {
    const resultado = await getDrivingDistance(
      { lat: origenCoords.lat, lng: origenCoords.lon },
      { lat: lugar.latitud, lng: lugar.longitud }
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
        lugar.latitud,
        lugar.longitud
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
      ...lugar,
      minutosCrudos: minutos,
      tiempoVehiculo: texto,
      tiempoTexto: texto,
      distanciaKm,
      distanciaTexto: Number.isFinite(distanciaKm) ? `${distanciaKm.toFixed(1)} km` : null
    };
  }));

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
