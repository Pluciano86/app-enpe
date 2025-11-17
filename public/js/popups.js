// public/js/popups.js

import { supabase } from "../shared/supabaseClient.js";
import { showPopup as showPopupManager } from "./popupManager.js";

// ─────────────────────────────────────────────
// UNIVERSAL POPUP SYSTEM
// ─────────────────────────────────────────────

// Crear contenedor si no existe
function ensurePopupContainer() {
  if (!document.getElementById("popupContainer")) {
    const div = document.createElement("div");
    div.id = "popupContainer";
    div.className =
      "fixed inset-0 hidden bg-black/60 z-[9999] flex items-center justify-center p-4";
    document.body.appendChild(div);
  }
}

// Mostrar popup genérico
export function showPopup(html) {
  ensurePopupContainer();
  const container = document.getElementById("popupContainer");

  container.innerHTML = `
    <div class="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl animate-fadeIn flex flex-col items-center">
      
      <!-- Logo -->
      <img src="https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/LOGO.png"
           alt="EnPeErre"
           class="w-24 mx-auto mb-3 select-none"/>

      ${html}

      <button id="popupCloseBtn"
        class="mt-5 w-full bg-gray-200 text-gray-800 py-2 rounded-xl hover:bg-gray-300 transition">
        Cerrar
      </button>
    </div>
  `;

  container.classList.remove("hidden");

  document.getElementById("popupCloseBtn").onclick = () =>
    container.classList.add("hidden");
}

// Determina la ruta correcta hacia login.html según el entorno
function getLoginUrl() {
  const { hostname, protocol, pathname } = window.location;
  const isLiveServer = hostname === "localhost" || protocol === "file:";

  if (isLiveServer) {
    return "login.html";
  }

  const inPublicPath = pathname.includes("/public/");
  return inPublicPath ? "/public/logearse.html" : "/login.html";
}

export function showPopupFavoritosVacios(tipo) {
  const cerrarPopup = () => {
    // Los popups de popupManager se remueven al hacer click; no se requiere acción adicional
  };

  const config = {
    titulo: "Aún no tienes favoritos 😌",
    mensaje: `Guarda tus lugares favoritos tocando el ❤️ en cualquier ${tipo}.`,
    botones: [{ texto: "Ok", accion: cerrarPopup }],
  };

  if (typeof showPopupManager === "function") {
    showPopupManager({
      title: config.titulo,
      message: config.mensaje,
      buttons: config.botones.map((btn) => ({
        text: btn.texto,
        onClick: btn.accion,
      })),
    });
  }
}

const UBICACION_BLOQUEADA_KEY = "ubicacionBloqueadaHasta";

function cerrarPopupUbicacion() {
  const overlay = document.getElementById("popupUbicacionDenegada");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

function ejecutarCallbackUbicacionConcedida() {
  const posiblesCallbacks = [
    window.initUbicacionUsuario,
    window.locateUser,
    window.cargarCercanosDesdeUsuario,
  ].filter((fn) => typeof fn === "function");

  posiblesCallbacks.forEach((fn) => {
    try {
      fn();
    } catch (error) {
      console.warn("Error al ejecutar callback de ubicación concedida:", error);
    }
  });
}

export function solicitarUbicacionDesdePopup() {
  const overlay = document.getElementById("popupUbicacionDenegada");
  const mensajeEl = overlay?.querySelector("[data-popup-geo-msg]");

  if (!navigator.geolocation) {
    if (mensajeEl) {
      mensajeEl.textContent = "Tu navegador no soporta geolocalización.";
    }
    return;
  }

  navigator.geolocation.getCurrentPosition(
    () => {
      try {
        localStorage.removeItem(UBICACION_BLOQUEADA_KEY);
      } catch (_) {
        /* noop */
      }
      cerrarPopupUbicacion();
      ejecutarCallbackUbicacionConcedida();
    },
    (error) => {
      if (error && error.code === error.PERMISSION_DENIED) {
        if (mensajeEl) {
          mensajeEl.textContent =
            "Debes habilitar los permisos de ubicación desde la configuración del navegador para continuar.";
        }
        return;
      }
      if (mensajeEl) {
        mensajeEl.textContent = "No se pudo obtener la ubicación. Intenta nuevamente.";
      }
    }
  );
}

// Popup para geolocalización denegada
export function mostrarPopupUbicacionDenegada() {
  const bloqueoHastaRaw = localStorage.getItem(UBICACION_BLOQUEADA_KEY);
  const bloqueoHasta = bloqueoHastaRaw ? Number(bloqueoHastaRaw) : null;
  if (Number.isFinite(bloqueoHasta) && bloqueoHasta > Date.now()) {
    return;
  }

  let overlay = document.getElementById("popupUbicacionDenegada");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "popupUbicacionDenegada";
    overlay.className =
      "fixed inset-0 hidden z-[10000] flex items-center justify-center bg-black/70 px-4";
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl flex flex-col gap-4">
      <h2 class="text-xl font-semibold leading-tight">🫣 Wooo… No te escondas!!</h2>
      <p class="text-gray-600 text-sm leading-relaxed">
        Activa la ubicación pa’ mostrarte lo mejor cerca de ti. Sin eso, terminamos recomendándote sitios en Fajardo aunque estés por Maya. 😅
      </p>
      <p data-popup-geo-msg class="text-sm text-red-500 min-h-[1.5rem]"></p>
      <div class="flex flex-col gap-2">
        <button data-action="activar" class="bg-[#23b4e9] text-white py-2 rounded-xl font-semibold hover:bg-[#199ac8] transition">
          Activar ubicación
        </button>
        <button data-action="mas-tarde" class="bg-gray-200 text-gray-800 py-2 rounded-xl hover:bg-gray-300 transition">
          Más tarde
        </button>
        <button data-action="no-deseo" class="bg-white text-gray-600 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 transition">
          No deseo activarla
        </button>
      </div>
    </div>
  `;

  const closePopup = () => overlay.classList.add("hidden");
  overlay.classList.remove("hidden");

  const btnActivar = overlay.querySelector('[data-action="activar"]');
  const btnMasTarde = overlay.querySelector('[data-action="mas-tarde"]');
  const btnNoDeseo = overlay.querySelector('[data-action="no-deseo"]');

  const guardarBloqueoTemporal = () => {
    try {
      localStorage.setItem(UBICACION_BLOQUEADA_KEY, Date.now() + 24 * 60 * 60 * 1000);
    } catch (_) {
      /* noop */
    }
  };

  if (btnActivar) {
    btnActivar.onclick = solicitarUbicacionDesdePopup;
  }

  if (btnMasTarde) {
    btnMasTarde.onclick = closePopup;
  }

  if (btnNoDeseo) {
    btnNoDeseo.onclick = () => {
      guardarBloqueoTemporal();
      closePopup();
    };
  }
}

// ─────────────────────────────────────────────
// POPUP AUTOMÁTICO: INVITAR A CREAR CUENTA
// ─────────────────────────────────────────────

async function popupCrearCuenta() {
  const { data: user } = await supabase.auth.getUser();

  if (user?.user) return;

  // evitar mostrarlo más de una vez por día
  const lastShown = localStorage.getItem("popupCrearCuentaShown");
  const today = new Date().toISOString().slice(0, 10);
  if (lastShown === today) return;

  localStorage.setItem("popupCrearCuentaShown", today);

  showPopup(`
    <h2 class="text-xl font-semibold mb-2">😎 Tu Experiencia puede ser mil veces mejor que esto</h2>

    <p class="text-gray-600 text-sm leading-relaxed mb-3">
      Crea tu cuenta pa’ guardar tus sitios Favoritos, recibir los Almuerzos y Happy Hours del día
y enterarte cuando abren cosas Brutales cerca de ti. 🔥
<br> Sin cuenta… te pierdes de medio jangueo.🥴
    </p>

    <a id="btnCrearCuenta"
      class="inline-block w-full bg-[#23b4e9] text-white py-2 rounded-xl font-semibold hover:bg-[#199ac8] transition">
      Crear Cuenta Gratis
    </a>
  `);

  const btnCrearCuenta = document.getElementById("btnCrearCuenta");
  if (btnCrearCuenta) {
    btnCrearCuenta.addEventListener("click", () => {
      window.location.href = getLoginUrl();
    });
  }
}

document.addEventListener("DOMContentLoaded", popupCrearCuenta);
