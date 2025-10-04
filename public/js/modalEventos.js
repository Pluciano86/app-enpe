// public/js/modalEventos.js

export function abrirModal(evento) {
  const modal = document.getElementById("modalEvento");
  if (!modal) return;

  // 🟢 Título e imagen principal
  const titulo = document.getElementById("modalTitulo");
  const imagen = document.getElementById("modalImagen");
  titulo.textContent = evento.nombre || "Evento sin título";
  imagen.src = evento.imagen || "";
  imagen.alt = evento.nombre || "Evento";

  // 🟢 Descripción
  const descripcion = document.getElementById("modalDescripcion");
  descripcion.textContent = evento.descripcion || "Sin descripción disponible.";

  // 🟢 Lugar y dirección
  const lugar = document.getElementById("modalLugar");
  const direccion = document.getElementById("modalDireccion");
  lugar.textContent = evento.lugar || "Lugar no especificado";
  direccion.textContent = evento.direccion || "";

  // 🟢 Costo o Gratis
  const costo = document.getElementById("modalCosto");
  if (evento.gratis) {
    costo.textContent = "Gratis";
  } else if (evento.costo) {
    const costoRaw = evento.costo.toString().trim();
    costo.textContent = costoRaw.toLowerCase().startsWith("costo")
      ? costoRaw
      : `Costo: ${costoRaw}`;
  } else {
    costo.textContent = "Costo no disponible";
  }

  // 🟢 Enlace de boletos (si existe)
  const enlaceBoletos = document.getElementById("modalBoletos");
  if (evento.enlaceboletos) {
    enlaceBoletos.href = evento.enlaceboletos;
    enlaceBoletos.classList.remove("hidden");
  } else {
    enlaceBoletos.classList.add("hidden");
  }

  // 🔴 Mostrar el modal
  modal.classList.remove("hidden");

  // 🟣 Cerrar modal con el botón “×”
  const cerrarModal = document.getElementById("cerrarModal");
  if (cerrarModal) {
    cerrarModal.onclick = () => modal.classList.add("hidden");
  }

  // 🟣 Cerrar modal haciendo clic fuera del cuadro
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  };
}