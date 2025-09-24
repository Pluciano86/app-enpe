import { calcularTiemposParaLista } from './calcularTiemposParaLista.js';
import { cardComercio } from './CardComercio.js';
import { supabase } from '/shared/supabaseClient.js';

// Ajusta estos IDs según tu Supabase
const ID_PLAYAS = 1;
const ID_LUGARES = 2;
const IDS_COMIDA = [3, 4, 5, 6]; // Ej: restaurantes, panaderías, coffee shops, food trucks

export function cargarCercanosDesdeUsuario() {
  if (!navigator.geolocation) {
    console.warn("Geolocalización no soportada.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const origen = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      };

      await Promise.all([
        cargarCercanosCategoria(IDS_COMIDA, 10, 'sliderCercanosComida', 'cercanosComidaContainer'),
        cargarCercanosCategoria([ID_PLAYAS], 45, 'sliderPlayasCercanas', 'cercanosPlayasContainer'),
        cargarCercanosCategoria([ID_LUGARES], 45, 'sliderCercanosLugares', 'cercanosLugaresContainer'),
      ]);
    },
    (err) => {
      console.error("❌ No se pudo obtener la ubicación del usuario:", err);
    }
  );
}

async function cargarCercanosCategoria(idCategorias, minutosMax, idSlider, idContainer) {
  const { data: comercios, error } = await supabase
    .from('Comercios')
    .select('*')
    .overlaps('idCategoria', idCategorias);

  if (error) {
    console.error(`❌ Error cargando comercios para categoría ${idCategorias}:`, error);
    return;
  }

  const origen = {
    lat: navigator.geolocation?.lastPosition?.coords?.latitude,
    lon: navigator.geolocation?.lastPosition?.coords?.longitude,
  };

  const conCoords = comercios.filter(c =>
    typeof c.latitud === 'number' &&
    typeof c.longitud === 'number'
  );

  const conTiempo = await calcularTiemposParaLista(conCoords, origen);
  const cercanos = conTiempo.filter(c => c.minutosCrudos !== null && c.minutosCrudos <= minutosMax);

  const container = document.getElementById(idContainer);
  const slider = document.getElementById(idSlider);
  if (!container || !slider) return;

  if (cercanos.length > 0) {
    slider.innerHTML = '';
    cercanos.forEach(c => slider.appendChild(cardComercio(c)));
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}