import { supabase } from '../js/supabaseClient.js';

async function init() {
  const btnMostrarLogin = document.getElementById('btnMostrarLogin');
  const formLogin = document.getElementById('formLogin');
  const errorMensaje = document.getElementById('errorMensaje');

  // Redirigir si ya hay sesión activa
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData?.session) {
    window.location.href = '/admin/usuarios/cuentaUsuario.html';
    return;
  }

  // Mostrar formulario
  btnMostrarLogin?.addEventListener('click', () => {
    formLogin.classList.remove('hidden');
    btnMostrarLogin.classList.add('hidden');
  });

  // Enviar login
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMensaje.classList.add('hidden');

    const email = document.getElementById('emailLogin').value;
    const password = document.getElementById('passwordLogin').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errorMensaje.textContent = 'Correo o contraseña incorrecta.';
      errorMensaje.classList.remove('hidden');
    } else {
      window.location.href = '/admin/usuarios/cuentaUsuario.html';
    }
  });
}

init(); // Ejecutar