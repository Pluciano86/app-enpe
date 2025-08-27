// adminEspeciales.js (actualizado sin tabla imgEspeciales)
import { supabase } from '../js/supabaseClient.js';

const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sabado'];
let tipoActual = 'almuerzo';
let diaSeleccionado = null;
const idComercio = new URLSearchParams(window.location.search).get('id');

// Elementos DOM
const contenedorDias = document.getElementById('contenedorDias');
const contenedorFrecuentes = document.getElementById('contenedorFrecuentes');
const btnAlmuerzo = document.getElementById('btnAlmuerzo');
const btnHappy = document.getElementById('btnHappy');
const modal = document.getElementById('modalEditarEspecial');
const form = document.getElementById('formEditarEspecial');
const cerrarModal = document.getElementById('cerrarModal');
const imgPreview = document.getElementById('editarImagenActual');

const inputId = document.getElementById('editarIdEspecial');
const inputNombre = document.getElementById('editarNombre');
const inputDescripcion = document.getElementById('editarDescripcion');
const inputPrecio = document.getElementById('editarPrecio');
const inputPermanente = document.getElementById('editarPermanente');
const inputNuevaImagen = document.getElementById('editarNuevaImagen');
const inputGuardarComoFrecuente = document.getElementById('guardarComoFrecuente');

inputNuevaImagen.addEventListener('change', () => {
  const file = inputNuevaImagen.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      imgPreview.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
});

btnAlmuerzo.addEventListener('click', () => {
  tipoActual = 'almuerzo';
  btnAlmuerzo.classList.add('bg-blue-600', 'text-white');
  btnAlmuerzo.classList.remove('bg-gray-200', 'text-gray-700');
  btnHappy.classList.remove('bg-blue-600', 'text-white');
  btnHappy.classList.add('bg-gray-200', 'text-gray-700');
  cargarEspeciales();
});

btnHappy.addEventListener('click', () => {
  tipoActual = 'happyhour';
  btnHappy.classList.add('bg-blue-600', 'text-white');
  btnHappy.classList.remove('bg-gray-200', 'text-gray-700');
  btnAlmuerzo.classList.remove('bg-blue-600', 'text-white');
  btnAlmuerzo.classList.add('bg-gray-200', 'text-gray-700');
  cargarEspeciales();
});

btnAlmuerzo.classList.add('bg-blue-600', 'text-white');
btnAlmuerzo.classList.remove('bg-gray-200', 'text-gray-700');
btnHappy.classList.remove('bg-blue-600', 'text-white');
btnHappy.classList.add('bg-gray-200', 'text-gray-700');
cargarEspeciales();

async function cargarEspeciales() {
  contenedorDias.innerHTML = '';
  contenedorFrecuentes.innerHTML = '';
  await cargarEspecialesFrecuentes();

  for (let i = 0; i < dias.length; i++) {
    const { data: especiales, error } = await supabase
      .from('especialesDia')
      .select('*')
      .eq('idcomercio', idComercio)
      .eq('tipo', tipoActual)
      .eq('diasemana', i);

    const seccion = document.createElement('section');
    seccion.className = 'bg-white p-4 rounded shadow mb-4';

    const titulo = document.createElement('div');
    titulo.className = 'flex items-center justify-between mb-2';
    titulo.innerHTML = `
      <h3 class="text-lg font-bold">${dias[i]}</h3>
      <button class="text-sm bg-green-600 text-white px-3 py-1 rounded btn-abrir-modal" data-dia="${i}">Añadir</button>
    `;

    const lista = document.createElement('div');
    if (!especiales || especiales.length === 0 || error) {
      lista.innerHTML = `<p class="text-gray-500 text-sm">No hay especiales para este día.</p>`;
    } else {
      for (const e of especiales) {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'bg-gray-50 border rounded p-3 mb-2 shadow-sm cursor-pointer hover:bg-gray-100 transition';
        const urlImagen = e.imagen 
          ? `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${encodeURIComponent(e.imagen)}`
          : 'https://via.placeholder.com/100x100.png?text=Especial';
        tarjeta.innerHTML = `
          <div class="flex gap-4 items-start">
            <img src="${urlImagen}" alt="Especial" class="w-20 h-20 rounded object-cover">
            <div class="flex-1">
              <h4 class="font-semibold">${e.nombre}</h4>
              <p class="text-sm text-gray-600">${e.descripcion || ''}</p>
              <p class="text-sm font-bold mt-1">$${e.precio?.toFixed(2) || '0.00'}</p>
              <div class="flex gap-3 mt-2 text-sm text-gray-600">
                <label><input type="checkbox" ${e.permanente ? 'checked' : ''}> Permanente</label>
                <button class="text-red-500 btn-eliminar-especial" data-id="${e.id}">❌ Eliminar</button>
              </div>
            </div>
          </div>
        `;
        tarjeta.addEventListener('click', (ev) => {
  if (ev.target.closest('.btn-eliminar-especial')) return; // no abrir modal si tocó eliminar
  abrirModal(e);
});
        lista.appendChild(tarjeta);
      }
    }
    seccion.appendChild(titulo);
    seccion.appendChild(lista);
    contenedorDias.appendChild(seccion);
  }
}

async function cargarEspecialesFrecuentes() {
  const { data, error } = await supabase
    .from('especialesFrecuentes')
    .select('*')
    .eq('idcomercio', idComercio)
    .eq('tipo', tipoActual)
    .limit(10);

  if (error) {
    console.error('Error al cargar especiales frecuentes:', error);
    return;
  }

  contenedorFrecuentes.innerHTML = data.length === 0
    ? `<p class="text-gray-500 text-sm">No hay especiales frecuentes guardados.</p>`
    : '';

  for (const e of data) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'bg-white border rounded p-3 mb-2 shadow cursor-pointer hover:bg-gray-100';
    tarjeta.innerHTML = `
      <h4 class="font-semibold">${e.nombre}</h4>
      <p class="text-sm">${e.descripcion || ''}</p>
      <p class="text-sm font-bold mt-1">$${e.precio?.toFixed(2) || '0.00'}</p>
      <button class="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm">Usar en ${tipoActual === 'almuerzo' ? 'Almuerzo' : 'Happy Hour'}</button>
    `;
    tarjeta.querySelector('button').addEventListener('click', async () => {
      const hoy = new Date();
      const dia = hoy.getDay();
      await supabase.from('especialesDia').insert({
        idcomercio: idComercio,
        nombre: e.nombre,
        descripcion: e.descripcion,
        precio: e.precio,
        tipo: tipoActual,
        diasemana: dia,
        permanente: false,
        imagen: e.imagen || null
      });
      await cargarEspeciales();
    });
    contenedorFrecuentes.appendChild(tarjeta);
  }
}

function abrirModalNuevo() {
  form.reset();
  inputId.value = '';
  imgPreview.src = '';
  modal.classList.remove('hidden');
}

export async function abrirModal(especial) {
  inputId.value = especial.id;
  inputNombre.value = especial.nombre || '';
  inputDescripcion.value = especial.descripcion || '';
  inputPrecio.value = especial.precio?.toFixed(2) || '';
  inputPermanente.checked = !!especial.permanente;
  inputNuevaImagen.value = '';

  const urlImagen = especial.imagen
    ? `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${encodeURIComponent(especial.imagen)}`
    : 'https://via.placeholder.com/100x100.png?text=Especial';

  imgPreview.src = urlImagen;
  imgPreview.classList.remove('hidden');
  modal.classList.remove('hidden');
}

cerrarModal.addEventListener('click', () => {
  modal.classList.add('hidden');
  form.reset();
  imgPreview.src = '';
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});

document.addEventListener('click', (e) => {
  if (e.target && e.target.classList.contains('btn-abrir-modal')) {
    diaSeleccionado = parseInt(e.target.dataset.dia);
    abrirModalNuevo();
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = inputId.value;
  const nombre = inputNombre.value;
  const descripcion = inputDescripcion.value;
  const precio = parseFloat(inputPrecio.value) || 0;
  const permanente = inputPermanente.checked;
  const nuevaImagen = inputNuevaImagen.files[0];
  let imagenFinal = null;

  if (nuevaImagen) {
    const nombreArchivo = `especiales/${Date.now()}_${nuevaImagen.name}`;
    const { error: uploadError } = await supabase.storage
      .from('galeriacomercios')
      .upload(nombreArchivo, nuevaImagen, { upsert: true });
    if (uploadError) return alert('Error subiendo nueva imagen');
    imagenFinal = nombreArchivo;
  }

  if (!id) {
    const { data: insertado, error: insertError } = await supabase.from('especialesDia').insert([{
      idcomercio: idComercio,
      nombre,
      descripcion,
      precio,
      permanente,
      diasemana: diaSeleccionado,
      tipo: tipoActual,
      imagen: imagenFinal
    }]).select().single();

    if (insertError) {
      alert('Error al guardar especial');
      console.error(insertError);
    } else {
      if (inputGuardarComoFrecuente.checked) {
        await supabase.from('especialesFrecuentes').insert({
          idcomercio: idComercio,
          nombre,
          descripcion,
          precio,
          tipo: tipoActual,
          imagen: imagenFinal
        });
      }

      alert('Especial creado');
      modal.classList.add('hidden');
      await cargarEspeciales();
    }
  } else {
    const { error: updateError } = await supabase.from('especialesDia').update({
      nombre,
      descripcion,
      precio,
      permanente,
      ...(imagenFinal && { imagen: imagenFinal })
    }).eq('id', id);

    if (updateError) {
      alert('Error al guardar cambios');
      console.error(updateError);
    } else {
      alert('Especial actualizado');
      modal.classList.add('hidden');
      await cargarEspeciales();
    }
  }
});

document.addEventListener('click', async (e) => {
  if (e.target && e.target.classList.contains('btn-eliminar-especial')) {
    e.stopPropagation(); // evita abrir el modal
    const id = e.target.dataset.id;

    const confirmar = confirm('¿Deseas eliminar este especial?');
    if (!confirmar) return;

    // Obtener el especial para eliminar también su imagen si aplica
    const { data: especial, error: fetchError } = await supabase
      .from('especialesDia')
      .select('imagen')
      .eq('id', id)
      .single();

    if (fetchError) {
      alert('Error buscando especial');
      console.error(fetchError);
      return;
    }

    // Eliminar imagen del bucket si existe
    if (especial?.imagen) {
      const { error: storageError } = await supabase.storage
        .from('galeriacomercios')
        .remove([especial.imagen]);

      if (storageError) {
        console.warn('⚠️ No se pudo eliminar la imagen del bucket:', storageError);
      }
    }

    // Eliminar el especial
    const { error: deleteError } = await supabase
      .from('especialesDia')
      .delete()
      .eq('id', id);

    if (deleteError) {
      alert('Error al eliminar especial');
      console.error(deleteError);
    } else {
      alert('Especial eliminado');
      await cargarEspeciales();
    }
  }
});