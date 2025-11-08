// public/js/perfilPlaya.js
import { supabase } from "../shared/supabaseClient.js";
import { requireAuth } from "./authGuard.js";
import { obtenerClima } from "./obtenerClima.js";
import { calcularTiemposParaLista } from "./calcularTiemposParaLista.js";

let usuarioId = null;
let playaFavorita = false;

// Loader
function mostrarLoader() {
  document.getElementById("loader")?.classList.remove("hidden");
}
function ocultarLoader() {
  document.getElementById("loader")?.classList.add("hidden");
}

// ID por querystring
function obtenerIdPlaya() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// Obtener coordenadas del usuario
function obtenerCoordenadasUsuario() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

function actualizarFavoritoPlayaUI(icono, texto) {
  if (!icono || !texto) return;
  if (playaFavorita) {
    icono.className = "fas fa-heart text-xl text-red-500 animate-bounce";
    texto.textContent = "En favoritos";
  } else {
    icono.className = "far fa-heart text-xl";
    texto.textContent = "Añadir a favoritos";
  }
}

async function sincronizarFavoritoPlaya(idPlaya) {
  if (!usuarioId) {
    playaFavorita = false;
    return;
  }
  const { data, error } = await supabase
    .from("favoritosPlayas")
    .select("id")
    .eq("idusuario", usuarioId)
    .eq("idplaya", idPlaya)
    .maybeSingle();
  if (error) {
    console.error("Error verificando favorito de playa:", error);
    return;
  }
  playaFavorita = !!data;
}

async function inicializarFavoritoPlaya(idPlaya) {
  const btnFavorito = document.getElementById("btnFavoritoPlaya");
  if (!btnFavorito || !idPlaya) return;

  const icono = btnFavorito.querySelector("i");
  const texto = btnFavorito.querySelector("span");

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      usuarioId = user.id;
      await sincronizarFavoritoPlaya(idPlaya);
    }
  } catch (error) {
    console.warn("⚠️ No se pudo obtener el usuario actual:", error?.message);
  }
  actualizarFavoritoPlayaUI(icono, texto);

  btnFavorito.addEventListener("click", async () => {
    if (!usuarioId) {
      try {
        const authUser = await requireAuth("favoriteBeach");
        if (!authUser?.id) return;
        usuarioId = authUser.id;
        await sincronizarFavoritoPlaya(idPlaya);
        actualizarFavoritoPlayaUI(icono, texto);
      } catch {
        return;
      }
    }

    if (playaFavorita) {
      console.log("Eliminando de favoritosPlayas");
      const { error } = await supabase
        .from("favoritosPlayas")
        .delete()
        .eq("idusuario", usuarioId)
        .eq("idplaya", idPlaya);
      if (!error) {
        playaFavorita = false;
        actualizarFavoritoPlayaUI(icono, texto);
      } else {
        console.error("Error eliminando favorito de playa:", error);
      }
    } else {
      console.log("Insertando en favoritosPlayas");
      const { error } = await supabase
        .from("favoritosPlayas")
        .insert([{ idusuario: usuarioId, idplaya: idPlaya }]);
      if (!error) {
        playaFavorita = true;
        actualizarFavoritoPlayaUI(icono, texto);
      } else {
        console.error("Error insertando favorito de playa:", error);
        alert("No se pudo añadir esta playa a tus favoritos.");
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const idPlaya = obtenerIdPlaya();
  if (!idPlaya) return console.error("No se encontró el ID de la playa");

  mostrarLoader();

  try {
    const { data, error } = await supabase
      .from("playas")
      .select(`
        id,
        nombre,
        municipio,
        direccion,
        costa,
        descripcion,
        acceso,
        estacionamiento,
        imagen,
        nadar,
        surfear,
        snorkeling,
        latitud,
        longitud
      `)
      .eq("id", idPlaya)
      .single();

    if (error) throw error;
    if (!data) throw new Error("No se encontró la playa");

    // === Imagen principal ===
    const imagenPlayaEl = document.getElementById("imagenPlaya");
    if (imagenPlayaEl) {
      imagenPlayaEl.src =
        data.imagen?.trim() ||
        "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/imgPlayaNoDisponible.jpg";
      imagenPlayaEl.alt = `Imagen de ${data.nombre}`;
      imagenPlayaEl.onerror = () => {
        imagenPlayaEl.src =
          "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/imgPlayaNoDisponible.jpg";
      };
    }

    // === Nombre, municipio y costa ===
    document.getElementById("nombrePlaya").textContent =
      data.nombre || "Playa sin nombre";
    const municipioText = data.municipio ? data.municipio : "";
    const costaText = data.costa ? `Costa ${data.costa}` : "";
    document.getElementById("municipioPlaya").textContent =
      municipioText && costaText
        ? `${municipioText} – ${costaText}`
        : municipioText || costaText;

    // === Dirección ===
const direccionSpan = document.getElementById("direccionPlaya");
if (direccionSpan) {
  direccionSpan.textContent =
    data.direccion?.trim() || "Dirección no disponible";
}

    // === Aptitudes ===
    const aptitudesContainer = document.getElementById("aptitudesContainer");
    aptitudesContainer.innerHTML = "";
    const aptitudes = [];
    if (data.nadar) aptitudes.push({ emoji: "🏊", texto: "Nadar" });
    if (data.surfear) aptitudes.push({ emoji: "🏄", texto: "Surfear" });
    if (data.snorkeling) aptitudes.push({ emoji: "🤿", texto: "Snorkel" });

    if (aptitudes.length > 0) {
      aptitudes.forEach((apt) => {
        const item = document.createElement("div");
        item.className = "flex flex-col items-center";
        item.innerHTML = `
          <div class="text-5xl">${apt.emoji}</div>
          <div class="text-[#9c9c9c] font-medium mt-1">${apt.texto}</div>
        `;
        aptitudesContainer.appendChild(item);
      });
    }

    // === Descripción ===
const descripcionEl = document.getElementById("descripcionPlaya");
if (descripcionEl) {
  descripcionEl.textContent =
    data.descripcion?.trim() || "Descripción no disponible.";
}

// === Acceso ===
const accesoEl = document.getElementById("infoAcceso");
if (accesoEl) {
  accesoEl.textContent =
    data.acceso?.trim() || "Información de acceso no disponible.";
}

    // === Clima ===
    const clima = await obtenerClima(data.latitud, data.longitud);
    if (clima) {
      const climaSection = document.getElementById("climaSection");
      climaSection.querySelector("#temperatura").textContent = clima.temperatura;
      climaSection.querySelector("#rangoTemperatura").textContent = `Mínima: ${clima.min} · Máxima: ${clima.max}`;
      climaSection.querySelector("#descripcionClima").textContent = clima.estado;
      climaSection.querySelector("#viento").textContent = clima.viento;
      climaSection.querySelector("#humedad").textContent = clima.humedad;

      // Icono
      const columnaEstado = climaSection.querySelector("#descripcionClima")?.parentElement;
      if (columnaEstado) {
        columnaEstado.querySelectorAll(".icono-clima").forEach((n) => n.remove());
        if (clima.iconoURL) {
          const iconoEl = document.createElement("img");
          iconoEl.src = clima.iconoURL;
          iconoEl.alt = clima.estado;
          iconoEl.className = "icono-clima w-16 h-16 mb-2 drop-shadow-md";
          columnaEstado.insertBefore(iconoEl, columnaEstado.firstChild);
        }
      }
    }

    // === Distancia y tiempo en vehículo ===
    const coordsUsuario = await obtenerCoordenadasUsuario();
    if (coordsUsuario && data.latitud && data.longitud) {
      const lista = [data];
      await calcularTiemposParaLista(lista, coordsUsuario);
      const tiempo = lista[0]?.tiempoTexto || null;

      const tiempoVehiculoEl = document.getElementById("tiempoVehiculo");
      if (tiempoVehiculoEl)
        tiempoVehiculoEl.innerHTML = `<i class="fas fa-car"></i> ${tiempo || "No disponible"}`;
    }

    // === Botones de navegación ===
    if (data.latitud && data.longitud) {
      const lat = data.latitud;
      const lon = data.longitud;
      document.getElementById(
        "btnGoogleMaps"
      ).href = `https://www.google.com/maps?q=${lat},${lon}`;
      document.getElementById(
        "btnWaze"
      ).href = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
    }

    await inicializarFavoritoPlaya(idPlaya);
  } catch (err) {
    console.error("Error al cargar la playa:", err.message);
  } finally {
    ocultarLoader();
  }
});
