// lugares.js

import { supabase } from './supabaseClient.js';
import { mostrarMensajeVacio } from './mensajesUI.js';
import { calcularTiemposParaLugares } from './distanciaLugar.js';

const contenedor = document.getElementById('lugaresContainer');
const inputBuscar = document.getElementById('searchInput');
const selectCategoria = document.getElementById('selectCategoria');
const selectMunicipio = document.getElementById('selectMunicipio');
const btnAbierto = document.getElementById('btnAbierto');
const btnFavoritos = document.getElementById('btnFavoritos');
const btnGratis = document.getElementById('btnGratis');

let lugares = [];
let latUsuario = null;
let lonUsuario = null;

function crearCardLugar(lugar) {
  const div = document.createElement('div');
  div.className = "bg-white rounded-2xl shadow-md overflow-hidden text-center w-full max-w-[200px] mx-auto";

  let estadoTexto = '';
  let estadoColor = '';
  let estadoIcono = '';

  if (lugar.estado === 'cerrado temporal') {
    estadoTexto = 'Cerrado Temporalmente';
    estadoColor = 'text-orange-500';
    estadoIcono = 'fa-solid fa-triangle-exclamation';
  } else if (lugar.estado === 'siempre abierto') {
    estadoTexto = 'Abierto Siempre';
    estadoColor = 'text-blue-600';
    estadoIcono = 'fa-solid fa-infinity';
  } else if (lugar.abiertoAhora === true) {
    estadoTexto = 'Abierto Ahora';
    estadoColor = 'text-green-600';
    estadoIcono = 'fa-regular fa-clock';
  } else {
    estadoTexto = 'Cerrado Ahora';
    estadoColor = 'text-red-600';
    estadoIcono = 'fa-regular fa-clock';
  }

  div.innerHTML = `
    <div class="relative">
      <img src="${lugar.portada}" alt="Portada de ${lugar.nombre}" class="w-full h-40 object-cover" />
      <a href="perfilComercio.html?id=${lugar.id}" class="relative w-full flex flex-col items-center no-underline">
        <div class="relative h-12 w-full">
          <div class="absolute inset-0 flex items-center justify-center px-2 text-center">
            <h3 class="${lugar.nombre.length > 25 ? 'text-lg' : 'text-xl'} font-medium text-[#424242] z-30 mt-2 leading-[0.9] text-center">
              ${lugar.nombre}
            </h3>
          </div>
        </div>
      </a>  
      <div class="flex flex-wrap h-12 justify-center items-center gap-1 leading-[0.9] -mt-3 text-[#6e6e6e] italic font-light text-base">
        ${lugar.categorias?.map(c => `<span>${c}</span>`).join(',') || ''}
      </div>
      <div class="flex justify-center items-center gap-1 ${estadoColor} -mt-2 font-medium mb-1 text-base">
        <i class="${estadoIcono}"></i> ${estadoTexto}
      </div>
      <div class="flex justify-center items-center gap-1 font-medium mb-1 text-sm text-orange-600">
        <i class="fa-solid fa-tag"></i> ${lugar.precioEntrada || 'Gratis'}
      </div>
      <div class="flex justify-center items-center gap-1 font-medium mb-1 text-sm text-[#23b4e9]">
        <i class="fas fa-map-pin"></i> ${lugar.municipio}
      </div>
      <div class="flex justify-center items-center gap-1 text-[#9c9c9c] font-medium text-sm mb-4">
        <i class="fas fa-car"></i> ${lugar.tiempoTexto || ''}
      </div>
    </div>
  `;
  return div;
}

async function cargarLugares() {
  let { data, error } = await supabase.from('LugaresTuristicos').select('*').eq('activo', true);
  if (error) {
    console.error('Error cargando lugares:', error);
    return;
  }

  lugares = data.filter(l => l.latitud && l.longitud);

  const { data: categoriasRel, error: errorCategoriasRel } = await supabase
    .from('lugarCategoria')
    .select('idLugar, categoria:categoriaLugares(nombre)');
  if (errorCategoriasRel) {
    console.error('❌ Error cargando categorías relacionadas:', errorCategoriasRel);
  }

  lugares.forEach(lugar => {
    lugar.categorias = categoriasRel?.filter(c => c.idLugar === lugar.id).map(c => c.categoria?.nombre).filter(Boolean);
    lugar.idCategorias = categoriasRel?.filter(c => c.idLugar === lugar.id).map(c => c.categoria?.idCategoria).filter(Boolean);
  });

  const { data: imagenes, error: errorImg } = await supabase
    .from('imagenesLugares')
    .select('imagen, idLugar, portada')
    .eq('portada', true);
  if (errorImg) console.error('Error cargando portadas:', errorImg);

  lugares.forEach(lugar => {
    const imgPortada = imagenes?.find(img => img.idLugar === lugar.id);
    lugar.portada = imgPortada?.imagen || null;
  });

  if (latUsuario && lonUsuario) {
    lugares = await calcularTiemposParaLugares(lugares, { lat: latUsuario, lon: lonUsuario });
    lugares.sort((a, b) => (a.minutosCrudos ?? Infinity) - (b.minutosCrudos ?? Infinity));
  }

  const diaSemana = new Date().getDay();
  const { data: horarios, error: errorHorarios } = await supabase
    .from('horariosLugares')
    .select('idLugar, apertura, cierre, cerrado, abiertoSiempre, cerradoTemporalmente')
    .eq('diaSemana', diaSemana);
  if (errorHorarios) console.error('❌ Error cargando horarios:', errorHorarios);

  const ahora = new Date();
  const horaActual = ahora.getHours() + ahora.getMinutes() / 60;

  lugares.forEach(lugar => {
    const horario = horarios?.find(h => h.idLugar === lugar.id);
    if (horario) {
      if (horario.cerradoTemporal) {
        lugar.estado = 'cerrado temporal';
        lugar.abiertoAhora = false;
      } else if (horario.abiertoSiempre) {
        lugar.estado = 'siempre abierto';
        lugar.abiertoAhora = true;
      } else if (horario.cerrado) {
        lugar.abiertoAhora = false;
      } else {
        const [hA, mA] = horario.apertura.split(':').map(Number);
        const [hC, mC] = horario.cierre.split(':').map(Number);
        const horaApertura = hA + mA / 60;
        const horaCierre = hC + mC / 60;
        lugar.abiertoAhora = horaActual >= horaApertura && horaActual < horaCierre;
      }
    } else {
      lugar.abiertoAhora = false;
    }
  });

  await llenarSelects();
  renderizarLugares();
}

function renderizarLugares() {
  contenedor.innerHTML = '';
  let filtrados = [...lugares];

  const texto = inputBuscar.value.toLowerCase();
  if (texto) filtrados = filtrados.filter(l => l.nombre.toLowerCase().includes(texto));

  const categoriaSeleccionada = selectCategoria.value;
  if (categoriaSeleccionada) {
    filtrados = filtrados.filter(l => l.categorias?.includes(categoriaSeleccionada));
  }

  const municipio = selectMunicipio.value;
  if (municipio) filtrados = filtrados.filter(l => l.municipio === municipio);

  if (btnAbierto.classList.contains('bg-blue-500')) filtrados = filtrados.filter(l => l.abiertoAhora);
  if (btnFavoritos.classList.contains('bg-blue-500')) filtrados = filtrados.filter(l => l.favorito);
  if (btnGratis.classList.contains('bg-blue-500')) filtrados = filtrados.filter(l => l.precioEntrada === 'Gratis');

  const orden = document.getElementById('filtro-orden')?.value;
  if (orden === 'az') {
    filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
  } else if (orden === 'recientes') {
    filtrados.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else {
    filtrados.sort((a, b) => a.distanciaLugar - b.distanciaLugar);
  }

  if (filtrados.length === 0) {
  mostrarMensajeVacio(contenedor, 'No se encontraron lugares de interés para los filtros seleccionados.');
} else {
  filtrados.forEach(l => contenedor.appendChild(crearCardLugar(l)));
}
}

async function llenarSelects() {
  const municipiosUnicos = [...new Set(lugares.map(l => l.municipio).filter(Boolean))].sort();
  municipiosUnicos.forEach(muni => {
    const opt = document.createElement('option');
    opt.value = muni;
    opt.textContent = muni;
    selectMunicipio.appendChild(opt);
  });

  const todasCategorias = lugares.flatMap(l => l.categorias || []);
  const categoriasUnicas = [...new Set(todasCategorias)].sort();
  categoriasUnicas.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    selectCategoria.appendChild(opt);
  });
}

inputBuscar.addEventListener('input', renderizarLugares);
selectCategoria.addEventListener('change', renderizarLugares);
selectMunicipio.addEventListener('change', renderizarLugares);
[btnAbierto, btnFavoritos, btnGratis].forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('bg-blue-500');
    btn.classList.toggle('text-white');
    renderizarLugares();
  });
});

navigator.geolocation.getCurrentPosition(
  async (pos) => {
    latUsuario = pos.coords.latitude;
    lonUsuario = pos.coords.longitude;
    await Promise.all([
      cargarMunicipios(),
      cargarLugares()
    ]);
  },
  async () => {
    console.warn('❗ Usuario no permitió ubicación.');
    await Promise.all([
      cargarMunicipios(),
      cargarLugares()
    ]);
  }
);

async function cargarMunicipios() {
  const { data: municipios, error } = await supabase
    .from('Municipios')
    .select('nombre');

  if (error) {
    console.error('❌ Error cargando municipios:', error);
    return;
  }

  // Limpiar opciones existentes
  selectMunicipio.innerHTML = '<option value="">Todos</option>';

  // Añadir cada municipio
  municipios.forEach(m => {
    const option = document.createElement('option');
    option.value = m.nombre;
    option.textContent = m.nombre;
    selectMunicipio.appendChild(option);
  });
}
