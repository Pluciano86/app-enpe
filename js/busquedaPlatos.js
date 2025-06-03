// js/busquedaPlatos.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { filtrosActivos, aplicarFiltrosYRedibujar } from './main.js';

const supabase = createClient(
  'https://zgjaxanqfkweslkxtayt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnamF4YW5xZmt3ZXNsa3h0YXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzk3NjgsImV4cCI6MjA2Mjg1NTc2OH0.Abif2Fu2uHyby--t_TAacEbjG8jCxmgsCbLx6AinT6c'
);

const inputBusquedaPlatos = document.createElement('input');
inputBusquedaPlatos.type = 'text';
inputBusquedaPlatos.placeholder = 'Buscar platos';
inputBusquedaPlatos.className = 'flex-1 px-3 py-2 border rounded-full text-base';
inputBusquedaPlatos.id = 'filtro-platos';

// Insertar el nuevo input junto al buscador principal
const buscadorNombre = document.getElementById('filtro-nombre');
if (buscadorNombre?.parentNode) {
  buscadorNombre.parentNode.insertBefore(inputBusquedaPlatos, buscadorNombre.nextSibling);
}

inputBusquedaPlatos.addEventListener('input', async (e) => {
  const valor = e.target.value.trim();

  if (valor.length < 2) {
    window.filtrosActivos.comerciosPorPlato = [];
    window.aplicarFiltrosYRedibujar();
    return;
  }

  const { data: productos, error } = await supabase
    .from('productos')
    .select('id, idMenu, nombre')
    .ilike('nombre', `%${valor}%`);

  if (error) {
    console.error('Error buscando productos:', error);
    return;
  }

  const idMenus = productos.map(p => p.idMenu);
  if (idMenus.length === 0) {
    window.filtrosActivos.comerciosPorPlato = [];
    window.aplicarFiltrosYRedibujar();
    return;
  }

  const { data: menus, error: errorMenus } = await supabase
    .from('menus')
    .select('id, idComercio')
    .in('id', idMenus);

  if (errorMenus) {
    console.error('Error buscando menús:', errorMenus);
    return;
  }

  const idComercios = menus.map(m => m.idComercio);
  window.filtrosActivos.comerciosPorPlato = [...new Set(idComercios)];
  window.aplicarFiltrosYRedibujar();
});