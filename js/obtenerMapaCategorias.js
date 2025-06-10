import { supabase } from './supabaseClient.js';

export async function obtenerMapaCategorias() {
  const { data, error } = await supabase
    .from('Categorias')
    .select('id, nombre');

  if (error || !data) {
    console.error('❌ Error cargando categorías:', error);
    return {};
  }

  const map = {};
  for (const cat of data) {
    map[cat.id] = cat.nombre;
  }
  return map;
}