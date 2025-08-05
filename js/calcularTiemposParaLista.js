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

// Lógica ajustada: velocidad dinámica según distancia
function calcularTiempoEstimado(distanciaKm) {
  let velocidadPromedio;

  if (distanciaKm < 5) {
    velocidadPromedio = 30; // urbano
  } else if (distanciaKm < 15) {
    velocidadPromedio = 45; // mixto
  } else if (distanciaKm < 40) {
    velocidadPromedio = 60; // carretera local
  } else {
    velocidadPromedio = 75; // autopista o tramos largos
  }

  return Math.round((distanciaKm / velocidadPromedio) * 60);
}

// Convierte minutos a texto conversacional
function formatearMinutosConversacional(minutos) {
  if (minutos < 60) return `a unos ${minutos} minutos`;

  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;

  if (mins === 0) return `a ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  return `a ${horas} ${horas === 1 ? 'hora' : 'horas'} y ${mins} minutos`;
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

    const minutosCrudos = calcularTiempoEstimado(distanciaKm);

    lugar.tiempoVehiculo = formatearMinutosConversacional(minutosCrudos);
    lugar.tiempoTexto = lugar.tiempoVehiculo;
    lugar.minutosCrudos = minutosCrudos;
    lugar.distanciaKm = distanciaKm;
  });

  return lista;
}