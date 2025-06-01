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
  if (hoyHorario && !hoyHorario.cerrado) {
    const apertura = hoyHorario.apertura.slice(0, 5);
    const cierre = hoyHorario.cierre.slice(0, 5);
    abierto = horaActual >= apertura && horaActual <= cierre;
  }

  estadoHorario.textContent = abierto ? 'Abierto Ahora' : 'Cerrado Ahora';
  estadoHorario.className = `text-center text-xl font-semibold mb-4 ${abierto ? 'text-green-600' : 'text-red-600'}`;

  tablaHorarios.innerHTML = horarios
    .filter(h => h.diaSemana !== null && h.diaSemana !== undefined)
    .map(h => {
      const esHoy = h.diaSemana === diaActual;
      const dia = diasSemana[h.diaSemana];
      const apertura = formato12Horas(h.apertura?.slice(0, 5));
      const cierre = formato12Horas(h.cierre?.slice(0, 5));
      const cerrado = h.cerrado;

      // ✅ Ajuste aquí
      const color = cerrado
        ? 'text-red-600'
        : esHoy
          ? (abierto ? 'text-green-600' : 'text-red-600')
          : 'text-gray-700';

      const peso = esHoy ? 'font-[500]' : 'font-[400]';

      return `
  <div class="flex justify-center">
    <div class="grid grid-cols-2 gap-2 text-[20px] ${color} ${peso} mb-2 w-full max-w-sm">
      <div class="text-right w-32">${dia}:</div>
      <div class="text-left">${cierre === '--:--' ? 'Cerrado' : `${apertura} – ${cierre}`}</div>
    </div>
  </div>
`;
    })
    .join('');
}

cargarHorarios();