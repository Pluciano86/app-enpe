document.addEventListener('DOMContentLoaded', async () => {
  const btn = document.getElementById('btnFavorito');
  const icono = btn?.querySelector('i');
  const texto = btn?.querySelector('span');
  const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  const basePath = isLocal ? '/public' : '';

  const idComercio = new URLSearchParams(window.location.search).get('id');
  let usuarioId = null;
  let esFavorito = false;

  if (!btn || !idComercio) return;

  // Verificar sesión
  const { supabase } = await import('../shared/supabaseClient.js');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  usuarioId = user.id;

  // Verificar si ya es favorito
  const { data } = await supabase
    .from('favoritosusuarios')
    .select('id')
    .eq('idusuario', usuarioId)
    .eq('idcomercio', parseInt(idComercio))
    .maybeSingle();

  esFavorito = !!data;
  actualizarUI();

  // Toggle favorito
  btn.addEventListener('click', async () => {
    if (!usuarioId) {
      alert(`Para añadir a este comercio a favoritos debes iniciar sesión.`);
      window.location.href = `${basePath}/logearse.html`;
      return;
    }

    if (esFavorito) {
      const { error } = await supabase
        .from('favoritosusuarios')
        .delete()
        .eq('idusuario', usuarioId)
        .eq('idcomercio', parseInt(idComercio));

      if (!error) {
        esFavorito = false;
        actualizarUI();
      } else {
        console.error('❌ Error eliminando favorito:', error.message);
      }
    } else {
      const { error } = await supabase
        .from('favoritosusuarios')
        .insert([
          { idusuario: usuarioId, idcomercio: parseInt(idComercio) }
        ]);

      if (!error) {
        esFavorito = true;
        actualizarUI();
      } else {
        console.error('❌ Error insertando favorito:', error.message);
        alert('Hubo un problema al añadir este comercio a favoritos.');
      }
    }
  });

  function actualizarUI() {
    if (!icono || !texto) return;

    if (esFavorito) {
      icono.className = 'fas fa-heart text-5xl mb-1 text-red-600 animate-bounce';
      texto.textContent = '¡Mi Favorito!';
      texto.classList.add('text-red-600');
    } else {
      icono.className = 'far fa-heart text-5xl mb-1 text-gray-600';
      texto.innerHTML = 'Añadir<br>Favoritos';
      texto.classList.remove('text-red-600');
    }
  }
});
