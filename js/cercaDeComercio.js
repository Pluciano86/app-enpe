import { supabase } from '../js/supabaseClient.js';
import { obtenerTiempoVehiculo } from './utilsDistancia.js';
import { obtenerUbicacionComercio } from './ubicacion.js';
import { crearCardComercioSlide } from './cardComercioSlide.js';

export async function obtenerMapaCategorias() {
  const { data, error } = await supabase.from('Categorias').select('id, nombre');
  if (error) return {};
  return Object.fromEntries(data.map((c) => [c.id, c.nombre]));
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
    .overlaps('idCategoria', categoriaIds.map((id) => BigInt(id)));

  if (error) {
    console.error('❌ Error cargando comercios:', error);
    return [];
  }

  const destinos = comercios
    .filter((c) => c.latitud && c.longitud && c.id !== parseInt(idComercio))
    .map((c) => ({ lat: c.latitud, lon: c.longitud }));

  const tiempos = await obtenerTiempoVehiculo(ubicacion, destinos);

  const resultados = [];
  let tiempoIdx = 0;

  for (const com of comercios) {
    if (!com.latitud || !com.longitud || com.id === parseInt(idComercio)) continue;

    const minutos = tiempos?.[tiempoIdx] ? Math.round(tiempos[tiempoIdx] / 60) : null;
    tiempoIdx++;

    const portadaImg = com.imagenes?.find((img) => img.portada)?.imagen || '';
    const logoImg = com.imagenes?.find((img) => img.logo)?.imagen || '';

    const portada = portadaImg
      ? supabase.storage.from('galeriacomercios').getPublicUrl(portadaImg).data.publicUrl
      : '';
    const logo = logoImg
      ? supabase.storage.from('galeriacomercios').getPublicUrl(logoImg).data.publicUrl
      : '';

    resultados.push({
      id: com.id,
      nombre: com.nombre,
      categoria: categoriasMap[com.idCategoria?.[0]] || 'Sin categoría',
      municipio: com.municipio?.nombre || '',
      distancia: minutos,
      tiempoTexto: minutos !== null ? `${minutos} min` : '',
      portada,
      logo
    });
  }

  return resultados.sort((a, b) => (a.distancia ?? Infinity) - (b.distancia ?? Infinity));
}

export async function obtenerCercanos({ categorias = [] } = {}) {
  const idComercio = new URLSearchParams(window.location.search).get('id');

  const { data: categoriasData, error } = await supabase
    .from('Categorias')
    .select('id')
    .in('nombre', categorias);

  if (error || !categoriasData) return [];

  const ids = categoriasData.map((c) => c.id);
  console.log('🟢 IDs de categorías obtenidas:', ids);

  return await buscarComerciosCercanos(idComercio, ids);
}