// public/js/especialesBanner.js
document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("videoEspeciales");
  const source = document.getElementById("videoSource");
  if (!video || !source) return;

  // 🕒 Obtener la hora actual en minutos totales
  const ahora = new Date();
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();
  const totalMin = hora * 60 + minutos;

  // 🕒 2:00 am → 3:30 pm = Almuerzos | 3:30 pm → 2:00 am = Happy Hour
  const esAlmuerzo = totalMin >= 120 && totalMin < 930;

  // 🎥 URLs de los videos en Supabase (por ahora la misma para ambos)
  const urlAlmuerzos =
    "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/videos/Lunch.mp4";
  const urlHappyHours =
    "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/videos/HH.mp4";

  // 🔁 Cambiar dinámicamente el video según la hora
  source.src = esAlmuerzo ? urlAlmuerzos : urlHappyHours;

  // 🔄 Recargar el video con la nueva fuente
  video.load();

  // ▶️ Intentar reproducir automáticamente
  video.play().catch(() => {
    console.warn("🔇 El navegador bloqueó el autoplay. El usuario debe interactuar para reproducir.");
  });

  // 🖱️ Efecto opcional: pausar al pasar el mouse y reanudar al salir
  video.addEventListener("mouseenter", () => video.pause());
  video.addEventListener("mouseleave", () => video.play());
});