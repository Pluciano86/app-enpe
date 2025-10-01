import { supabase } from '../shared/supabaseClient.js';

const form = document.getElementById('formCrearEvento');
const municipioSelect = document.getElementById('municipio');
const categoriaSelect = document.getElementById('categoria');
const gratisCheckbox = document.getElementById('gratis');
const costoInput = document.getElementById('costo');
const mismaHoraCheckbox = document.getElementById('mismaHora');
const nuevaFechaInput = document.getElementById('nuevaFecha');
const nuevaHoraInput = document.getElementById('nuevaHora');
const btnAgregarFecha = document.getElementById('btnAgregarFecha');
const listaFechasContainer = document.getElementById('listaFechas');

const fechasSeleccionadas = [];

function formatFecha(fechaStr) {
  try {
    const fecha = new Date(`${fechaStr}T00:00:00`);
    return fecha.toLocaleDateString('es-PR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return fechaStr;
  }
}

function renderListadoFechas() {
  if (fechasSeleccionadas.length === 0) {
    listaFechasContainer.innerHTML = '';
    listaFechasContainer.classList.add('hidden');
    return;
  }

  listaFechasContainer.classList.remove('hidden');
  listaFechasContainer.innerHTML = fechasSeleccionadas
    .map((item, index) => {
      const horaInput = mismaHoraCheckbox.checked
        ? `<span class="text-sm text-gray-600">${item.hora || '--:--'}</span>`
        : `<input type="time" data-index="${index}" class="hora-item border rounded px-3 py-1 w-28" value="${item.hora || ''}"/>`;

      return `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-white">
          <div>
            <p class="font-medium text-gray-800">${formatFecha(item.fecha)}</p>
            ${mismaHoraCheckbox.checked ? '<p class="text-xs text-gray-500">Hora compartida</p>' : ''}
          </div>
          <div class="flex items-center gap-3">
            ${horaInput}
            <button type="button" data-remove="${index}" class="text-red-600 text-sm hover:underline">Eliminar</button>
          </div>
        </div>`;
    })
    .join('');

  const horaInputs = listaFechasContainer.querySelectorAll('.hora-item');
  horaInputs.forEach((input) => {
    input.addEventListener('change', (event) => {
      const idx = Number(event.target.dataset.index);
      if (Number.isInteger(idx)) {
        fechasSeleccionadas[idx].hora = event.target.value;
      }
    });
  });

  const removeButtons = listaFechasContainer.querySelectorAll('[data-remove]');
  removeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.remove);
      if (!Number.isInteger(idx)) return;
      fechasSeleccionadas.splice(idx, 1);
      renderListadoFechas();
    });
  });
}

async function cargarSelects() {
  const [{ data: municipios }, { data: categorias }] = await Promise.all([
    supabase.from('Municipios').select('id, nombre').order('nombre'),
    supabase.from('categoriaEventos').select('id, nombre').order('nombre')
  ]);

  municipios?.forEach((m) => {
    municipioSelect.insertAdjacentHTML('beforeend', `<option value="${m.id}">${m.nombre}</option>`);
  });

  categorias?.forEach((c) => {
    categoriaSelect.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.nombre}</option>`);
  });
}

cargarSelects().catch((error) => {
  console.error('Error cargando catálogos de eventos:', error);
});

btnAgregarFecha.addEventListener('click', () => {
  const fecha = nuevaFechaInput.value;
  const hora = nuevaHoraInput.value;

  if (!fecha) {
    alert('Selecciona una fecha válida.');
    return;
  }

  if (fechasSeleccionadas.some((item) => item.fecha === fecha)) {
    alert('Esa fecha ya fue agregada.');
    return;
  }

  let horaAsignada = hora;

  if (mismaHoraCheckbox.checked) {
    if (!horaAsignada) {
      alert('Selecciona la hora que deseas aplicar a todas las fechas.');
      return;
    }
    fechasSeleccionadas.push({ fecha, hora: horaAsignada });
    fechasSeleccionadas.forEach((item) => {
      item.hora = horaAsignada;
    });
  } else {
    if (!horaAsignada) {
      alert('Selecciona la hora de inicio para esa fecha.');
      return;
    }
    fechasSeleccionadas.push({ fecha, hora: horaAsignada });
  }

  nuevaFechaInput.value = '';
  if (!mismaHoraCheckbox.checked) nuevaHoraInput.value = '';
  renderListadoFechas();
});

mismaHoraCheckbox.addEventListener('change', () => {
  if (mismaHoraCheckbox.checked) {
    const hora = nuevaHoraInput.value || fechasSeleccionadas[0]?.hora || '';
    if (!hora) {
      alert('Selecciona una hora para aplicar a todas las fechas.');
      mismaHoraCheckbox.checked = false;
      return;
    }
    fechasSeleccionadas.forEach((item) => {
      item.hora = hora;
    });
    nuevaHoraInput.value = hora;
  }
  renderListadoFechas();
});

gratisCheckbox.addEventListener('change', () => {
  if (gratisCheckbox.checked) {
    costoInput.value = 'Libre de Costo';
    costoInput.setAttribute('readonly', true);
  } else {
    costoInput.value = '';
    costoInput.removeAttribute('readonly');
  }
});

async function subirImagenEvento(file) {
  if (!file) throw new Error('Debes seleccionar una imagen del evento.');
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const nombreArchivo = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('galeriaeventos')
    .upload(nombreArchivo, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'No se pudo subir la imagen');
  }

  return `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriaeventos/${nombreArchivo}`;
}

async function eliminarEventoFallido(eventoId) {
  try {
    await supabase.from('eventos').delete().eq('id', eventoId);
  } catch (error) {
    console.error('No se pudo revertir el evento creado tras un fallo:', error);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (fechasSeleccionadas.length === 0) {
    alert('Agrega al menos una fecha para el evento.');
    return;
  }

  if (fechasSeleccionadas.some((item) => !item.hora)) {
    alert('Asegúrate de que todas las fechas tengan una hora de inicio definida.');
    return;
  }

  const formData = new FormData(form);
  const imagenFile = formData.get('imagen');

  try {
    if (typeof mostrarLoader === 'function') await mostrarLoader();

    const imagenUrl = await subirImagenEvento(imagenFile);

    const eventoPayload = {
      nombre: formData.get('nombre')?.trim(),
      descripcion: formData.get('descripcion')?.trim(),
      costo: gratisCheckbox.checked ? 'Libre de Costo' : formData.get('costo')?.trim(),
      gratis: gratisCheckbox.checked,
      lugar: formData.get('lugar')?.trim(),
      direccion: formData.get('direccion')?.trim(),
      municipio_id: Number(formData.get('municipio')),
      categoria: Number(formData.get('categoria')),
      enlaceboletos: formData.get('enlaceBoletos')?.trim() || null,
      imagen: imagenUrl,
      activo: true
    };

    const { data: eventoCreado, error: errorEvento } = await supabase
      .from('eventos')
      .insert([eventoPayload])
      .select('id')
      .single();

    if (errorEvento || !eventoCreado?.id) {
      throw new Error(errorEvento?.message || 'No se pudo crear el evento');
    }

    const fechasPayload = fechasSeleccionadas.map((item) => ({
      idevento: eventoCreado.id,
      fecha: item.fecha,
      horainicio: item.hora,
      mismahora: mismaHoraCheckbox.checked
    }));

    const { error: errorFechas } = await supabase
      .from('eventoFechas')
      .insert(fechasPayload);

    if (errorFechas) {
      await eliminarEventoFallido(eventoCreado.id);
      throw new Error(errorFechas.message || 'No se pudieron registrar las fechas del evento');
    }

    alert('Evento creado exitosamente.');
    form.reset();
    fechasSeleccionadas.length = 0;
    renderListadoFechas();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    console.error('Error al crear evento:', error);
    alert(error.message || 'Ocurrió un error al crear el evento.');
  } finally {
    if (typeof ocultarLoader === 'function') await ocultarLoader();
  }
});
