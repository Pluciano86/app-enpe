// admin/js/botonEspeciales.js
const COMERCIO_ORIGIN = 'https://comercio.enpe-erre.com';
const paramsEspeciales = new URLSearchParams(window.location.search);
const idComercioEspecial = paramsEspeciales.get('idcomercio') || paramsEspeciales.get('id');
const btnAdministrarEspeciales = document.getElementById('btnAdministrarEspeciales');

if (btnAdministrarEspeciales && idComercioEspecial) {
  const destino = new URL('/especiales/adminEspeciales.html', COMERCIO_ORIGIN);
  destino.searchParams.set('idcomercio', idComercioEspecial);
  console.log('REDIRECT FINAL (Especiales):', destino.toString());
  btnAdministrarEspeciales.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.href = destino.toString();
  });
}
