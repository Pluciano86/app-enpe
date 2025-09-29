import { supabase } from '../shared/supabaseClient.js';

const formRecuperarPassword = document.getElementById('formRecuperarPassword');
const emailInput = document.getElementById('emailRecuperar');
const mensaje = document.getElementById('mensajeRecuperarPassword');
const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const basePath = isLocal ? '/public' : '';
const redirectTo = `${window.location.origin}${basePath}/nuevaPassword.html`;

function mostrarMensaje(texto, tipo) {
  if (!mensaje) return;
  mensaje.textContent = texto;
  mensaje.classList.remove('hidden', 'text-red-500', 'text-green-500');
  mensaje.classList.add(tipo === 'error' ? 'text-red-500' : 'text-green-500');
}

formRecuperarPassword?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = emailInput?.value.trim();
  if (!email) {
    mostrarMensaje('Por favor ingresa tu correo electrónico.', 'error');
    return;
  }

  const button = formRecuperarPassword.querySelector('button[type="submit"]');
  if (button) {
    button.disabled = true;
    button.classList.add('opacity-70');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  if (button) {
    button.disabled = false;
    button.classList.remove('opacity-70');
  }

  if (error) {
    mostrarMensaje('No pudimos enviar el correo. Inténtalo nuevamente.', 'error');
    console.error('Error resetPasswordForEmail:', error.message);
    return;
  }

  mostrarMensaje('📧 Verifica tu e-mail, te enviamos el enlace', 'success');
});
