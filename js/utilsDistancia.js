// utilsDistancia.js
const baseURL = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? 'http://localhost:8888'
  : 'https://test.enpe-erre.com';

export async function obtenerTiempoVehiculo(origen, destinos) {
  try {
    const res = await fetch(`${baseURL}/.netlify/functions/distance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origen, destinos }),
    });

    const data = await res.json();
    return data.tiempos || [];
  } catch (err) {
    console.error('❌ Error consultando distancia en carro:', err);
    return [];
  }
}