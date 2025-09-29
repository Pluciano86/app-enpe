import { supabase } from '../shared/supabaseClient.js';

const formRecuperarEmail = document.getElementById('formRecuperarEmail');
const emailActualInput = document.getElementById('emailActual');
const nuevoEmailInput = document.getElementById('nuevoEmail');
const mensaje = document.getElementById('mensajeRecuperarEmail');
const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const basePath = isLocal ? '/public' : '';

function mostrarMensaje(texto, tipo) {
  if (!mensaje) return;
  mensaje.textContent = texto;
  mensaje.classList.remove('hidden', 'text-red-500', 'text-green-500');
  mensaje.classList.add(tipo === 'error' ? 'text-red-500' : 'text-green-500');
}

formRecuperarEmail?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const emailActual = emailActualInput?.value.trim();
  const nuevoEmail = nuevoEmailInput?.value.trim();

  if (!emailActual || !nuevoEmail) {
    mostrarMensaje('Completa ambos campos antes de continuar.', 'error');
    return;
  }

  const button = formRecuperarEmail.querySelector('button[type="submit"]');
  if (button) {
    button.disabled = true;
    button.classList.add('opacity-70');
  }

  const { data: userData, error: errorUsuario } = await supabase.auth.getUser();
  if (errorUsuario || !userData?.user) {
    if (button) {
      button.disabled = false;
      button.classList.remove('opacity-70');
    }
    mostrarMensaje('Debes iniciar sesión para actualizar tu correo.', 'error');
    console.error('Error getUser:', errorUsuario?.message);
    return;
  }

  const correoActualSesion = userData.user.email ?? '';
  if (correoActualSesion && correoActualSesion.toLowerCase() !== emailActual.toLowerCase()) {
    if (button) {
      button.disabled = false;
      button.classList.remove('opacity-70');
    }
    mostrarMensaje('El email actual no coincide con tu cuenta.', 'error');
    return;
  }

  const { error } = await supabase.auth.updateUser({ email: nuevoEmail });

  if (button) {
    button.disabled = false;
    button.classList.remove('opacity-70');
  }

  if (error) {
    mostrarMensaje('No pudimos actualizar tu correo. Intenta nuevamente.', 'error');
    console.error('Error updateUser email:', error.message);
    return;
  }

  mostrarMensaje('Email actualizado correctamente. Revisa tu bandeja para confirmar.', 'success');

  setTimeout(() => {
    window.location.href = `${basePath}/logearse.html`;
  }, 2000);
});
