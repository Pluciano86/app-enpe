export function cardComercio(comercio) {
  const div = document.createElement('div');
  div.className = `
    bg-white rounded-b-2xl shadow-md overflow-hidden 
    relative text-center transition-transform duration-300 hover:scale-[1.02]
  `;

  div.innerHTML = `
    <div class="relative w-full">
      <img src="${comercio.imagenPortada}" alt="Portada de ${comercio.nombre}" 
        class="w-full h-36 object-cover transition-transform duration-300 ease-in-out hover:scale-105" />

      <img src="${comercio.logo}" alt="Logo de ${comercio.nombre}"
        class="w-24 h-24 rounded-full absolute -bottom-12 left-1/2 transform -translate-x-1/2 
               bg-white object-contain shadow-lg border-4 border-white z-10
               transition-transform duration-300 ease-in-out hover:scale-110" />
    </div>

    <div class="pt-16 pb-4 px-3 text-center text-sm text-gray-700 font-sans">
      <h3 class="text-xl font-bold text-gray-900 mb-2">${comercio.nombre}</h3>

      <a href="tel:${comercio.telefono}" 
         class="inline-flex items-center justify-center gap-2 text-white font-semibold bg-red-600 rounded-full px-4 py-1 mb-2 shadow hover:bg-red-700 transition text-sm">
        <i class="fa-solid fa-phone"></i> ${comercio.telefono}
      </a>

      <div class="flex justify-center items-center gap-1 text-red-600 font-medium mb-1 text-sm">
        <i class="fas fa-clock"></i> ${comercio.abierto ? 'Abierto Ahora' : 'Cerrado Ahora'}
      </div>

      <div class="flex justify-center items-center gap-1 text-blue-500 font-medium mb-1 text-sm">
        <i class="fas fa-map-marker-alt"></i> ${comercio.pueblo}
      </div>

      <div class="flex justify-center items-center gap-1 text-gray-600 font-medium text-sm">
        <i class="fas fa-car"></i> ${comercio.tiempoVehiculo}
      </div>
    </div>
  `;

  return div;
}