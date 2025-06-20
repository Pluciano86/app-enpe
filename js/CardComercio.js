export function cardComercio(comercio) {
  const div = document.createElement('div');
  div.className = `
    bg-white rounded-2xl shadow-md overflow-hidden 
    text-center transition-transform duration-300 hover:scale-[1.02]
    w-full max-w-[180px] sm:max-w-[200px] mx-auto
  `;

  div.innerHTML = `
    <div class="relative">
      <!-- Imagen de portada -->
      <img src="${comercio.imagenPortada}" alt="Portada de ${comercio.nombre}" 
        class="w-full h-20 object-cover" />

      <!-- Logo y nombre con enlace -->
      <a href="perfilComercio.html?id=${comercio.id}" class="relative w-full flex flex-col items-center pt-9 mt-6 no-underline">
        <!-- Logo centrado y superpuesto -->
        <img src="${comercio.logo}" alt="Logo de ${comercio.nombre}"
          class="w-24 h-24 rounded-full absolute left-1/2 -top-10 transform -translate-x-1/2 
                 bg-white object-contain shadow-[0px_-17px_11px_-5px_rgba(0,_0,_0,_0.3)] 
                 border-4 border-white z-20" />

        <!-- Nombre con ajuste de tamaño si es largo -->
        <div class="relative h-12 w-full">
          <div class="absolute inset-0 flex items-center justify-center px-2 text-center">
            <h3 class="${comercio.nombre.length > 25 ? 'text-lg' : 'text-xl'} 
                       font-medium text-[#424242] z-30 mt-2 leading-[0.9] text-center">
              ${comercio.nombre}
            </h3>
          </div>
        </div>
      </a>

      <!-- Botón de llamada -->
      <a href="tel:${comercio.telefono}" 
        class="inline-flex items-center justify-center gap-2 text-[15px] text-white font-medium 
               bg-red-600 rounded-full px-4 py-[6px] mb-2 shadow hover:bg-red-700 transition 
               mx-auto mt-2 max-w-[100%]">
        <i class="fa-solid fa-phone text-base"></i> ${comercio.telefono}
      </a>

      <!-- Estado de apertura -->
      <div class="flex justify-center items-center gap-1 
                  ${comercio.abierto ? 'text-green-600' : 'text-red-600'} 
                  font-medium mb-1 text-base">
        <i class="far fa-clock"></i> ${comercio.abierto ? 'Abierto Ahora' : 'Cerrado Ahora'}
      </div>

      <!-- Pueblo -->
      <div class="flex justify-center items-center gap-1 font-medium mb-1 text-sm text-[#23b4e9]">
        <i class="fas fa-map-pin text-[#23b4e9]"></i> ${comercio.pueblo}
      </div>

      <!-- Tiempo en vehículo -->
      <div class="flex justify-center items-center gap-1 text-[#9c9c9c] font-medium text-sm mb-4">
        <i class="fas fa-car"></i> ${comercio.tiempoVehiculo}
      </div>
    </div>
  `;

  return div;
}