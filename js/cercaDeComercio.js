import { supabase } from '../js/supabaseClient.js'

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

/**
 * Verifica si un comercio está abierto ahora
 */
async function estaAbierto(idComercio) {
  const ahora = new Date();
  const hora = ahora.toTimeString().slice(0, 5);
  const dia = ahora.getDay();

  const { data, error } = await supabase
    .from('Horarios')
    .select('apertura, cierre, cerrado')
    .eq('idComercio', idComercio)
    .eq('diaSemana', dia)
    .maybeSingle();

  if (error || !data || data.cerrado) return false;
  return hora >= data.apertura && hora <= data.cierre;
} 

/**
 * Obtiene la ubicación (lat/lon) del comercio principal en perfil
 */
export async function obtenerUbicacionComercio(idComercio) {
  const { data, error } = await supabase
    .from('Comercios')
    .select('latitud, longitud')
    .eq('id', idComercio)
    .single();

  if (error || !data) return null;
  return { lat: data.latitud, lon: data.longitud };
}

/**
 * Busca comercios cercanos con toda la info necesaria
 */
export async function buscarComerciosCercanos(idComercio, categoriaIds = []) {
  const ubicacion = await obtenerUbicacionComercio(idComercio);
  if (!ubicacion) return [];

  const { data: comercios, error } = await supabase
    .from('Comercios')
    .select('id,nombre,latitud,longitud,idCategoria,idMunicipio')
    .overlaps('idCategoria', categoriaIds); // ✅ usamos overlaps para arrays

  if (error) {
    console.error('❌ Error cargando comercios:', error);
    return [];
  }

  const resultados = [];

  for (const com of comercios) {
    if (!com.latitud || !com.longitud) continue;
    if (com.id === parseInt(idComercio)) continue;

    const distancia = calcularDistancia(
      ubicacion.lat,
      ubicacion.lon,
      com.latitud,
      com.longitud
    );

 /**   const abierto = await estaAbierto(com.id);
    if (!abierto) continue;
 */
    resultados.push({
      id: com.id,
      nombre: com.nombre,
      idCategoria: com.idCategoria,
      idMunicipio: com.idMunicipio,
      distancia
    });
  }

  return resultados.sort((a, b) => a.distancia - b.distancia);
}

/**
 * Export genérico para facilitar el uso en otros módulos
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