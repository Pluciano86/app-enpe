// botonMenu.js
import { supabase } from '../shared/supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');

const btnVerMenu = document.getElementById('btnVerMenu');

if (btnVerMenu && idComercio) {
  try {
    const { data: menu, error } = await supabase
      .from('menus')
      .select('id')
      .eq('idComercio', idComercio)
      .eq('activo', true)
      .limit(1)
      .maybeSingle();

    if (!error && menu) {
      btnVerMenu.href = `menu/menuComercio.html?id=${idComercio}`;
    //  btnVerMenu.target = "_blank";
      btnVerMenu.style.display = 'inline-block'; // Forzar visibilidad
      btnVerMenu.classList.remove('hidden');
btnVerMenu.classList.add('inline-block', 'mt-4', 'bg-orange-400', 'hover:bg-orange-600', 'text-white', 'font-normal', 'py-2', 'px-10', 'rounded-full', 'shadow-lg');
      console.log("✅ Menú encontrado para este comercio");
    } else {
    }
  } catch (e) {
    console.error('❌ Error verificando menú:', e);
  }
}