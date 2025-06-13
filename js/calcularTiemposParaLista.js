export async function calcularTiemposParaLista(lista, origenCoords) {
  console.log('🟡 Lista recibida:', lista);
  console.log('🟡 Coordenadas de origen:', origenCoords);

  lista.forEach((c, i) => {
    console.log(`📍 Comercio ${i + 1}:`, c.nombre, 'Lat:', c.latitud, 'Lon:', c.longitud);
  });

  const destinos = lista
    .filter(c =>
      typeof c.latitud === 'number' &&
      typeof c.longitud === 'number' &&
      !isNaN(c.latitud) &&
      !isNaN(c.longitud)
    )
    .map(c => `${c.latitud},${c.longitud}`);

  console.log('🟡 Destinos válidos:', destinos);

  if (destinos.length === 0) {
    console.warn('⚠️ No hay destinos con coordenadas válidas.');
    return lista;
  }

  try {
    const response = await fetch('https://zgjaxanqfkweslkxtayt.functions.supabase.co/calcular-distancia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnamF4YW5xZmt3ZXNsa3h0YXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzk3NjgsImV4cCI6MjA2Mjg1NTc2OH0.Abif2Fu2uHyby--t_TAacEbjG8jCxmgsCbLx6AinT6c'
      },
      body: JSON.stringify({
        origen: `${origenCoords.lat},${origenCoords.lon}`,
        destinos: destinos.join('|')
      })
    });

    const result = await response.json();
    console.log('✅ Resultado recibido de la API:', result);

    const tiempos = result?.rows?.[0]?.elements || [];

    return lista.map((comercio, i) => {
      const duracion = tiempos[i]?.duration?.value || null;
      const minutos = duracion ? Math.round(duracion / 60) : null;

      console.log(`🕒 Tiempo para comercio ${comercio.nombre || i}:`, minutos, 'min');

      return {
        ...comercio,
        tiempoVehiculo: minutos
      };
    });

  } catch (err) {
    console.error('❌ Error calculando tiempos para lista:', err);
    return lista;
  }
}