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
      departure_time: 'now'
    };

    try {
      const response = await fetch('https://zgjaxanqfkweslkxtayt.functions.supabase.co/calcular-distancia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnamF4YW5xZmt3ZXNsa3h0YXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzk3NjgsImV4cCI6MjA2Mjg1NTc2OH0.Abif2Fu2uHyby--t_TAacEbjG8jCxmgsCbLx6AinT6c'
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      const tiempos = result?.rows?.[0]?.elements || [];
      allDurations.push(...tiempos);
    } catch (err) {
      console.error('❌ Error consultando API para chunk:', err);
    }
  }

  lugaresValidos.forEach((lugar, i) => {
    const duracion = allDurations[i]?.duration?.value || null;
    let minutos = duracion ? Math.round(duracion / 60) : null;

    if (minutos === null) {
      // Calcular distancia manual y estimar duración
      const distanciaKm = calcularDistancia(origenCoords.lat, origenCoords.lon, lugar.latitud, lugar.longitud);
      let velocidad = 30;
      if (distanciaKm < 5) velocidad = 30;
      else if (distanciaKm < 15) velocidad = 45;
      else if (distanciaKm < 40) velocidad = 60;
      else velocidad = 75;

      minutos = Math.round((distanciaKm / velocidad) * 60);
    }

        function formatearMinutosConversacional(min) {
      if (min < 60) return `a unos ${min} minutos`;
      const horas = Math.floor(min / 60);
      const mins = min % 60;
      if (mins === 0) return `a ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
      return `a ${horas} ${horas === 1 ? 'hora' : 'horas'} y ${mins} minutos`;
    }

    const texto = formatearMinutosConversacional(minutos);
    lugar.tiempoTexto = texto;
    lugar.tiempoVehiculo = texto;
    lugar.minutosCrudos = minutos;
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