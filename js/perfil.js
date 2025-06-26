import { supabase } from './supabaseClient.js';
import { calcularTiemposParaLista } from './calcularTiemposParaLista.js';
import { mostrarCercanosComida } from './cercanosComida.js';
import { mostrarPlayasCercanas } from './playasCercanas.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
let latUsuario = null;
let lonUsuario = null;

async function cargarPerfilComercio() {
  const { data, error } = await supabase
    .from('Comercios')
    .select('*')
    .eq('id', idComercio)
    .single();

  if (error || !data) {
    console.error('Error cargando comercio:', error);
    return null;
  }

  const nombre = document.getElementById('nombreComercio');
  const telefono = document.getElementById('telefonoComercio');
  const textoDireccion = document.getElementById('textoDireccion');
  const logo = document.getElementById('logoComercio');
  const nombreCercanos = document.getElementById('nombreCercanosComida');

  if (nombreCercanos) nombreCercanos.textContent = data.nombre;

  if (nombre) nombre.textContent = data.nombre;

  if (telefono) {
    telefono.href = `tel:${data.telefono}`;
    telefono.innerHTML = `<i class="fa-solid fa-phone text-xl"></i> ${data.telefono}`;
  }

  if (textoDireccion) textoDireccion.textContent = data.direccion;

  // Redes sociales
  if (data.whatsapp) document.getElementById('linkWhatsapp')?.setAttribute('href', data.whatsapp);
  if (data.facebook) document.getElementById('linkFacebook')?.setAttribute('href', data.facebook);
  if (data.instagram) document.getElementById('linkInstagram')?.setAttribute('href', data.instagram);
  if (data.webpage) document.getElementById('linkWeb')?.setAttribute('href', data.webpage);

  // Logo
  const { data: imagenes } = await supabase
    .from('imagenesComercios')
    .select('imagen')
    .eq('idComercio', idComercio)
    .eq('logo', true)
    .single();

  if (imagenes && logo) {
    const url = supabase.storage.from('galeriacomercios').getPublicUrl(imagenes.imagen).data.publicUrl;
    logo.src = url;
  }

  // Distancia desde usuario
  if (latUsuario && lonUsuario && data.latitud && data.longitud) {
    const [conTiempo] = await calcularTiemposParaLista([data], {
      lat: latUsuario,
      lon: lonUsuario
    });

    const divTiempo = document.getElementById('tiempoVehiculo');
    if (divTiempo && conTiempo?.tiempoVehiculo) {
      divTiempo.innerHTML = `<i class="fas fa-car"></i> ${conTiempo.tiempoVehiculo}`;
    }
      // Enlaces a Google Maps y Waze
  if (data.latitud && data.longitud) {
    const googleMapsURL = `https://www.google.com/maps/search/?api=1&query=${data.latitud},${data.longitud}`;
    const wazeURL = `https://waze.com/ul?ll=${data.latitud},${data.longitud}&navigate=yes`;

    const btnGoogleMaps = document.getElementById('btnGoogleMaps');
    const btnWaze = document.getElementById('btnWaze');

    if (btnGoogleMaps) btnGoogleMaps.href = googleMapsURL;
    if (btnWaze) btnWaze.href = wazeURL;
  }
    data.tiempoVehiculo = conTiempo?.tiempoVehiculo || '';
    data.minutosCrudos = conTiempo?.minutosCrudos || null;
  }

  return data;
}

// Obtener ubicación del usuario primero y luego cargar perfil
navigator.geolocation.getCurrentPosition(
  async (pos) => {
    latUsuario = pos.coords.latitude;
    lonUsuario = pos.coords.longitude;
    const comercio = await cargarPerfilComercio();
    if (comercio) {
      mostrarCercanosComida(comercio);
      mostrarPlayasCercanas(comercio); // ✅ NUEVO
    }
  },
  async () => {
    console.warn('❗ Usuario no permitió ubicación.');
    const comercio = await cargarPerfilComercio();
    if (comercio) {
      mostrarCercanosComida(comercio);
      mostrarPlayasCercanas(comercio); // ✅ NUEVO
    }
  }
);