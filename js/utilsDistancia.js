export async function obtenerTiempoVehiculo(origen, destinos) {
  const GOOGLE_MAPS_API_KEY = 'AIzaSyBxfWTx5kMwy_2UcOnKhILbnLkbU4VMaBI'; // 👈🏽 Tu key pública de prueba

  const params = new URLSearchParams({
    origins: `${origen.lat},${origen.lon}`,
    destinations: destinos.map(d => `${d.lat},${d.lon}`).join('|'),
    mode: 'driving',
    units: 'metric',
    key: GOOGLE_MAPS_API_KEY
  });

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const tiempos = data.rows[0].elements.map(el => el.duration?.value || null);
    return tiempos;
  } catch (err) {
    console.error('❌ Error en obtenerTiempoVehiculo:', err);
    return [];
  }
}