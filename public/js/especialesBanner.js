// public/js/especialesBanner.js
document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("bannerContenido");
  if (!contenedor) return;

  // Hora actual
  const ahora = new Date();
  const totalMin = ahora.getHours() * 60 + ahora.getMinutes();

  // Almuerzo = 2:00am → 3:30pm
  const esAlmuerzo = totalMin >= 120 && totalMin < 930;

  // URLs de banners
  const urlAlmuerzos =
    "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/EA.png";

  const urlHappyHours =
    "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/HH.png";

  const urlFinal = esAlmuerzo ? urlAlmuerzos : urlHappyHours;

  // Detectar si es video por extensión
  const esVideo = /\.(mp4|webm|ogg)$/i.test(urlFinal);

  // Limpiar contenido
  contenedor.innerHTML = "";

  if (esVideo) {
    const video = document.createElement("video");
    video.src = urlFinal;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsinline = true;
    video.className =
      "w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300";

    contenedor.appendChild(video);
  } else {
    const img = document.createElement("img");
    img.src = urlFinal;
    img.alt = "Banner Especiales";
    img.className =
      "w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300";

    contenedor.appendChild(img);
  }
});