import { supabase } from '../shared/supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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

function minutosDesdeMedianoche(horaStr) {
  const [hora, minuto] = horaStr.split(':').map(Number);
  return hora * 60 + minuto;
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
  const horaMinutos = minutosDesdeMedianoche(horaActual);

  const { data: horarios } = await supabase
    .from('Horarios')
    .select('diaSemana, apertura, cierre, cerrado')
    .eq('idComercio', idComercio);

  const hoyHorario = horarios.find(h => h.diaSemana === diaSemana);
  const ayerHorario = horarios.find(h => h.diaSemana === (diaSemana + 6) % 7); // día anterior

  let abierto = false;
  let cierre = null;

  if (hoyHorario && !hoyHorario.cerrado) {
    const aperturaMin = minutosDesdeMedianoche(hoyHorario.apertura.slice(0, 5));
    const cierreMin = minutosDesdeMedianoche(hoyHorario.cierre.slice(0, 5));

    if (aperturaMin < cierreMin) {
      abierto = horaMinutos >= aperturaMin && horaMinutos < cierreMin;
    } else {
      abierto = horaMinutos >= aperturaMin || horaMinutos < cierreMin;
    }

    if (abierto) cierre = hoyHorario.cierre;
  }

  // Verifica si sigue abierto desde ayer (pasó medianoche)
  if (!abierto && ayerHorario && !ayerHorario.cerrado) {
    const aperturaMin = minutosDesdeMedianoche(ayerHorario.apertura.slice(0, 5));
    const cierreMin = minutosDesdeMedianoche(ayerHorario.cierre.slice(0, 5));

    if (aperturaMin > cierreMin && horaMinutos < cierreMin) {
      abierto = true;
      cierre = ayerHorario.cierre;
    }
  }

  // Resultado visual
  if (abierto) {
    iconoEl.className = 'fa-regular fa-clock text-green-500 text-4xl slow-spin';
    iconoEl.style.webkitTextStroke = '1.2px currentColor';
    textoEl.textContent = 'Abierto Ahora';
    textoEl.className = 'text-sm text-green-600 font-light';

    const minutosCierre = minutosDesdeMedianoche(cierre);
    const diferencia = (minutosCierre >= horaMinutos)
      ? minutosCierre - horaMinutos
      : 1440 - horaMinutos + minutosCierre; // por si cruza medianoche

    if (diferencia <= 120) {
      subtituloEl.innerHTML = `Cierra a las<br><span class="text-sm">${formato12Horas(cierre)}</span>`;
    } else {
      subtituloEl.textContent = '';
    }
  } else {
    iconoEl.className = 'fa-regular fa-clock text-red-500 text-4xl';
    iconoEl.style.webkitTextStroke = '1.2px currentColor';
    textoEl.textContent = 'Cerrado Ahora';
    textoEl.className = 'text-sm text-red-600 font-medium';

    // ¿Abre más tarde hoy?
    if (hoyHorario && !hoyHorario.cerrado && horaMinutos < minutosDesdeMedianoche(hoyHorario.apertura.slice(0, 5))) {
      subtituloEl.innerHTML = `Abre hoy<br><span class="text-sm ">${formato12Horas(hoyHorario.apertura.slice(0, 5))}</span>`;
    } else {
      const proximo = obtenerProximoDiaAbierto(horarios, diaSemana);
      if (proximo) {
        const cuando = proximo.esManana ? 'mañana' : proximo.dia;
        subtituloEl.innerHTML = `Abre ${cuando}<br><span class="text-sm">${proximo.apertura}</span>`;
      } else {
        subtituloEl.textContent = '';
      }
    }
  }
}

verificarHorario();
setInterval(verificarHorario, 30000);