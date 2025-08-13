import { supabase } from './supabaseClient.js';
import { calcularTiemposParaLista } from './calcularTiemposParaLista.js';
import { mostrarCercanosComida } from './cercanosComida.js';
import { mostrarPlayasCercanas } from './playasCercanas.js';
import { mostrarLugaresCercanos } from './lugaresCercanos.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
let latUsuario = null;
let lonUsuario = null;

function formatearMinutosConversacional(minutos) {
  if (minutos < 60) return `Aproximadamente a ${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return mins === 0
    ? `Aproximadamente a ${horas} ${horas === 1 ? 'hora' : 'horas'}`
    : `Aproximadamente a ${horas} ${horas === 1 ? 'hora' : 'horas'} y ${mins} minutos`;
}

async function mostrarSucursales(idComercio) {
  const { data: relaciones } = await supabase
    .from('ComercioSucursales')
    .select('idSucursal, idComercio')
    .or(`idComercio.eq.${idComercio},idSucursal.eq.${idComercio}`);

  if (!relaciones || relaciones.length === 0) return;

  const ids = relaciones
    .map(r => (r.idSucursal == idComercio ? r.idComercio : r.idSucursal))
    .filter(id => id !== idComercio);

  const { data: sucursales } = await supabase
    .from('Comercios')
    .select('id, nombre, nombreSucursal')
    .in('id', ids);

  if (!sucursales || sucursales.length === 0) return;

  const contenedor = document.getElementById('listaSucursales');
  const wrapper = document.getElementById('sucursalesContainer');
  if (!contenedor || !wrapper) return;

  sucursales.forEach(sucursal => {
    const btn = document.createElement('button');
    btn.textContent = sucursal.nombreSucursal || sucursal.nombre;
    btn.className = 'px-3 py-2 m-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200';
    btn.onclick = () => window.location.href = `perfilComercio.html?id=${sucursal.id}`;
    contenedor.appendChild(btn);
  });

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
      const tiempoFormateado = formatearMinutosConversacional(conTiempo.minutosCrudos);
      document.getElementById('tiempoVehiculo').innerHTML = `<i class="fas fa-car"></i> ${tiempoFormateado}`;
    }

    const googleMapsURL = `https://www.google.com/maps/search/?api=1&query=${data.latitud},${data.longitud}`;
    const wazeURL = `https://waze.com/ul?ll=${data.latitud},${data.longitud}&navigate=yes`;

    document.getElementById('btnGoogleMaps').href = googleMapsURL;
    document.getElementById('btnWaze').href = wazeURL;
  }

  if (data.tieneSucursales) await mostrarSucursales(idComercio);

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