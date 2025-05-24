import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { cardComercio } from './CardComercio.js';

function obtenerIdCategoriaDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('idCategoria') || null;
}

const supabaseUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnamF4YW5xZmt3ZXNsa3h0YXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzk3NjgsImV4cCI6MjA2Mjg1NTc2OH0.Abif2Fu2uHyby--t_TAacEbjG8jCxmgsCbLx6AinT6c'; // tu llave está bien
const supabase = createClient(supabaseUrl, supabaseKey);
const baseImageUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios';
const diaActual = new Date().getDay();
const idCategoriaDesdeURL = obtenerIdCategoriaDesdeURL();

let listaOriginal = [];
let latUsuario = null;
let lonUsuario = null;async function cargarNombreCategoria() {
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

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c; // km
}

async function cargarComercios() {
  let query = supabase.from('Comercios').select('*').eq('activo', true);

  if (idCategoriaDesdeURL) {
    query = query.eq('idCategoria', parseInt(idCategoriaDesdeURL));
  }

  const { data: comercios, error } = await query;

  if (error) {
    console.error('❌ Error cargando comercios:', error);
    return;
  }

  console.log('✅ Comercios obtenidos:', comercios);

  listaOriginal = [];

  for (const comercio of comercios) {
    console.log(`🔍 Procesando comercio: ${comercio.nombre}`);

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

    // Validar coordenadas
    let distancia = null;
    if (latUsuario && lonUsuario && comercio.latitud && comercio.longitud) {
      distancia = calcularDistancia(latUsuario, lonUsuario, comercio.latitud, comercio.longitud);
    } else {
      console.warn(`⚠️ Coordenadas faltantes en ${comercio.nombre}`);
    }

    listaOriginal.push({
      nombre: comercio.nombre,
      telefono: comercio.telefono,
      googleMap: comercio.googleMap,
      pueblo: comercio.municipio,
      abierto: abierto,
      tiempoVehiculo: distancia ? `${Math.round(distancia * 2)} min` : null,
      imagenPortada: portada ? `${baseImageUrl}/${portada.imagen}` : '',
      logo: logo ? `${baseImageUrl}/${logo.imagen}` : '',
      distanciaKm: distancia
    });
  }

  console.log("✅ Comercios procesados para renderizar:", listaOriginal);
  aplicarFiltrosYRedibujar();
}

const filtrosActivos = {
  textoBusqueda: '',
  municipio: '',
  subcategoria: '',
  orden: 'ubicacion', // puedes cambiar esto por defecto a 'ubicacion', 'az', 'recientes'
  abiertoAhora: false,
  favoritos: false,
  activos: false
};




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

// Listeners
document.getElementById('filtro-nombre')?.addEventListener('input', (e) => {
  filtrosActivos.textoBusqueda = e.target.value;
  aplicarFiltrosYRedibujar();
});

// Geolocalización y carga
navigator.geolocation.getCurrentPosition(
  (pos) => {
    latUsuario = pos.coords.latitude;
    lonUsuario = pos.coords.longitude;
    cargarComerciosConOrden(); // ✅ usamos la nueva función que incluye sort
  },
  (err) => {
    console.warn("No se pudo obtener ubicación del usuario:", err);
    cargarComerciosConOrden(); // incluso sin ubicación, seguimos
  }
);

cargarNombreCategoria();

// ✅ Nueva función con el orden por cercanía integrado
async function cargarComerciosConOrden() {
  await cargarComercios();

  if (filtrosActivos.orden === 'ubicacion') {
    listaOriginal.sort((a, b) => {
      if (a.distanciaKm == null) return 1;
      if (b.distanciaKm == null) return -1;
      return a.distanciaKm - b.distanciaKm;
    });
  }

  console.log("Lista ordenada por distancia:");
  listaOriginal.forEach(c => console.log(`${c.nombre}: ${c.distanciaKm?.toFixed(2)} km`));

  aplicarFiltrosYRedibujar();
}