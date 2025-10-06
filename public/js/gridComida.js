import { supabase } from '../shared/supabaseClient.js';

export async function mostrarGridComida() {
  // acepta ambos ids para no romper tu HTML
  const contenedor =
    document.getElementById('gridComida') ||
    document.getElementById('sliderCercanosComida');

  if (!contenedor) return;

  contenedor.innerHTML = '<p class="text-gray-500 text-sm">Cargando lugares...</p>';

  try {
  // 🔹 Obtener idArea desde la URL
  const params = new URLSearchParams(window.location.search);
  const idArea = parseInt(params.get('idArea'));

  // 🔹 Comercios activos de categorías de comida
  const CATS_COMIDA = [1, 2, 3, 4]; // Restaurantes, Coffee Shops, Panaderías, Food Trucks

  const { data: comercios, error: errorComercios } = await supabase
    .from('Comercios')
    .select('id, nombre, municipio, logo, activo, idCategoria, idArea')
    .or('idCategoria.cs.{1},idCategoria.cs.{2},idCategoria.cs.{3},idCategoria.cs.{4}')
    .eq('activo', true)
    .eq('idArea', idArea);

  if (errorComercios) throw errorComercios;
  if (!comercios?.length) {
    contenedor.innerHTML = '<p class="text-gray-500 text-sm">No hay lugares disponibles.</p>';
    return;
  }

    // 🔹 Mapa rápido por id
    const porId = new Map(comercios.map(c => [c.id, c]));

    // 🔹 Todas las imágenes no-logo de esos comercios
    const ids = comercios.map(c => c.id);
    const { data: imagenes, error: errorImgs } = await supabase
      .from('imagenesComercios')
      .select('idComercio, imagen, logo')
      .in('idComercio', ids)
      .eq('logo', false);

    if (errorImgs) throw errorImgs;
    if (!imagenes?.length) {
      contenedor.innerHTML = '<p class="text-gray-500 text-sm">No hay fotos disponibles.</p>';
      return;
    }

    // 🔹 Creamos una "tile" por CADA foto (múltiples por comercio)
    //    y barajamos para que salgan random
    const tiles = imagenes
      .map((img) => {
        const c = porId.get(img.idComercio);
        if (!c) return null;
        return {
          id: c.id,
          nombre: c.nombre,
          municipio: c.municipio || '',
          logo: c.logo || null,
          imagen: img.imagen
        };
      })
      .filter(Boolean)
      .sort(() => 0.5 - Math.random())
      .slice(0, 12);

    // 🔹 Render
    const STORAGE = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public';
    contenedor.innerHTML = '';

    tiles.forEach(tile => {
      const imgUrl = tile.imagen?.startsWith('http')
        ? tile.imagen
        : `${STORAGE}/galeriacomercios/${tile.imagen}`;

      const logoUrl = tile.logo?.startsWith?.('http')
        ? tile.logo
        : `${STORAGE}/galeriacomercios/${tile.logo || 'NoActivoLogo.png'}`;

      const a = document.createElement('a');
      a.href = `perfilComercio.html?id=${tile.id}`;
      a.className = 'relative overflow-hidden rounded-xl shadow-md aspect-square';

      a.innerHTML = `
        <img src="${imgUrl}" alt="${tile.nombre}"
             class="w-full h-full object-cover"
             onerror="this.src='${STORAGE}/imagenesapp/NoActivoPortada.jpg'"/>
        <div class="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 to-transparent px-2 py-1 flex items-center gap-1 text-white text-xs">
          <img src="${logoUrl}" class="w-10 h-10 rounded-full bg-white border border-white object-cover shadow" />
          <span class="truncate">${tile.municipio}</span>
        </div>
      `;

      contenedor.appendChild(a);
    });

    // 🌀 Carrusel automático de derecha → izquierda
    let offset = 0;
    const visible = 12; // 3x4 grid visible
    const total = tiles.length;
    const paso = visible;

    function moverCarrusel() {
      offset = (offset + paso) % total;
      contenedor.style.transition = "transform 1s ease-in-out";
      contenedor.style.transform = `translateX(-${offset * (100 / visible)}%)`;
    }

    // ⏱️ Loop cada 8 segundos
    setInterval(moverCarrusel, 8000);

    // 👆 Swipe manual
    let startX = 0;
    contenedor.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
    });

    contenedor.addEventListener("touchend", (e) => {
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          offset = (offset - paso + total) % total;
        } else {
          offset = (offset + paso) % total;
        }
        contenedor.style.transition = "transform 0.7s ease-in-out";
        contenedor.style.transform = `translateX(-${offset * (100 / visible)}%)`;
      }
    });


  } catch (err) {
    console.error('⚠️ Error mostrando lugares para comer:', err);
    contenedor.innerHTML = '<p class="text-red-500 text-sm">Error cargando lugares.</p>';
  }
}

