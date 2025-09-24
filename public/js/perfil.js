import { supabase } from '/shared/supabaseClient.js';
import { calcularTiempoEnVehiculo } from '/shared/utils.js';
import { calcularTiemposParaLista } from './calcularTiemposParaLista.js';
import { mostrarCercanosComida } from './cercanosComida.js';
import { mostrarPlayasCercanas } from './playasCercanas.js';
import { mostrarLugaresCercanos } from './lugaresCercanos.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
let latUsuario = null;
let lonUsuario = null;

async function mostrarSucursales(idComercio, nombreComercio) {
  const { data: relaciones, error: errorRelaciones } = await supabase
    .from('ComercioSucursales')
    .select('comercio_id, sucursal_id')
    .or(`comercio_id.eq.${idComercio},sucursal_id.eq.${idComercio}`);

  if (errorRelaciones) {
    console.error('Error consultando relaciones de sucursales:', errorRelaciones);
    return;
  }

  if (!relaciones || relaciones.length === 0) return;

  const idsRelacionados = relaciones.flatMap(r => [r.comercio_id, r.sucursal_id]);
  const idsUnicos = [...new Set(idsRelacionados.filter(id => id !== parseInt(idComercio)))];

  const { data: sucursales, error: errorSucursales } = await supabase
    .from('Comercios')
    .select('id, nombre, nombreSucursal')
    .in('id', idsUnicos);

  if (errorSucursales) {
    console.error('Error consultando sucursales:', errorSucursales);
    return;
  }

  if (!sucursales || sucursales.length === 0) return;

  const contenedor = document.getElementById('listaSucursales');
  const wrapper = document.getElementById('sucursalesContainer');
  if (!contenedor || !wrapper) return;

  sucursales.forEach(sucursal => {
    const btn = document.createElement('button');
    btn.textContent = sucursal.nombreSucursal || sucursal.nombre;
    btn.className = 'px-3 py-2 m-1 bg-red-600 text-white rounded-full text-base font-medium hover:bg-red-700 transition';
    btn.onclick = () => window.location.href = `perfilComercio.html?id=${sucursal.id}`;
    contenedor.appendChild(btn);
  });

  const titulo = document.getElementById('tituloSucursales');
  if (titulo) titulo.textContent = `Otras Sucursales de ${nombreComercio}`;

  wrapper.classList.remove('hidden');
}

export async function obtenerComercioPorID(idComercio) {
  const { data, error } = await supabase
    .from('Comercios')
    .select('*')
    .eq('id', idComercio)
    .single();

  if (error || !data) {
    console.error('Error cargando comercio:', error);
    return null;
  }

  document.getElementById('nombreComercio').textContent = data.nombre;
  if (data.nombreSucursal) {
    document.getElementById('nombreSucursal').textContent = data.nombreSucursal;
  }
  document.getElementById('textoDireccion').textContent = data.direccion;
  document.getElementById('telefonoComercio').innerHTML = `<i class="fa-solid fa-phone text-xl"></i> ${data.telefono}`;
  document.getElementById('telefonoComercio').href = `tel:${data.telefono}`;
  document.getElementById('nombreCercanosComida').textContent = data.nombre;

  if (data.whatsapp) document.getElementById('linkWhatsapp')?.setAttribute('href', data.whatsapp);
  if (data.facebook) document.getElementById('linkFacebook')?.setAttribute('href', data.facebook);
  if (data.instagram) document.getElementById('linkInstagram')?.setAttribute('href', data.instagram);
  if (data.tiktok) document.getElementById('linkTikTok')?.setAttribute('href', data.tiktok);
  if (data.webpage) document.getElementById('linkWeb')?.setAttribute('href', data.webpage);
  if (data.email) document.getElementById('linkEmail')?.setAttribute('href', `mailto:${data.email}`);

  const { data: imagenLogo } = await supabase
    .from('imagenesComercios')
    .select('imagen')
    .eq('idComercio', idComercio)
    .eq('logo', true)
    .maybeSingle();

  if (imagenLogo?.imagen) {
    const url = supabase.storage.from('galeriacomercios').getPublicUrl(imagenLogo.imagen).data.publicUrl;
    document.getElementById('logoComercio').src = url;
  }

  if (latUsuario && lonUsuario && data.latitud && data.longitud) {
    const [conTiempo] = await calcularTiemposParaLista([data], {
      lat: latUsuario,
      lon: lonUsuario
    });

    if (conTiempo?.minutosCrudos !== null) {
      const { texto } = calcularTiempoEnVehiculo(conTiempo.distanciaKm ?? 0);
      document.getElementById('tiempoVehiculo').innerHTML = `<i class="fas fa-car"></i> Aproximadamente a ${texto}`;
    }

    const googleMapsURL = `https://www.google.com/maps/search/?api=1&query=${data.latitud},${data.longitud}`;
    const wazeURL = `https://waze.com/ul?ll=${data.latitud},${data.longitud}&navigate=yes`;

    document.getElementById('btnGoogleMaps').href = googleMapsURL;
    document.getElementById('btnWaze').href = wazeURL;
  }

  if (data.tieneSucursales) await mostrarSucursales(idComercio, data.nombre);

  return data;
}

navigator.geolocation.getCurrentPosition(
  async (pos) => {
    latUsuario = pos.coords.latitude;
    lonUsuario = pos.coords.longitude;
    const comercio = await obtenerComercioPorID(idComercio);
    if (comercio) {
      mostrarCercanosComida(comercio);
      mostrarPlayasCercanas(comercio);
      mostrarLugaresCercanos(comercio);
    }
  },
  async () => {
    console.warn('❗ Usuario no permitió ubicación.');
    const comercio = await obtenerComercioPorID(idComercio);
    if (comercio) {
      mostrarCercanosComida(comercio);
      mostrarPlayasCercanas(comercio);
      mostrarLugaresCercanos(comercio);
    }
  }
);
