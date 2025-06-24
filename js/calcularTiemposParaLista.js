export async function calcularTiemposParaLista(lista, origenCoords) {
  const comerciosValidos = lista.filter(c =>
    typeof c.latitud === 'number' &&
    typeof c.longitud === 'number' &&
    !isNaN(c.latitud) &&
    !isNaN(c.longitud)
  );

  if (comerciosValidos.length === 0) return lista;

  const chunkSize = 20;
  const chunks = [];

  for (let i = 0; i < comerciosValidos.length; i += chunkSize) {
    chunks.push(comerciosValidos.slice(i, i + chunkSize));
  }

  const allDurations = [];

  for (const chunk of chunks) {
    const destinos = chunk.map(c => `${c.latitud},${c.longitud}`);
    const body = {
      origen: `${origenCoords.lat},${origenCoords.lon}`,
      destinos: destinos.join('|')
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

  comerciosValidos.forEach((comercio, i) => {
    const duracion = allDurations[i]?.duration?.value || null;
    const minutos = duracion ? Math.round(duracion / 60) : null;

    if (minutos !== null) {
      const texto = minutos >= 60
        ? `a ${Math.floor(minutos / 60)} hr${Math.floor(minutos / 60) > 1 ? 's' : ''} y ${minutos % 60} minutos`
        : `a ${minutos} minutos`;

      comercio.tiempoTexto = texto;
      comercio.tiempoVehiculo = texto; // ✅ compatibilidad
      comercio.minutosCrudos = minutos;
    } else {
      comercio.tiempoTexto = null;
      comercio.tiempoVehiculo = null; // ✅ compatibilidad
      comercio.minutosCrudos = null;
    }
  });

  return lista;
}