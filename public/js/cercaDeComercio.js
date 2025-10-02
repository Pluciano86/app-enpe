import { cardComercio } from './CardComercio.js';
import { supabase } from '../shared/supabaseClient.js';
import { getDrivingDistance, formatTiempo } from '../shared/osrmClient.js';
import { calcularTiempoEnVehiculo } from '../shared/utils.js';
import { calcularDistancia } from './distanciaLugar.js';

export async function mostrarComerciosCercanos(comercioOrigen) {
  const origenCoords = {
    lat: comercioOrigen.latitud,
    lon: comercioOrigen.longitud
  };

  if (!origenCoords.lat || !origenCoords.lon) {
    console.warn('⚠️ Comercio origen sin coordenadas válidas.');
    return;
  }

  // 1. Traer todos los comercios con coordenadas válidas, excepto el actual
  const { data: comercios, error } = await supabase
    .from('Comercios')
    .select('*')
    .neq('id', comercioOrigen.id);

  if (error || !comercios) {
    console.error('❌ Error trayendo comercios:', error);
    return;
  }

  const comerciosConCoords = comercios.filter(c =>
    typeof c.latitud === 'number' &&
    typeof c.longitud === 'number' &&
    !isNaN(c.latitud) &&
    !isNaN(c.longitud)
  );

  // 2. Calcular distancias reales usando API
  const listaConTiempos = await Promise.all(comerciosConCoords.map(async (comercio) => {
    const resultado = await getDrivingDistance(
      origenCoords.lat,
      origenCoords.lon,
      comercio.latitud,
      comercio.longitud
    );

    let minutos = null;
    let texto = null;
    let distanciaKm = typeof resultado?.distance === 'number'
      ? resultado.distance / 1000
      : null;

    if (resultado?.duration != null) {
      minutos = Math.round(resultado.duration / 60);
      texto = formatTiempo(resultado.duration);
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
        texto = 'Distancia no disponible';
      }
    }

    return {
      ...comercio,
      minutosCrudos: minutos,
      tiempoVehiculo: texto,
      tiempoTexto: texto,
      distanciaKm,
      distanciaTexto: Number.isFinite(distanciaKm) ? `${distanciaKm.toFixed(1)} km` : null
    };
  }));

  // 3. Filtrar los que estén dentro de ~15 minutos (aprox. 5 km)
  const cercanos = listaConTiempos.filter(c =>
    c.minutosCrudos !== null && c.minutosCrudos <= 15
  );

  // 4. Mostrar resultados si existen
  const container = document.getElementById('cercanosComidaContainer');
  const slider = document.getElementById('sliderCercanosComida');

  if (!container || !slider) {
    console.warn('⚠️ No se encontraron los contenedores para mostrar los comercios cercanos.');
    return;
  }

  if (cercanos.length > 0) {
    slider.innerHTML = '';
    cercanos.forEach(c => slider.appendChild(cardComercio(c)));
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden'); // Por si no hay ninguno
  }
}
