import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');

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
}

document.addEventListener('DOMContentLoaded', cargarPerfilComercio);