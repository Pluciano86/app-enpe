// 📦 Supabase y componentes

function mostrarMensajeVacio(contenedor, mensaje = 'No se encontraron comercios para los filtros seleccionados.', icono = '📍') {
  contenedor.innerHTML = `
    <div class="col-span-full flex justify-center items-center py-12">
      <div class="w-full max-w-xs text-center text-gray-600 px-4">
        <div class="text-5xl mb-2 animate-bounce">${icono}</div>
        <p class="text-lg font-medium leading-tight mb-1">${mensaje}</p>
        <p class="text-sm text-gray-400">Prueba cambiar los filtros o intenta otra búsqueda.</p>
      </div>
    </div>
  `;
}

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { cardComercio } from './CardComercio.js';
import { cardComercioNoActivo } from './CardComercioNoActivo.js';
//import { calcularTiemposParaLista } from './calcularTiemposParaLista.js';
import { detectarMunicipioUsuario } from './detectarMunicipio.js';

function mostrarLoader() {
  document.getElementById('loaderLogo')?.classList.remove('hidden');
}
function ocultarLoader() {
  document.getElementById('loaderLogo')?.classList.add('hidden');
}

function obtenerIdCategoriaDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('idCategoria');
  if (!raw) return null;
  return parseInt(raw);
}

const supabaseUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnamF4YW5xZmt3ZXNsa3h0YXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzk3NjgsImV4cCI6MjA2Mjg1NTc2OH0.Abif2Fu2uHyby--t_TAacEbjG8jCxmgsCbLx6AinT6c';
const supabase = createClient(supabaseUrl, supabaseKey);
const baseImageUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios';

const diaActual = new Date().getDay();
const idCategoriaDesdeURL = obtenerIdCategoriaDesdeURL();
cargarNombreCategoria();
cargarMunicipios();
if (idCategoriaDesdeURL) {
  cargarSubcategorias(idCategoriaDesdeURL);
}


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
  destacadosPrimero: true,
  comerciosPorPlato: []
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
    .select('nombre, icono') // 👈 aseguramos que viene el icono
    .eq('id', parseInt(idCategoriaDesdeURL))
    .single();

  if (error || !data) {
    console.error('Error cargando categoría:', error);
    return;
  }

  const titulo = document.getElementById('tituloCategoria');
  const icono = document.getElementById('iconoCategoria');
  const input = document.getElementById('filtro-nombre');

  if (titulo) {
    titulo.textContent = data.nombre;
    actualizarEtiquetaSubcategoria(data.nombre);
  }

  if (icono && data.icono) {
    icono.innerHTML = data.icono;
  }

  if (input) {
    input.placeholder = `Buscar en ${data.nombre}`;
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
  let query = supabase.from('Comercios').select('*');
  if (idCategoriaDesdeURL) {
    query = query.overlaps('idCategoria', [idCategoriaDesdeURL]);
  }

  const { data: comercios, error } = await query;
  if (error || !comercios?.length) return;

  const { data: imagenesAll } = await supabase
    .from('imagenesComercios')
    .select('idComercio, imagen, portada, logo');

  const { data: horariosAll } = await supabase
    .from('Horarios')
    .select('idComercio, apertura, cierre, cerrado, diaSemana')
    .eq('diaSemana', diaActual);

  const { data: productosAll } = await supabase.from('productos').select('idMenu, nombre');

// Obtener usuario autenticado
const { data: { user } } = await supabase.auth.getUser();
let favoritosUsuario = [];

if (user) {
  const { data: favoritosData } = await supabase
    .from('favoritosusuarios')
    .select('idcomercio')
    .eq('idusuario', user.id);

  favoritosUsuario = favoritosData?.map(f => f.idcomercio) ?? [];
}


  const { data: menusAll } = await supabase.from('menus').select('id, idComercio');

  const productosPorComercio = {};
  for (const producto of productosAll) {
    const menu = menusAll.find(m => m.id === producto.idMenu);
    if (!menu) continue;
    if (!productosPorComercio[menu.idComercio]) productosPorComercio[menu.idComercio] = [];
    productosPorComercio[menu.idComercio].push(producto.nombre);
  }

  listaOriginal = comercios.map(comercio => {
    const portada = imagenesAll.find(img => img.idComercio === comercio.id && img.portada);
    const logo = imagenesAll.find(img => img.idComercio === comercio.id && img.logo);
    const horario = horariosAll.find(h => h.idComercio === comercio.id);

    let abierto = false;
    if (horario && !horario.cerrado && horario.apertura && horario.cierre) {
      const horaActual = new Date().toTimeString().slice(0, 5);
      const apertura = horario.apertura.slice(0, 5);
      const cierre = horario.cierre.slice(0, 5);
      abierto = horaActual >= apertura && horaActual <= cierre;
    }

    let distancia = null;
    if (latUsuario && lonUsuario && comercio.latitud && comercio.longitud) {
      distancia = calcularDistancia(latUsuario, lonUsuario, comercio.latitud, comercio.longitud);
    }

    return {
      id: comercio.id,
      nombre: comercio.nombre,
      telefono: comercio.telefono,
      googleMap: comercio.googleMap,
      pueblo: comercio.municipio,
      abierto,
      tiempoVehiculo: null,
      imagenPortada: portada ? `${baseImageUrl}/${portada.imagen}` : '',
      logo: logo ? `${baseImageUrl}/${logo.imagen}` : '',
      distanciaKm: distancia,
      idCategoria: comercio.idCategoria,
      idSubcategoria: Array.isArray(comercio.idSubcategoria)
        ? comercio.idSubcategoria
        : [parseInt(comercio.idSubcategoria)],
      activoEnPeErre: comercio.activo === true,
      favorito: favoritosUsuario.includes(comercio.id),
      platos: productosPorComercio[comercio.id] || [],
      latitud: comercio.latitud,
      longitud: comercio.longitud
    };
  });
}

function normalizarTexto(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}


function aplicarFiltrosYRedibujar() {
  console.log("🟡 Aplicando filtros con:", filtrosActivos);
  const contenedor = document.getElementById('app');
  contenedor.innerHTML = '';

  let filtrados = listaOriginal;

  const texto = normalizarTexto(filtrosActivos.textoBusqueda.trim());
  if (texto) {
    filtrados = filtrados.filter(c =>
      normalizarTexto(c.nombre).includes(texto) ||
      (c.platos && c.platos.some(p => normalizarTexto(p).includes(texto)))
    );
  }

  if (filtrosActivos.comerciosPorPlato?.length > 0) {
    filtrados = filtrados.filter(c => filtrosActivos.comerciosPorPlato.includes(c.id));
  }

  if (filtrosActivos.municipio) {
    filtrados = filtrados.filter(c => c.pueblo === filtrosActivos.municipio);
  }

  if (filtrosActivos.subcategoria) {
    filtrados = filtrados.filter(c =>
      Array.isArray(c.idSubcategoria) &&
      c.idSubcategoria.includes(parseInt(filtrosActivos.subcategoria))
    );
  }

  if (filtrosActivos.abiertoAhora) {
    filtrados = filtrados.filter(c => c.abierto === true);
  }

  if (filtrosActivos.favoritos) {
    filtrados = filtrados.filter(c => c.favorito === true);
  }

  // Mostrar filtros activos
  const filtrosDiv = document.getElementById('filtros-activos');
  filtrosDiv.innerHTML = '';

  const categoriaCruda = document.getElementById('tituloCategoria')?.textContent || 'Resultados';
  const categoriaNombre = categoriaCruda
    .split(' ')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
  const total = filtrados.length;
  const labelTotal = document.createElement('span');
  labelTotal.textContent = `${total} ${categoriaNombre}`;
  labelTotal.className = 'font-medium';
  filtrosDiv.appendChild(labelTotal);

  // Subcategoría activa
  if (filtrosActivos.subcategoria) {
    const opcion = document.querySelector(`#filtro-subcategoria option[value="${filtrosActivos.subcategoria}"]`);
    if (opcion) {
      const tag = crearTagFiltro(opcion.textContent, () => {
        filtrosActivos.subcategoria = '';
        document.getElementById('filtro-subcategoria').value = '';
        aplicarFiltrosYRedibujar();
      });
      filtrosDiv.appendChild(tag);
    }
  }

  // Municipio activo
  if (filtrosActivos.municipio) {
    const tag = crearTagFiltro(`en ${filtrosActivos.municipio}`, () => {
      filtrosActivos.municipio = '';
      document.getElementById('filtro-municipio').value = '';
      aplicarFiltrosYRedibujar();
    });
    filtrosDiv.appendChild(tag);
  }

  if (filtrados.length === 0) {
    mostrarMensajeVacio(contenedor);
    return;
  }

  for (const comercio of filtrados) {
    const card = comercio.activoEnPeErre
      ? cardComercio(comercio)
      : cardComercioNoActivo(comercio);
    contenedor.appendChild(card);
  }
}

// Utilidad para tags de filtro
function crearTagFiltro(texto, onClick) {
  const span = document.createElement('span');
  span.className = 'bg-gray-100 text-gray-800 px-2 py-1 rounded flex items-center gap-1';
  span.innerHTML = `${texto} <button class="text-gray-500 hover:text-red-500 font-bold">×</button>`;
  span.querySelector('button').onclick = onClick;
  return span;
}

// 🧩 Listeners
['filtro-nombre', 'filtro-municipio', 'filtro-subcategoria', 'filtro-orden', 'filtro-abierto', 'filtro-destacados', 'filtro-favoritos']
  .forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    const evento = id === 'filtro-nombre' ? 'input' : 'change';
    el.addEventListener(evento, async (e) => {
      const v = e.target;
      console.log(`🛠 Cambió filtro ${id}:`, v.value ?? v.checked);

      if (id === 'filtro-nombre') {
        const texto = v.value.trim();
        filtrosActivos.textoBusqueda = texto;

        if (texto.length >= 3) {
          const { data: productos, error } = await supabase
            .from('productos')
            .select('idMenu, nombre')
            .ilike('nombre', `%${texto}%`);

          if (!error && productos?.length) {
            const idMenus = productos.map(p => p.idMenu);
            const { data: menus, error: errMenus } = await supabase
              .from('menus')
              .select('idComercio')
              .in('id', idMenus);
            if (!errMenus && menus?.length) {
              const idComercios = [...new Set(menus.map(m => m.idComercio))];
              filtrosActivos.comerciosPorPlato = idComercios;
            }
          } else {
            filtrosActivos.comerciosPorPlato = [];
          }
        } else {
          filtrosActivos.comerciosPorPlato = [];
        }
      }

      if (id === 'filtro-municipio') filtrosActivos.municipio = v.value;
      if (id === 'filtro-subcategoria') filtrosActivos.subcategoria = v.value;
      if (id === 'filtro-orden') filtrosActivos.orden = v.value;
      if (id === 'filtro-abierto') filtrosActivos.abiertoAhora = v.checked;
      if (id === 'filtro-favoritos') filtrosActivos.favoritos = v.checked;
      if (id === 'filtro-destacados') {
        filtrosActivos.destacadosPrimero = v.checked;
        console.log(`⭐ Cambió filtro destacadosPrimero: ${v.checked}`);
        await cargarComerciosConOrden(); // ✅ refresca con orden
        return;
      }

      // ✅ Nuevo console antes de aplicar
      console.log('🟡 Aplicando filtros con:', { ...filtrosActivos });

      if (id === 'filtro-orden') {
        await cargarComerciosConOrden();
      } else {
        aplicarFiltrosYRedibujar();
      }
    });
  });

  

navigator.geolocation.getCurrentPosition(async (pos) => {
  latUsuario = pos.coords.latitude;
  lonUsuario = pos.coords.longitude;

  // Detectar municipio
  const municipioDetectado = detectarMunicipioUsuario({
    lat: latUsuario,
    lon: lonUsuario
  });
  console.log("📍 Municipio más cercano detectado:", municipioDetectado);

  // Activar ese filtro automáticamente
  filtrosActivos.municipio = municipioDetectado;
  const selectMunicipio = document.getElementById('filtro-municipio');
  if (selectMunicipio) selectMunicipio.value = municipioDetectado;


ocultarLoader();

  await cargarComerciosConOrden();
});

async function cargarComerciosConOrden() {
  console.log("🔄 Orden seleccionado:", filtrosActivos.orden);

  // Solo recarga comercios (no toca tiempos)
  await cargarComercios();

if (filtrosActivos.orden === 'ubicacion') {
  listaOriginal.sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity));
} else if (filtrosActivos.orden === 'az') {
  listaOriginal.sort((a, b) => a.nombre.localeCompare(b.nombre));
} else if (filtrosActivos.orden === 'recientes') {
  listaOriginal.sort((a, b) => b.id - a.id);
}

  // Reordenar si destacados está activo
  if (filtrosActivos.destacadosPrimero) {
    const activos = listaOriginal.filter(c => c.activoEnPeErre);
    const inactivos = listaOriginal.filter(c => !c.activoEnPeErre);

    activos.sort((a, b) => (a.minutosCrudos ?? Infinity) - (b.minutosCrudos ?? Infinity));
    inactivos.sort((a, b) => (a.minutosCrudos ?? Infinity) - (b.minutosCrudos ?? Infinity));

    listaOriginal = [...activos, ...inactivos];
  }

  if (filtrosActivos.comerciosPorPlato?.length > 0) {
    listaOriginal = listaOriginal.filter(c =>
      filtrosActivos.comerciosPorPlato.includes(c.id)
    );
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

function actualizarResumenFiltros() {
  const contenedor = document.getElementById('resumen-filtros');
  if (!contenedor) return;

  let partes = [];
  const total = listaOriginal.filter(c => {
    // Aplicar los mismos filtros que en aplicarFiltrosYRedibujar
    if (filtrosActivos.textoBusqueda && !normalizarTexto(c.nombre).includes(normalizarTexto(filtrosActivos.textoBusqueda))) return false;
    if (filtrosActivos.municipio && c.pueblo !== filtrosActivos.municipio) return false;
    if (filtrosActivos.subcategoria && c.idSubcategoria !== parseInt(filtrosActivos.subcategoria)) return false;
    if (filtrosActivos.abiertoAhora && !c.abierto) return false;
    return true;
  });

  partes.push(`<strong>${total.length}</strong> resultado${total.length !== 1 ? 's' : ''}`);

  if (filtrosActivos.categoria) partes.push(`de <span class="bg-gray-100 rounded px-2 py-1 inline-flex items-center gap-1">
    ${document.getElementById('tituloCategoria')?.textContent || 'categoría'} 
  </span>`);
  
  if (filtrosActivos.subcategoria) {
    const subcat = document.querySelector(`#filtro-subcategoria option[value="${filtrosActivos.subcategoria}"]`)?.textContent;
    if (subcat) partes.push(`<span class="bg-gray-100 rounded px-2 py-1 inline-flex items-center gap-1">
      ${subcat} 
      <button onclick="borrarFiltro('subcategoria')" class="text-gray-500 hover:text-red-500">&times;</button>
    </span>`);
  }

  if (filtrosActivos.municipio) {
    partes.push(`<span class="bg-gray-100 rounded px-2 py-1 inline-flex items-center gap-1">
      en ${filtrosActivos.municipio}
      <button onclick="borrarFiltro('municipio')" class="text-gray-500 hover:text-red-500">&times;</button>
    </span>`);
  }

  contenedor.innerHTML = partes.join(' ');
}
function borrarFiltro(tipo) {
  if (tipo === 'municipio') {
    filtrosActivos.municipio = '';
    document.getElementById('filtro-municipio').value = '';
  } else if (tipo === 'subcategoria') {
    filtrosActivos.subcategoria = '';
    document.getElementById('filtro-subcategoria').value = '';
  }
  aplicarFiltrosYRedibujar();
}

document.getElementById('filtro-plato')?.addEventListener('input', async (e) => {
  const termino = e.target.value.trim();
  if (!termino || termino.length < 3) {
    filtrosActivos.comerciosPorPlato = [];
    aplicarFiltrosYRedibujar();
    return;
  }

  const { data: productos, error } = await supabase
    .from('productos')
    .select('idMenu, nombre')
    .ilike('nombre', `%${termino}%`);

  if (error) {
    console.error('Error buscando productos:', error);
    return;
  }

  if (!productos.length) {
    filtrosActivos.comerciosPorPlato = [];
    aplicarFiltrosYRedibujar();
    return;
  }

  const idMenus = productos.map(p => p.idMenu);

  const { data: menus, error: errMenus } = await supabase
    .from('menus')
    .select('id, idComercio')
    .in('id', idMenus);

  if (errMenus) {
    console.error('Error buscando menús:', errMenus);
    return;
  }

  const idComercios = [...new Set(menus.map(m => m.idComercio))];
  filtrosActivos.comerciosPorPlato = idComercios;
  aplicarFiltrosYRedibujar();
});

