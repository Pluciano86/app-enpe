// admin/js/botonEspeciales.js
const idComercioEspecial = new URLSearchParams(window.location.search).get('id');
const btnAdministrarEspeciales = document.getElementById('btnAdministrarEspeciales');

if (btnAdministrarEspeciales && idComercioEspecial) {
  // Ruta relativa para live-server y producción
  btnAdministrarEspeciales.href = `../comercio/especiales/adminEspeciales.html?id=${idComercioEspecial}`;
}
