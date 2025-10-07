// ✅ gridComida.js - versión funcional con botón "Ver más"
import { supabase } from '../shared/supabaseClient.js';

async function mostrarGridComida({ idArea, idMunicipio }) {
  const grid = document.getElementById("gridComida");
  if (!grid) return;

  grid.innerHTML = `<p class="text-gray-400 text-center col-span-full animate-pulse">Cargando lugares...</p>`;

  try {
    // 🔹 Categorías que cuentan como "Lugares para Comer"
    // 🔹 Cargar IDs de categorías de comida dinámicamente
const { data: categorias, error: errorCat } = await supabase
  .from("Categorias")
  .select("id, nombre")
  .in("nombre", ["Restaurantes", "Bares", "Food Trucks", "Coffee Shops", "Panaderías"]);

if (errorCat) {
  console.warn("⚠️ Error cargando categorías de comida:", errorCat);
}

const categoriasComida = categorias?.map(c => c.id) || [];

    // 🔹 Buscar comercios activos (sin repetir sucursales)
    let query = supabase
      .from("Comercios")
      .select("id, nombre, municipio, idArea, idMunicipio, activo, tieneSucursales, idCategoria")
      .eq("activo", true);

    // 🔹 Filtrar por ubicación
    if (idMunicipio) query = query.eq("idMunicipio", idMunicipio);
    else if (idArea) query = query.eq("idArea", idArea);

    // 🔹 Incluir comercios que tengan al menos una categoría de comida
    query = query.or(
      categoriasComida
        .map(catId => `idCategoria.cs.{${catId}}`) // `.cs` = contains en arrays
        .join(',')
    );

    // 🔹 Ejecutar query
    const { data: comercios, error } = await query;
    console.log("🍽 Comercios encontrados:", comercios?.length, comercios);
    if (error) throw error;

    if (!comercios?.length) {
      grid.innerHTML = `<p class="text-gray-500">No hay lugares disponibles.</p>`;
      return;
    }

    // 🔹 Filtrar comercios únicos (solo una sucursal visible)
    const comerciosUnicos = [];
    const nombresVistos = new Set();
    for (const c of comercios) {
      const nombreKey = c.nombre.trim().toLowerCase();
      if (!nombresVistos.has(nombreKey)) {
        comerciosUnicos.push(c);
        nombresVistos.add(nombreKey);
      }
    }

    // 🔹 Obtener todas las imágenes (excepto las que son logo)
    const { data: imagenes, error: errorImgs } = await supabase
      .from("imagenesComercios")
      .select("imagen, idComercio, logo")
      .in("idComercio", comerciosUnicos.map(c => c.id))
      .neq("logo", true);

    if (errorImgs) throw errorImgs;

    if (!imagenes?.length) {
      grid.innerHTML = `<p class="text-gray-500">No hay imágenes disponibles.</p>`;
      return;
    }

    // 🔹 Aleatorizar imágenes
    const imagenesRandom = imagenes.sort(() => Math.random() - 0.5);

    // 🔹 Base URL
    const baseURL =
      "https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/";

    // 🔹 Mostrar primeras 12 imágenes
    const primeras = imagenesRandom.slice(0, 12);
    const restantes = imagenesRandom.slice(12);

    grid.innerHTML = "";

    for (const img of primeras) {
      const comercio = comerciosUnicos.find(c => c.id === img.idComercio);
      if (!comercio) continue;

      // Buscar logo del comercio
      const { data: logoData } = await supabase
        .from("imagenesComercios")
        .select("imagen")
        .eq("idComercio", comercio.id)
        .eq("logo", true)
        .maybeSingle();

      const logoURL = logoData
        ? `${baseURL}${logoData.imagen}`
        : "https://placehold.co/40x40?text=Logo";

      const card = document.createElement("a");
      card.href = `perfilComercio.html?id=${comercio.id}`;
      card.className =
        "relative block overflow-hidden rounded-xl shadow hover:scale-[1.03] transition-transform bg-white";

      card.innerHTML = `
         <img src="${baseURL + img.imagen}" alt="${comercio.nombre}"
           class="w-full h-40 object-cover" />
      <div class="absolute bottom-0 left-0 w-full p-2 flex items-end justify-start bg-gradient-to-t from-black/80 via-black/30 to-transparent">
        <img src="${logoURL}" alt="logo"
             class="w-9 h-9 rounded-full border border-white mr-2 object-cover bg-white" />
        <div class="leading-tight justify-items-start text-white text-[11px]">
          <p class="font-medium truncate max-w-[140px]">${comercio.nombre}</p>
          <p class="text-[11px] text-white">${comercio.municipio}</p>
        </div>
      </div>
      `;

      grid.appendChild(card);
    }

    // 🔹 Botón “Ver más...”
    if (restantes.length > 0) {
      const btnVerMas = document.createElement("button");
      btnVerMas.textContent = "Ver más...";
      btnVerMas.className =
        "block mx-auto mt-6 bg-[#0B132B] hover:bg-[#1C2541] text-white font-semibold py-2 px-8 rounded-lg shadow";
      
      // ✅ Conexión garantizada con modal
      btnVerMas.addEventListener("click", () => {
        console.log("🟢 Click detectado en 'Ver más'");
        mostrarModalImagenes(restantes, comerciosUnicos, baseURL);
      });

      grid.appendChild(btnVerMas);
    }
  } catch (err) {
    console.error("❌ Error cargando imágenes:", err);
    grid.innerHTML = `<p class="text-red-500">Error al cargar los lugares.</p>`;
  }
}

/* ===========================================================
   🔹 Modal - Versión funcional con blur, fade y cierre externo
   =========================================================== */
function mostrarModalImagenes(imagenes, comercios, baseURL) {
  const modal = document.getElementById("modalComida");
  const gridModal = document.getElementById("gridComidaModal");
  const cerrar = document.getElementById("cerrarModalComida");

  if (!modal || !gridModal) {
    console.warn("⚠️ Modal o contenedor no encontrados en el DOM");
    return;
  }

  gridModal.innerHTML = "";
  modal.classList.remove("hidden");
  modal.classList.add("flex", "animate-fadeIn");

  // Generar galería completa
  imagenes.forEach(async (img) => {
    const comercio = comercios.find(c => c.id === img.idComercio);
    if (!comercio) return;

    // 🔹 Buscar logo del comercio
    const { data: logoData } = await supabase
      .from("imagenesComercios")
      .select("imagen")
      .eq("idComercio", comercio.id)
      .eq("logo", true)
      .maybeSingle();

    const logoURL = logoData
      ? `${baseURL}${logoData.imagen}`
      : "https://placehold.co/40x40?text=Logo";

    // 🔹 Crear tarjeta
    const card = document.createElement("a");
    card.href = `perfilComercio.html?id=${comercio.id}`;
    card.className =
      "relative block overflow-hidden rounded-xl shadow hover:scale-[1.02] transition-transform bg-white";

    card.innerHTML = `
      <img src="${baseURL + img.imagen}" alt="${comercio.nombre}"
           class="w-full h-40 object-cover" />
      <div class="absolute bottom-0 left-0 w-full p-2 flex items-end justify-start bg-gradient-to-t from-black/80 via-black/30 to-transparent">
        <img src="${logoURL}" alt="logo"
             class="w-9 h-9 rounded-full border border-white mr-2 object-cover bg-white" />
        <div class="leading-tight justify-items-start text-white text-[11px]">
          <p class="font-medium truncate max-w-[140px]">${comercio.nombre}</p>
          <p class="text-[11px] text-white">${comercio.municipio}</p>
        </div>
      </div>
    `;

    gridModal.appendChild(card);
  });

  // ✅ Cerrar modal con botón o clic fuera
  if (cerrar) cerrar.onclick = () => cerrarModalAnimado(modal);
  modal.onclick = (e) => { if (e.target === modal) cerrarModalAnimado(modal); };
}

// 🔹 Animación de cierre
function cerrarModalAnimado(modal) {
  modal.classList.remove("animate-fadeIn");
  modal.classList.add("animate-fadeOut");

  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex", "animate-fadeOut");
  }, 200);
}

// 🔹 Inyectar animaciones
const style = document.createElement("style");
style.textContent = `
@keyframes fadeIn { from { opacity: 0; transform: scale(0.97);} to { opacity: 1; transform: scale(1);} }
@keyframes fadeOut { from { opacity: 1; transform: scale(1);} to { opacity: 0; transform: scale(0.97);} }
.animate-fadeIn { animation: fadeIn 0.25s ease forwards; }
.animate-fadeOut { animation: fadeOut 0.2s ease forwards; }
`;
document.head.appendChild(style);

// 🔹 Escuchar evento del área
window.addEventListener("areaCargada", (e) => {
  mostrarGridComida(e.detail);
});