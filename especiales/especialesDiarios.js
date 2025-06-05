import { supabase } from './supabaseClient.js';

const contenedorAlmuerzos = document.getElementById('contenedorAlmuerzos');
const contenedorHappy = document.getElementById('contenedorHappy');
const searchInput = document.getElementById('searchEspecial');

let todosLosEspeciales = [];
let coordenadasUsuario = null; // opcional para futuro filtro de cercanía

// 🔄 Cargar especiales del día
async function cargarEspeciales() {
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0 = domingo
  const horaActual = hoy.getHours() + hoy.getMinutes() / 60;

  const { data: especiales, error } = await supabase
    .from('especiales')
    .select('*, Comercios (id, nombre, municipio, logo)')
    .eq('diaSemana', diaSemana)
    .eq('activo', true);

  if (error) {
    console.error('Error cargando especiales:', error);
    return;
  }

  todosLosEspeciales = especiales;

  renderizarEspeciales(horaActual);
}

function renderizarEspeciales(hora) {
  contenedorAlmuerzos.innerHTML = '';
  contenedorHappy.innerHTML = '';

  const texto = searchInput.value.toLowerCase().trim();

  const filtrados = todosLosEspeciales.filter(e => {
    const nombreComercio = e.Comercios?.nombre?.toLowerCase() || '';
    const nombreEspecial = e.nombre?.toLowerCase() || '';
    return (
      nombreComercio.includes(texto) ||
      nombreEspecial.includes(texto)
    );
  });

  filtrados.forEach(especial => {
    const esAlmuerzo = especial.tipo === 'almuerzo' && hora >= 2 && hora < 15.5;
    const esHappy = especial.tipo === 'happyhour' && (hora >= 15.5 || hora < 2);

    const urlImagen = supabase.storage.from('galeriacomercios').getPublicUrl(especial.imagen).data.publicUrl;
    const urlLogo = especial.Comercios?.logo
      ? supabase.storage.from('galeriacomercios').getPublicUrl(especial.Comercios.logo).data.publicUrl
      : '';

    const tarjeta = document.createElement('div');
    tarjeta.className = 'bg-white rounded-lg shadow p-4 flex gap-4';

    tarjeta.innerHTML = `
      <img src="${urlImagen}" alt="Imagen especial" class="w-24 h-24 object-cover rounded-md">
      <div class="flex flex-col justify-between flex-1">
        <div>
          <h3 class="font-bold text-lg">${especial.nombre}</h3>
          <p class="text-sm text-gray-600">${especial.descripcion || ''}</p>
        </div>
        <div class="flex items-center justify-between mt-2">
          <p class="text-green-600 font-bold text-md">$${especial.precio?.toFixed(2) || ''}</p>
          <span class="text-xs text-gray-400">${especial.Comercios?.nombre || ''}</span>
        </div>
      </div>
    `;

    if (esAlmuerzo) contenedorAlmuerzos.appendChild(tarjeta);
    if (esHappy) contenedorHappy.appendChild(tarjeta);
  });
}

// 🔍 Buscador en tiempo real
searchInput.addEventListener('input', () => {
  const ahora = new Date();
  const horaActual = ahora.getHours() + ahora.getMinutes() / 60;
  renderizarEspeciales(horaActual);
});

// 🚀 Iniciar
document.addEventListener('DOMContentLoaded', cargarEspeciales);