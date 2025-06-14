export async function calcularTiemposParaLista(lista, origenCoords) {
//  console.log('🟡 Lista recibida:', lista);
//  console.log('🟡 Coordenadas de origen:', origenCoords);

  lista.forEach((c, i) => {
//    console.log(`📍 Comercio ${i + 1}:`, c.nombre, 'Lat:', c.latitud, 'Lon:', c.longitud);
  });

  const destinos = lista
    .filter(c =>
      typeof c.latitud === 'number' &&
      typeof c.longitud === 'number' &&
      !isNaN(c.latitud) &&
      !isNaN(c.longitud)
    )
    .map(c => `${c.latitud},${c.longitud}`);

//  console.log('🟡 Destinos válidos:', destinos);

  if (destinos.length === 0) {
    console.warn('⚠️ No hay destinos con coordenadas válidas.');
    return lista;
  }

  const body = {
    origen: `${origenCoords.lat},${origenCoords.lon}`,
    destinos: destinos.join('|')
  };

//  console.log('📦 BODY ENVIADO:', body);

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
  //  console.log('✅ Resultado recibido de la API:', result);

    const tiempos = result?.rows?.[0]?.elements || [];

    return lista.map((comercio, i) => {
  const duracion = tiempos[i]?.duration?.value || null; // en segundos
  const minutos = duracion ? Math.round(duracion / 60) : null;

  let tiempoTexto = null;
  if (minutos !== null) {
    if (minutos >= 60) {
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;
      tiempoTexto = `a ${horas} hr${horas > 1 ? 's' : ''}${mins > 0 ? ` y ${mins} minutos` : ''}`;
    } else {
      tiempoTexto = `a ${minutos} minutos`;
    }
  }

//  console.log(`🕒 Tiempo para comercio ${comercio.nombre || i}:`, tiempoTexto);

  return {
  ...comercio,
  tiempoVehiculo: minutos >= 60
    ? `a ${Math.floor(minutos / 60)} hr${Math.floor(minutos / 60) > 1 ? 's' : ''} y ${minutos % 60} minutos`
    : `a ${minutos} minutos`,
  minutosCrudos: minutos
};
});

  } catch (err) {
    console.error('❌ Error calculando tiempos para lista:', err);
    return lista;
  }
}