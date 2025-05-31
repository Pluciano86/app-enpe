// galeria.js
import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
const galeriaContenedor = document.getElementById('galeriaImagenes');
const modal = document.getElementById('modalGaleria');
const sliderModal = document.getElementById('sliderModal');
const btnCerrar = document.getElementById('cerrarModal');
const btnPrev = document.getElementById('prevModal');
const btnNext = document.getElementById('nextModal');

let imagenesGaleria = [];
let imagenActual = 0;

async function cargarGaleria() {
  const { data, error } = await supabase
  .from('imagenesComercios')
  .select('imagen')
  .eq('idComercio', idComercio)
  .or('logo.is.false,logo.is.null')  // 👈 CORREGIDO
  .order('id', { ascending: true });

  if (error || !data) {
  console.error('Error cargando imágenes', error);
  return;
}

console.log("🖼️ Datos recibidos:", data);

  imagenesGaleria = data.map(i =>
    supabase.storage.from('galeriacomercios').getPublicUrl(i.imagen).data.publicUrl
  );

  imagenesGaleria.forEach((url, index) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = `Imagen ${index + 1}`;
    img.className = 'h-64 object-cover w-full cursor-pointer snap-center';
    img.onclick = () => abrirModal(index);
    galeriaContenedor.appendChild(img);
  });
}

function abrirModal(index) {
  if (!modal || !sliderModal) return;
  sliderModal.innerHTML = '';
  imagenActual = index;

  imagenesGaleria.forEach(url => {
    const slide = document.createElement('img');
    slide.src = url;
    slide.className = 'w-full object-contain';
    sliderModal.appendChild(slide);
  });

  actualizarSlider();
  modal.classList.remove('hidden');
}

function actualizarSlider() {
  sliderModal.style.transform = `translateX(-${imagenActual * 100}%)`;
}

btnCerrar?.addEventListener('click', () => {
  modal?.classList.add('hidden');
});

btnPrev?.addEventListener('click', () => {
  if (imagenActual > 0) imagenActual--;
  else imagenActual = imagenesGaleria.length - 1;
  actualizarSlider();
});

btnNext?.addEventListener('click', () => {
  if (imagenActual < imagenesGaleria.length - 1) imagenActual++;
  else imagenActual = 0;
  actualizarSlider();
});

cargarGaleria();
