// ✅ distanciaLugar.js

export async function calcularTiemposParaLugares(lista, origenCoords) {
  const lugaresValidos = lista.filter(l =>
    typeof l.latitud === 'number' &&
    typeof l.longitud === 'number' &&
    !isNaN(l.latitud) &&
    !isNaN(l.longitud)
  );

  if (lugaresValidos.length === 0) return lista;

  const chunkSize = 20;
  const chunks = [];

  for (let i = 0; i < lugaresValidos.length; i += chunkSize) {
    chunks.push(lugaresValidos.slice(i, i + chunkSize));
  }

  const allDurations = [];

  for (const chunk of chunks) {
    const destinos = chunk.map(l => `${l.latitud},${l.longitud}`);
    const body = {
      origen: `${origenCoords.lat},${origenCoords.lon}`,
      destinos: destinos.join('|'),
      departure_time: 'now' // ✅ tiempo real con tráfico
    };

    try {
      const response = await fetch('https://maps.googleapis.com/maps/api/distancematrix/json?units=metric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      const tiempos = result?.rows?.[0]?.elements || [];
      allDurations.push(...tiempos);
    } catch (err) {
      console.error('❌ Error consultando Google Maps API:', err);
    }
  }

  lugaresValidos.forEach((lugar, i) => {
    const duracion = allDurations[i]?.duration?.value || null;
    const minutos = duracion ? Math.round(duracion / 60) : null;

    if (minutos !== null) {
      const texto = minutos >= 60
        ? `a ${Math.floor(minutos / 60)} hr${Math.floor(minutos / 60) > 1 ? 's' : ''} y ${minutos % 60} minutos`
        : `a ${minutos} minutos`;

      lugar.tiempoTexto = texto;
      lugar.tiempoVehiculo = texto;
      lugar.minutosCrudos = minutos;
    } else {
      lugar.tiempoTexto = null;
      lugar.tiempoVehiculo = null;
      lugar.minutosCrudos = null;
    }
  });

  return lista;
}

export function calcularDistancia(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const R = 6371;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}