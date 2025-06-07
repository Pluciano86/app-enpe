// adminEspeciales.js
import { supabase } from '../js/supabaseClient.js';
import { obtenerImagenEspecial } from './renderImagenesEspecial.js';

const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
let tipoActual = 'almuerzo';
const idComercio = new URLSearchParams(window.location.search).get('id');

document.addEventListener('DOMContentLoaded', () => {
  const contenedorDias = document.getElementById('contenedorDias');
  const btnAlmuerzo = document.getElementById('btnAlmuerzo');
  const btnHappy = document.getElementById('btnHappy');

  if (!idComercio) return alert('ID de comercio no encontrado en la URL.');

  btnAlmuerzo.addEventListener('click', () => {
    tipoActual = 'almuerzo';
    btnAlmuerzo.classList.add('bg-blue-600', 'text-white');
    btnHappy.classList.remove('bg-blue-600', 'text-white');
    cargarEspeciales();
  });

  btnHappy.addEventListener('click', () => {
    tipoActual = 'happyhour';
    btnHappy.classList.add('bg-blue-600', 'text-white');
    btnAlmuerzo.classList.remove('bg-blue-600', 'text-white');
    cargarEspeciales();
  });

  async function cargarEspeciales() {
    contenedorDias.innerHTML = '';
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
        <button class="text-sm bg-green-600 text-white px-3 py-1 rounded">Añadir</button>
      `;

      const lista = document.createElement('div');
      if (!especiales || especiales.length === 0 || error) {
        lista.innerHTML = `<p class="text-gray-500 text-sm">No hay especiales para este día.</p>`;
      } else {
        for (const e of especiales) {
          const tarjeta = document.createElement('div');
          tarjeta.className = 'bg-gray-50 border rounded p-3 mb-2 shadow-sm cursor-pointer hover:bg-gray-100 transition';

          const urlImagen = await obtenerImagenEspecial(e.id);

          tarjeta.innerHTML = `
            <div class="flex gap-4 items-start">
              <img src="${urlImagen}" alt="Especial" class="w-20 h-20 rounded object-cover">
              <div class="flex-1">
                <h4 class="font-semibold">${e.nombre}</h4>
                <p class="text-sm text-gray-600">${e.descripcion || ''}</p>
                <p class="text-sm font-bold mt-1">$${e.precio?.toFixed(2) || '0.00'}</p>
                <div class="flex gap-3 mt-2 text-sm text-gray-600">
                  <label><input type="checkbox" ${e.permanente ? 'checked' : ''}> Permanente</label>
                  <button class="text-red-500">❌ Eliminar</button>
                </div>
              </div>
            </div>
          `;

          tarjeta.addEventListener('click', () => abrirModal(e));
          lista.appendChild(tarjeta);
        }
      }

      seccion.appendChild(titulo);
      seccion.appendChild(lista);
      contenedorDias.appendChild(seccion);
    }
  }

  // Mostrar Almuerzo por default
  btnAlmuerzo.classList.add('bg-blue-600', 'text-white');
  cargarEspeciales();
});

// -----------------------------------------------------------------------------------------------------------------------
// Referencias al modal y formulario
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

export async function abrirModal(especial) {
  inputId.value = especial.id;
  inputNombre.value = especial.nombre || '';
  inputDescripcion.value = especial.descripcion || '';
  inputPrecio.value = especial.precio || '';
  inputPermanente.checked = !!especial.permanente;

  // Mostrar imagen actual
  const urlImagen = await obtenerImagenEspecial(especial.id);
  imgPreview.src = urlImagen;

  modal.classList.remove('hidden');
}

cerrarModal.addEventListener('click', () => {
  modal.classList.add('hidden');
  form.reset();
  imgPreview.src = '';
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.add('hidden');
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = inputId.value;
  const nombre = inputNombre.value;
  const descripcion = inputDescripcion.value;
  const precio = parseFloat(inputPrecio.value);
  const permanente = inputPermanente.checked;
  const nuevaImagen = inputNuevaImagen.files[0];

  let imagenFinal = null;

  // Subir imagen nueva si hay
  if (nuevaImagen) {
    const nombreArchivo = `especiales/${Date.now()}_${nuevaImagen.name}`;
    const { error: uploadError } = await supabase.storage
      .from('galeriacomercios')
      .upload(nombreArchivo, nuevaImagen, { upsert: true });

    if (uploadError) {
      return alert('Error subiendo nueva imagen');
    }
    imagenFinal = nombreArchivo;
  }

  // Actualizar el especial
  const { error } = await supabase.from('especialesDia').update({
    nombre,
    descripcion,
    precio,
    permanente,
    ...(imagenFinal && { imagen: imagenFinal })
  }).eq('id', id);

  if (error) {
    alert('Error al guardar cambios');
    console.error(error);
  } else {
    alert('Especial actualizado');
    modal.classList.add('hidden');
    form.reset();
    location.reload();
  }
});