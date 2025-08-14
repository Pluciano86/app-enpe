import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const hoy = new Date();
const diaActual = hoy.getDay();
const horaActual = hoy.toTimeString().slice(0, 5);

const tituloHorario = document.getElementById('tituloHorario');
const estadoHorario = document.getElementById('estadoHorario');
const tablaHorarios = document.getElementById('tablaHorarios');

function formato12Horas(horaStr) {
  if (!horaStr) return '--:--';
  const [hora, minutos] = horaStr.split(':').map(Number);
  const ampm = hora >= 12 ? 'PM' : 'AM';
  const hora12 = hora % 12 === 0 ? 12 : hora % 12;
  return `${hora12}:${minutos.toString().padStart(2, '0')} ${ampm}`;
}

function obtenerProximoDiaAbierto(horarios, diaActual) {
  for (let i = 1; i <= 7; i++) {
    const diaSiguiente = (diaActual + i) % 7;
    const diaHorario = horarios.find(h => h.diaSemana === diaSiguiente);
    if (diaHorario && !diaHorario.cerrado) {
      return {
        nombre: diasSemana[diaSiguiente],
        apertura: formato12Horas(diaHorario.apertura?.slice(0, 5)),
        esManana: i === 1
      };
    }
  }
  return null;
}

function minutosDesdeMedianoche(horaStr) {
  const [hora, minuto] = horaStr.split(':').map(Number);
  return hora * 60 + minuto;
}

function estaAbierto(horarios, diaActual, horaActual) {
  const horaMin = minutosDesdeMedianoche(horaActual);
  const hoy = horarios.find(h => h.diaSemana === diaActual);
  const ayer = horarios.find(h => h.diaSemana === (diaActual + 6) % 7);

  if (hoy && !hoy.cerrado) {
    const apertura = minutosDesdeMedianoche(hoy.apertura.slice(0, 5));
    const cierre = minutosDesdeMedianoche(hoy.cierre.slice(0, 5));
    if (apertura < cierre) {
      if (horaMin >= apertura && horaMin < cierre) return { abierto: true, cierreHoy: hoy.cierre };
    } else {
      if (horaMin >= apertura || horaMin < cierre) return { abierto: true, cierreHoy: hoy.cierre };
    }
  }

  if (ayer && !ayer.cerrado) {
    const apertura = minutosDesdeMedianoche(ayer.apertura.slice(0, 5));
    const cierre = minutosDesdeMedianoche(ayer.cierre.slice(0, 5));
    if (apertura > cierre && horaMin < cierre) {
      return { abierto: true, cierreHoy: ayer.cierre };
    }
  }

  return { abierto: false };
}

async function cargarHorarios() {
  const { data: comercio } = await supabase.from('Comercios').select('nombre').eq('id', idComercio).maybeSingle();
  const { data: horarios, error } = await supabase
    .from('Horarios')
    .select('diaSemana, apertura, cierre, cerrado')
    .eq('idComercio', idComercio)
    .order('diaSemana', { ascending: true });

  if (!horarios || error) return;

  tituloHorario.textContent = `Horario de ${comercio?.nombre || ''}`;

  const resultado = estaAbierto(horarios, diaActual, horaActual);
  const abierto = resultado.abierto;
  const cierreHoy = resultado.cierreHoy;

  let mensajeEstado = '';
  const hoyHorario = horarios.find(h => h.diaSemana === diaActual);
  if (!abierto && hoyHorario && !hoyHorario.cerrado && horaActual < hoyHorario.apertura.slice(0, 5)) {
    mensajeEstado = `Abre hoy a las ${formato12Horas(hoyHorario.apertura.slice(0, 5))}`;
  } else if (!abierto) {
    const proximo = obtenerProximoDiaAbierto(horarios, diaActual);
    if (proximo) {
      const cuando = proximo.esManana ? 'mañana' : proximo.nombre;
      mensajeEstado = `Abre ${cuando} a las ${proximo.apertura}`;
    }
  }

  const cierreEnMenosDe2Horas = abierto && cierreHoy && (minutosDesdeMedianoche(cierreHoy) - minutosDesdeMedianoche(horaActual) <= 120);

  if (cierreEnMenosDe2Horas) {
    mensajeEstado += (mensajeEstado ? ' • ' : '') + `Cierra a las ${formato12Horas(cierreHoy)}`;
  }

  estadoHorario.innerHTML = `
    <p class="font-semibold text-2xl ${abierto ? 'text-green-600' : 'text-red-600'}">
      ${abierto ? 'Abierto Ahora' : 'Cerrado Ahora'}
    </p>
    <p class="text-sm font-normal text-gray-600">
      ${mensajeEstado}
    </p>
  `;

  tablaHorarios.innerHTML = horarios
    .filter(h => h.diaSemana !== null && h.diaSemana !== undefined)
    .map(h => {
      const esHoy = h.diaSemana === diaActual;
      const dia = diasSemana[h.diaSemana];
      const apertura = formato12Horas(h.apertura?.slice(0, 5));
      const cierre = formato12Horas(h.cierre?.slice(0, 5));
      const cerrado = h.cerrado;

      const color = esHoy ? (cerrado ? 'text-white bg-red-500' : (abierto ? 'text-white bg-green-500' : 'text-white bg-red-500')) : 'text-gray-700';
      const peso = esHoy ? 'font-[500]' : 'font-[400]';

      return `
        <div class="grid grid-cols-4 items-center text-[18px] ${color} ${peso} mb-2 rounded px-2 py-1">
          <div class="text-left">${dia}:</div>
          ${cerrado
            ? `<div class="col-span-3 text-center">Cerrado</div>`
            : `
              <div class="text-right">${apertura}</div>
              <div class="text-center">–</div>
              <div class="text-left">${cierre}</div>
            `
          }
        </div>
      `;
    })
    .join('');
}

cargarHorarios();
setInterval(cargarHorarios, 30000); // Actualiza cada 30 segundos