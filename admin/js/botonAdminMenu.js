// admin/js/botonAdminMenu.js
const idComercio = new URLSearchParams(window.location.search).get('id');
const btnAdminMenu = document.getElementById('btnAdminMenu');

if (btnAdminMenu && idComercio) {
  btnAdminMenu.href = `../menu/adminMenuComercio.html?id=${idComercio}`;
}