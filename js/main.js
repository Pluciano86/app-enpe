import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { cardComercio } from './CardComercio.js'

const supabaseUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnamF4YW5xZmt3ZXNsa3h0YXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzk3NjgsImV4cCI6MjA2Mjg1NTc2OH0.Abif2Fu2uHyby--t_TAacEbjG8jCxmgsCbLx6AinT6c'
const supabase = createClient(supabaseUrl, supabaseKey)

const baseImageUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios'
const diaActual = new Date().getDay()
let comercios = [] // Lista global para poder aplicar filtros luego

async function cargarComercios() {
  const { data, error } = await supabase
    .from('Comercios')
    .select('*')
    .eq('activo', true)

  if (error) {
    console.error('Error cargando comercios:', error)
    return
  }

  comercios = data // Guardamos para filtros
  renderComercios(comercios)
}

async function renderComercios(lista) {
  const contenedor = document.getElementById('app')
  contenedor.innerHTML = ''

  for (const comercio of lista) {
    const { data: portada } = await supabase
      .from('imagenesComercios')
      .select('imagen')
      .eq('idComercio', comercio.id)
      .eq('portada', true)
      .single()

    const { data: logo } = await supabase
      .from('imagenesComercios')
      .select('imagen')
      .eq('idComercio', comercio.id)
      .eq('logo', true)
      .single()

    const { data: horario } = await supabase
      .from('horarios')
      .select('apertura, cierre, cerrado')
      .eq('idComercio', comercio.id)
      .eq('diaSemana', diaActual)
      .single()

    const ahora = new Date()
    const horaActual = ahora.toTimeString().slice(0, 5)
    let abierto = false

    if (horario && !horario.cerrado) {
      abierto = horaActual >= horario.apertura && horaActual <= horario.cierre
    }

    const card = cardComercio({
      nombre: comercio.nombre,
      telefono: comercio.telefono,
      googleMap: comercio.googleMap,
      pueblo: comercio.municipio,
      tiempoVehiculo: "8 min",
      abierto: abierto,
      imagenPortada: portada ? `${baseImageUrl}/${portada.imagen}` : '',
      logo: logo ? `${baseImageUrl}/${logo.imagen}` : ''
    })

    contenedor.appendChild(card)
  }
}

cargarComercios()

// FILTROS LISTA DE COMERCIOS

const filtrosActivos = {
  textoBusqueda: '',
  municipio: '',
  subcategoria: '',
  orden: '',
  abiertoAhora: false,
  favoritos: false,
  activos: false
};

// Listeners para filtros

// MUNICIPIO
const selectMunicipio = document.getElementById('selectMunicipio')
if (selectMunicipio) {
  selectMunicipio.addEventListener('change', (e) => {
    filtrosActivos.municipio = e.target.value;
    aplicarFiltrosYRedibujar();
  });
}

// SUBCATEGORÍA
const selectSubcategoria = document.getElementById('selectSubcategoria')
if (selectSubcategoria) {
  selectSubcategoria.addEventListener('change', (e) => {
    filtrosActivos.subcategoria = e.target.value;
    aplicarFiltrosYRedibujar();
  });
}

// ORDEN
const selectOrden = document.getElementById('selectOrden')
if (selectOrden) {
  selectOrden.addEventListener('change', (e) => {
    filtrosActivos.orden = e.target.value;
    aplicarFiltrosYRedibujar();
  });
}

// CHECKS
['chkAbierto', 'chkFavorito', 'chkActivo'].forEach(id => {
  const el = document.getElementById(id)
  if (el) {
    el.addEventListener('change', (e) => {
      filtrosActivos[id === 'chkAbierto' ? 'abiertoAhora' : id === 'chkFavorito' ? 'favoritos' : 'activos'] = e.target.checked;
      aplicarFiltrosYRedibujar();
    });
  }
})

// BÚSQUEDA POR NOMBRE (revisado para esperar DOM cargado)
document.addEventListener("DOMContentLoaded", () => {
  const inputNombre = document.getElementById("filtro-nombre")

  if (!inputNombre) {
    console.warn("No se encontró el input filtro-nombre")
    return
  }

  inputNombre.addEventListener("input", () => {
    const texto = inputNombre.value.toLowerCase().trim();
    const filtrados = comercios.filter(c =>
      c.nombre.toLowerCase().includes(texto)
    );
    renderComercios(filtrados);
  });
})