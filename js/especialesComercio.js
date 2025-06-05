import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');

async function cargarEspecialesComercio() {
  const hoy = new Date();
  const horaActual = hoy.getHours();
  const diaSemana = hoy.getDay(); // 0 = domingo

  const { data: especiales, error } = await supabase
    .from('especiales')
    .select('*')
    .eq('idComercio', idComercio)
    .eq('diaSemana', diaSemana)
    .eq('activo', true);

  if (error) {
    console.error('Error cargando especiales:', error);
    return;
  }

  especiales.forEach(especial => {
    const url = supabase.storage.from('galeriacomercios').getPublicUrl(especial.imagen).data.publicUrl;

    if (especial.tipo === 'almuerzo' && horaActual >= 10 && horaActual < 16) {
      document.getElementById('especialAlmuerzo')?.classList.remove('hidden');
      document.getElementById('imagenAlmuerzo').src = url;
      document.getElementById('nombreAlmuerzo').textContent = especial.nombre;
      document.getElementById('descripcionAlmuerzo').textContent = especial.descripcion;
      document.getElementById('precioAlmuerzo').textContent = `$${especial.precio?.toFixed(2)}`;
    }

    if (especial.tipo === 'happyhour' && horaActual >= 16) {
      document.getElementById('especialHappyHour')?.classList.remove('hidden');
      document.getElementById('imagenHappy').src = url;
      document.getElementById('nombreHappy').textContent = especial.nombre;
      document.getElementById('descripcionHappy').textContent = especial.descripcion;
      document.getElementById('precioHappy').textContent = `$${especial.precio?.toFixed(2)}`;
    }
  });
}

document.addEventListener('DOMContentLoaded', cargarEspecialesComercio);