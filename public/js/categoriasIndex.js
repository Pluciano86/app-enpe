import { supabase } from '../shared/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  const contenedor = document.getElementById('categoriasContainer');
  const toggleBtn = document.getElementById('toggleCategorias');
  const section = document.getElementById('categoriasSection');
  let todasCategorias = [];
  let mostrandoTodas = false;

  // 🔹 Cargar categorías desde Supabase
  async function cargarCategorias() {
    const { data, error } = await supabase
      .from('Categorias')
      .select('id, nombre, imagen')
      .order('id', { ascending: true });

    if (error) {
      console.error('❌ Error cargando categorías:', error);
      return;
    }

    todasCategorias = data || [];
    renderizarCategorias();
  }

  // 🔹 Renderizar categorías
  function renderizarCategorias() {
    contenedor.innerHTML = '';

    const categoriasAMostrar = mostrandoTodas ? todasCategorias : todasCategorias.slice(0, 6);

    categoriasAMostrar.forEach(cat => {
      const card = document.createElement('a');
      card.href = `listadoComercios.html?idCategoria=${cat.id}`;
      card.className = 'flex flex-col items-center';
      card.innerHTML = `
        <img src="${cat.imagen || 'https://via.placeholder.com/150'}"
             alt="${cat.nombre}"
             class="rounded-full w-24 h-24 object-cover mb-1">
        <p>${cat.nombre}</p>
      `;
      contenedor.appendChild(card);
    });

    toggleBtn.textContent = mostrandoTodas ? 'Ver menos...' : 'Ver todas las Categorías...';
  }

  // 🔹 Alternar entre ver todas / solo las principales
  toggleBtn.addEventListener('click', () => {
    mostrandoTodas = !mostrandoTodas;
    renderizarCategorias();
  });

  // 🔹 Ocultar al pasar la sección con scroll
  window.addEventListener('scroll', () => {
    const rect = section.getBoundingClientRect();
    const visible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (!visible && mostrandoTodas) {
      mostrandoTodas = false;
      renderizarCategorias();
    }
  });

  cargarCategorias();
});