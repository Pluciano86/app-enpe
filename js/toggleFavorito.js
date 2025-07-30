import { supabase } from './js/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  const btn = document.getElementById('btnFavorito');
  const icono = btn?.querySelector('i');
  const texto = btn?.querySelector('span');

  const idComercio = new URLSearchParams(window.location.search).get('id');
  let usuarioId = null;
  let esFavorito = false;

  if (!btn || !idComercio) return;

  // 1. Verificar sesión y si ya es favorito
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  usuarioId = user.id;

  const { data } = await supabase
    .from('favoritosComercios')
    .select('id')
    .eq('idUsuario', usuarioId)
    .eq('idComercio', idComercio)
    .maybeSingle();

  esFavorito = !!data;
  actualizarUI();

  // 2. Escuchar clic para toggle
  btn.addEventListener('click', async () => {
    if (!usuarioId) {
      alert('Debes iniciar sesión para guardar favoritos.');
      window.location.href = '/login/logearse.html';
      return;
    }

    if (esFavorito) {
      const { error } = await supabase
        .from('favoritosComercios')
        .delete()
        .eq('idUsuario', usuarioId)
        .eq('idComercio', idComercio);

      if (!error) {
        esFavorito = false;
        actualizarUI();
      }
    } else {
      const { error } = await supabase
        .from('favoritosComercios')
        .insert({ idUsuario: usuarioId, idComercio: idComercio });

      if (!error) {
        esFavorito = true;
        actualizarUI();
      }
    }
  });

  // 3. Cambiar ícono y texto
  function actualizarUI() {
    if (!icono || !texto) return;

    btn.classList.add('animate-bounce');
    setTimeout(() => btn.classList.remove('animate-bounce'), 300);

    if (esFavorito) {
      icono.className = 'fas fa-heart text-3xl mb-1 text-red-600';
      texto.textContent = '¡Mi Favorito!';
    } else {
      icono.className = 'far fa-heart text-3xl mb-1 text-gray-400';
      texto.textContent = 'Añadir a Favoritos';
    }
  }
});