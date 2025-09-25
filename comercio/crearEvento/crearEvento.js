// adminEventos.js
import { supabase } from '../shared/supabaseClient.js';

const form = document.getElementById('formCrearEvento');
const municipioSelect = document.getElementById('municipio');
const categoriaSelect = document.getElementById('categoria');

// Cargar Municipios y Categorías
async function cargarSelects() {
  const { data: municipios } = await supabase.from('Municipios').select('*').order('nombre');
  municipios?.forEach(m => {
    municipioSelect.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
  });

  const { data: categorias } = await supabase.from('categoriaEventos').select('*').order('nombre');
  categorias?.forEach(c => {
    categoriaSelect.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
  });
}
cargarSelects();

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const imagenFile = formData.get('imagen');
  const nombreArchivo = `${Date.now()}_${imagenFile.name}`;

  const { data: imgData, error: errorUpload } = await supabase.storage
  .from('galeriaeventos') // ← ✅ usa el bucket correcto
  .upload(nombreArchivo, imagenFile, {
    cacheControl: '3600',
    upsert: true
  });

  if (errorUpload) {
    alert('Error subiendo imagen');
    console.error(errorUpload);
    return;
  }

  const evento = {
    nombre: formData.get('nombre')?.trim(),
    descripcion: formData.get('descripcion')?.trim(),
    fecha: formData.get('fecha'),
    hora: formData.get('hora'),
    costo: formData.get('gratis') ? 'Libre de Costo' : formData.get('costo')?.trim(),
    gratis: formData.get('gratis') ? true : false,
    lugar: formData.get('lugar')?.trim(),
    direccion: formData.get('direccion')?.trim(),
    municipio_id: parseInt(formData.get('municipio')),
    categoria: parseInt(formData.get('categoria')),
    enlaceboletos: formData.get('enlaceBoletos')?.trim() || null,
    imagen: `https://zgjaxangfkweslkxtayt.supabase.co/storage/v1/object/public/galeriaeventos/${nombreArchivo}`,
    activo: true
  };

  // 🔎 DEBUG extra
  console.log('📦 Payload evento:', JSON.stringify(evento, null, 2));
  if (!evento.nombre || !evento.descripcion || !evento.fecha || !evento.hora || !evento.municipio_id || !evento.categoria) {
    console.error('❌ Campos requeridos faltantes o inválidos:', evento);
  }

  const { error } = await supabase.from('eventos').insert(evento);

  if (error) {
    alert('Error guardando evento');
    console.error('❌ Error Supabase:', error.message);
    console.error('🧾 Detalles:', error.details);
    console.error('📑 Hint:', error.hint);
  } else {
    alert('✅ Evento creado exitosamente');
    form.reset();
    window.scrollTo(0, 0);
  }
});
