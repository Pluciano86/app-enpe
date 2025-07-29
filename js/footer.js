const container = document.getElementById('footerContainer');

const hora = new Date().getHours();
const esAlmuerzo = hora >= 6 && hora < 15;

const icono = esAlmuerzo ? 'cutlery.svg' : 'beer.svg';
const texto = esAlmuerzo ? 'Almuerzos' : 'Happy Hours';

const iconBase = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/appicon/';
const nivelActual = location.pathname.split('/').length - 2;
const base = '../'.repeat(nivelActual);

// Valores por defecto si no está logeado
let cuentaImg = `${iconBase}profile.svg`;
let cuentaTexto = `Mi Cuenta`;
let cuentaHref = `${base}admin/login/logearse.html`;

(async () => {
  try {
    const { supabase } = await import('/js/supabaseClient.js');
    const { data: { user }, error } = await supabase.auth.getUser();

    if (user && !error) {
      const uid = user.id;
      const { data: perfil } = await supabase
        .from('usuarios')
        .select('nombre, imagen')
        .eq('id', uid)
        .single();

      if (perfil) {
        cuentaImg = perfil.imagen || cuentaImg;
        cuentaTexto = perfil.nombre || user.email.split('@')[0];
        cuentaHref = `${base}admin/usuarios/cuentaUsuario.html`; // ← solo si está logeado
      }
    }
  } catch (error) {
    console.warn('⚠️ No logueado o Supabase no disponible:', error.message);
  }

  // Generar el footer
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
       <a href="${cuentaHref}" class="flex flex-col items-center text-sm font-extralight w-1/4">
  <img 
    src="${cuentaImg}" 
    class="w-8 h-8 mb-1 ${cuentaImg.includes('profile.svg') ? '' : 'rounded-full object-cover'}" 
    alt="Cuenta">
  ${cuentaTexto}
</a>
      </nav>
    </footer>
  `;
})();