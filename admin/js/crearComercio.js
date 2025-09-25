// crearComercio.js
import { supabase } from '../shared/supabaseClient.js';

const municipioSelect = document.getElementById('municipio');
const categoriaSelect = document.getElementById('categoria');
const subcategoriaSelect = document.getElementById('subcategoria');
const crearBtn = document.getElementById('crearBtn');

export async function cargarMunicipios() {
  const { data, error } = await supabase
    .from('Municipios')
    .select('id, nombre')
    .order('nombre');

  if (error) return console.error('❌ Error cargando municipios:', error);

  data.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.nombre;
    municipioSelect.appendChild(opt);
  });
}

export async function cargarCategorias() {
  const { data, error } = await supabase
    .from('Categorias')
    .select('id, nombre')
    .order('nombre');

  if (error) return console.error('❌ Error cargando categorías:', error);

  data.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.nombre;
    categoriaSelect.appendChild(opt);
  });
}

export async function cargarSubcategorias() {
  const idCategoria = parseInt(categoriaSelect.value);
  if (isNaN(idCategoria)) {
    subcategoriaSelect.innerHTML = '<option value="">Seleccionar Subcategoría</option>';
    return;
  }

  const { data, error } = await supabase
    .from('subCategoria')
    .select('id, nombre')
    .eq('idCategoria', idCategoria)
    .order('nombre');

  if (error) return console.error('❌ Error cargando subcategorías:', error);

  subcategoriaSelect.innerHTML = '<option value="">Seleccionar Subcategoría</option>';
  data.forEach((sub) => {
    const opt = document.createElement('option');
    opt.value = sub.id;
    opt.textContent = sub.nombre;
    subcategoriaSelect.appendChild(opt);
  });
}

categoriaSelect.addEventListener('change', cargarSubcategorias);

crearBtn.addEventListener('click', async () => {
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const direccion = document.getElementById('direccion').value.trim();
  const idMunicipio = parseInt(municipioSelect.value);
  const idCategoria = parseInt(categoriaSelect.value);
  const idSubcategoria = parseInt(subcategoriaSelect.value);
  const latitud = parseFloat(document.getElementById('latitud').value);
  const longitud = parseFloat(document.getElementById('longitud').value);

  if (!nombre || !telefono || !direccion || isNaN(idMunicipio) || isNaN(idCategoria)) {
    alert('Faltan campos obligatorios.');
    return;
  }

  const { data: municipioData, error: municipioError } = await supabase
  .from('Municipios')
  .select('idArea, nombre')
  .eq('id', idMunicipio)
  .single();

if (municipioError || !municipioData?.idArea) {
  alert('❌ Error obteniendo el área del municipio.');
  console.error(municipioError);
  return;
}

const idArea = municipioData.idArea;
const nombreMunicipio = municipioData.nombre;

const { data: areaData, error: areaError } = await supabase
  .from('Area')
  .select('nombre')
  .eq('idArea', idArea)
  .single();

if (areaError || !areaData?.nombre) {
  alert('❌ Error obteniendo el nombre del área.');
  console.error(areaError);
  return;
}

const nombreArea = areaData.nombre;

  const { error: insertError } = await supabase.from('Comercios').insert({
  nombre,
  telefono,
  direccion,
  idMunicipio,
  municipio: nombreMunicipio,
  idCategoria: isNaN(idCategoria) ? [] : [idCategoria],  // 👈 En array
  idSubcategoria: isNaN(idSubcategoria) ? [] : [idSubcategoria], // 👈 En array también
  latitud,
  longitud,
  idArea,
  area: nombreArea,  
  activo: true
});

  if (insertError) {
    alert('❌ Error creando comercio');
    console.error(insertError);
    return;
  }

  alert('✅ Comercio creado exitosamente');
  location.href = 'adminComercios.html';
});

cargarMunicipios();
cargarCategorias();