// admin/js/botonAdminMenu.js
const COMERCIO_ORIGIN = 'https://comercio.enpe-erre.com';
const paramsAdminMenu = new URLSearchParams(window.location.search);
const idComercio = paramsAdminMenu.get('idcomercio') || paramsAdminMenu.get('id');
const btnAdminMenu = document.getElementById('btnAdminMenu');

if (btnAdminMenu && idComercio) {
  const destino = new URL('/adminMenuComercio.html', COMERCIO_ORIGIN);
  destino.searchParams.set('idcomercio', idComercio);
  console.log('REDIRECT FINAL (Menú):', destino.toString());
  btnAdminMenu.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.href = destino.toString();
  });
}
