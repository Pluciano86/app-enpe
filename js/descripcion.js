import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');

async function cargarDescripcion() {
  const { data, error } = await supabase
    .from('Comercios')
    .select('nombre, descripcion')
    .eq('id', idComercio)
    .single();

  if (error || !data) {
    console.error('Error cargando descripción:', error);
    return;
  }

  const descripcionEl = document.getElementById('descripcionTexto');
  const toggleBtn = document.getElementById('toggleDescripcion');

  if (!descripcionEl || !toggleBtn) return;

  descripcionEl.innerHTML = `<strong>${data.nombre}</strong> ${data.descripcion || ''}`;

  let expandido = false;

  toggleBtn.addEventListener('click', () => {
    expandido = !expandido;
    descripcionEl.classList.toggle('line-clamp-5', !expandido);
    toggleBtn.textContent = expandido
      ? 'Ocultar información'
      : 'Ver toda la información';
  });
}

document.addEventListener('DOMContentLoaded', cargarDescripcion);