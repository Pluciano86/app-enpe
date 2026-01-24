// admin/js/botonAdminMenu.js
const paramsAdminMenu = new URLSearchParams(window.location.search);
const idComercio =
  paramsAdminMenu.get('idcomercio') || paramsAdminMenu.get('id');
const btnAdminMenu = document.getElementById('btnAdminMenu');

if (btnAdminMenu && idComercio) {
  const destino = new URL('/comercio/adminMenuComercio.html', window.location.origin);
  destino.searchParams.set('idcomercio', idComercio);
  destino.searchParams.set('id', idComercio); // compatibilidad con páginas que aún leen "id"
  btnAdminMenu.href = destino.toString();
  console.log('REDIRECT FINAL (Menú):', destino.toString());
  btnAdminMenu.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.assign(destino.toString());
  });
}
