import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const iconoEl = document.querySelector('#estadoHorarioContainer i');
const textoEl = document.querySelector('#estadoHorarioContainer p');
const subtituloEl = document.createElement('p');
subtituloEl.className = 'text-xs text-gray-500 font-light';
textoEl.insertAdjacentElement('afterend', subtituloEl);

function formato12Horas(horaStr) {
  const [h, m] = horaStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hora12 = h % 12 === 0 ? 12 : h % 12;
  return `${hora12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function obtenerProximoDiaAbierto(horarios, diaActual) {
  for (let i = 1; i <= 7; i++) {
    const diaSiguiente = (diaActual + i) % 7;
    const horario = horarios.find(h => h.diaSemana === diaSiguiente);
    if (horario && !horario.cerrado) {
      return {
        dia: diasSemana[diaSiguiente],
        apertura: formato12Horas(horario.apertura?.slice(0, 5)),
        esManana: i === 1
      };
    }
  }
  return null;
}

async function verificarHorario() {
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  const horaActual = hoy.toTimeString().slice(0, 5);

  const { data: horarios } = await supabase
    .from('Horarios')
    .select('diaSemana, apertura, cierre, cerrado')
    .eq('idComercio', idComercio);

  const hoyHorario = horarios.find(h => h.diaSemana === diaSemana);

  if (!hoyHorario || hoyHorario.cerrado) {
    iconoEl.className = 'fa-regular fa-clock text-red-500 text-2xl';
    iconoEl.style.webkitTextStroke = '1.2px currentColor';
    textoEl.textContent = 'Cerrado Ahora';
    textoEl.className = 'text-sm, text-red-600 font-light';

    const proximo = obtenerProximoDiaAbierto(horarios, diaSemana);
    if (proximo) {
      const cuando = proximo.esManana ? 'mañana' : proximo.dia;
      subtituloEl.textContent = `Abre ${cuando} a las ${proximo.apertura}`;
    } else {
      subtituloEl.textContent = '';
    }
    return;
  }

  const apertura = hoyHorario.apertura.slice(0, 5);
  const cierre = hoyHorario.cierre.slice(0, 5);
  const abierto = horaActual >= apertura && horaActual <= cierre;

  if (abierto) {
    iconoEl.className = 'fa-regular fa-clock text-green-500 text-4xl slow-spin';
    iconoEl.style.webkitTextStroke = '1.2px currentColor';
    textoEl.textContent = 'Abierto Ahora';
    textoEl.className = 'text-sm text-green-600 font-light';

    const tiempoCierre =
      parseInt(cierre.slice(0, 2)) * 60 + parseInt(cierre.slice(3, 5)) -
      (parseInt(horaActual.slice(0, 2)) * 60 + parseInt(horaActual.slice(3, 5)));

    if (tiempoCierre <= 120) {
      subtituloEl.innerHTML = `Cierra a las<br><span class="text-sm">${formato12Horas(cierre)}</span>`;
    } else {
      subtituloEl.textContent = '';
    }
  } else {
    iconoEl.className = 'fa-regular fa-clock text-red-500 text-4xl';
    iconoEl.style.webkitTextStroke = '1.2px currentColor';
    textoEl.textContent = 'Cerrado Ahora';
    textoEl.className = 'text-sm text-red-600 font-medium';
    subtituloEl.innerHTML = `Abre hoy<br><span class="text-sm ">${formato12Horas(apertura)}</span>`;
  }
}

verificarHorario();
setInterval(verificarHorario, 30000);