import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
const mapsBtn = document.getElementById('btnGoogleMaps');
const wazeBtn = document.getElementById('btnWaze');
const tiempoEl = document.getElementById('tiempoVehiculo');

let latUsuario = null;
let lonUsuario = null;

navigator.geolocation.getCurrentPosition(
  async (pos) => {
    latUsuario = pos.coords.latitude;
    lonUsuario = pos.coords.longitude;

    const { data, error } = await supabase
      .from('Comercios')
      .select('latitud, longitud')
      .eq('id', idComercio)
      .single();

    if (error || !data) {
      console.error('Error cargando coordenadas del comercio:', error);
      return;
    }

    const { latitud, longitud } = data;

    // Calcular distancia y tiempo estimado
    const distanciaKm = calcularDistancia(latUsuario, lonUsuario, latitud, longitud);
    const minutos = Math.round(distanciaKm * 2); // Aproximado

    if (tiempoEl) {
      tiempoEl.innerHTML = `<i class="fas fa-car"></i> Estás a <strong>${minutos} mins</strong> de distancia.`;
    }

    // Generar URLs de navegación
    if (mapsBtn) {
      mapsBtn.href = `https://www.google.com/maps/dir/?api=1&origin=${latUsuario},${lonUsuario}&destination=${latitud},${longitud}&travelmode=driving`;
    }

    if (wazeBtn) {
      wazeBtn.href = `https://waze.com/ul?ll=${latitud},${longitud}&navigate=yes`;
    }
  },
  (err) => {
    console.error('Error obteniendo ubicación del usuario:', err.message);
  }
);

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function obtenerUbicacionComercio(idComercio) {
  const { data, error } = await supabase
    .from('Comercios')
    .select('latitud, longitud')
    .eq('id', idComercio)
    .single();

  if (error || !data) {
    console.error('❌ Error obteniendo ubicación del comercio:', error);
    return null;
  }

  return { lat: data.latitud, lon: data.longitud };
}