// public/js/modalEventos.js
import { getEventoI18n } from "../shared/eventoI18n.js";
import { t } from "./i18n.js";

let eventoOriginal = null;

async function renderModal(evento) {
  const modal = document.getElementById("modalEvento");
  if (!modal) return;

  const lang =
    localStorage.getItem("lang") ||
    document.documentElement.lang ||
    "es";
  const locale = lang === "es" ? "es-PR" : lang;
  const ev = await getEventoI18n(evento, lang).catch(() => evento);

  const fallback = (key, def) => {
    const val = t(key);
    return val === key ? def : val;
  };

  // 🟢 Imagen principal y título
  const titulo = document.getElementById("modalTitulo");
  const imagen = document.getElementById("modalImagen");
  titulo.textContent = ev.nombre || fallback("modal.sinTitulo", "Evento sin título");
  imagen.src = ev.imagen || ev.img_principal || "https://placehold.co/400x500?text=Evento";
  imagen.alt = ev.nombre || fallback("modal.sinTitulo", "Evento sin título");

  // 🟢 Descripción
  const descripcion = document.getElementById("modalDescripcion");
  descripcion.textContent = ev.descripcion?.trim()
    ? ev.descripcion
    : fallback("evento.sinDescripcion", "Sin descripción disponible");

  // 🟢 Lugar y dirección
  const lugar = document.getElementById("modalLugar");
  const direccion = document.getElementById("modalDireccion");
  lugar.textContent = ev.lugar || fallback("modal.lugarNoEspecificado", "Lugar no especificado");
  direccion.textContent = ev.direccion || "";

  // 🟢 Costo o Entrada Gratis
  const costo = document.getElementById("modalCosto");
  if (ev.gratis || ev.entrada_gratis) {
    costo.textContent = t("area.gratis");
  } else if (ev.costo || ev.precio) {
    const costoValor = (ev.costo ?? ev.precio ?? "").toString().trim();
    const necesitaSimbolo = /[0-9]/.test(costoValor) && !costoValor.startsWith("$");
    const costoMostrar = necesitaSimbolo ? `$${costoValor}` : costoValor;
    costo.textContent = costoValor.toLowerCase().startsWith("costo")
      ? costoValor
      : `${t("area.costo")} ${costoMostrar}`;
  } else {
    costo.textContent = "";
  }

  // 🟢 Enlace de boletos
  const enlaceBoletos = document.getElementById("modalBoletos");
  if (ev.enlaceboletos || ev.enlace_boleto || ev.link_boletos) {
    enlaceBoletos.href = ev.enlaceboletos || ev.enlace_boleto || ev.link_boletos;
    enlaceBoletos.textContent = t("evento.comprarBoletos");
    enlaceBoletos.classList.remove("hidden");
  } else {
    enlaceBoletos.classList.add("hidden");
  }

// 🗓️ FECHAS DEL EVENTO
const fechaElem = document.getElementById("modalFechaPrincipal");
const horaElem = document.getElementById("modalHoraPrincipal");
const verFechasBtn = document.getElementById("modalVerFechas");
const fechasListado = document.getElementById("modalFechasListado");

if (ev.eventoFechas && ev.eventoFechas.length > 0) {
  // Ordenar por fecha
  const fechasOrdenadas = [...ev.eventoFechas].sort(
    (a, b) => new Date(a.fecha) - new Date(b.fecha)
  );

  // Mostrar la primera como principal
  const primera = fechasOrdenadas[0];
  const fechaPrincipal = new Date(primera.fecha).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  fechaElem.textContent = fechaPrincipal;

  if (primera.horainicio) {
    const [hora, minutos] = primera.horainicio.split(":");
    horaElem.textContent = new Date(`1970-01-01T${hora}:${minutos}:00`).toLocaleTimeString(
      locale,
      { hour: "numeric", minute: "2-digit", hour12: true }
    );
  } else {
    horaElem.textContent = "";
  }

  // Mostrar botón "Ver más fechas" si hay más de una
  if (fechasOrdenadas.length > 1) {
    verFechasBtn.classList.remove("hidden");
    verFechasBtn.textContent = t("evento.verFechas", { count: fechasOrdenadas.length });

    // Generar listado de fechas
  fechasListado.innerHTML = fechasOrdenadas
    .map((f) => {
      const fecha = new Date(f.fecha).toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
          month: "long",
          year: "numeric",
        });
        const hora = f.horainicio
          ? new Date(`1970-01-01T${f.horainicio}`).toLocaleTimeString(locale, {
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
  eventoOriginal = null;
}

export async function abrirModal(evento) {
  eventoOriginal = evento;
  await renderModal(eventoOriginal);
}

// Re-render si cambia el idioma y el modal está visible
window.addEventListener("lang:changed", () => {
  const modal = document.getElementById("modalEvento");
  if (modal && !modal.classList.contains("hidden") && eventoOriginal) {
    renderModal(eventoOriginal);
  }
});
