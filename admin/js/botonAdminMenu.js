// admin/js/botonAdminMenu.js
const idComercio = new URLSearchParams(window.location.search).get('id');
const btnAdminMenu = document.getElementById('btnAdminMenu');

if (btnAdminMenu && idComercio) {
  // Ruta relativa funciona tanto en live-server (localhost) como en producción
  btnAdminMenu.href = `../comercio/adminMenuComercio.html?id=${idComercio}`;
}
