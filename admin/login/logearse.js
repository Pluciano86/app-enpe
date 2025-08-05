import { supabase } from '../js/supabaseClient.js';

async function init() {
  const btnMostrarLogin = document.getElementById('btnMostrarLogin');
  const formLogin = document.getElementById('formLogin');
  const errorMensaje = document.getElementById('errorMensaje');

  const btnMostrarRegistro = document.getElementById('btnMostrarRegistro');
  const formRegistro = document.getElementById('formRegistro');
  const errorRegistro = document.getElementById('errorRegistro');

  const fotoInput = document.getElementById('fotoRegistro');
  const previewFoto = document.createElement('img');
  previewFoto.className = 'w-16 h-16 rounded-full object-cover mt-2 mx-auto hidden';
  fotoInput?.parentNode?.appendChild(previewFoto);

  // Redirigir si ya hay sesión activa
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData?.session) {
    window.location.href = '/admin/usuarios/cuentaUsuario.html';
    return;
  }

  // Mostrar Login
  btnMostrarLogin?.addEventListener('click', () => {
    formLogin.classList.remove('hidden');
    btnMostrarLogin.classList.add('hidden');
    formRegistro.classList.add('hidden');
    btnMostrarRegistro.classList.remove('hidden');
  });

  // Mostrar Registro
  btnMostrarRegistro?.addEventListener('click', () => {
    formRegistro.classList.remove('hidden');
    btnMostrarRegistro.classList.add('hidden');
    formLogin.classList.add('hidden');
    btnMostrarLogin.classList.remove('hidden');
  });

  // Mostrar/Ocultar contraseñas
  document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', () => {
      const targetId = icon.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
      }
    });
  });

  // Preview de imagen
  fotoInput?.addEventListener('change', () => {
    const file = fotoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        previewFoto.src = reader.result;
        previewFoto.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
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
      window.location.href = '/admin/usuarios/cuentaUsuario.html';
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

    // 🧾 Insertar datos en tabla usuarios
    const { error: errorDB } = await supabase
      .from('usuarios')
      .insert([{ id: userId, nombre, apellido, imagen }]);

    if (errorDB) {
      errorRegistro.textContent = 'Error guardando datos.';
      errorRegistro.classList.remove('hidden');
      return;
    }

    // ✅ Login automático después de registrar
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (!loginError) {
      window.location.href = '/admin/usuarios/cuentaUsuario.html';
    } else {
      alert('Cuenta creada, pero necesitas iniciar sesión.');
      window.location.reload();
    }
  });
}

init();