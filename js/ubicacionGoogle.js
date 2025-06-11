import { supabase } from './supabaseClient.js';

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
      const duration = result?.rows?.[0]?.elements?.[0]?.duration?.value || null;
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

  const destinos = lista
    .filter(c => c.latitud && c.longitud)
    .map(c => `${c.latitud},${c.longitud}`);

  if (destinos.length === 0) return lista;

  const params = new URLSearchParams({
    origins: `${origenCoords.lat},${origenCoords.lon}`,
    destinations: destinos.join('|'),
    mode: 'driving',
    units: 'metric',
    key: apiKey
  });

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params}`);
    const result = await response.json();

    const tiempos = result?.rows?.[0]?.elements || [];

    return lista.map((comercio, i) => {
      const duracion = tiempos[i]?.duration?.value || null;
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