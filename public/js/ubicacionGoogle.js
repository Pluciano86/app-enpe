import { supabase } from '../shared/supabaseClient.js';

// ✅ Solo se ejecuta si hay ID en URL (usado en perfilComercio.html)
const idComercio = new URLSearchParams(window.location.search).get('id');
if (idComercio && !isNaN(parseInt(idComercio))) {
  mostrarTiempoIndividual(idComercio);
}

// ✅ Función para mostrar tiempo en perfilComercio
export async function mostrarTiempoIndividual(id) {
  const mapsBtn = document.getElementById('btnGoogleMaps');
  const wazeBtn = document.getElementById('btnWaze');
  const tiempoEl = document.getElementById('tiempoVehiculo');

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const origen = `${pos.coords.latitude},${pos.coords.longitude}`;

    const { data, error } = await supabase
      .from('Comercios')
      .select('latitud, longitud')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error cargando coordenadas del comercio:', error);
      return;
    }

    const destino = `${data.latitud},${data.longitud}`;
    const params = new URLSearchParams({
      origins: origen,
      destinations: destino,
      mode: 'driving',
      units: 'metric',
      key: 'AIzaSyBxfWTx5kMwy_2UcOnKhILbnLkbU4VMaBI'
    });

    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params}`);
      const result = await response.json();

      const elemento = result?.rows?.[0]?.elements?.[0];
      const duration = elemento?.status === 'OK' ? elemento.duration?.value : null;
      const minutos = duration ? Math.round(duration / 60) : null;

      if (tiempoEl && minutos !== null) {
        tiempoEl.innerHTML = `<i class="fas fa-car"></i> Estás a <strong>${minutos} mins</strong> de distancia.`;
      }

      if (mapsBtn) {
        mapsBtn.href = `https://www.google.com/maps/dir/?api=1&origin=${origen}&destination=${destino}&travelmode=driving`;
      }

      if (wazeBtn) {
        wazeBtn.href = `https://waze.com/ul?ll=${destino}&navigate=yes`;
      }

    } catch (err) {
      console.error('❌ Error consultando Google Maps:', err);
    }
  }, (err) => {
    console.error('Error obteniendo ubicación del usuario:', err.message);
  });
}

// ✅ Función utilizable en listadoComercios (recibe múltiples comercios)
export async function calcularTiemposParaLista(lista, origenCoords) {
  const apiKey = 'AIzaSyBxfWTx5kMwy_2UcOnKhILbnLkbU4VMaBI';

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
      console.log(`🕒 Tiempo para comercio ${comercio.nombre || i}:`, duracion);
      return {
        ...comercio,
        tiempoVehiculo: duracion ? `${Math.round(duracion / 60)} min` : comercio.tiempoVehiculo
      };
    });

  } catch (err) {
    console.error('❌ Error calculando tiempos para lista:', err);
    return lista;
  }
}