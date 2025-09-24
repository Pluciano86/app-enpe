import { calcularTiemposParaLista } from './calcularTiemposParaLista.js';
import { cardComercio } from './CardComercio.js';
import { supabase } from '/shared/supabaseClient.js';

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
  const listaConTiempos = await calcularTiemposParaLista(comerciosConCoords, origenCoords);

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