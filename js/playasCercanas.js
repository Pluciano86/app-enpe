import { supabase } from './supabaseClient.js';
import { cardPlayaSlide } from './cardPlayaSlide.js';
import { obtenerClima } from './obtenerClima.js';
import { calcularTiemposParaLugares } from './distanciaLugar.js';

export async function mostrarPlayasCercanas(comercio) {
  const contenedor = document.getElementById('sliderPlayasCercanas');
  const seccion = document.getElementById('cercanosPlayasContainer');
  const nombreSpan = document.getElementById('nombreCercanosPlayas');

  if (!contenedor || !seccion) return;

  // Verificar si municipio tiene costa
  const { data: municipioData } = await supabase
    .from('Municipios')
    .select('costa')
    .eq('nombre', comercio.municipio)
    .single();

  if (!municipioData?.costa) return;

  // Buscar playas del mismo municipio
  const { data: playas, error } = await supabase
  .from('playas')
  .select('*')
  .not('latitud', 'is', null)
  .not('longitud', 'is', null);

  if (error || !playas || playas.length === 0) return;

  // Calcular tiempo desde el comercio hacia cada playa
  const conTiempo = await calcularTiemposParaLugares(playas, {
    lat: comercio.latitud,
    lon: comercio.longitud
  });

  const filtradas = conTiempo
    .filter(p => p.minutosCrudos !== null && p.minutosCrudos <= 45)
    .sort((a, b) => a.minutosCrudos - b.minutosCrudos);

  if (filtradas.length === 0) return;

  if (nombreSpan) nombreSpan.textContent = comercio.nombre;
  seccion.classList.remove('hidden');

  for (const playa of filtradas) {
    // Imagen: Supabase o default
    let imagenURL;
if (playa.imagen) {
  const { data: imgData } = supabase.storage.from('galeriacomercios').getPublicUrl(playa.imagen);
  imagenURL = imgData?.publicUrl || 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/imgPlayaNoDisponible.jpg';
} else {
  imagenURL = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/imgPlayaNoDisponible.jpg';
}

    // Clima
    const clima = await obtenerClima(playa.latitud, playa.longitud);

    const card = cardPlayaSlide({
  id: playa.id,
  nombre: playa.nombre,
  imagen: imagenURL,
  municipio: playa.municipio,
  clima: {
    estado: clima?.estado || 'Clima desconocido',
    iconoURL: clima?.iconoURL || ''
  },
  tiempoTexto: playa.tiempoVehiculo || 'Cercana'
});

    contenedor.appendChild(card);
  }
}