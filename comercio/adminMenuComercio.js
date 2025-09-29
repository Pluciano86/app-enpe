import { supabase } from './shared/supabaseClient.js';

function getPublicBase() {
  return '/';
}

const idComercio = new URLSearchParams(window.location.search).get('id');
const nombreEl = document.getElementById('nombreComercio');
const logoEl = document.getElementById('logoComercio');
const seccionesEl = document.getElementById('seccionesMenu');
const btnAgregarSeccion = document.getElementById('btnAgregarSeccion');
const modal = document.getElementById('modalSeccion');
const inputTitulo = document.getElementById('inputTitulo');
const inputOrden = document.getElementById('inputOrden');
const inputActivo = document.getElementById('inputActivo');
const btnCancelarSeccion = document.getElementById('btnCancelarSeccion');
const btnGuardarSeccion = document.getElementById('btnGuardarSeccion');
const linkLogo = document.getElementById('linkPerfilDelLogo');

let editandoId = null;

async function cargarDatos() {
  if (!idComercio) return alert('ID de comercio no encontrado en la URL');

  const { data: comercio, error } = await supabase
    .from('Comercios')
    .select('id, nombre')
    .eq('id', idComercio)
    .single();

  if (error || !comercio) {
    console.error('Error al cargar comercio', error);
    return alert('Comercio no encontrado');
  }

  nombreEl.textContent = comercio.nombre;
  linkLogo.href = `${getPublicBase()}perfilComercio.html?id=${idComercio}`;

  const { data: logoData } = await supabase
    .from('imagenesComercios')
    .select('imagen')
    .eq('idComercio', idComercio)
    .eq('logo', true)
    .maybeSingle();

  if (logoData?.imagen) {
    logoEl.src = `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${logoData.imagen}`;
  }

  await cargarSecciones();
}

async function cargarSecciones() {
  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .eq('idComercio', idComercio)
    .order('orden', { ascending: true });

  if (error) {
    console.error('Error cargando secciones:', error);
    return alert('Error cargando secciones');
  }

  seccionesEl.innerHTML = '';
  for (const seccion of data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'bg-white rounded shadow p-4';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2';
    header.innerHTML = `
      <div>
        <h3 class="text-lg font-bold">${seccion.titulo}</h3>
        <p class="text-sm text-gray-500">Orden: ${seccion.orden} | ${seccion.activo ? 'Activo' : 'Inactivo'}</p>
      </div>
      <button class="text-blue-600 font-semibold underline" onclick="editarSeccion(${seccion.id}, '${seccion.titulo}', ${seccion.orden}, ${seccion.activo})">Editar</button>
    `;

    const productosContenedor = document.createElement('div');
    productosContenedor.className = 'mt-4';

    const { data: productos } = await supabase
      .from('productos')
      .select('*')
      .eq('idMenu', seccion.id)
      .order('orden', { ascending: true });

    productos?.forEach(producto => {
      const div = document.createElement('div');
      div.className = 'bg-gray-50 rounded p-3 mb-2 shadow cursor-pointer hover:bg-gray-100';
      div.onclick = () => abrirEditarProducto(seccion.id, producto);

      div.innerHTML = `
  <div class="flex gap-4 justify-between items-start">
    <div class="flex gap-4">
      ${producto.imagen ? `<img src="https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${producto.imagen}" class="w-16 h-16 object-cover rounded">` : ''}
      <div>
        <h4 class="text-md font-semibold">${producto.nombre}</h4>
        <p class="text-sm text-gray-600">${producto.descripcion || ''}</p>
        <p class="text-blue-600 font-bold mt-1">$${producto.precio.toFixed(2)}</p>
      </div>
    </div>
   <button onclick="eliminarProducto(${producto.id}, '${producto.nombre}', '${producto.imagen ?? ''}')" class="text-red-600 text-sm underline ml-4">Eliminar</button>
  </div>
`;
      productosContenedor.appendChild(div);
    });

    const btnAgregar = document.createElement('button');
    btnAgregar.className = 'text-blue-600 font-semibold underline mt-2';
    btnAgregar.textContent = '+ Añadir Producto';
    btnAgregar.onclick = () => abrirEditarProducto(seccion.id);
    productosContenedor.appendChild(btnAgregar);

    wrapper.appendChild(header);
    wrapper.appendChild(productosContenedor);
    seccionesEl.appendChild(wrapper);
  }
}

window.editarSeccion = (id, titulo, orden, activo) => {
  editandoId = id;
  inputTitulo.value = titulo;
  inputOrden.value = orden;
  inputActivo.checked = activo;
  modal.classList.remove('hidden');
};

btnAgregarSeccion.onclick = () => {
  editandoId = null;
  inputTitulo.value = '';
  inputOrden.value = 1;
  inputActivo.checked = true;
  modal.classList.remove('hidden');
};

btnCancelarSeccion.onclick = () => {
  modal.classList.add('hidden');
};

btnGuardarSeccion.onclick = async () => {
  const nueva = {
    titulo: inputTitulo.value.trim(),
    orden: parseInt(inputOrden.value),
    activo: inputActivo.checked,
    idComercio: parseInt(idComercio),
  };

  if (!nueva.titulo) return alert('El título es requerido');

  if (editandoId) {
    await supabase.from('menus').update(nueva).eq('id', editandoId);
  } else {
    const { error } = await supabase.from('menus').insert(nueva);
if (error) {
  console.error('❌ Error insertando menú:', error);
  return alert('Error al crear la sección del menú');
}
  }

  modal.classList.add('hidden');
  await cargarSecciones();
};

// Producto
const modalProducto = document.getElementById('modalProducto');
const inputNombreProducto = document.getElementById('inputNombreProducto');
const inputDescripcionProducto = document.getElementById('inputDescripcionProducto');
const inputPrecioProducto = document.getElementById('inputPrecioProducto');
const inputOrdenProducto = document.getElementById('inputOrdenProducto');
const inputImagenProducto = document.getElementById('inputImagenProducto');
const btnCancelarProducto = document.getElementById('btnCancelarProducto');
const btnGuardarProducto = document.getElementById('btnGuardarProducto');
let productoEditandoId = null;
let idMenuActivo = null;

window.abrirEditarProducto = (idMenu, producto = null) => {
  idMenuActivo = idMenu;
  productoEditandoId = producto?.id || null;
  inputNombreProducto.value = producto?.nombre || '';
  inputDescripcionProducto.value = producto?.descripcion || '';
  inputPrecioProducto.value = producto?.precio || '';
  inputOrdenProducto.value = producto?.orden || 1;
  inputImagenProducto.value = ''; // nunca prellena file input
  modalProducto.classList.remove('hidden');
};

window.abrirNuevoProducto = (idMenu) => {
  productoEditandoId = null;
  idMenuActivo = idMenu;
  inputNombreProducto.value = '';
  inputDescripcionProducto.value = '';
  inputPrecioProducto.value = '';
  inputOrdenProducto.value = 1;
  previewImagenProducto.src = '';
  previewImagenProducto.classList.add('hidden');
  inputImagenProducto.value = '';
  modalProducto.classList.remove('hidden');

  // 🧼 Limpiar preview de imagen
  const preview = document.getElementById('previewImagenProducto');
  if (preview) {
    preview.src = '';
    preview.classList.add('hidden');
  }
};

window.eliminarProducto = async (idProducto, nombreProducto, rutaImagen = '') => {
  const confirmar = confirm(`¿Estás seguro de que deseas eliminar "${nombreProducto}"?`);
  if (!confirmar) return;

  // Elimina imagen si existe
  if (rutaImagen) {
    const { error: errorBorrado } = await supabase.storage
      .from('galeriacomercios')
      .remove([rutaImagen]);

    if (errorBorrado) {
      console.warn('No se pudo eliminar imagen:', errorBorrado);
    }
  }

  // Elimina producto
  const { error } = await supabase.from('productos').delete().eq('id', idProducto);
  if (error) {
    alert('Error al eliminar producto');
    console.error(error);
  } else {
    alert(`"${nombreProducto}" fue eliminado exitosamente.`);
    await cargarSecciones();
  }
};

btnCancelarProducto.onclick = () => {
  modalProducto.classList.add('hidden');
};

btnGuardarProducto.onclick = async () => {
  const nuevo = {
    nombre: inputNombreProducto.value.trim(),
    descripcion: inputDescripcionProducto.value.trim(),
    precio: parseFloat(inputPrecioProducto.value),
    orden: parseInt(inputOrdenProducto.value),
    activo: true,
    idMenu: idMenuActivo
  };

  if (!nuevo.nombre || isNaN(nuevo.precio)) {
    return alert('Nombre y precio son requeridos');
  }

  let productoId = productoEditandoId;

  if (productoId) {
    const { error } = await supabase.from('productos').update(nuevo).eq('id', productoId);
    if (error) {
      console.error('Error actualizando producto:', error);
      return alert('Error al actualizar producto');
    }
  } else {
    const { data, error } = await supabase.from('productos').insert(nuevo).select().single();
    if (error) {
      console.error('Error insertando producto:', error);
      return alert('Error al guardar producto');
    }
    productoId = data.id;
  }

  // Subir imagen
  const archivo = inputImagenProducto.files[0];
if (archivo && productoId) {
  const ext = archivo.name.split('.').pop();
  const nombreArchivo = `menu/${productoId}.${ext}`;  // Ruta dentro de galeriacomercios

  const { error: errorSubida } = await supabase.storage
    .from('galeriacomercios')
    .upload(nombreArchivo, archivo, {
      upsert: true,
      contentType: archivo.type,
      cacheControl: '3600'
    });

  if (errorSubida) {
    console.error('🛑 Error subiendo imagen:', errorSubida);
  } else {
    await supabase
      .from('productos')
      .update({ imagen: nombreArchivo })
      .eq('id', productoId);
  }
}

  modalProducto.classList.add('hidden');
  await cargarSecciones();
};

document.addEventListener('DOMContentLoaded', cargarDatos);

// Mostrar preview al seleccionar nueva imagen
inputImagenProducto.addEventListener('change', () => {
  const archivo = inputImagenProducto.files[0];
  const preview = document.getElementById('previewImagenProducto');

  if (archivo) {
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(archivo);
  }
});
