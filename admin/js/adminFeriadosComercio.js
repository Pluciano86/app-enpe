// adminFeriadosComercio.js
import { supabase } from '/shared/supabaseClient.js';
const idComercio = new URLSearchParams(window.location.search).get('id');

document.addEventListener('DOMContentLoaded', async () => {
  await cargarFeriadosComercio();
  document.getElementById('agregarFeriado')?.addEventListener('click', agregarNuevoFeriado);
});

async function cargarFeriadosComercio() {
  const container = document.getElementById('feriadosContainer');
  if (!container) return;

  const { data, error } = await supabase
    .from('feriados')
    .select('*')
    .eq('idComercio', idComercio);

  if (error) {
    console.error('Error cargando feriados:', error);
    container.innerHTML = '<p class="text-red-600">Error al cargar feriados</p>';
    return;
  }

  const feriadosValidos = data.filter(f => f.feriado !== null);

  if (feriadosValidos.length === 0) {
    container.innerHTML = '<p class="text-gray-500">No hay feriados aún.</p>';
    return;
  }

  container.innerHTML = '';
  feriadosValidos.forEach((f) => {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-4';
    div.innerHTML = `
      <input type="date" class="border rounded p-1" value="${f.feriado}" data-id="${f.id}">
      <button class="text-red-600 eliminarFeriado" data-id="${f.id}">Eliminar</button>
    `;
    container.appendChild(div);
  });

  document.querySelectorAll('.eliminarFeriado').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('¿Eliminar este feriado?')) {
        await supabase.from('feriados').delete().eq('id', id);
        await cargarFeriadosComercio();
      }
    });
  });
}

async function agregarNuevoFeriado() {
  const fecha = prompt('Ingrese la fecha del feriado (YYYY-MM-DD):');
  if (!fecha || isNaN(Date.parse(fecha))) {
    alert('Fecha inválida.');
    return;
  }

  const { error } = await supabase
    .from('feriados')
    .insert([{ idComercio, feriado: fecha }]);

  if (error) {
    console.error('Error al añadir feriado:', error);
    alert('Hubo un error al añadir el feriado.');
    return;
  }

  await cargarFeriadosComercio();
}

// ✅ Export para poder usar en el HTML si lo necesitas
export { cargarFeriadosComercio, agregarNuevoFeriado };