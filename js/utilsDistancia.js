// utilsDistancia.js

/**
 * Llama a la función serverless en Netlify para obtener los tiempos reales en vehículo
 * usando Google Maps Distance Matrix API (a través de functions/distance.js)
 *
 * @param {Object} origen - Objeto con lat y lon del comercio actual
 * @param {Array} destinos - Arreglo de objetos con lat y lon de los comercios a comparar
 * @returns {Promise<Array<number>>} - Tiempos en segundos para cada destino (o null si falla)
 */
export async function obtenerTiempoVehiculo(origen, destinos) {
  try {
    const res = await fetch('/.netlify/functions/distance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origen, destinos }),
    });

    const data = await res.json();
    return data.tiempos || [];
  } catch (err) {
    console.error('Error consultando distancia en carro:', err);
    return [];
  }
}