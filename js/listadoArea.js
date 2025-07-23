// listadoArea.js
import { supabase } from './supabaseClient.js';
import { cardComercioSlide } from './cardComercioSlide.js';
import { cardPlayaSlide } from './cardPlayaSlide.js';
import { cardLugarSlide } from './cardLugarSlide.js';

// Elementos del DOM
const sliderComida = document.getElementById('sliderCercanosComida');
const containerComida = document.getElementById('cercanosComidaContainer');
const nombreComida = document.getElementById('nombreCercanosComida');

const sliderPlayas = document.getElementById('sliderPlayasCercanas');
const containerPlayas = document.getElementById('cercanosPlayasContainer');
const nombrePlayas = document.getElementById('nombreCercanosPlayas');

const sliderLugares = document.getElementById('sliderCercanosLugares');
const containerLugares = document.getElementById('cercanosLugaresContainer');
const nombreLugares = document.getElementById('nombreCercanosLugares');

// Fallback para pruebas locales sin HTTPS
function usarUbicacionFalsa() {
  const coords = { lat: 18.0098, lon: -66.6141 }; // San Germán
  cargarTodoDesdeCoords(coords);
}

navigator.geolocation.getCurrentPosition(
  position => {
    const coords = {
      lat: position.coords.latitude,
      lon: position.coords.longitude
    };
    cargarTodoDesdeCoords(coords);
  },
  error => {
    console.warn('No se pudo obtener la ubicación del usuario:', error);
    usarUbicacionFalsa();
  }
);

async function cargarTodoDesdeCoords(coords) {
  nombreComida.textContent = 'tu ubicación';
  nombrePlayas.textContent = 'tu ubicación';
  nombreLugares.textContent = 'tu ubicación';

  await Promise.all([
    cargarComercios(coords),
    cargarPlayas(coords),
    cargarLugares(coords)
  ]);
}

async function cargarComercios({ lat, lon }) {
  const { data, error } = await supabase.from('Comercios').select('*');
  if (error || !data) return;

  const validos = data.filter(c => c.latitud && c.longitud);
  const cercanos = await calcularCercanos(validos, lat, lon, 15);

  if (cercanos.length > 0) {
    sliderComida.innerHTML = '';
    cercanos.forEach(c => sliderComida.appendChild(cardComercioSlide(c)));
    containerComida.classList.remove('hidden');
  }
}

async function cargarPlayas({ lat, lon }) {
  const { data, error } = await supabase.from('Playas').select('*');
  if (error || !data) return;

  const validas = data.filter(p => p.latitud && p.longitud);
  const cercanas = await calcularCercanos(validas, lat, lon, 45);

  if (cercanas.length > 0) {
    sliderPlayas.innerHTML = '';
    cercanas.forEach(p => sliderPlayas.appendChild(cardPlayaSlide(p)));
    containerPlayas.classList.remove('hidden');
  }
}

async function cargarLugares({ lat, lon }) {
  const { data, error } = await supabase.from('Lugares').select('*');
  if (error || !data) return;

  const validos = data.filter(l => l.latitud && l.longitud);
  const cercanos = await calcularCercanos(validos, lat, lon, 30);

  if (cercanos.length > 0) {
    sliderLugares.innerHTML = '';
    cercanos.forEach(l => sliderLugares.appendChild(cardLugarSlide(l)));
    containerLugares.classList.remove('hidden');
  }
}

async function calcularCercanos(lista, lat, lon, minutosMax) {
  const origen = `${lat},${lon}`;
  const destinos = lista.map(item => `${item.latitud},${item.longitud}`).join('|');

  try {
    const resp = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origen}&destinations=${destinos}&key=AIzaSyBxfWTx5kMwy_2UcOnKhILbnLkbU4VMaB&mode=driving` // Reemplazar clave
    );
    const json = await resp.json();

    return lista.map((item, i) => {
      const tiempo = json.rows[0].elements[i]?.duration;
      return tiempo ? { ...item, minutos: tiempo.text, minutosCrudos: tiempo.value / 60 } : null;
    }).filter(c => c && c.minutosCrudos <= minutosMax);
  } catch (e) {
    console.error('Error calculando distancias:', e);
    return [];
  }
}