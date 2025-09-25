import { supabase } from '../shared/supabaseClient.js';

const container = document.getElementById('footerContainer');

// Detectar si estamos en Live Server y ajustar ruta base
const isLiveServer = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
const ruta = location.pathname;

let nivel = 0;
if (isLiveServer && ruta.includes('/public/')) {
  nivel = ruta.split('/public/')[1].split('/').filter(x => x && !x.includes('.')).length;
} else {
  nivel = ruta.split('/').filter(x => x && !x.includes('.')).length;
}

const base = nivel === 0 ? './' : '../'.repeat(nivel);

// Otros valores
const hora = new Date().getHours();
const esAlmuerzo = hora >= 6 && hora < 15;

const icono = esAlmuerzo ? 'cutlery.svg' : 'beer.svg';
const texto = esAlmuerzo ? 'Almuerzos' : 'Happy Hours';

const iconBase = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/appicon/';

const defaultCuentaImg = `${iconBase}profile.svg`;
const defaultCuentaTexto = 'Mi Cuenta';

function renderFooter() {
  if (!container) return;

  container.innerHTML = `
    <footer class="fixed bottom-0 left-0 right-0 z-50 bg-[#231F20] text-white border-t border-gray-700" style="padding-bottom: env(safe-area-inset-bottom);">
      <nav class="flex justify-around py-2">
        <a href="${base}index.html" class="flex flex-col items-center text-sm font-extralight w-1/4">
          <img src="${iconBase}iconInicio.png" class="w-8 h-8 mb-1" alt="Inicio">
          Inicio
        </a>
        <a href="${base}especiales/especialesDiarios.html" class="flex flex-col items-center text-sm font-extralight w-1/4">
          <img src="${iconBase}${icono}" class="w-8 h-8 mb-1" alt="${texto}">
          ${texto}
        </a>
        <a href="${base}listadoEventos.html" class="flex flex-col items-center text-sm font-extralight w-1/4">
          <img src="${iconBase}deadline.svg" class="w-8 h-8 mb-1" alt="Eventos">
          Eventos
        </a>
        <a id="enlaceMiCuenta" href="#" class="flex flex-col items-center text-sm font-extralight w-1/4">
          <img 
            id="footerImagen"
            src="${defaultCuentaImg}"
            class="w-8 h-8 mb-1 rounded-full object-cover"
            alt="Cuenta">
          <span id="footerTexto">${defaultCuentaTexto}</span>
        </a>
      </nav>
    </footer>
  `;
}

renderFooter();

document.addEventListener('DOMContentLoaded', async () => {
  const enlaceMiCuenta = document.getElementById('enlaceMiCuenta');
  const cuentaImagen = document.getElementById('footerImagen');
  const cuentaTexto = document.getElementById('footerTexto');

  if (!enlaceMiCuenta) return;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    if (session?.user) {
      const user = session.user;
      enlaceMiCuenta.href = '/usuarios/cuentaUsuario.html';

      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios')
        .select('nombre, imagen')
        .eq('id', user.id)
        .single();

      if (!perfilError && perfil) {
        if (perfil.imagen) {
          cuentaImagen.src = perfil.imagen;
          cuentaImagen.classList.add('rounded-full', 'object-cover');
        }
        cuentaTexto.textContent = perfil.nombre || user.email.split('@')[0];
      } else {
        cuentaTexto.textContent = user.email.split('@')[0];
      }
    } else {
      cuentaImagen.src = defaultCuentaImg;
      cuentaTexto.textContent = defaultCuentaTexto;
      enlaceMiCuenta.href = 'https://admin.enpe-erre.com/logearse.html';
    }
  } catch (error) {
    console.error('Error verificando sesión:', error);
    cuentaImagen.src = defaultCuentaImg;
    cuentaTexto.textContent = defaultCuentaTexto;
    enlaceMiCuenta.href = 'https://admin.enpe-erre.com/logearse.html';
  }
});
