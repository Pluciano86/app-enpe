export async function handler(event) {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  const body = JSON.parse(event.body);
  const { origen, destinos } = body;

  const params = new URLSearchParams({
    origins: `${origen.lat},${origen.lon}`,
    destinations: destinos.map(d => `${d.lat},${d.lon}`).join('|'),
    mode: 'driving',
    units: 'metric',
    key: AIzaSyBxfWTx5kMwy_2UcOnKhILbnLkbU4VMaBI
  });

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const tiempos = data.rows[0].elements.map(el => el.duration?.value || null);
    return {
      statusCode: 200,
      body: JSON.stringify({ tiempos })
    };
  } catch (err) {
    console.error('Error en función distance:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error consultando Google Maps' })
    };
  }
}





