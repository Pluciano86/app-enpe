import { calcularTiempoEnVehiculo } from '/shared/utils.js';

// Calcula la distancia Haversine entre dos coordenadas
function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function calcularTiemposParaLista(lista, origenCoords) {
  const lugaresValidos = lista.filter(l =>
    typeof l.latitud === 'number' &&
    typeof l.longitud === 'number' &&
    !isNaN(l.latitud) &&
    !isNaN(l.longitud)
  );

  if (lugaresValidos.length === 0) return lista;

  lugaresValidos.forEach(lugar => {
    const distanciaKm = calcularDistanciaHaversine(
      origenCoords.lat,
      origenCoords.lon,
      lugar.latitud,
      lugar.longitud
    );

    const { minutos: minutosCrudos, texto } = calcularTiempoEnVehiculo(distanciaKm);

    lugar.tiempoVehiculo = minutosCrudos < 60 ? `a unos ${texto}` : `a ${texto}`;
    lugar.tiempoTexto = lugar.tiempoVehiculo;
    lugar.minutosCrudos = minutosCrudos;
    lugar.distanciaKm = distanciaKm;
  });

  return lista;
}
