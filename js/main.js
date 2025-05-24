import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { cardComercio } from './CardComercio.js';

// ✅ Leer idCategoria desde la URL si fue pasadax
function obtenerIdCategoriaDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('idCategoria') || null;
}

const supabaseUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnamF4YW5xZmt3ZXNsa3h0YXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzk3NjgsImV4cCI6MjA2Mjg1NTc2OH0.Abif2Fu2uHyby--t_TAacEbjG8jCxmgsCbLx6AinT6c';
const supabase = createClient(supabaseUrl, supabaseKey);
const baseImageUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios';
const diaActual = new Date().getDay();
const idCategoriaDesdeURL = obtenerIdCategoriaDesdeURL(); // ✅ capturar si viene

let listaOriginal = [];

const filtrosActivos = {
  textoBusqueda: '',
  municipio: '',
  subcategoria: '',
  orden: '',
  abiertoAhora: false,
  favoritos: false,
  activos: false
};


async function cargarNombreCategoria() {
  if (!idCategoriaDesdeURL) return;

  const { data, error } = await supabase
    .from('Categorias')
    .select('nombre')
    .eq('id', parseInt(idCategoriaDesdeURL))
    .single();

  if (error) {
    console.error('Error cargando nombre de categoría:', error);
    return;
  }

  const titulo = document.getElementById('tituloCategoria');
  if (titulo) {
    titulo.textContent = data.nombre;
  }
}







async function cargarComercios() {
  let query = supabase.from('Comercios').select('*').eq('activo', true);

  // ✅ Filtrar por idCategoria si viene en la URL
  if (idCategoriaDesdeURL) {
    query = query.eq('idCategoria', parseInt(idCategoriaDesdeURL));
  }

  const { data: comercios, error } = await query;

  if (error) {
    console.error('Error cargando comercios:', error);
    return;
  }

  listaOriginal = [];

  for (const comercio of comercios) {
    const { data: portada } = await supabase
      .from('imagenesComercios')
      .select('imagen')
      .eq('idComercio', comercio.id)
      .eq('portada', true)
      .single();

    const { data: logo } = await supabase
      .from('imagenesComercios')
      .select('imagen')
      .eq('idComercio', comercio.id)
      .eq('logo', true)
      .single();

    const { data: horario } = await supabase
      .from('horarios')
      .select('apertura, cierre, cerrado')
      .eq('idComercio', comercio.id)
      .eq('diaSemana', diaActual)
      .single();

    const ahora = new Date();
    const horaActual = ahora.toTimeString().slice(0, 5);
    let abierto = false;
    if (horario && !horario.cerrado) {
      abierto = horaActual >= horario.apertura && horaActual <= horario.cierre;
    }

    listaOriginal.push({
      nombre: comercio.nombre,
      telefono: comercio.telefono,
      googleMap: comercio.googleMap,
      pueblo: comercio.municipio,
      tiempoVehiculo: "8 min",
      abierto: abierto,
      imagenPortada: portada ? `${baseImageUrl}/${portada.imagen}` : '',
      logo: logo ? `${baseImageUrl}/${logo.imagen}` : ''
    });
  }

  aplicarFiltrosYRedibujar();
}

function aplicarFiltrosYRedibujar() {
  const contenedor = document.getElementById('app');
  contenedor.innerHTML = '';

  let filtrados = listaOriginal;

  if (filtrosActivos.textoBusqueda.trim()) {
    const texto = filtrosActivos.textoBusqueda.toLowerCase();
    filtrados = filtrados.filter(c => c.nombre.toLowerCase().includes(texto));
  }

  for (const comercio of filtrados) {
    const card = cardComercio(comercio);
    contenedor.appendChild(card);
  }
}

// --- Listeners activos ---
document.getElementById('filtro-nombre')?.addEventListener('input', (e) => {
  filtrosActivos.textoBusqueda = e.target.value;
  aplicarFiltrosYRedibujar();
});

cargarComercios();
cargarNombreCategoria();