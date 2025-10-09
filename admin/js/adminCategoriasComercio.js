// adminCategoriasComercio.js
import { supabase } from '../shared/supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');

let categorias = [];
let subcategorias = [];

window.categoriasSeleccionadas = [];
window.subcategoriasSeleccionadas = [];

async function cargarCategorias() {
  if (!categorias.length) {
    const { data, error } = await supabase.from('Categorias').select('id, nombre').order('nombre');
    if (error) {
      console.error('Error cargando categorías:', error);
      categorias = [];
    } else {
      categorias = data || [];
    }
  }
  const contenedor = document.getElementById('opcionesCategorias');
  if (!contenedor) return;

  contenedor.innerHTML = '';
  categorias.forEach(c => {
    const checked = window.categoriasSeleccionadas.includes(c.id) ? 'checked' : '';
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2';
    div.innerHTML = `
      <input type="checkbox" value="${c.id}" id="cat_${c.id}" ${checked}>
      <label for="cat_${c.id}">${c.nombre}</label>
    `;
    contenedor.appendChild(div);
  });

  contenedor.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      const id = parseInt(input.value);
      if (input.checked) {
        if (!window.categoriasSeleccionadas.includes(id)) window.categoriasSeleccionadas.push(id);
      } else {
        window.categoriasSeleccionadas = window.categoriasSeleccionadas.filter(c => c !== id);
      }
      mostrarSeleccionadas('categoriasSeleccionadas', window.categoriasSeleccionadas, categorias, 'removerCategoria');
      cargarSubcategorias();
    });
  });

  mostrarSeleccionadas('categoriasSeleccionadas', window.categoriasSeleccionadas, categorias, 'removerCategoria');
}

async function cargarSubcategorias() {
  if (!subcategorias.length) {
    const { data, error } = await supabase
      .from('subCategoria')
      .select('id, nombre, idCategoria')
      .order('nombre');
    if (error) {
      console.error('Error cargando subcategorías:', error);
      subcategorias = [];
    } else {
      subcategorias = data || [];
    }
  }
  const contenedor = document.getElementById('opcionesSubcategorias');
  if (!contenedor) return;

  contenedor.innerHTML = '';
  const categoriasSeleccionadas = (window.categoriasSeleccionadas || []).map(Number);
  const filtradas = subcategorias.filter(sc =>
    categoriasSeleccionadas.includes(Number(sc.idCategoria))
  );
  filtradas.forEach(sub => {
    const checked = window.subcategoriasSeleccionadas.includes(sub.id) ? 'checked' : '';
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2';
    div.innerHTML = `
      <input type="checkbox" value="${sub.id}" id="sub_${sub.id}" ${checked}>
      <label for="sub_${sub.id}">${sub.nombre}</label>
    `;
    contenedor.appendChild(div);
  });

  contenedor.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      const id = parseInt(input.value);
      if (input.checked) {
        if (!window.subcategoriasSeleccionadas.includes(id)) window.subcategoriasSeleccionadas.push(id);
      } else {
        window.subcategoriasSeleccionadas = window.subcategoriasSeleccionadas.filter(s => s !== id);
      }
      mostrarSeleccionadas('subcategoriasSeleccionadas', window.subcategoriasSeleccionadas, subcategorias, 'removerSubcategoria');
    });
  });

  mostrarSeleccionadas('subcategoriasSeleccionadas', window.subcategoriasSeleccionadas, subcategorias, 'removerSubcategoria');
}

function mostrarSeleccionadas(wrapperId, array, listaReferencia, fnName) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  wrapper.innerHTML = '';
  array.forEach(id => {
    const nombre = (listaReferencia.find(x => x.id === id) || {}).nombre || id;
    const chip = document.createElement('span');
    chip.className = 'inline-flex items-center bg-blue-200 text-blue-800 rounded-full px-3 py-1 text-sm m-1';
    chip.innerHTML = `${nombre} <button onclick="${fnName}(${id})" class="ml-2 text-red-500 font-bold">×</button>`;
    wrapper.appendChild(chip);
  });
}

window.removerCategoria = function(id) {
  window.categoriasSeleccionadas = window.categoriasSeleccionadas.filter(c => c !== id);
  const checkbox = document.getElementById(`cat_${id}`);
  if (checkbox) checkbox.checked = false;
  mostrarSeleccionadas('categoriasSeleccionadas', window.categoriasSeleccionadas, categorias, 'removerCategoria');
  cargarSubcategorias();
};

window.removerSubcategoria = function(id) {
  window.subcategoriasSeleccionadas = window.subcategoriasSeleccionadas.filter(s => s !== id);
  const checkbox = document.getElementById(`sub_${id}`);
  if (checkbox) checkbox.checked = false;
  mostrarSeleccionadas('subcategoriasSeleccionadas', window.subcategoriasSeleccionadas, subcategorias, 'removerSubcategoria');
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data: comercio, error } = await supabase
      .from('Comercios')
      .select(
        `
          idCategoria,
          idSubcategoria,
          ComercioCategorias (
            idCategoria
          ),
          ComercioSubcategorias (
            idSubcategoria
          )
        `
      )
      .eq('id', idComercio)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo categorías del comercio:', error);
    }

    if (comercio) {
      const categoriasRel = Array.isArray(comercio.ComercioCategorias) ? comercio.ComercioCategorias : [];
      const subcategoriasRel = Array.isArray(comercio.ComercioSubcategorias)
        ? comercio.ComercioSubcategorias
        : [];

      const categoriasDesdeRel = categoriasRel
        .map(rel => Number(rel?.idCategoria))
        .filter(id => !Number.isNaN(id));

      const subcategoriasDesdeRel = subcategoriasRel
        .map(rel => Number(rel?.idSubcategoria))
        .filter(id => !Number.isNaN(id));

      const categoriasLegacy = Array.isArray(comercio.idCategoria)
        ? comercio.idCategoria
        : comercio.idCategoria !== null && comercio.idCategoria !== undefined
        ? [comercio.idCategoria]
        : [];

      const subcategoriasLegacy = Array.isArray(comercio.idSubcategoria)
        ? comercio.idSubcategoria
        : comercio.idSubcategoria !== null && comercio.idSubcategoria !== undefined
        ? [comercio.idSubcategoria]
        : [];

      window.categoriasSeleccionadas = categoriasDesdeRel.length
        ? categoriasDesdeRel
        : categoriasLegacy.map(id => Number(id)).filter(id => !Number.isNaN(id));

      window.subcategoriasSeleccionadas = subcategoriasDesdeRel.length
        ? subcategoriasDesdeRel
        : subcategoriasLegacy.map(id => Number(id)).filter(id => !Number.isNaN(id));
    }
  } catch (error) {
    console.error('Error procesando categorías del comercio:', error);
  }

  await cargarCategorias();
  await cargarSubcategorias();
});
