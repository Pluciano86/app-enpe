import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
const galeriaContenedor = document.getElementById('galeriaImagenes');

let imagenesGaleria = [];
let imagenActual = 0;

async function cargarGaleria() {
  const { data, error } = await supabase
    .from('imagenesComercios')
    .select('imagen')
    .eq('idComercio', idComercio)
    .or('logo.is.false,logo.is.null')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error cargando imágenes', error);
    return;
  }

  imagenesGaleria = data.map(i =>
    supabase.storage.from('galeriacomercios').getPublicUrl(i.imagen).data.publicUrl
  );

  imagenesGaleria.forEach((url, index) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Imagen del comercio';
    img.className = 'h-64 object-cover w-full cursor-pointer snap-center transition-transform duration-500 ease-in-out';
    img.onclick = () => abrirModal(index);
    galeriaContenedor.appendChild(img);
  });

  // ✅ Clonar la primera imagen para loop suave
  if (imagenesGaleria.length > 0) {
    const clone = galeriaContenedor.children[0].cloneNode(true);
    galeriaContenedor.appendChild(clone);
  }

  iniciarAutoSlide();
}

function iniciarAutoSlide() {
  let currentIndex = 0;
  const total = galeriaContenedor.children.length;

  setInterval(() => {
    currentIndex++;
    galeriaContenedor.scrollTo({
      left: galeriaContenedor.clientWidth * currentIndex,
      behavior: 'smooth',
    });

    if (currentIndex === total - 1) {
      setTimeout(() => {
        galeriaContenedor.scrollTo({
          left: 0,
          behavior: 'auto'
        });
        currentIndex = 0;
      }, 500); // esperar a que termine la animación
    }
  }, 4000);
}

// 🔍 MODAL

function abrirModal(index) {
  const modal = document.getElementById('modalGaleria');
  const slider = document.getElementById('sliderModal');
  if (!modal || !slider) return;

  slider.innerHTML = '';
  imagenActual = index;

  imagenesGaleria.forEach((url) => {
    const slide = document.createElement('img');
    slide.src = url;
    slide.className = 'w-full object-contain';
    slider.appendChild(slide);
  });

  slider.style.transform = `translateX(-${imagenActual * 100}%)`;
  modal.classList.remove('hidden');
}

// ❌ cerrar al dar clic fuera
document.getElementById('modalGaleria')?.addEventListener('click', (e) => {
  if (e.target.id === 'modalGaleria') {
    document.getElementById('modalGaleria')?.classList.add('hidden');
  }
});

// ❌ cerrar con X
document.getElementById('cerrarModal')?.addEventListener('click', () => {
  document.getElementById('modalGaleria')?.classList.add('hidden');
});

// ⬅️➡️ navegación dentro del modal
document.getElementById('prevModal')?.addEventListener('click', () => {
  if (imagenActual > 0) imagenActual--;
  else imagenActual = imagenesGaleria.length - 1;
  document.getElementById('sliderModal').style.transform = `translateX(-${imagenActual * 100}%)`;
});

document.getElementById('nextModal')?.addEventListener('click', () => {
  if (imagenActual < imagenesGaleria.length - 1) imagenActual++;
  else imagenActual = 0;
  document.getElementById('sliderModal').style.transform = `translateX(-${imagenActual * 100}%)`;
});

cargarGaleria();