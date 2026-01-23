// admin/js/botonEspeciales.js
const paramsEspeciales = new URLSearchParams(window.location.search);
const idComercioEspecial =
  paramsEspeciales.get('idcomercio') || paramsEspeciales.get('id');
const btnAdministrarEspeciales = document.getElementById('btnAdministrarEspeciales');

if (btnAdministrarEspeciales && idComercioEspecial) {
  const destino = new URL('/comercio/especiales/adminEspeciales.html', window.location.origin);
  destino.searchParams.set('idcomercio', idComercioEspecial);
  btnAdministrarEspeciales.href = destino.toString();
}
