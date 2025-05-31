import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
const galeriaContenedor = document.getElementById('galeriaImagenes');

let imagenesGaleria = [];
let imagenActual = 0;
let modalSlider; // referencia global para usar en swipe

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
        galeriaContenedor.scrollTo({ left: 0, behavior: 'auto' });
        currentIndex = 0;
      }, 100);
    }
  }, 3000);
}

function abrirModal(index) {
  const modal = document.getElementById('modalGaleria');
  modalSlider = document.getElementById('sliderModal');
  if (!modal || !modalSlider) return;

  modalSlider.innerHTML = '';
  imagenActual = index;

  // Establecer el ancho total del slider
  modalSlider.style.display = 'flex';
  modalSlider.style.transition = 'transform 0.5s ease';
  modalSlider.style.width = `${imagenesGaleria.length * 100}%`;

  imagenesGaleria.forEach((url) => {
    const slide = document.createElement('img');
    slide.src = url;
    slide.className = 'object-contain flex-shrink-0';
    slide.style.maxHeight = '90vh';
    slide.style.width = `${100 / imagenesGaleria.length}%`; // Ajusta para que todas entren en línea
    modalSlider.appendChild(slide);
  });

  modalSlider.style.transform = `translateX(-${imagenActual * (100 / imagenesGaleria.length)}%)`;
  modal.classList.remove('hidden');
}

document.getElementById('modalGaleria')?.addEventListener('click', (e) => {
  if (e.target.id === 'modalGaleria') {
    document.getElementById('modalGaleria')?.classList.add('hidden');
  }
});

document.getElementById('cerrarModal')?.addEventListener('click', () => {
  document.getElementById('modalGaleria')?.classList.add('hidden');
});

document.getElementById('prevModal')?.addEventListener('click', () => {
  if (!modalSlider) return;
  if (imagenActual > 0) imagenActual--;
  else imagenActual = imagenesGaleria.length - 1;
  modalSlider.style.transform = `translateX(-${imagenActual * 100}%)`;
});

document.getElementById('nextModal')?.addEventListener('click', () => {
  if (!modalSlider) return;
  if (imagenActual < imagenesGaleria.length - 1) imagenActual++;
  else imagenActual = 0;
  modalSlider.style.transform = `translateX(-${imagenActual * 100}%)`;
});

// SWIPE - TOUCH
let startX = 0;
document.getElementById('sliderModal')?.addEventListener('touchstart', (e) => {
  startX = e.touches[0].clientX;
});
document.getElementById('sliderModal')?.addEventListener('touchend', (e) => {
  const diff = e.changedTouches[0].clientX - startX;
  handleSwipe(diff);
});

// SWIPE - MOUSE
let isDragging = false;
document.getElementById('sliderModal')?.addEventListener('mousedown', (e) => {
  isDragging = true;
  startX = e.clientX;
});
document.getElementById('sliderModal')?.addEventListener('mouseup', (e) => {
  if (!isDragging) return;
  isDragging = false;
  const diff = e.clientX - startX;
  handleSwipe(diff);
});

function handleSwipe(diff) {
  const threshold = 50;
  if (diff > threshold && imagenActual > 0) {
    imagenActual--;
  } else if (diff < -threshold && imagenActual < imagenesGaleria.length - 1) {
    imagenActual++;
  }
  if (modalSlider) {
    modalSlider.style.transform = `translateX(-${imagenActual * 100}%)`;
  }
}

cargarGaleria();