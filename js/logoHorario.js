import { supabase } from './supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');

async function verificarHorario() {
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  const horaActual = hoy.toTimeString().slice(0, 5);

  const { data, error } = await supabase
    .from('Horarios')
    .select('apertura, cierre, cerrado')
    .eq('idComercio', idComercio)
    .eq('diaSemana', diaSemana)
    .maybeSingle();

  const iconoEl = document.querySelector('#estadoHorarioContainer i');
  const textoEl = document.querySelector('#estadoHorarioContainer p');

  if (!data || error || data.cerrado) {
    iconoEl.className = 'fa-regular fa-clock text-red-500 text-3xl';
    iconoEl.style.webkitTextStroke = '1.2px currentColor';
    iconoEl.classList.remove('animate-spin', 'slow-spin');

    textoEl.textContent = 'Cerrado Ahora';
    textoEl.className = 'text-base text-red-600 font-medium';
    return;
  }

  const apertura = data.apertura.slice(0, 5);
  const cierre = data.cierre.slice(0, 5);
  const abierto = horaActual >= apertura && horaActual <= cierre;

  if (abierto) {
    iconoEl.className = 'fa-regular fa-clock text-green-500 text-3xl slow-spin';
    iconoEl.style.webkitTextStroke = '1.2px currentColor';

    textoEl.textContent = 'Abierto Ahora';
    textoEl.className = 'text-base text-green-600 font-medium';
  } else {
    iconoEl.className = 'fa-regular fa-clock text-red-500 text-3xl';
    iconoEl.style.webkitTextStroke = '1.2px currentColor';
    iconoEl.classList.remove('animate-spin', 'slow-spin');

    textoEl.textContent = 'Cerrado Ahora';
    textoEl.className = 'text-base text-red-600 font-medium';
  }
}

verificarHorario();