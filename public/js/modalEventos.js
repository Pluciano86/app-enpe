// public/js/modalEventos.js

export function abrirModal(evento) {
  const modal = document.getElementById("modalEvento");
  if (!modal) return;

  // 🟢 Imagen principal y título
  const titulo = document.getElementById("modalTitulo");
  const imagen = document.getElementById("modalImagen");
  titulo.textContent = evento.nombre || "Evento sin título";
  imagen.src = evento.imagen || evento.img_principal || "https://placehold.co/400x500?text=Evento";
  imagen.alt = evento.nombre || "Evento";

  // 🟢 Descripción
  const descripcion = document.getElementById("modalDescripcion");
  descripcion.textContent = evento.descripcion || "Sin descripción disponible.";

  // 🟢 Lugar y dirección
  const lugar = document.getElementById("modalLugar");
  const direccion = document.getElementById("modalDireccion");
  lugar.textContent = evento.lugar || "Lugar no especificado";
  direccion.textContent = evento.direccion || "";

  // 🟢 Costo o Entrada Gratis
  const costo = document.getElementById("modalCosto");
  if (evento.gratis || evento.entrada_gratis) {
    costo.textContent = "Entrada Gratis";
  } else if (evento.costo || evento.precio) {
    const costoValor = (evento.costo || evento.precio).toString().trim();
    costo.textContent = costoValor.toLowerCase().startsWith("costo")
      ? costoValor
      : `Costo: ${costoValor}`;
  } else {
    costo.textContent = "";
  }

  // 🟢 Enlace de boletos
  const enlaceBoletos = document.getElementById("modalBoletos");
  if (evento.enlaceboletos || evento.enlace_boleto || evento.link_boletos) {
    enlaceBoletos.href = evento.enlaceboletos || evento.enlace_boleto || evento.link_boletos;
    enlaceBoletos.classList.remove("hidden");
  } else {
    enlaceBoletos.classList.add("hidden");
  }

// 🗓️ FECHAS DEL EVENTO
const fechaElem = document.getElementById("modalFechaPrincipal");
const horaElem = document.getElementById("modalHoraPrincipal");
const verFechasBtn = document.getElementById("modalVerFechas");
const fechasListado = document.getElementById("modalFechasListado");

if (evento.eventoFechas && evento.eventoFechas.length > 0) {
  // Ordenar por fecha
  const fechasOrdenadas = [...evento.eventoFechas].sort(
    (a, b) => new Date(a.fecha) - new Date(b.fecha)
  );

  // Mostrar la primera como principal
  const primera = fechasOrdenadas[0];
  const fechaPrincipal = new Date(primera.fecha).toLocaleDateString("es-PR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  fechaElem.textContent = fechaPrincipal;

  if (primera.horainicio) {
    const [hora, minutos] = primera.horainicio.split(":");
    horaElem.textContent = new Date(`1970-01-01T${hora}:${minutos}:00`).toLocaleTimeString(
      "es-PR",
      { hour: "numeric", minute: "2-digit", hour12: true }
    );
  } else {
    horaElem.textContent = "";
  }

  // Mostrar botón "Ver más fechas" si hay más de una
  if (fechasOrdenadas.length > 1) {
    verFechasBtn.classList.remove("hidden");
    verFechasBtn.textContent = `Ver las ${fechasOrdenadas.length} fechas disponibles`;

    // Generar listado de fechas
    fechasListado.innerHTML = fechasOrdenadas
      .map((f) => {
        const fecha = new Date(f.fecha).toLocaleDateString("es-PR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const hora = f.horainicio
          ? new Date(`1970-01-01T${f.horainicio}`).toLocaleTimeString("es-PR", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : "";
        return `<p>${fecha}${hora ? ` — ${hora}` : ""}</p>`;
      })
      .join("");

    // Acción del botón
    verFechasBtn.onclick = () => {
      fechasListado.classList.toggle("hidden");
    };
  } else {
    verFechasBtn.classList.add("hidden");
    fechasListado.classList.add("hidden");
  }
} else {
  fechaElem.textContent = "";
  horaElem.textContent = "";
  verFechasBtn.classList.add("hidden");
  fechasListado.classList.add("hidden");
}

  // 🔹 Mostrar modal
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  // 🔹 Cerrar modal
  const cerrarModal = document.getElementById("cerrarModal");
  if (cerrarModal) {
    cerrarModal.onclick = () => cerrarModalEvento();
  }

  modal.onclick = (e) => {
    if (e.target === modal) cerrarModalEvento();
  };
}

// 🔹 Función para cerrar el modal con animación y scroll restore
function cerrarModalEvento() {
  const modal = document.getElementById("modalEvento");
  if (modal) modal.classList.add("hidden");
  document.body.style.overflow = "auto";
}