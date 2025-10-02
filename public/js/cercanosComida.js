import { cardComercioSlide } from './cardComercioSlide.js';
import { supabase } from '../shared/supabaseClient.js';
import { getPublicBase, calcularTiempoEnVehiculo } from '../shared/utils.js';
import { getDrivingDistance, formatTiempo } from '../shared/osrmClient.js';
import { calcularDistancia } from './distanciaLugar.js';

export async function mostrarCercanosComida(comercioOrigen) {
  const origenCoords = { lat: comercioOrigen.latitud, lon: comercioOrigen.longitud };

  if (!origenCoords.lat || !origenCoords.lon) {
    console.warn('⚠️ Comercio origen sin coordenadas.');
    return;
  }

  const { data: comercios, error } = await supabase
    .from('Comercios')
    .select('*')
    .neq('id', comercioOrigen.id);

  if (error) {
    console.error('❌ Error trayendo comercios:', error);
    return;
  }

  const comerciosConCoords = comercios.filter(c =>
    typeof c.latitud === 'number' &&
    typeof c.longitud === 'number' &&
    !isNaN(c.latitud) &&
    !isNaN(c.longitud)
  );

  console.log(`🔎 ${comerciosConCoords.length} comercios con coordenadas encontradas.`);

  const listaConTiempos = await Promise.all(comerciosConCoords.map(async (comercio) => {
    const resultado = await getDrivingDistance(
      origenCoords.lat,
      origenCoords.lon,
      comercio.latitud,
      comercio.longitud
    );

    let minutos = null;
    let texto = null;
    let distanciaKm = typeof resultado?.distance === 'number'
      ? resultado.distance / 1000
      : null;

    if (resultado?.duration != null) {
      minutos = Math.round(resultado.duration / 60);
      texto = formatTiempo(resultado.duration);
    }

    if (texto == null) {
      const distanciaFallback = distanciaKm ?? calcularDistancia(
        origenCoords.lat,
        origenCoords.lon,
        comercio.latitud,
        comercio.longitud
      );

      if (Number.isFinite(distanciaFallback) && distanciaFallback > 0) {
        distanciaKm = distanciaFallback;
        const fallbackTiempo = calcularTiempoEnVehiculo(distanciaFallback);
        minutos = fallbackTiempo.minutos;
        texto = formatTiempo(fallbackTiempo.minutos * 60);
      } else {
        texto = 'Distancia no disponible';
      }
    }

    return {
      ...comercio,
      minutosCrudos: minutos,
      tiempoVehiculo: texto,
      tiempoTexto: texto,
      distanciaKm,
      distanciaTexto: Number.isFinite(distanciaKm) ? `${distanciaKm.toFixed(1)} km` : null
    };
  }));

  // Traer portadas y logos
  const { data: imagenes, error: errorImg } = await supabase
    .from('imagenesComercios')
    .select('imagen, idComercio, portada, logo')
    .or('portada.eq.true,logo.eq.true');

  if (errorImg) {
    console.error('❌ Error trayendo imágenes:', errorImg);
  }

  listaConTiempos.forEach(comercio => {
    const imgPortada = imagenes?.find(img => img.idComercio === comercio.id && img.portada);
    const imgLogo = imagenes?.find(img => img.idComercio === comercio.id && img.logo);

    const activo = comercio.activo === true || comercio.activo === 'true' || comercio.activo === 1;

    comercio.imagenPortada = activo
      ? (imgPortada
          ? getPublicBase(`galeriacomercios/${imgPortada.imagen}`)
          : 'https://placehold.co/200x120?text=Sin+Portada')
      : getPublicBase('galeriacomercios/NoActivoPortada.jpg');

    comercio.logo = activo
      ? (imgLogo
          ? getPublicBase(`galeriacomercios/${imgLogo.imagen}`)
          : 'https://placehold.co/40x40?text=Logo')
      : getPublicBase('galeriacomercios/NoActivoLogo.png');
  });

  // Filtrar los que están a 10 minutos o menos
  const cercanos = listaConTiempos
    .filter(c => c.minutosCrudos !== null && c.minutosCrudos <= 10)
    .sort((a, b) => a.minutosCrudos - b.minutosCrudos);

  console.log(`✅ ${cercanos.length} comercios cercanos encontrados.`);

  const container = document.getElementById('cercanosComidaContainer');
  const slider = document.getElementById('sliderCercanosComida');

  if (cercanos.length > 0 && container && slider) {
    slider.innerHTML = '';
    cercanos.forEach(c => slider.appendChild(cardComercioSlide(c)));
    container.classList.remove('hidden');
  } else {
    console.info('ℹ️ No hay comercios cercanos para mostrar.');
  }
}
