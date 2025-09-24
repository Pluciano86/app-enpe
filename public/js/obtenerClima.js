const climaMap = {
  0: "0",
  1: "1",
  2: "2",
  3: "3",
  45: "45",
  48: "45",  // Mismo ícono para niebla con escarcha
  51: "51",
  53: "53",
  55: "55",
  61: "61",
  63: "63",
  65: "65",
  80: "61",
  81: "63",
  82: "65",
  95: "95",
  96: "95",
  99: "95"
};

export async function obtenerClima(lat, lon) {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,is_day&daily=sunrise,sunset&timezone=auto`
    );
    const data = await res.json();

    const code = data.current.weather_code;
    const isDay = data.current.is_day === 1;
    const vientoMph = (data.current.wind_speed_10m * 0.621371).toFixed(1);

    // Ruta del ícono SVG según código y si es de noche
    const iconCode = climaMap[code] ?? "0";
    const suffix = isDay ? "" : "n";
    const iconoURL = `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/${iconCode}${suffix}.svg`;

    return {
      iconoURL,
      estado: obtenerNombreEstado(code),
      viento: `${vientoMph} mph`
    };

  } catch (error) {
    console.error("Error obteniendo clima:", error);
    return {
      iconoURL: "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/imagenesapp/enpr/0.svg",
      estado: "Desconocido",
      viento: null
    };
  }
}

function obtenerNombreEstado(code) {
  const nombres = {
    0: "Clima Perfecto",
    1: "Pocas Nubes",
    2: "Poco Nublado",
    3: "Nublado",
    45: "Niebla",
    48: "Niebla con escarcha",
    51: "Llovizna",
    53: "Llovizna",
    55: "Llovizna Densa",
    61: "Lluvia Ligera",
    63: "Lluvia",
    65: "Lluvia Fuerte",
    80: "Chubascos",
    81: "Chubascos",
    82: "Chubascos",
    95: "Tormenta",
    96: "Tormenta con granizo",
    99: "Tormenta Fuerte"
  };
  return nombres[code] ?? "Desconocido";
}