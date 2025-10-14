// public/js/especialesBanner.js
document.addEventListener("DOMContentLoaded", () => {
  const imagen = document.getElementById("imagenEspeciales");
  if (!imagen) return;

  const ahora = new Date();
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();
  const totalMin = hora * 60 + minutos;

  // 🕒 2:00 am → 3:30 pm = Almuerzos
  const esAlmuerzo = totalMin >= 120 && totalMin < 930;

  // 🖼️ URLs directas desde Supabase Storage
  const urlAlmuerzos = "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/Almuerzos.jpg";
  const urlHappyHours = "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/HappyHours%20.jpg";

  imagen.src = esAlmuerzo ? urlAlmuerzos : urlHappyHours;
  imagen.alt = esAlmuerzo ? "Almuerzos del Día" : "Happy Hours";
});