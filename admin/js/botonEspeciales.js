// admin/js/botonEspeciales.js
const paramsEspeciales = new URLSearchParams(window.location.search);
const idComercioEspecial =
  paramsEspeciales.get('idcomercio') || paramsEspeciales.get('id');
const btnAdministrarEspeciales = document.getElementById('btnAdministrarEspeciales');

if (btnAdministrarEspeciales && idComercioEspecial) {
  const destino = new URL('/comercio/especiales/adminEspeciales.html', window.location.origin);
  destino.searchParams.set('idcomercio', idComercioEspecial);
  destino.searchParams.set('id', idComercioEspecial); // compatibilidad
  btnAdministrarEspeciales.href = destino.toString();
  btnAdministrarEspeciales.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.assign(destino.toString());
  });
}
