const container = document.getElementById('headerContainer');

container.innerHTML = `
  <header class="bg-[#231F20] text-white flex items-center justify-between p-4 shadow-md">
    <button id="btnBack" class="text-xl invisible w-6">&#8592;</button>

    <a href="index.html" class="flex-1 text-center">
      <img src="https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/Logo_fondo%20oscuro.png"
           alt="Logo" class="h-8 inline-block">
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