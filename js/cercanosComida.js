import { supabase } from '../js/supabaseClient.js';
import { crearCardComercioSlide } from './cardComercioSlide.js';
import { obtenerCercanos } from './cercaDeComercio.js';

const slide = document.getElementById('slideComida');
const contenedor = document.getElementById('contenedorComidaCercana');

async function cargarCercanosComida() {
  const categorias = ['Restaurantes', 'FoodTrucks', 'Coffee Shops', 'Panaderías'];
const comercios = await obtenerCercanos({ categorias });

  console.log('🍽 Comercios cercanos para comer:', comercios);

  if (!comercios || comercios.length === 0) {
    console.warn('❌ No hay comercios cercanos abiertos.');
    return;
  }

  for (const comercio of comercios) {
    const card = await crearCardComercioSlide(comercio);
    slide.appendChild(card);
  }

  contenedor.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', cargarCercanosComida);