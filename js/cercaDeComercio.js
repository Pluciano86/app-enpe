import { supabase } from '../js/supabaseClient.js';
import { obtenerTiempoVehiculo } from './utilsDistancia.js';
import { obtenerUbicacionComercio } from './ubicacion.js'; // 👈 ajusta el path según tu estructura
import { obtenerMapaCategorias } from './obtenerMapaCategorias.js';


/**
 * Calcula la distancia entre dos coordenadas en kilómetros
 */
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const R = 6371;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function buscarComerciosCercanos(idComercio, categoriaIds = []) {
  const ubicacion = await obtenerUbicacionComercio(idComercio);
  if (!ubicacion) return [];

  const categoriasMap = await obtenerMapaCategorias();

  const { data: comercios, error } = await supabase
    .from('Comercios')
    .select(`
      id,
      nombre,
      latitud,
      longitud,
      idCategoria,
      idMunicipio,
      municipio:Municipios(nombre),
      imagenes:imagenesComercios(imagen, portada, logo)
    `)
    .overlaps('idCategoria', categoriaIds.map(id => BigInt(id)));

  if (error) {
    console.error('❌ Error cargando comercios:', JSON.stringify(error, null, 2));
    return [];
  }

  const destinos = comercios
    .filter(c => c.latitud && c.longitud && c.id !== parseInt(idComercio))
    .map(c => ({ lat: c.latitud, lon: c.longitud }));

  const tiempos = await obtenerTiempoVehiculo(ubicacion, destinos);

  const resultados = [];
  let tiempoIdx = 0;

  for (const com of comercios) {
    if (!com.latitud || !com.longitud) continue;
    if (com.id === parseInt(idComercio)) continue;

    const portadaImg = com.imagenes?.find(img => img.portada)?.imagen || '';
    const logoImg = com.imagenes?.find(img => img.logo)?.imagen || '';

    const portada = portadaImg
      ? supabase.storage.from('galeriacomercios').getPublicUrl(portadaImg).data.publicUrl
      : '';
    const logo = logoImg
      ? supabase.storage.from('galeriacomercios').getPublicUrl(logoImg).data.publicUrl
      : '';

    const distanciaKm = calcularDistancia(
  ubicacion.lat,
  ubicacion.lon,
  com.latitud,
  com.longitud
);
const minutos = Math.round(distanciaKm * 2);

resultados.push({
  id: com.id,
  nombre: com.nombre,
  categoria: categoriasMap[com.idCategoria?.[0]] || 'Sin categoría',
  municipio: com.municipio?.nombre || '',
  distancia: minutos,
  tiempoTexto: `${minutos} min`,
  portada,
  logo
});
  }

  return resultados.sort((a, b) => a.distancia - b.distancia);
}

/**
 * Exporta los comercios filtrados por nombres de categorías
 */
export async function obtenerCercanos({ categorias = [] } = {}) {
  const idComercio = new URLSearchParams(window.location.search).get('id');

  const { data: categoriasData, error } = await supabase
    .from('Categorias')
    .select('id')
    .in('nombre', categorias);

  if (error || !categoriasData) return [];

  const ids = categoriasData.map(c => c.id);
  console.log('🟢 IDs de categorías obtenidas:', ids);

  return await buscarComerciosCercanos(idComercio, ids);
}