import { supabase } from '../shared/supabaseClient.js';

export async function mostrarGridComida() {
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

    // 🔹 Evitar repetir comercios con sucursales
    const unicos = [];
    const nombresVistos = new Set();
    for (const c of comercios) {
      const clave = c.nombre.trim().toLowerCase();
      if (!nombresVistos.has(clave)) {
        nombresVistos.add(clave);
        unicos.push(c);
      }
    }

    // 🔹 Mapa rápido por id
    const porId = new Map(unicos.map(c => [c.id, c]));

    // 🔹 Todas las imágenes no-logo de esos comercios
    const ids = unicos.map(c => c.id);
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

    // 🔹 Crear tiles con 1 imagen por comercio (sin repetir sucursales)
    const tiles = imagenes
      .map(img => {
        const c = porId.get(img.idComercio);
        if (!c) return null;
        return {
          id: c.id,
          nombre: c.nombre,
          municipio: c.municipio || '',
          logo: c.logo || null,
          imagen: img.imagen,
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

    // 🔹 Botón "Ver más..."
    const btnVerMas = document.createElement('button');
    btnVerMas.textContent = 'Ver más...';
    btnVerMas.className = `
  block mx-auto mt-6 mb-4 
  px-8 py-3 bg-[#0F172A] text-white font-medium 
  rounded-xl shadow hover:bg-[#1E293B] 
  transition-all duration-200 text-center
`;

    if (contenedor.classList.contains('grid')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'col-span-full flex justify-center';
      wrapper.appendChild(btnVerMas);
      contenedor.appendChild(wrapper);
    } else {
      contenedor.appendChild(btnVerMas);
    }

    // 🔹 Crear modal oculto
    const modal = document.createElement('div');
    modal.id = 'modalGridComida';
    modal.className = `
      fixed inset-0 bg-black/80 flex items-center justify-center z-50 hidden
    `;
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-5xl w-[95%] max-h-[90vh] overflow-y-auto p-4 relative">
        <button id="cerrarModalGridComida"
          class="absolute top-2 right-2 bg-black text-white rounded-full w-8 h-8 flex items-center justify-center text-lg">✕</button>
        <h2 class="text-xl font-semibold text-center mb-4">Todos los lugares para comer</h2>
        <div id="gridModalComida" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"></div>
      </div>
    `;
    document.body.appendChild(modal);

    // 🔹 Acción al presionar "Ver más"
    btnVerMas.addEventListener('click', () => {
      const gridModal = document.getElementById('gridModalComida');
      gridModal.innerHTML = '';

      const todas = imagenes
        .map(img => {
          const c = porId.get(img.idComercio);
          if (!c) return null;
          return {
            id: c.id,
            nombre: c.nombre,
            municipio: c.municipio || '',
            logo: c.logo || null,
            imagen: img.imagen,
          };
        })
        .filter(Boolean)
        .sort(() => 0.5 - Math.random());

      todas.forEach(tile => {
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
               class="w-full h-full object-cover rounded-xl"
               onerror="this.src='${STORAGE}/imagenesapp/NoActivoPortada.jpg'"/>
          <div class="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-white text-xs">
            <div class="font-semibold truncate">${tile.nombre}</div>
            <div class="flex items-center gap-1 mt-0.5">
              <img src="${logoUrl}" class="w-6 h-6 rounded-full bg-white border border-white object-cover shadow" />
              <span class="truncate">${tile.municipio}</span>
            </div>
          </div>
        `;
        gridModal.appendChild(a);
      });

      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    });

    // 🔹 Cerrar modal
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'modalGridComida' || e.target.id === 'cerrarModalGridComida') {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
      }
    });

  } catch (err) {
    console.error('⚠️ Error mostrando lugares para comer:', err);
    contenedor.innerHTML = '<p class="text-red-500 text-sm">Error cargando lugares.</p>';
  }
}
