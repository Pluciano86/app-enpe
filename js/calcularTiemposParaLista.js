export async function calcularTiemposParaLista(lista, origenCoords) {
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
      departure_time: 'now' // ✅ tiempo real
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