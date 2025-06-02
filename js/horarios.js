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
        apertura: formato12Horas(diaHorario.apertura?.slice(0, 5))
      };
    }
  }
  return null;
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

  const hoyHorario = horarios.find(h => h.diaSemana === diaActual);
  let abierto = false;
  let aperturaHoy = null;
  let cierreHoy = null;

  if (hoyHorario && !hoyHorario.cerrado) {
    aperturaHoy = hoyHorario.apertura.slice(0, 5);
    cierreHoy = hoyHorario.cierre.slice(0, 5);
    abierto = horaActual >= aperturaHoy && horaActual <= cierreHoy;
  }

  const proximo = !abierto ? obtenerProximoDiaAbierto(horarios, diaActual) : null;
  const cierreEnMenosDe2Horas = abierto && cierreHoy && ((parseInt(cierreHoy.slice(0, 2)) * 60 + parseInt(cierreHoy.slice(3, 5))) - (parseInt(horaActual.slice(0, 2)) * 60 + parseInt(horaActual.slice(3, 5))) <= 120);

  estadoHorario.innerHTML = `
    <p class="font-semibold text-2x1 ${abierto ? 'text-green-600' : 'text-red-600'}">
      ${abierto ? 'Abierto Ahora' : 'Cerrado Ahora'}
    </p>
    <p class="text-sm font-normal text-gray-600">
      ${!abierto && proximo ? `Abre ${proximo.nombre} a las ${proximo.apertura}` : ''}
      ${cierreEnMenosDe2Horas ? `Cierra a las ${formato12Horas(cierreHoy)}` : ''}
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