const container = document.getElementById('headerContainer');

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

container.innerHTML = `
  <header class="bg-[#231F20] text-white flex items-center justify-between p-4 shadow-md">
    <button id="btnBack" class="text-xl invisible w-6">&#8592;</button>
    <a href="${base}index.html" class="flex-1 text-center">
      <img
        src="https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/Logo_fondo%20oscuro.png"
        alt="Logo"
        class="h-8 inline-block"
      >
    </a>
    <div class="w-6"></div>
  </header>
`;

document.addEventListener('DOMContentLoaded', () => {
  const btnBack = document.getElementById('btnBack');
  if (window.history.length > 1) {
    btnBack.classList.remove('invisible');
    btnBack.addEventListener('click', () => history.back());
  }
});