import { supabase } from '../shared/supabaseClient.js';
import { togglePassword } from './togglePassword.js';

const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const basePath = isLocal ? '/public' : '';
const origin = window.location.origin;
const resetRedirectTo = `${origin}${basePath}/nuevaPassword.html`;

window.__supabaseResetRedirect = resetRedirectTo;
const socialRedirectUrl = `${origin}${basePath}/usuarios/cuentaUsuario.html`;

async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: socialRedirectUrl }
  });

  if (error) {
    console.error('Error loginWithGoogle:', error.message);
  }
}

async function loginWithFacebook() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: socialRedirectUrl }
  });

  if (error) {
    console.error('Error loginWithFacebook:', error.message);
  }
}

async function actualizarPerfilUsuario(usuarioId, data) {
  let reintentos = 3;
  let errorFinal = null;

  for (let i = 0; i < reintentos; i++) {
    const { error } = await supabase
      .from('usuarios')
      .update(data)
      .eq('id', usuarioId);

    if (!error) {
      console.log('Perfil actualizado correctamente en intento', i + 1);
      return true;
    }

    console.warn('Reintento de update falló:', error.message);
    errorFinal = error;
    await new Promise(res => setTimeout(res, 1000));
  }

  console.error('No se pudo actualizar perfil después de reintentos:', errorFinal);
  return false;
}

async function init() {
  const btnMostrarLogin = document.getElementById('btnMostrarLogin');
  const formLogin = document.getElementById('formLogin');
  const errorMensaje = document.getElementById('errorMensaje');

  const btnMostrarRegistro = document.getElementById('btnMostrarRegistro');
  const formRegistro = document.getElementById('formRegistro');
  const errorRegistro = document.getElementById('errorRegistro');
  const linksRecuperacion = document.getElementById('linksRecuperacion');

  const fotoInput = document.getElementById('fotoRegistro');
  const avatarPreview = document.getElementById('avatarPreview');
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');
  const avatarText = document.getElementById('avatarText');
  const previewFoto = document.getElementById('previewFoto');

  // Redirigir si ya hay sesión activa
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData?.session) {
    window.location.href = `${basePath}/usuarios/cuentaUsuario.html`;
    return;
  }

  // Mostrar Login
  btnMostrarLogin?.addEventListener('click', () => {
    formLogin.classList.remove('hidden');
    btnMostrarLogin.classList.add('hidden');
    formRegistro.classList.add('hidden');
    btnMostrarRegistro.classList.remove('hidden');
    linksRecuperacion?.classList.remove('hidden');
  });

  // Mostrar Registro
  btnMostrarRegistro?.addEventListener('click', () => {
    formRegistro.classList.remove('hidden');
    btnMostrarRegistro.classList.add('hidden');
    formLogin.classList.add('hidden');
    btnMostrarLogin.classList.remove('hidden');
    linksRecuperacion?.classList.add('hidden');
  });

  togglePassword('passwordLogin', 'togglePasswordLogin');
  togglePassword('passwordRegistro', 'togglePasswordRegistro');
  togglePassword('confirmarPassword', 'toggleConfirmarPassword');

  const socialButtons = document.querySelectorAll('[data-login-provider]');
  socialButtons.forEach(button => {
    button.addEventListener('click', () => {
      const provider = button.getAttribute('data-login-provider');
      if (provider === 'google') {
        loginWithGoogle();
      }
      if (provider === 'facebook') {
        loginWithFacebook();
      }
    });
  });

  const triggerAvatarPicker = () => {
    fotoInput?.click();
  };

  avatarPreview?.addEventListener('click', triggerAvatarPicker);
  avatarText?.addEventListener('click', triggerAvatarPicker);

  // Preview de imagen
  fotoInput?.addEventListener('change', () => {
    const file = fotoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        previewFoto.src = reader.result;
        previewFoto.classList.remove('hidden');
        avatarPlaceholder?.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    } else {
      previewFoto?.classList.add('hidden');
      avatarPlaceholder?.classList.remove('hidden');
    }
  });

  // Login
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
      window.location.href = `${basePath}/usuarios/cuentaUsuario.html`;
    }
  });

  // Registro
  formRegistro?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorRegistro.classList.add('hidden');

    const nombre = document.getElementById('nombreRegistro').value.trim();
    const apellido = document.getElementById('apellidoRegistro').value.trim();
    const email = document.getElementById('emailRegistro').value.trim();
    const password = document.getElementById('passwordRegistro').value;
    const confirmar = document.getElementById('confirmarPassword').value;
    const foto = document.getElementById('fotoRegistro').files[0];
    const telefono = document.getElementById('telefonoRegistro').value.trim();
    const municipio = document.getElementById('municipio').value;

    if (password !== confirmar) {
      errorRegistro.textContent = 'Las contraseñas no coinciden.';
      errorRegistro.classList.remove('hidden');
      return;
    }

    // 🔒 Desactivar confirmación de email
    const { data: signup, error: errorSignup } = await supabase.auth.signUp({
      email,
      password
    });

    if (errorSignup || !signup?.user?.id) {
      errorRegistro.textContent = 'Error creando la cuenta.';
      errorRegistro.classList.remove('hidden');
      return;
    }

    const userId = signup.user.id;
    let imagen = '';

    // 📸 Subir imagen si existe
    if (foto) {
      const extension = foto.name.split('.').pop();
      const nombreArchivo = `usuarios/${userId}_${Date.now()}.${extension}`;

      const { error: errorUpload } = await supabase.storage
        .from('imagenesusuarios')
        .upload(nombreArchivo, foto, {
          cacheControl: '3600',
          upsert: true,
          contentType: foto.type
        });

      if (!errorUpload) {
        const { data } = supabase.storage
          .from('imagenesusuarios')
          .getPublicUrl(nombreArchivo);
        imagen = data.publicUrl;
      }
    }

    const payload = { nombre, apellido, telefono, municipio, imagen };
    const actualizado = await actualizarPerfilUsuario(userId, payload);

    if (!actualizado) {
      errorRegistro.textContent = 'Error guardando datos.';
      errorRegistro.classList.remove('hidden');
      return;
    }

    // ✅ Login automático después de registrar
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (!loginError) {
      window.location.href = `${basePath}/usuarios/cuentaUsuario.html`;
    } else {
      alert('Cuenta creada, pero necesitas iniciar sesión.');
      window.location.reload();
    }
  });
}

init();
