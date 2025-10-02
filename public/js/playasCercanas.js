import { supabase } from '../shared/supabaseClient.js';
import { cardPlayaSlide } from './cardPlayaSlide.js';
import { obtenerClima } from './obtenerClima.js';
import { getDrivingDistance, formatTiempo } from '../shared/osrmClient.js';
import { calcularTiempoEnVehiculo } from '../shared/utils.js';
import { calcularDistancia } from './distanciaLugar.js';

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

  // Buscar playas con coordenadas
  const { data: playas, error } = await supabase
    .from('playas')
    .select('*')
    .not('latitud', 'is', null)
    .not('longitud', 'is', null);

  if (error || !playas || playas.length === 0) return;

  const conTiempo = await Promise.all(playas.map(async (playa) => {
    const resultado = await getDrivingDistance(
      { lat: comercio.latitud, lng: comercio.longitud },
      { lat: playa.latitud, lng: playa.longitud }
    );

    let minutos = null;
    let texto = null;
    let distanciaKm = typeof resultado?.distancia === 'number'
      ? resultado.distancia / 1000
      : null;

    if (resultado?.duracion != null) {
      minutos = Math.round(resultado.duracion / 60);
      texto = formatTiempo(resultado.duracion);
    }

    if (texto == null) {
      const distanciaFallback = distanciaKm ?? calcularDistancia(
        comercio.latitud,
        comercio.longitud,
        playa.latitud,
        playa.longitud
      );

      if (Number.isFinite(distanciaFallback) && distanciaFallback > 0) {
        distanciaKm = distanciaFallback;
        const fallbackTiempo = calcularTiempoEnVehiculo(distanciaFallback);
        minutos = fallbackTiempo.minutos;
        texto = formatTiempo(fallbackTiempo.minutos * 60);
      } else {
        texto = 'N/D';
      }
    }

    return {
      ...playa,
      minutosCrudos: minutos,
      tiempoVehiculo: texto,
      tiempoTexto: texto,
      distanciaKm,
      distanciaTexto: Number.isFinite(distanciaKm) ? `${distanciaKm.toFixed(1)} km` : null
    };
  }));

  const filtradas = conTiempo
    .filter(p => p.minutosCrudos !== null && p.minutosCrudos <= 45)
    .sort((a, b) => a.minutosCrudos - b.minutosCrudos);

  if (filtradas.length === 0) return;

  if (nombreSpan) nombreSpan.textContent = comercio.nombre;
  seccion.classList.remove('hidden');

  for (const playa of filtradas) {
    // 🔍 Obtener imagen de portada desde la tabla imagenesPlayas
    let imagenURL = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/imgPlayaNoDisponible.jpg';

    const { data: imgData, error: errorImg } = await supabase
      .from('imagenesPlayas')
      .select('imagen')
      .eq('idPlaya', playa.id)
      .eq('portada', true)
      .single();

    if (imgData?.imagen) {
      imagenURL = imgData.imagen;
    }

    console.log(`🧪 Imagen usada para ${playa.nombre}:`, imagenURL);

    // Obtener clima
    const clima = await obtenerClima(playa.latitud, playa.longitud);

    // Crear tarjeta
    const card = cardPlayaSlide({
      id: playa.id,
      nombre: playa.nombre,
      imagen: imagenURL,
      municipio: playa.municipio,
      clima: {
        estado: clima?.estado || 'Clima desconocido',
        iconoURL: clima?.iconoURL || ''
      },
      tiempoTexto: playa.tiempoTexto || 'N/D'
    });

    contenedor.appendChild(card);
  }
}
