// 📦 Supabase y componentes
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { cardComercio } from './CardComercio.js';

function obtenerIdCategoriaDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('idCategoria') || null;
}

const supabaseUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnamF4YW5xZmt3ZXNsa3h0YXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzk3NjgsImV4cCI6MjA2Mjg1NTc2OH0.Abif2Fu2uHyby--t_TAacEbjG8jCxmgsCbLx6AinT6c';
const supabase = createClient(supabaseUrl, supabaseKey);
const baseImageUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios';

const diaActual = new Date().getDay();
const idCategoriaDesdeURL = obtenerIdCategoriaDesdeURL();

let listaOriginal = [];
let latUsuario = null;
let lonUsuario = null;

const filtrosActivos = {
  textoBusqueda: '',
  municipio: '',
  categoria: '',
  subcategoria: '',
  orden: 'ubicacion',
  abiertoAhora: false,
  favoritos: false,
  activos: false,
  destacadosPrimero: true
};

function actualizarEtiquetaSubcategoria(nombreCategoria) {
  const label = document.querySelector('label[for="filtro-subcategoria"]');
  if (label) {
    switch (nombreCategoria.toLowerCase()) {
      case 'restaurantes':
        label.textContent = 'Tipo de Comida'; break;
      case 'servicios':
        label.textContent = 'Tipo de Servicio'; break;
      case 'tiendas':
        label.textContent = 'Tipo de Tienda'; break;
      default:
        label.textContent = 'Subcategoría';
    }
  }
}

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
    actualizarEtiquetaSubcategoria(data.nombre);
  }
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function formatearTiempo(minutos) {
  return minutos >= 60
    ? `${Math.floor(minutos / 60)}h ${minutos % 60}min`
    : `${minutos} min`;
}

async function cargarComercios() {
  // 1. Traer todos los comercios activos
  let query = supabase.from('Comercios').select('*');
  if (idCategoriaDesdeURL) {
    query = query.eq('idCategoria', parseInt(idCategoriaDesdeURL));
  }

  const { data: comercios, error: errorComercios } = await query;
  if (errorComercios) {
    console.error('❌ Error cargando comercios:', errorComercios);
    return;
  }

  // 2. Traer todas las imágenes (portadas y logos)
  const { data: imagenesAll, error: errorImagenes } = await supabase
    .from('imagenesComercios')
    .select('idComercio, imagen, portada, logo');

  if (errorImagenes) {
    console.error('❌ Error cargando imágenes:', errorImagenes);
    return;
  }

  // 3. Traer todos los horarios del día actual
  const { data: horariosAll, error: errorHorarios } = await supabase
    .from('Horarios')
    .select('idComercio, apertura, cierre, cerrado, diaSemana')
    .eq('diaSemana', diaActual);

  if (errorHorarios) {
    console.error('❌ Error cargando horarios:', errorHorarios);
    return;
  }

  // 4. Procesar la lista
  listaOriginal = comercios.map(comercio => {
    // Buscar portada y logo en la lista ya traída
    const portada = imagenesAll.find(img => img.idComercio === comercio.id && img.portada);
    const logo = imagenesAll.find(img => img.idComercio === comercio.id && img.logo);

    // Buscar horario del día actual
    const horario = horariosAll.find(h => h.idComercio === comercio.id);

    // Calcular si está abierto
    const ahora = new Date();
    const horaActual = ahora.toTimeString().slice(0, 5);
    let abierto = false;
    if (horario && !horario.cerrado && horario.apertura && horario.cierre) {
      const apertura = horario.apertura.slice(0, 5);
      const cierre = horario.cierre.slice(0, 5);
      abierto = horaActual >= apertura && horaActual <= cierre;
    }

    // Calcular distancia
    let distancia = null;
    if (latUsuario && lonUsuario && comercio.latitud && comercio.longitud) {
      distancia = calcularDistancia(latUsuario, lonUsuario, comercio.latitud, comercio.longitud);
    }

    const minutosEstimados = distancia ? Math.round(distancia * 2) : null;

    return {
      id: comercio.id,
      nombre: comercio.nombre,
      telefono: comercio.telefono,
      googleMap: comercio.googleMap,
      pueblo: comercio.municipio,
      abierto,
      tiempoVehiculo: minutosEstimados != null ? formatearTiempo(minutosEstimados) : null,
      imagenPortada: portada ? `${baseImageUrl}/${portada.imagen}` : '',
      logo: logo ? `${baseImageUrl}/${logo.imagen}` : '',
      distanciaKm: distancia,
      idCategoria: comercio.idCategoria,
      idSubcategoria: parseInt(comercio.idSubcategoria),
     activoEnPeErre: comercio.activo === true,
      favorito: comercio.favorito || false
    };
  });
}

function normalizarTexto(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}


function aplicarFiltrosYRedibujar() {
  const contenedor = document.getElementById('app');
  contenedor.innerHTML = '';

  let filtrados = listaOriginal;

  if (filtrosActivos.textoBusqueda.trim()) {
  const texto = normalizarTexto(filtrosActivos.textoBusqueda);
  filtrados = filtrados.filter(c => normalizarTexto(c.nombre).includes(texto));
}
  if (filtrosActivos.municipio) filtrados = filtrados.filter(c => c.pueblo === filtrosActivos.municipio);
  if (filtrosActivos.categoria) filtrados = filtrados.filter(c => c.idCategoria == filtrosActivos.categoria);
  if (filtrosActivos.subcategoria) filtrados = filtrados.filter(c => c.idSubcategoria === parseInt(filtrosActivos.subcategoria));
  if (filtrosActivos.abiertoAhora) filtrados = filtrados.filter(c => c.abierto === true);

  for (const comercio of filtrados) {
    const card = cardComercio(comercio);
    contenedor.appendChild(card);
  }
}

// 🧩 Listeners
['filtro-nombre', 'filtro-municipio', 'filtro-subcategoria', 'filtro-orden', 'filtro-abierto', 'filtro-destacados']
  .forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const evento = id === 'filtro-nombre' ? 'input' : 'change';
    el.addEventListener(evento, (e) => {
      const v = e.target;
      if (id === 'filtro-nombre') filtrosActivos.textoBusqueda = v.value;
      if (id === 'filtro-municipio') filtrosActivos.municipio = v.value;
      if (id === 'filtro-subcategoria') filtrosActivos.subcategoria = v.value;
      if (id === 'filtro-orden') filtrosActivos.orden = v.value;
      if (id === 'filtro-abierto') filtrosActivos.abiertoAhora = v.checked;
      if (id === 'filtro-destacados') filtrosActivos.destacadosPrimero = v.checked;
      if (['filtro-nombre', 'filtro-municipio', 'filtro-subcategoria', 'filtro-abierto'].includes(id)) {
        aplicarFiltrosYRedibujar();
      } else {
        cargarComerciosConOrden();
      }
    });
  });

navigator.geolocation.getCurrentPosition(
  (pos) => {
    latUsuario = pos.coords.latitude;
    lonUsuario = pos.coords.longitude;
    cargarComerciosConOrden();
  },
  () => cargarComerciosConOrden()
);

document.addEventListener('DOMContentLoaded', () => {
  cargarNombreCategoria();
  cargarMunicipios();
  cargarSubcategorias(idCategoriaDesdeURL);
});

async function cargarComerciosConOrden() {
  await cargarComercios();

  if (filtrosActivos.orden === 'ubicacion') {
    listaOriginal.sort((a, b) => {
      if (a.distanciaKm == null) return 1;
      if (b.distanciaKm == null) return -1;
      return a.distanciaKm - b.distanciaKm;
    });
  } else if (filtrosActivos.orden === 'az') {
    listaOriginal.sort((a, b) => a.nombre.localeCompare(b.nombre));
  } else if (filtrosActivos.orden === 'recientes') {
    listaOriginal.sort((a, b) => b.id - a.id);
  }

  if (filtrosActivos.destacadosPrimero) {
  // Separa activos y no activos
  const activos = listaOriginal.filter(c => c.activoEnPeErre === true);
  const noActivos = listaOriginal.filter(c => c.activoEnPeErre !== true);

  console.log("Activos:", activos.map(c => c.nombre));
  console.log("No activos:", noActivos.map(c => c.nombre));

  // Ordenar ambos por distancia
  activos.sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity));
  noActivos.sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity));

  // Unir listas: activos primero
  listaOriginal = [...activos, ...noActivos];
}

  aplicarFiltrosYRedibujar();
}

async function cargarMunicipios() {
  const { data, error } = await supabase.from('Municipios').select('id, nombre');
  const select = document.getElementById('filtro-municipio');
  if (!select) return;
  if (error) return console.error('Error cargando municipios:', error);

  data.forEach(m => {
    const option = document.createElement('option');
    option.value = m.nombre;
    option.textContent = m.nombre;
    select.appendChild(option);
  });
}

async function cargarSubcategorias(categoriaId) {
  const select = document.getElementById('filtro-subcategoria');
  if (!select || !categoriaId) return;

  select.innerHTML = '<option value="">Todas</option>';
  const { data, error } = await supabase
    .from('subCategoria')
    .select('id, nombre')
    .eq('idCategoria', parseInt(categoriaId));

  if (error) return console.error('Error cargando subcategorías:', error);

  data.forEach(s => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = s.nombre;
    select.appendChild(option);
  });
}

console.log("idCategoriaDesdeURL:", idCategoriaDesdeURL);
