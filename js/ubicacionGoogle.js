// ubicacionGoogle.js
import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
if (!idComercio || isNaN(parseInt(idComercio))) {
  console.error('ID del comercio inválido o no presente en la URL');
}

const mapsBtn = document.getElementById('btnGoogleMaps');
const wazeBtn = document.getElementById('btnWaze');
const tiempoEl = document.getElementById('tiempoVehiculo');

navigator.geolocation.getCurrentPosition(async (pos) => {
  const latUsuario = pos.coords.latitude;
  const lonUsuario = pos.coords.longitude;

  const { data, error } = await supabase
    .from('Comercios')
    .select('latitud, longitud')
    .eq('id', idComercio)
    .single();

  if (error || !data) {
    console.error('Error cargando coordenadas del comercio:', error);
    return;
  }

  const origen = `${latUsuario},${lonUsuario}`;
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
});