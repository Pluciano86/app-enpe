import { supabase } from '../shared/supabaseClient.js';
import { translateDom } from './i18n.js';

const container = document.getElementById('footerContainer');

// Detectar si estamos en Live Server y ajustar ruta base
const isLiveServer = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
const ruta = location.pathname;
const loginPath = isLiveServer ? '/public/logearse.html' : '/logearse.html';
const cuentaPath = isLiveServer ? '/public/usuarios/cuentaUsuario.html' : '/usuarios/cuentaUsuario.html';

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

const defaultCuentaImg = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/findixi/iconoPerfil.png';
const defaultCuentaTexto = 'Mi Cuenta';

function renderFooter() {
  if (!container) return;

  const maxWidth = '28rem'; // igual que max-w-md para alinear con el header/columna
  container.innerHTML = `
    <footer
      class="fixed bottom-0 z-50 text-white bg-[#023047] border-t border-gray-700 shadow-lg"
      style="
        padding-bottom: env(safe-area-inset-bottom);
        width: 100%;
        max-width: ${maxWidth};
        left: 50%;
        transform: translateX(-50%);
      ">
      <nav class="flex justify-around py-2">
        <a href="${base}index.html" class="flex flex-col items-center text-sm font-extralight w-1/4">
          <img src="https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/findixi/iconoHome.png" class="w-8 h-8 mb-1" alt="Inicio">
          <span data-i18n="footer.inicio">Inicio</span>
        </a>
        <a href="${base}cercaDeMi.html" class="flex flex-col items-center text-sm font-extralight w-1/4">
          <img src="https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/findixi/iconoNearMe.png" class="w-8 h-8 mb-1" alt="Cerca de Mi">
          <span data-i18n="footer.cerca">Cerca de Mi</span>
        </a>
        <a href="${base}listadoEventos.html" class="flex flex-col items-center text-sm font-extralight w-1/4">
          <img src="https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/findixi/iconoEventos.png" class="w-8 h-8 mb-1" alt="Eventos">
          <span data-i18n="footer.eventos">Eventos</span>
        </a>
        <a id="enlaceMiCuenta" href="${loginPath}" class="flex flex-col items-center text-sm font-extralight w-1/4">
          <img 
            id="footerImagen"
            src="${defaultCuentaImg}"
            class="w-8 h-8 mb-1"
            alt="Cuenta">
          <span id="footerTexto" data-i18n="footer.cuenta">${defaultCuentaTexto}</span>
        </a>
      </nav>
    </footer>
  `;
}

renderFooter();
translateDom(container);

window.addEventListener('lang:changed', () => translateDom(container));

document.addEventListener('DOMContentLoaded', async () => {
  // Lazy-load para medios pesados (si no se especificó)
  document.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
  });

  const enlaceMiCuenta = document.getElementById('enlaceMiCuenta');
  const cuentaImagen = document.getElementById('footerImagen');
  const cuentaTexto = document.getElementById('footerTexto');

  if (!enlaceMiCuenta) return;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    if (session?.user) {
      const user = session.user;
      enlaceMiCuenta.href = cuentaPath;

      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios')
        .select('nombre, imagen')
        .eq('id', user.id)
        .maybeSingle();

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
      enlaceMiCuenta.href = loginPath;
    }
  } catch (error) {
    console.error('Error verificando sesión:', error);
    cuentaImagen.src = defaultCuentaImg;
    cuentaTexto.textContent = defaultCuentaTexto;
    enlaceMiCuenta.href = loginPath;
  }
});
