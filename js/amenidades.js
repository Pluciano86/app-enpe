// js/amenidades.js
import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');

document.addEventListener('DOMContentLoaded', async () => {
  const contenedor = document.getElementById('contenedorAmenidades');
  const titulo = document.getElementById('tituloAmenidades');
  if (!contenedor || !titulo) return;

  const { data: comercio, error: errorComercio } = await supabase
    .from('Comercios')
    .select('nombre')
    .eq('id', idComercio)
    .single();

  if (comercio?.nombre) {
    titulo.textContent = `${comercio.nombre} cuenta con:`;
  }

  const { data: relaciones, error } = await supabase
    .from('comercioAmenidades')
    .select('idAmenidad')
    .eq('idComercio', idComercio);

  if (error || !relaciones) {
    contenedor.innerHTML = '<p class="text-sm text-red-600">No se pudieron cargar las amenidades.</p>';
    return;
  }

  if (relaciones.length === 0) {
    contenedor.innerHTML = '<p class="text-sm text-gray-500 col-span-full">Este comercio aún no tiene amenidades registradas.</p>';
    return;
  }

  const ids = relaciones.map(r => r.idAmenidad);
  const { data: amenidades, error: errorAmenidades } = await supabase
    .from('Amenidades')
    .select('nombre, icono')
    .in('id', ids);

  if (errorAmenidades || !amenidades) {
    contenedor.innerHTML = '<p class="text-sm text-red-600">Error al cargar detalles de amenidades.</p>';
    return;
  }

  contenedor.innerHTML = '';
  amenidades.forEach(amenidad => {
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="flex flex-col items-center gap-2 text-sm">
      <i class="${amenidad.icono} text-lg md:text-xl" style="color: #23b4e9;"></i>
      <span>${amenidad.nombre}</span>
    </div>
  `;
  contenedor.appendChild(div);
});
});