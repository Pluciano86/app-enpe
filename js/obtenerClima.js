// obtenerClima.js
const climaMap = {
  0: { icon: "☀️", estado: "Despejado" },
  1: { icon: "☀️", estado: "Mayormente soleado" },
  2: { icon: "☁️", estado: "Parcialmente nublado" },
  3: { icon: "☁️", estado: "Nublado" },
  45: { icon: "🌫️", estado: "Niebla" },
  48: { icon: "🌫️", estado: "Niebla con escarcha" },
  51: { icon: "🌧️", estado: "Llovizna ligera" },
  53: { icon: "🌧️", estado: "Llovizna moderada" },
  55: { icon: "🌧️", estado: "Llovizna densa" },
  61: { icon: "🌧️", estado: "Lluvia ligera" },
  63: { icon: "🌧️", estado: "Lluvia moderada" },
  65: { icon: "🌧️", estado: "Lluvia fuerte" },
  80: { icon: "🌧️", estado: "Chubascos" },
  81: { icon: "🌧️", estado: "Chubascos moderados" },
  82: { icon: "🌧️", estado: "Chubascos violentos" },
  95: { icon: "⛈️", estado: "Tormenta" },
  96: { icon: "⛈️", estado: "Tormenta con granizo leve" },
  99: { icon: "⛈️", estado: "Tormenta con granizo fuerte" }
};

export async function obtenerClima(lat, lon) {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,is_day&daily=sunrise,sunset&timezone=auto`
    );
    const data = await res.json();

    const code = data.current.weather_code;
    const isDay = data.current.is_day === 1;
    const icono = climaMap[code]?.icon || "❓";
    const estado = climaMap[code]?.estado || "Desconocido";
    const viento = data.current.wind_speed_10m;

    return {
      icono: isDay ? icono : '🌙 ' + icono,
      estado,
      viento: `${viento} km/h`
    };
  } catch (error) {
    console.error("Error obteniendo clima:", error);
    return {
      icono: "❓",
      estado: "Error",
      viento: null
    };
  }
}