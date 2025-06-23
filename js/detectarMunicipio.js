const municipiosPR = [
  { nombre: 'Adjuntas', lat: 18.1634, lon: -66.7249 },
  { nombre: 'Aguada', lat: 18.3814, lon: -67.1880 },
  { nombre: 'Aguadilla', lat: 18.4275, lon: -67.1541 },
  { nombre: 'Aguas Buenas', lat: 18.2546, lon: -66.1057 },
  { nombre: 'Aibonito', lat: 18.1397, lon: -66.2663 },
  { nombre: 'Añasco', lat: 18.2855, lon: -67.1401 },
  { nombre: 'Arecibo', lat: 18.4721, lon: -66.7157 },
  { nombre: 'Arroyo', lat: 17.9652, lon: -66.0615 },
  { nombre: 'Barceloneta', lat: 18.4512, lon: -66.5385 },
  { nombre: 'Barranquitas', lat: 18.1877, lon: -66.3074 },
  { nombre: 'Bayamón', lat: 18.3985, lon: -66.1557 },
  { nombre: 'Cabo Rojo', lat: 18.0866, lon: -67.1452 },
  { nombre: 'Caguas', lat: 18.2328, lon: -66.0485 },
  { nombre: 'Camuy', lat: 18.4838, lon: -66.8441 },
  { nombre: 'Canóvanas', lat: 18.3775, lon: -65.9111 },
  { nombre: 'Carolina', lat: 18.3802, lon: -65.9574 },
  { nombre: 'Cataño', lat: 18.4464, lon: -66.1180 },
  { nombre: 'Cayey', lat: 18.1111, lon: -66.1667 },
  { nombre: 'Ceiba', lat: 18.2637, lon: -65.6466 },
  { nombre: 'Ciales', lat: 18.3361, lon: -66.4730 },
  { nombre: 'Cidra', lat: 18.1741, lon: -66.1580 },
  { nombre: 'Coamo', lat: 18.0814, lon: -66.3613 },
  { nombre: 'Comerío', lat: 18.2188, lon: -66.2257 },
  { nombre: 'Corozal', lat: 18.3416, lon: -66.3177 },
  { nombre: 'Culebra', lat: 18.3167, lon: -65.3000 },
  { nombre: 'Dorado', lat: 18.4582, lon: -66.2655 },
  { nombre: 'Fajardo', lat: 18.3258, lon: -65.6520 },
  { nombre: 'Florida', lat: 18.3628, lon: -66.5596 },
  { nombre: 'Guánica', lat: 17.9712, lon: -66.9080 },
  { nombre: 'Guayama', lat: 17.9843, lon: -66.1133 },
  { nombre: 'Guayanilla', lat: 17.9812, lon: -66.7919 },
  { nombre: 'Guaynabo', lat: 18.3566, lon: -66.1100 },
  { nombre: 'Gurabo', lat: 18.2542, lon: -65.9741 },
  { nombre: 'Hatillo', lat: 18.4861, lon: -66.8041 },
  { nombre: 'Hormigueros', lat: 18.1419, lon: -67.1290 },
  { nombre: 'Humacao', lat: 18.1515, lon: -65.8277 },
  { nombre: 'Isabela', lat: 18.5008, lon: -67.0247 },
  { nombre: 'Jayuya', lat: 18.2189, lon: -66.5913 },
  { nombre: 'Juana Díaz', lat: 18.0528, lon: -66.5077 },
  { nombre: 'Juncos', lat: 18.2275, lon: -65.9216 },
  { nombre: 'Lajas', lat: 18.0691, lon: -67.0591 },
  { nombre: 'Lares', lat: 18.2958, lon: -66.8766 },
  { nombre: 'Las Marías', lat: 18.2891, lon: -66.9816 },
  { nombre: 'Las Piedras', lat: 18.1858, lon: -65.8703 },
  { nombre: 'Loíza', lat: 18.4314, lon: -65.8802 },
  { nombre: 'Luquillo', lat: 18.3724, lon: -65.7168 },
  { nombre: 'Manatí', lat: 18.4271, lon: -66.4927 },
  { nombre: 'Maricao', lat: 18.1806, lon: -66.9813 },
  { nombre: 'Maunabo', lat: 18.0080, lon: -65.8991 },
  { nombre: 'Mayagüez', lat: 18.2011, lon: -67.1396 },
  { nombre: 'Moca', lat: 18.3936, lon: -67.1137 },
  { nombre: 'Morovis', lat: 18.3185, lon: -66.4060 },
  { nombre: 'Naguabo', lat: 18.2107, lon: -65.7363 },
  { nombre: 'Naranjito', lat: 18.3011, lon: -66.2440 },
  { nombre: 'Orocovis', lat: 18.2242, lon: -66.3913 },
  { nombre: 'Patillas', lat: 18.0066, lon: -66.0157 },
  { nombre: 'Peñuelas', lat: 18.0591, lon: -66.7224 },
  { nombre: 'Ponce', lat: 17.9990, lon: -66.6141 },
  { nombre: 'Quebradillas', lat: 18.4719, lon: -66.9399 },
  { nombre: 'Rincón', lat: 18.3402, lon: -67.2500 },
  { nombre: 'Río Grande', lat: 18.3808, lon: -65.8177 },
  { nombre: 'Sabana Grande', lat: 18.0757, lon: -66.9552 },
  { nombre: 'Salinas', lat: 17.9753, lon: -66.2977 },
  { nombre: 'San Germán', lat: 18.0828, lon: -67.0419 },
  { nombre: 'San Juan', lat: 18.4655, lon: -66.1057 },
  { nombre: 'San Lorenzo', lat: 18.1895, lon: -65.9554 },
  { nombre: 'San Sebastián', lat: 18.3372, lon: -66.9922 },
  { nombre: 'Santa Isabel', lat: 17.9858, lon: -66.3914 },
  { nombre: 'Toa Alta', lat: 18.3658, lon: -66.2485 },
  { nombre: 'Toa Baja', lat: 18.4431, lon: -66.2594 },
  { nombre: 'Trujillo Alto', lat: 18.3549, lon: -66.0079 },
  { nombre: 'Utuado', lat: 18.2655, lon: -66.7005 },
  { nombre: 'Vega Alta', lat: 18.4122, lon: -66.3260 },
  { nombre: 'Vega Baja', lat: 18.4457, lon: -66.3877 },
  { nombre: 'Vieques', lat: 18.1340, lon: -65.4400 },
  { nombre: 'Villalba', lat: 18.1211, lon: -66.4857 },
  { nombre: 'Yabucoa', lat: 18.0505, lon: -65.8793 },
  { nombre: 'Yauco', lat: 18.0343, lon: -66.8499 }
];

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c; // Distancia en kilómetros
}

export function detectarMunicipioUsuario({ lat, lon }) {
  if (!lat || !lon) return null;

  let municipioCercano = null;
  let menorDistancia = Infinity;

  for (const m of municipiosPR) {
    const distancia = calcularDistancia(lat, lon, m.lat, m.lon);
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      municipioCercano = m.nombre;
    }
  }

  return municipioCercano;
}