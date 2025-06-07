import { supabase } from '../js/supabaseClient.js';

const contenedorAlmuerzos = document.getElementById('contenedorAlmuerzos');
const contenedorHappy = document.getElementById('contenedorHappy');

async function renderizarEspeciales(lista) {
  const ahora = new Date();
  const hora = ahora.getHours() + ahora.getMinutes() / 60;

  contenedorAlmuerzos.innerHTML = '';
  contenedorHappy.innerHTML = '';

  for (const grupo of lista) {
    const { comercio, especiales } = grupo;
    const urlLogo = comercio.logo;

    const tarjeta = document.createElement('div');
    tarjeta.className = 'bg-white rounded-lg shadow p-4';

    const especialesHTML = await Promise.all(especiales.map(async (esp) => {
      const esAlmuerzo = esp.tipo === 'almuerzo' && hora >= 2 && hora < 15.5;
      const esHappy = esp.tipo === 'happyhour' && (hora >= 15.5 || hora < 2);
      if (!esAlmuerzo && !esHappy) return '';

      return `
        <div class="flex gap-4 items-start mb-4">
          <img src="${esp.imagen}" alt="Imagen especial" class="w-24 h-24 object-cover rounded-md">
          <div class="flex flex-col justify-between flex-1">
            <h3 class="font-bold text-lg">${esp.nombre}</h3>
            <p class="text-sm text-gray-600">${esp.descripcion || ''}</p>
            <p class="text-black font-bold text-md mt-2">$${esp.precio?.toFixed(2) || ''}</p>
          </div>
        </div>
      `;
    }));

    if (especialesHTML.filter(e => e).length === 0) continue;

    tarjeta.innerHTML = `
      <div class="flex items-center justify-start gap-2 mb-2">
        ${urlLogo ? `<img src="${urlLogo}" class="w-16 h-16 rounded-full object-cover">` : ''}
        <span class="text-lg text-gray-500">${comercio.nombre}</span>
      </div>
      <hr class="border-t border-gray-200 mb-2">
      ${especialesHTML.join('')}
    `;

    const tipo = especiales.find(e => (e.tipo === 'almuerzo' && hora >= 2 && hora < 15.5) || (e.tipo === 'happyhour' && (hora >= 15.5 || hora < 2)))?.tipo;
    if (tipo === 'almuerzo') contenedorAlmuerzos.appendChild(tarjeta);
    else if (tipo === 'happyhour') contenedorHappy.appendChild(tarjeta);
  }
}

export { renderizarEspeciales };
