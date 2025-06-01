// adminCategoriasComercio.js
import { supabase } from '../../js/supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');

let categorias = [];
let subcategorias = [];

window.categoriasSeleccionadas = [];
window.subcategoriasSeleccionadas = [];

async function cargarCategorias() {
  const { data } = await supabase.from('Categorias').select('id, nombre').order('nombre');
  categorias = data;
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
  const { data } = await supabase.from('subCategoria').select('id, nombre, idCategoria').order('nombre');
  subcategorias = data;
  const contenedor = document.getElementById('opcionesSubcategorias');
  if (!contenedor) return;

  contenedor.innerHTML = '';
  const filtradas = subcategorias.filter(sc => window.categoriasSeleccionadas.includes(sc.idCategoria));
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
  const { data: comercio } = await supabase.from('Comercios').select('*').eq('id', idComercio).single();
  if (comercio) {
    window.categoriasSeleccionadas = comercio.idCategoria || [];
    window.subcategoriasSeleccionadas = comercio.idSubcategoria || [];
  }

  await cargarCategorias();
  await cargarSubcategorias();
});