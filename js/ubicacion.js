// js/ubicacion.js
import { supabase } from './supabaseClient.js';

let latUsuario = null;
let lonUsuario = null;

navigator.geolocation.getCurrentPosition(
  pos => {
    latUsuario = pos.coords.latitude;
    lonUsuario = pos.coords.longitude;
    cargarUbicacionComercio();
  },
  err => console.error('Error obteniendo ubicación', err)
);

async function cargarUbicacionComercio() {
  const idComercio = new URLSearchParams(window.location.search).get('id');

  const { data, error } = await supabase
    .from('Comercios')
    .select('latitud, longitud')
    .eq('id', idComercio)
    .single();

  if (error || !data) return;

  const { latitud, longitud } = data;

  // Actualizar enlaces
  document.querySelector('#btnGoogleMaps')?.setAttribute(
    'href',
    `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`
  );

  document.querySelector('#btnWaze')?.setAttribute(
    'href',
    `https://waze.com/ul?ll=${latitud},${longitud}&navigate=yes`
  );

  // Calcular distancia
  if (latUsuario && lonUsuario) {
    const distancia = calcularDistanciaKm(latUsuario, lonUsuario, latitud, longitud);
    const tiempoMin = Math.round(distancia * 2);
    document.getElementById('tiempoVehiculo')!.innerHTML = 
      `Estás a <strong>${formatearTiempo(tiempoMin)}</strong> de distancia.`;
  }
}

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatearTiempo(min) {
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}min` : `${min} min`;
}