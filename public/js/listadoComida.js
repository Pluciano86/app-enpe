import { supabase } from "../shared/supabaseClient.js";
import { cardComida } from "./cardComida.js";

// 🔹 Muestra los comercios activos tipo “Lugares para Comer”
export async function mostrarListadoComida() {
  const seccion = document.getElementById("cercanosComidaContainer");
  const contenedor = document.getElementById("sliderCercanosComida");

  if (!seccion || !contenedor) return;

  contenedor.innerHTML = "";

  try {
    // 🔸 Buscar comercios activos
    const { data: comercios, error } = await supabase
      .from("Comercios")
      .select("id, nombre, municipio, activo, idCategoria, logo, categoria")
      .eq("activo", true);

    if (error) throw error;
    if (!comercios?.length) {
      console.warn("No se encontraron comercios activos.");
      return;
    }

    // 🔹 Para cada comercio, buscar la portada
    for (const comercio of comercios) {
      let imagenPortada = null;

      const { data: portadaData } = await supabase
        .from("imagenesComercios")
        .select("imagen")
        .eq("idComercio", comercio.id)
        .eq("portada", true)
        .maybeSingle();

      if (portadaData?.imagen) {
        imagenPortada = portadaData.imagen;
      } else {
        // Si no tiene portada, generamos una random del bucket
        const randomNum = Math.floor(Math.random() * 5) + 1;
        imagenPortada = `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/placeholder/random-${randomNum}.jpg`;
      }

      const card = await cardComida({
        ...comercio,
        imagenPortada,
      });

      contenedor.appendChild(card);
    }

    seccion.classList.remove("hidden");
  } catch (err) {
    console.error("⚠️ Error mostrando lugares para comer:", err.message);
  }
}