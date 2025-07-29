import { supabase } from '../js/supabaseClient.js';
import { mostrarMensajeVacio } from '../js/mensajesUI.js';

const contenedorAlmuerzos = document.getElementById('contenedorAlmuerzos');
const contenedorHappy = document.getElementById('contenedorHappy');
const seccionAlmuerzo = contenedorAlmuerzos.closest('section');
const seccionHappy = contenedorHappy.closest('section');

async function renderizarEspeciales(lista) {
  const ahora = new Date();
  const hora = ahora.getHours() + ahora.getMinutes() / 60;

  const esAlmuerzo = hora >= 2 && hora < 15.5;
  const tipoSeleccionado = esAlmuerzo ? 'almuerzo' : 'happyhour';

  contenedorAlmuerzos.innerHTML = '';
  contenedorHappy.innerHTML = '';
  seccionAlmuerzo.classList.add('hidden');
  seccionHappy.classList.add('hidden');

  let hayResultados = false;

  for (const grupo of lista) {
    const { comercio, especiales } = grupo;
    const urlLogo = comercio.logo;

    const especialesFiltrados = especiales.filter(esp => esp.tipo === tipoSeleccionado);
    if (especialesFiltrados.length === 0) continue;

    const contenido = await Promise.all(especialesFiltrados.map(async (esp) => `
      <div class="flex gap-4 items-start mb-4">
        <img src="${esp.imagen}" alt="Imagen especial" class="w-24 h-24 object-cover rounded-md">
        <div class="flex flex-col justify-between flex-1">
          <h3 class="font-bold text-lg">${esp.nombre}</h3>
          <p class="text-sm text-gray-600">${esp.descripcion || ''}</p>
          <p class="text-black font-bold text-md mt-2">$${esp.precio?.toFixed(2) || ''}</p>
        </div>
      </div>
    `));

    const tarjeta = document.createElement('div');
    tarjeta.className = 'bg-white rounded-lg shadow p-4';
    tarjeta.innerHTML = `
      <div class="flex items-center justify-start gap-2 mb-2">
        ${urlLogo ? `<img src="${urlLogo}" class="w-16 h-16 rounded-full object-cover">` : ''}
        <span class="text-lg text-gray-500">${comercio.nombre}</span>
      </div>
      <hr class="border-t border-gray-200 mb-2">
      ${contenido.join('')}
    `;

    if (tipoSeleccionado === 'almuerzo') {
      contenedorAlmuerzos.appendChild(tarjeta);
      seccionAlmuerzo.classList.remove('hidden');
    } else {
      contenedorHappy.appendChild(tarjeta);
      seccionHappy.classList.remove('hidden');
    }

    hayResultados = true;
  }

  if (!hayResultados) {
    const emoji = tipoSeleccionado === 'almuerzo' ? '🍴' : '🍻';
    const mensaje = tipoSeleccionado === 'almuerzo'
      ? 'No hay Almuerzos disponibles para hoy'
      : 'No hay Happy Hours disponibles para hoy';

    const contenedor = tipoSeleccionado === 'almuerzo' ? contenedorAlmuerzos : contenedorHappy;
    const seccion = tipoSeleccionado === 'almuerzo' ? seccionAlmuerzo : seccionHappy;
    mostrarMensajeVacio(contenedor, mensaje, emoji);
    seccion.classList.remove('hidden');
  }
}

export { renderizarEspeciales };