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
  }, 3000); // acelerado para que el salto sea menos perceptible
}

function abrirModal(index) {
  const modal = document.getElementById('modalGaleria');
  const slider = document.getElementById('sliderModal');
  if (!modal || !slider) return;

  slider.innerHTML = ''; // limpiar slider
  imagenActual = index;

  imagenesGaleria.forEach((url) => {
    const slide = document.createElement('img');
    slide.src = url;
    slide.className = 'w-full object-contain flex-shrink-0';
    slide.style.maxHeight = '90vh';
    slider.appendChild(slide);
  });

  // Aplica el estilo para mostrar la imagen correcta
  slider.style.display = 'flex';
  slider.style.transition = 'transform 0.5s ease';
  slider.style.transform = `translateX(-${imagenActual * 100}%)`;

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
  const slider = document.getElementById('sliderModal');
  if (!slider) return;
  if (imagenActual > 0) imagenActual--;
  else imagenActual = imagenesGaleria.length - 1;
  slider.scrollTo({ left: slider.clientWidth * imagenActual, behavior: 'smooth' });
});

document.getElementById('nextModal')?.addEventListener('click', () => {
  const slider = document.getElementById('sliderModal');
  if (!slider) return;
  if (imagenActual < imagenesGaleria.length - 1) imagenActual++;
  else imagenActual = 0;
  slider.scrollTo({ left: slider.clientWidth * imagenActual, behavior: 'smooth' });
});

cargarGaleria();