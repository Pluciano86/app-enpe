// admin/js/botonAdminMenu.js
const paramsAdminMenu = new URLSearchParams(window.location.search);
const idComercio =
  paramsAdminMenu.get('idcomercio') || paramsAdminMenu.get('id');
const btnAdminMenu = document.getElementById('btnAdminMenu');

if (btnAdminMenu && idComercio) {
  const destino = new URL('/comercio/adminMenuComercio.html', window.location.origin);
  destino.searchParams.set('idcomercio', idComercio);
  btnAdminMenu.href = destino.toString();
}
