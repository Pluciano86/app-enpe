import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
const especialesBox = document.getElementById('especialesBox');
const tituloEspecialesBox = document.getElementById('tituloEspecialesBox');
const btnToggleAlmuerzo = document.getElementById('btnToggleAlmuerzo');
const btnToggleHappy = document.getElementById('btnToggleHappy');
const almuerzoCard = document.getElementById('almuerzoCard');
const happyCard = document.getElementById('happyCard');

btnToggleAlmuerzo?.addEventListener('click', () => {
  almuerzoCard.classList.toggle('hidden');
  if (!happyCard.classList.contains('hidden')) happyCard.classList.add('hidden');
});

btnToggleHappy?.addEventListener('click', () => {
  happyCard.classList.toggle('hidden');
  if (!almuerzoCard.classList.contains('hidden')) almuerzoCard.classList.add('hidden');
});

async function obtenerImagenDeEspecial(idEspecial) {
  const { data, error } = await supabase
    .from('imgEspeciales')
    .select('imagen')
    .eq('idEspecial', idEspecial)
    .maybeSingle();

  if (error || !data?.imagen) return null;
  return supabase.storage.from('galeriacomercios').getPublicUrl(data.imagen).data.publicUrl;
}

async function cargarEspecialesComercio() {
  const hoy = new Date();
  const hora = hoy.getHours();
  const dia = hoy.getDay();

  const { data: especiales, error } = await supabase
    .from('especialesDia')
    .select('*')
    .eq('idcomercio', idComercio)
    .eq('diasemana', dia)
    .eq('activo', true);

  if (error || !especiales) return;

  let tieneAlmuerzo = false;
  let tieneHappyHour = false;

  const listaAlmuerzo = [];
  const listaHappy = [];

  for (const especial of especiales) {
    const url = await obtenerImagenDeEspecial(especial.id);
    console.log(`🖼️ Imagen para ${especial.nombre} (${especial.tipo}):`, url);

    const card = `
      <div class="flex gap-4 items-start bg-white shadow p-4 rounded-lg mb-2">
        <img src="${url || ''}" alt="Imagen Especial" class="w-24 h-24 object-cover rounded-md">
        <div>
          <p class="font-semibold text-left text-md">${especial.nombre}</p>
          <p class="text-sm text-left text-gray-600 mb-1">${especial.descripcion || ''}</p>
          <p class="font-bold text-left text-green-600">$${especial.precio?.toFixed(2)}</p>
        </div>
      </div>`;

    if (especial.tipo === 'almuerzo' && hora >= 6 && hora < 16) {
      listaAlmuerzo.push(card);
      tieneAlmuerzo = true;
    }

    if (especial.tipo === 'happyhour') {
      listaHappy.push(card);
      tieneHappyHour = true;
    }
  }

  if (tieneAlmuerzo || tieneHappyHour) {
    especialesBox.classList.remove('hidden');
    tituloEspecialesBox.textContent = `Especiales para hoy ${hoy.toLocaleDateString('es-PR', { weekday: 'long' })}`;

    if (tieneAlmuerzo) {
      btnToggleAlmuerzo.classList.remove('hidden');
      almuerzoCard.innerHTML = `
        <h3 class="text-lg font-bold text-blue-500 mb-2 text-center">Especial de Almuerzo</h3>
        ${listaAlmuerzo.join('')}
      `;
    }

    if (tieneHappyHour) {
      btnToggleHappy.classList.remove('hidden');
      happyCard.innerHTML = `
        <h3 class="text-lg font-bold text-pink-500 mb-2 text-center">Happy Hour</h3>
        ${listaHappy.join('')}
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', cargarEspecialesComercio);