// menu/menuComercio.js
import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
const nombreEl = document.getElementById('nombreComercio');
const seccionesEl = document.getElementById('seccionesMenu');
const listaProductosEl = document.getElementById('listaProductos');
const tituloSeccionEl = document.getElementById('tituloSeccion');
const btnVolver = document.getElementById('btnVolver');

async function cargarDatos() {
  const { data: comercio, error: errorComercio } = await supabase
    .from('Comercios')
    .select('nombre, colorPrimario, colorSecundario')
    .eq('id', idComercio)
    .single();

  if (errorComercio || !comercio) return alert('Error cargando comercio');

  nombreEl.textContent = comercio.nombre;
  document.body.style.setProperty('--colorPrimario', comercio.colorPrimario || '#23b4e9');
  document.body.style.setProperty('--colorSecundario', comercio.colorSecundario || '#f5f5f5');

  const { data: menus, error: errorMenus } = await supabase
    .from('menus')
    .select('id, titulo, orden')
    .eq('idComercio', idComercio)
    .eq('activo', true)
    .order('orden');

console.log('Menus:', menus); // 👈 Añade esto

  if (errorMenus) return alert('Error cargando menú');

  seccionesEl.innerHTML = '';
  for (const menu of menus) {
    const btn = document.createElement('button');
    btn.className = 'bg-[var(--colorPrimario)] text-white px-4 py-2 rounded shadow font-medium hover:opacity-90 transition';
    btn.textContent = menu.titulo;
    btn.onclick = () => cargarProductos(menu.id, menu.titulo);
    seccionesEl.appendChild(btn);
  }
}

async function cargarProductos(idMenu, titulo) {
  tituloSeccionEl.textContent = titulo;
  listaProductosEl.innerHTML = 'Cargando...';
  document.getElementById('productosMenu').classList.remove('hidden');

  const { data: productos, error } = await supabase
    .from('productos')
    .select('*')
    .eq('idMenu', idMenu)
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (error) return alert('Error cargando productos');

  listaProductosEl.innerHTML = '';
  for (const p of productos) {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-lg shadow p-4 mb-4 flex gap-4';

    div.innerHTML = `
      <div class="w-24 h-24 flex-shrink-0">
        <img src="https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${p.imagen}" 
             alt="${p.nombre}" class="w-full h-full object-cover rounded cursor-pointer" onclick="ampliarImagen('${p.imagen}')">
      </div>
      <div class="flex flex-col justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-800">${p.nombre}</h3>
          <p class="text-sm text-gray-600">${p.descripcion}</p>
        </div>
        <div class="text-[var(--colorPrimario)] font-bold text-lg mt-2">$${p.precio.toFixed(2)}</div>
      </div>
    `;

    listaProductosEl.appendChild(div);
  }
}

window.ampliarImagen = function (nombreImagen) {
  const modal = document.getElementById('modalImagen');
  const img = document.getElementById('imgAmpliada');
  img.src = `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${nombreImagen}`;
  modal.classList.remove('hidden');
  modal.onclick = () => modal.classList.add('hidden');
};

btnVolver.onclick = () => {
  document.getElementById('productosMenu').classList.add('hidden');
};

document.addEventListener('DOMContentLoaded', cargarDatos);