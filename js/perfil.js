import { supabase } from './supabaseClient.js';
import { calcularTiemposParaLista } from './calcularTiemposParaLista.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
let latUsuario = null;
let lonUsuario = null;

async function cargarPerfilComercio() {
  const { data, error } = await supabase.from('Comercios').select('*').eq('id', idComercio).single();

  if (error || !data) {
    console.error('Error cargando comercio:', error);
    return;
  }

  const nombre = document.getElementById('nombreComercio');
  const telefono = document.getElementById('telefonoComercio');
  const textoDireccion = document.getElementById('textoDireccion');
  const logo = document.getElementById('logoComercio');

  if (nombre) nombre.textContent = data.nombre;

  if (telefono) {
    telefono.href = `tel:${data.telefono}`;
    telefono.innerHTML = `<i class="fa-solid fa-phone text-xl"></i> ${data.telefono}`;
  }

  if (textoDireccion) textoDireccion.textContent = data.direccion;

  // redes sociales
  if (data.whatsapp) document.getElementById('linkWhatsapp')?.setAttribute('href', data.whatsapp);
  if (data.facebook) document.getElementById('linkFacebook')?.setAttribute('href', data.facebook);
  if (data.instagram) document.getElementById('linkInstagram')?.setAttribute('href', data.instagram);
  if (data.webpage) document.getElementById('linkWeb')?.setAttribute('href', data.webpage);

  // cargar logo
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

  // 🚗 Calcular distancia desde la ubicación del usuario
  if (latUsuario && lonUsuario && data.latitud && data.longitud) {
    const [conTiempo] = await calcularTiemposParaLista([data], {
      lat: latUsuario,
      lon: lonUsuario
    });

    const divTiempo = document.getElementById('tiempoVehiculo');
    if (divTiempo) {
      divTiempo.innerHTML = `<i class="fas fa-car"></i> ${conTiempo.tiempoVehiculo}`;
    }
  }
}

// Obtener ubicación del usuario primero
navigator.geolocation.getCurrentPosition(
  async (pos) => {
    latUsuario = pos.coords.latitude;
    lonUsuario = pos.coords.longitude;
    await cargarPerfilComercio();
  },
  async () => {
    console.warn('❗ Usuario no permitió ubicación.');
    await cargarPerfilComercio(); // cargar sin distancia
  }
);