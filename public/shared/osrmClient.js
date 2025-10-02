const LOCAL_OSRM = 'http://127.0.0.1:5000';
const REMOTE_OSRM = 'http://45.55.140.61:5000';

const OSRM_BASE = window.location.hostname === 'localhost'
  ? LOCAL_OSRM
  : REMOTE_OSRM;

/**
 * Calcula la distancia y duración en vehículo usando OSRM
 * @param {number} fromLat latitud origen
 * @param {number} fromLon longitud origen
 * @param {number} toLat latitud destino
 * @param {number} toLon longitud destino
 * @returns {Promise<{ distance: number|null, duration: number|null }>}
 */
export async function getDrivingDistance(fromLat, fromLon, toLat, toLon) {
  try {
    const url = `${OSRM_BASE}/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM error: ${res.status}`);

    const data = await res.json();
    if (data.code !== 'Ok') throw new Error(`OSRM response: ${data.message}`);

    const route = data.routes?.[0];
    if (!route) throw new Error('OSRM response: route not found');

    return {
      distance: route.distance, // metros
      duration: route.duration  // segundos
    };
  } catch (err) {
    console.error('Error en OSRM:', err);
    return { distance: null, duration: null };
  }
}

/**
 * Convierte segundos en texto legible: "a 5 minutos" o "a 1 hora 15 minutos"
 * @param {number} seconds
 * @returns {string}
 */
export function formatTiempo(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Distancia no disponible';
  const min = Math.round(seconds / 60);
  if (min < 60) return `a ${min} minutos`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const horasTxt = `a ${h} hora${h > 1 ? 's' : ''}`;
  return m ? `${horasTxt} ${m} minutos` : horasTxt;
}
