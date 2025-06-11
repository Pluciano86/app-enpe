import { obtenerTiempoVehiculo } from './utilsDistancia.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
const mapsBtn = document.getElementById('btnGoogleMaps');
const wazeBtn = document.getElementById('btnWaze');
const tiempoEl = document.getElementById('tiempoVehiculo');
const GOOGLE_MAPS_API_KEY = 'AIzaSyBxfWTx5kMwy_2UcOnKhILbnLkbU4VMaBI'; // Inserta aquí tu API KEY de Google

let latUsuario = null;
let lonUsuario = null;

navigator.geolocation.getCurrentPosition(
  async (pos) => {
    latUsuario = pos.coords.latitude;
    lonUsuario = pos.coords.longitude;

    const res = await fetch(`https://db.pe-erre.com/comercio/${idComercio}`);
    const comercio = await res.json();

    const destino = { lat: comercio.latitud, lon: comercio.longitud };
    const origen = { lat: latUsuario, lon: lonUsuario };

    const tiempos = await obtenerTiempoVehiculo(origen, [destino], GOOGLE_MAPS_API_KEY);
    const minutos = tiempos?.[0] ? Math.round(tiempos[0] / 60) : null;

    if (tiempoEl && minutos !== null) {
      tiempoEl.innerHTML = `<i class="fas fa-car"></i> Estás a <strong>${minutos} mins</strong> de distancia.`;
    }

    if (mapsBtn) {
      mapsBtn.href = `https://www.google.com/maps/dir/?api=1&origin=${latUsuario},${lonUsuario}&destination=${destino.lat},${destino.lon}&travelmode=driving`;
    }

    if (wazeBtn) {
      wazeBtn.href = `https://waze.com/ul?ll=${destino.lat},${destino.lon}&navigate=yes`;
    }
  },
  (err) => {
    console.error('Error obteniendo ubicación del usuario:', err.message);
  }
);