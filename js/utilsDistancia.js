export async function obtenerTiempoVehiculo(origen, destinos = []) {
  const key = ' AIzaSyBxfWTx5kMwy_2UcOnKhILbnLkbU4VMaBI';
  const origins = `${origen.lat},${origen.lon}`;
  const destinations = destinos.map(d => `${d.lat},${d.lon}`).join('|');
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&mode=driving&units=metric&key=${key}`;

  const resp = await fetch(url);
  const data = await resp.json();
  const tiempos = data.rows[0].elements.map(el => el.duration?.value || null); // segundos

  return tiempos; // array de segundos
}